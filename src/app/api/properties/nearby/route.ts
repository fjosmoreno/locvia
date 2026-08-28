import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { serializeProperty, propertyInclude } from "@/lib/property-serializer";
import { publicWhere } from "@/lib/property-serializer";
import { haversine } from "@/lib/geo";

// GET /api/properties/nearby?lat=&lng=&radius=&...filtros
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const lat = Number(sp.get("lat"));
  const lng = Number(sp.get("lng"));
  const radius = Number(sp.get("radius") || "5000"); // metros

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat e lng são obrigatórios." }, { status: 400 });
  }

  // bounding box ampliado para depois filtrar por raio exato
  const radiusSafe = Math.max(radius, 2000);
  const latDelta = radiusSafe / 111320;
  const lngDelta = radiusSafe / (111320 * Math.cos((lat * Math.PI) / 180));

  const where = publicWhere({
    purpose: sp.get("purpose") || undefined,
    propertyType: sp.getAll("propertyType").length ? sp.getAll("propertyType") : undefined,
    minPrice: sp.get("minPrice") ? Number(sp.get("minPrice")) : undefined,
    maxPrice: sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined,
    bedrooms: sp.get("bedrooms") ? Number(sp.get("bedrooms")) : undefined,
    bathrooms: sp.get("bathrooms") ? Number(sp.get("bathrooms")) : undefined,
    parkingSpaces: sp.get("parkingSpaces") ? Number(sp.get("parkingSpaces")) : undefined,
    minArea: sp.get("minArea") ? Number(sp.get("minArea")) : undefined,
    city: sp.get("city") || undefined,
    state: sp.get("state") || undefined,
    search: sp.get("search") || undefined,
    bbox: {
      minLat: lat - latDelta,
      maxLat: lat + latDelta,
      minLng: lng - lngDelta,
      maxLng: lng + lngDelta,
    },
  });

  const props = await db.property.findMany({
    where,
    include: propertyInclude,
    take: 500,
  });

  const origin = { lat, lng };
  const withDistance = props.map((p) => ({
    p,
    distance: haversine(origin, { lat: p.latitude, lng: p.longitude }),
  }));
  const filtered = withDistance.filter((x) => x.distance <= radiusSafe);
  filtered.sort((a, b) => a.distance - b.distance);

  const data = await Promise.all(
    filtered.map(async (x) => ({
      ...(await serializeProperty(x.p, origin)),
      distance: x.distance,
    }))
  );
  return NextResponse.json({ properties: data, total: data.length, radius: radiusSafe });
}
