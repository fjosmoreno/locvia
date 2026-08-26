"use client";

import { Heart, MapPin, BedDouble, Bath, Car, Maximize, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useUI } from "@/lib/store";
import { useFavorite } from "@/hooks/use-favorite";
import { formatPrice, formatDistance } from "@/lib/geo";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PropertyCard({ property }: { property: Property }) {
  const { openProperty } = useUI();
  const { isFavorited, toggle, canFavorite } = useFavorite(property.id);

  const img = property.images[0]?.url;
  const dist = property.distance;

  return (
    <div
      onClick={() => openProperty(property)}
      className="group cursor-pointer rounded-2xl overflow-hidden bg-card border border-border hover:border-primary/40 hover:shadow-lg transition-all"
    >
      <div className="relative aspect-[16/11] bg-muted overflow-hidden">
        {img ? (
           
          <img
            src={img}
            alt={property.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground text-xs">
            Sem foto
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1.5">
          {property.featured && (
            <Badge className="bg-primary text-primary-foreground shadow text-[10px]">
              Destaque
            </Badge>
          )}
          {property.badge === "OFFER" && (
            <Badge className="bg-amber-500 text-white shadow text-[10px]">Oferta</Badge>
          )}
          {property.badge === "RECOMMENDED" && (
            <Badge className="bg-violet-600 text-white shadow text-[10px]">Recomendado</Badge>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggle();
          }}
          className="absolute top-2 right-2 w-8 h-8 grid place-items-center rounded-full bg-white/90 backdrop-blur shadow hover:bg-white transition-colors"
          aria-label="Favoritar"
        >
          <Heart
            className={cn(
              "w-4 h-4 transition-colors",
              isFavorited ? "fill-rose-500 text-rose-500" : "text-muted-foreground"
            )}
          />
        </button>
      </div>

      <div className="p-3 space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <div className="font-bold text-[15px] text-primary leading-tight">
            {formatPrice(property.price, property.purpose)}
          </div>
          {dist != null && (
            <div className="text-[11px] text-muted-foreground shrink-0 flex items-center gap-0.5">
              <MapPin className="w-3 h-3" />
              {formatDistance(dist)}
            </div>
          )}
        </div>
        <div className="text-[13px] font-medium text-foreground clamp-1">
          {property.title}
        </div>
        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {property.neighborhood ? `${property.neighborhood}` : ""}
          {property.city ? `, ${property.city}` : ""}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-1 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/70">
            {PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType}
          </span>
          {property.bedrooms != null && (
            <span className="flex items-center gap-1">
              <BedDouble className="w-3 h-3" /> {property.bedrooms}
            </span>
          )}
          {property.bathrooms != null && (
            <span className="flex items-center gap-1">
              <Bath className="w-3 h-3" /> {property.bathrooms}
            </span>
          )}
          {property.parkingSpaces != null && (
            <span className="flex items-center gap-1">
              <Car className="w-3 h-3" /> {property.parkingSpaces}
            </span>
          )}
          {property.area != null && (
            <span className="flex items-center gap-1">
              <Maximize className="w-3 h-3" /> {property.area}m²
            </span>
          )}
        </div>

        {property.advertiser?.verified && (
          <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium pt-0.5">
            <BadgeCheck className="w-3 h-3" /> Anunciante verificado
          </div>
        )}
      </div>
    </div>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border">
      <Skeleton className="aspect-[16/11] w-full" />
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2 pt-1">
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-10" />
          <Skeleton className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
}
