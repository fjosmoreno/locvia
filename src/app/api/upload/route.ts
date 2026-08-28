// POST /api/upload — upload de imagens OU vídeos do cadastro de imóveis.
// Espera multipart/form-data com:
//   - file: File (obrigatório)
//   - kind: "image" | "video" (obrigatório)
//   - duration: number (segundos — obrigatório para kind=video, extraído client-side)
//
// Resposta (200): { url, size, mimeType, duration? }
// Erros: 400 (validação) | 401 (não autenticado) | 500 (storage)

import { NextRequest, NextResponse } from "next/server";
import { getSessionUser, ADVERTISER_ROLES } from "@/lib/session";
import { uploadMedia, type MediaKind } from "@/lib/storage";
import { rateLimitResponse } from "@/lib/rate-limit";

export const runtime = "nodejs"; // fs + FormData precisam de runtime node, não edge

const MAX_DURATION_SECONDS = 30;

export async function POST(req: NextRequest) {
  // Upload — limite conservador (10/min) por causa do peso (até 50MB por arquivo).
  const limited = rateLimitResponse(req, { windowMs: 60_000, max: 10 });
  if (limited) return limited;

  // Apenas anunciantes (imobiliária, proprietário, corretor) podem fazer upload.
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Faça login para enviar mídias." },
      { status: 401 }
    );
  }
  const isAdmin = user.role === "ADMIN";
  if (!isAdmin && !ADVERTISER_ROLES.includes(user.role)) {
    return NextResponse.json(
      { error: "Apenas anunciantes podem enviar mídias." },
      { status: 403 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Payload inválido. Esperado multipart/form-data." },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Campo 'file' ausente ou inválido." },
      { status: 400 }
    );
  }
  const kindRaw = formData.get("kind");
  const kind: MediaKind | null =
    kindRaw === "image" || kindRaw === "video" ? kindRaw : null;
  if (!kind) {
    return NextResponse.json(
      { error: "Campo 'kind' deve ser 'image' ou 'video'." },
      { status: 400 }
    );
  }

  // Duração é obrigatória para vídeo (validada client-side, mas checamos aqui também).
  let duration: number | undefined;
  if (kind === "video") {
    const durRaw = formData.get("duration");
    const parsed = Number(durRaw);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return NextResponse.json(
        { error: "Duração do vídeo inválida ou ausente." },
        { status: 400 }
      );
    }
    duration = parsed;
  }

  try {
    const result = await uploadMedia(
      { file, folder: `properties/${kind}s` },
      {
        kind,
        duration,
        maxDuration: MAX_DURATION_SECONDS,
      }
    );
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falha no upload da mídia.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
