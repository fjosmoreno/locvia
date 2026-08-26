import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import sharp from "sharp";
import { getSessionUser, ADVERTISER_ROLES, ADMIN_ROLES } from "@/lib/session";

// POST /api/upload — upload de imagem (multipart), otimiza com sharp
export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user || (![...ADVERTISER_ROLES, ...ADMIN_ROLES].includes(user.role))) {
    return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "Arquivo ausente." }, { status: 400 });

  // Validações
  const allowed = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
  if (!allowed.includes(file.type)) {
    return NextResponse.json({ error: "Formato não suportado. Use JPG, PNG ou WebP." }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return NextResponse.json({ error: "Imagem muito grande (máx 8MB)." }, { status: 400 });
  }

  const buf = Buffer.from(await file.arrayBuffer());
  const uploadDir = path.join(process.cwd(), "public", "uploads");
  await mkdir(uploadDir, { recursive: true });

  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}.webp`;
  const fullPath = path.join(uploadDir, name);

  // Otimiza: redimensiona (máx 1600px), converte para webp
  await sharp(buf)
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(fullPath);

  const url = `/uploads/${name}`;
  return NextResponse.json({ url });
}
