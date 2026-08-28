// Storage de mídias (imagens + vídeos).
//
// Estratégia:
//   - Produção (Vercel): Vercel Blob via @vercel/blob (BLOB_READ_WRITE_TOKEN).
//   - Dev local: filesystem em public/uploads/ (servido pelo Next como estático).
//
// Adiciona cache-control adequado + validação de MIME/tamanho.

import { put, del } from "@vercel/blob";
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export type MediaKind = "image" | "video";

export interface UploadInput {
  /** File do FormData */
  file: File;
  /** Pasta: "properties/images" | "properties/videos" */
  folder: string;
}

export interface UploadResult {
  url: string;
  size: number;
  mimeType: string;
  /** Duração em segundos (só vídeo) */
  duration?: number;
  /** Thumbnail (frame do vídeo) opcional */
  thumbnail?: string;
}

const IMAGE_MIME = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
const VIDEO_MIME = ["video/mp4", "video/webm", "video/quicktime"];

const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB (mantém margem de 30s em 720p)

function guessKind(mime: string): MediaKind | null {
  if (IMAGE_MIME.includes(mime)) return "image";
  if (VIDEO_MIME.includes(mime)) return "video";
  return null;
}

function safeExt(filename: string, mime: string): string {
  const fromName = path.extname(filename).slice(1).toLowerCase();
  if (fromName) return fromName;
  if (mime === "image/jpeg" || mime === "image/jpg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "video/mp4") return "mp4";
  if (mime === "video/webm") return "webm";
  if (mime === "video/quicktime") return "mov";
  return "bin";
}

function newId() {
  return crypto.randomBytes(8).toString("hex");
}

const hasBlob = !!process.env.BLOB_READ_WRITE_TOKEN;

function buildKey(folder: string, originalName: string, mime: string) {
  // timestamp + random pra evitar colisão e cache-busting opcional
  const ts = Date.now();
  const ext = safeExt(originalName, mime);
  return `${folder}/${ts}-${newId()}.${ext}`;
}

async function uploadToBlob(
  file: File,
  key: string
): Promise<{ url: string }> {
  const blob = await put(key, file, {
    access: "public",
    addRandomSuffix: false,
    contentType: file.type || undefined,
    cacheControlMaxAge: 60 * 60 * 24 * 30, // 30 dias
  });
  return { url: blob.url };
}

async function uploadToLocal(
  file: File,
  key: string
): Promise<{ url: string }> {
  const uploadsDir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(uploadsDir, { recursive: true });
  const localPath = path.join(uploadsDir, key);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(localPath, buf);
  return { url: `/uploads/${key}` };
}

export interface ValidateOptions {
  kind: MediaKind;
  /** Duração em segundos (obrigatório pra vídeo) */
  duration?: number;
  /** Limite de duração em segundos (padrão: 30) */
  maxDuration?: number;
}

export function validateMedia(
  file: File,
  opts: ValidateOptions
): { ok: true; kind: MediaKind } | { ok: false; error: string } {
  if (!file || file.size === 0) return { ok: false, error: "Arquivo vazio." };
  const kind = guessKind(file.type);
  if (!kind) {
    return {
      ok: false,
      error: `Formato não suportado (${file.type || "?"}). Use JPG/PNG/WebP para fotos ou MP4/WebM/MOV para vídeos.`,
    };
  }
  if (kind !== opts.kind) {
    return {
      ok: false,
      error:
        opts.kind === "image"
          ? "Selecione apenas imagens (JPG, PNG ou WebP)."
          : "Selecione apenas vídeos (MP4, WebM ou MOV).",
    };
  }
  const maxBytes = opts.kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > maxBytes) {
    const mb = Math.round(maxBytes / 1024 / 1024);
    return { ok: false, error: `Arquivo excede o limite de ${mb}MB.` };
  }
  if (opts.kind === "video") {
    const maxDur = opts.maxDuration ?? 30;
    if (opts.duration == null || opts.duration <= 0) {
      return { ok: false, error: "Não foi possível ler a duração do vídeo." };
    }
    if (opts.duration > maxDur) {
      return {
        ok: false,
        error: `O vídeo tem ${opts.duration.toFixed(1)}s. Limite permitido: ${maxDur}s.`,
      };
    }
  }
  return { ok: true, kind };
}

export async function uploadMedia(
  input: UploadInput,
  validate: ValidateOptions
): Promise<UploadResult> {
  const v = validateMedia(input.file, validate);
  if (!v.ok) throw new Error(v.error);

  const key = buildKey(input.folder, input.file.name, input.file.type);
  const { url } = hasBlob
    ? await uploadToBlob(input.file, key)
    : await uploadToLocal(input.file, key);

  return {
    url,
    size: input.file.size,
    mimeType: input.file.type,
  };
}

export async function deleteMedia(url: string): Promise<void> {
  if (!url) return;
  try {
    if (hasBlob && url.includes("blob.vercel-storage.com")) {
      await del(url);
      return;
    }
    if (url.startsWith("/uploads/")) {
      const local = path.join(process.cwd(), "public", url);
      await fs.unlink(local).catch(() => undefined);
    }
  } catch {
    // best-effort
  }
}

export const __hasBlob = hasBlob;
