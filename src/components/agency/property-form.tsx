"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  MapPin,
  Search,
  Upload,
  X,
  Loader2,
  Images,
  UserRound,
  ChevronLeft,
  ChevronRight,
  Video,
  Crosshair,
  PlayCircle,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  PURPOSES,
  PURPOSE_LABELS,
} from "@/lib/constants";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PropertyVideo {
  id: string;
  url: string;
  duration: number;
  thumbnail: string | null;
  isPrimary: boolean;
  sortOrder: number;
}

interface PropertyFormProps {
  editProperty?: Property | null;
  onDone: () => void;
  defaultContact?: { name?: string | null; phone?: string | null };
}

interface GeoResult {
  lat: number;
  lng: number;
  displayName: string;
}

interface UploadedVideo {
  url: string;
  duration: number;
  thumbnail: string | null;
  size: number;
  mimeType: string;
}

const EMPTY = {
  title: "",
  purpose: "RENT",
  propertyType: "APARTMENT",
  price: "",
  condominium: "",
  iptu: "",
  area: "",
  bedrooms: "",
  bathrooms: "",
  parkingSpaces: "",
  description: "",
  postalCode: "",
  address: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "",
  latitude: "",
  longitude: "",
  contactName: "",
  whatsapp: "",
  phone: "",
  images: [] as string[],
  video: null as UploadedVideo | null,
};

type FormState = typeof EMPTY;

const ALLOWED_IMAGE_MIME = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
];
const ALLOWED_VIDEO_MIME = ["video/mp4", "video/webm", "video/quicktime"];
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_SECONDS = 30;

export function PropertyForm({
  editProperty,
  onDone,
  defaultContact,
}: PropertyFormProps) {
  const qc = useQueryClient();
  const isEdit = !!editProperty;

  const [form, setForm] = useState<FormState>({ ...EMPTY });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [videoPreview, setVideoPreview] = useState<{
    url: string;
    duration: number;
    thumbnail: string | null;
  } | null>(null);
  const [geoQuery, setGeoQuery] = useState("");
  const [geoResults, setGeoResults] = useState<GeoResult[]>([]);
  const [geoLoading, setGeoLoading] = useState(false);
  const [geoOpen, setGeoOpen] = useState(false);
  const [autoGeoLoading, setAutoGeoLoading] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initialize form when editProperty changes (or when entering create mode)
  useEffect(() => {
    if (!editProperty) {
      setForm({
        ...EMPTY,
        contactName: defaultContact?.name || "",
        whatsapp: defaultContact?.phone || "",
        phone: defaultContact?.phone || "",
      });
      setGeoQuery("");
      setGeoResults([]);
      setVideoPreview(null);
      return;
    }
    const p = editProperty;
    const existingVideo = p.videos?.[0];
    setForm({
      title: p.title || "",
      purpose: p.purpose || "RENT",
      propertyType: p.propertyType || "APARTMENT",
      price: p.price != null ? String(p.price) : "",
      condominium: p.condominium != null ? String(p.condominium) : "",
      iptu: p.iptu != null ? String(p.iptu) : "",
      area: p.area != null ? String(p.area) : "",
      bedrooms: p.bedrooms != null ? String(p.bedrooms) : "",
      bathrooms: p.bathrooms != null ? String(p.bathrooms) : "",
      parkingSpaces: p.parkingSpaces != null ? String(p.parkingSpaces) : "",
      description: p.description || "",
      postalCode: p.postalCode || "",
      address: p.address || "",
      number: p.number || "",
      complement: p.complement || "",
      neighborhood: p.neighborhood || "",
      city: p.city || "",
      state: p.state || "",
      latitude: p.latitude != null ? String(p.latitude) : "",
      longitude: p.longitude != null ? String(p.longitude) : "",
      contactName: p.contactName || defaultContact?.name || "",
      whatsapp: p.whatsapp || defaultContact?.phone || "",
      phone: p.phone || defaultContact?.phone || "",
      images: p.images.map((im) => im.url),
      video: existingVideo
        ? {
            url: existingVideo.url,
            duration: existingVideo.duration,
            thumbnail: existingVideo.thumbnail,
            size: 0,
            mimeType: "",
          }
        : null,
    });
    setVideoPreview(
      existingVideo
        ? {
            url: existingVideo.url,
            duration: existingVideo.duration,
            thumbnail: existingVideo.thumbnail,
          }
        : null
    );
    setGeoQuery(p.address ? `${p.address}${p.number ? ", " + p.number : ""}` : "");
    setGeoResults([]);
  }, [editProperty]);

  // Limpa o object URL do preview de vídeo ao desmontar/trocar
  useEffect(() => {
    return () => {
      if (videoPreview?.url && videoPreview.url.startsWith("blob:")) {
        URL.revokeObjectURL(videoPreview.url);
      }
    };
  }, [videoPreview]);

  // debounced geocode lookup
  useEffect(() => {
    if (geoQuery.trim().length < 3) {
      setGeoResults([]);
      setGeoLoading(false);
      return;
    }
    let cancelled = false;
    setGeoLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/geocode?q=${encodeURIComponent(geoQuery)}`)
        .then((r) => r.json())
        .then((d) => {
          if (cancelled) return;
          setGeoResults(d.results || []);
          setGeoOpen(true);
        })
        .catch(() => {})
        .finally(() => {
          if (!cancelled) setGeoLoading(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [geoQuery]);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((f) => ({ ...f, [key]: val }));
    if (errors[key]) setErrors((e) => ({ ...e, [key]: "" }));
  }

  function pickGeo(r: GeoResult) {
    setForm((f) => ({
      ...f,
      latitude: String(r.lat),
      longitude: String(r.lng),
    }));
    if (errors.location) setErrors((e) => ({ ...e, location: "" }));
    setGeoQuery(r.displayName);
    setGeoOpen(false);

    // Best-effort parse of Nominatim display_name parts
    const parts = r.displayName.split(",").map((s) => s.trim());
    setForm((f) => ({
      ...f,
      latitude: String(r.lat),
      longitude: String(r.lng),
      address: f.address || (parts[0] || ""),
      neighborhood: f.neighborhood || (parts[1] || parts[2] || ""),
      city: f.city || (parts[3] || parts[2] || ""),
      state: f.state || (() => {
        const stateRaw = parts.find((p) => /[A-Z]{2}/.test(p));
        const m = stateRaw?.match(/\b([A-Z]{2})\b/);
        return m ? m[1] : "";
      })(),
    }));
  }

  async function handleUpload(files: FileList | null) {
    if (!files || !files.length) return;
    const valid: File[] = [];
    for (const f of Array.from(files)) {
      if (!ALLOWED_IMAGE_MIME.includes(f.type)) {
        toast.error(`${f.name}: formato não suportado. Use JPG, PNG ou WebP.`);
        continue;
      }
      if (f.size > MAX_IMAGE_BYTES) {
        toast.error(`${f.name}: excede o limite de 8MB.`);
        continue;
      }
      valid.push(f);
    }
    if (!valid.length) return;

    setUploading(true);
    try {
      const uploaded: string[] = [];
      for (const f of valid) {
        const fd = new FormData();
        fd.append("file", f);
        fd.append("kind", "image");
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const d = await res.json();
        if (!res.ok) {
          toast.error(d.error || `${f.name}: falha no upload.`);
          continue;
        }
        uploaded.push(d.url);
      }
      if (uploaded.length) {
        setForm((f) => ({ ...f, images: [...f.images, ...uploaded] }));
        toast.success(
          uploaded.length === 1
            ? "Imagem adicionada."
            : `${uploaded.length} imagens adicionadas.`
        );
      }
    } finally {
      setUploading(false);
    }
  }

  function removeImage(idx: number) {
    setForm((f) => ({ ...f, images: f.images.filter((_, i) => i !== idx) }));
  }
  function moveImage(idx: number, dir: -1 | 1) {
    setForm((f) => {
      const next = [...f.images];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return f;
      [next[idx], next[j]] = [next[j], next[idx]];
      return { ...f, images: next };
    });
  }

  // ============== UPLOAD DE VÍDEO ==============
  function readVideoMeta(
    file: File
  ): Promise<{ duration: number; thumbnail: string | null }> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const v = document.createElement("video");
      v.preload = "metadata";
      v.muted = true;
      v.playsInline = true;
      v.src = url;
      const cleanup = () => {
        try {
          URL.revokeObjectURL(url);
        } catch {}
      };
      v.onloadedmetadata = () => {
        const dur = Number.isFinite(v.duration) ? v.duration : 0;
        // Captura thumbnail no segundo 1 (ou 0 se for muito curto)
        const seekTo = Math.min(1, Math.max(0, dur / 2));
        v.currentTime = seekTo;
      };
      v.onseeked = () => {
        try {
          const canvas = document.createElement("canvas");
          const w = 320;
          const ratio = v.videoHeight / Math.max(1, v.videoWidth);
          canvas.width = w;
          canvas.height = Math.round(w * ratio);
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const thumb = canvas.toDataURL("image/jpeg", 0.7);
            cleanup();
            resolve({ duration: v.duration, thumbnail: thumb });
          } else {
            cleanup();
            resolve({ duration: v.duration, thumbnail: null });
          }
        } catch {
          cleanup();
          resolve({ duration: v.duration, thumbnail: null });
        }
      };
      v.onerror = () => {
        cleanup();
        resolve({ duration: 0, thumbnail: null });
      };
    });
  }

  async function handleVideoUpload(file: File | null) {
    if (!file) return;
    if (!ALLOWED_VIDEO_MIME.includes(file.type)) {
      toast.error("Formato não suportado. Use MP4, WebM ou MOV.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      toast.error(`Vídeo excede o limite de 50MB.`);
      return;
    }

    setUploadingVideo(true);
    try {
      const { duration, thumbnail } = await readVideoMeta(file);
      if (duration <= 0) {
        toast.error("Não foi possível ler a duração do vídeo.");
        return;
      }
      if (duration > MAX_VIDEO_SECONDS) {
        toast.error(
          `O vídeo tem ${duration.toFixed(1)}s. Limite permitido: ${MAX_VIDEO_SECONDS}s.`
        );
        return;
      }
      const fd = new FormData();
      fd.append("file", file);
      fd.append("kind", "video");
      fd.append("duration", String(duration));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error || "Falha no upload do vídeo.");
        return;
      }
      setForm((f) => ({
        ...f,
        video: {
          url: d.url,
          duration,
          thumbnail,
          size: file.size,
          mimeType: file.type,
        },
      }));
      setVideoPreview({ url: d.url, duration, thumbnail });
      toast.success("Vídeo enviado.");
    } finally {
      setUploadingVideo(false);
    }
  }

  function removeVideo() {
    setForm((f) => ({ ...f, video: null }));
    setVideoPreview(null);
  }

  // ============== AUTOCOMPLETAR CEP (ViaCEP) ==============
  async function lookupCep(cep: string) {
    const digits = cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`/api/geocode/cep?cep=${digits}`);
      if (!res.ok) return;
      const json = await res.json();
      const data = json.data;
      if (!data) return;
      setForm((f) => ({
        ...f,
        // só preenche se o usuário não tiver digitado (mantém o que está)
        neighborhood: f.neighborhood || data.bairro || "",
        city: f.city || data.localidade || "",
        state: f.state || data.uf || "",
        address: f.address || data.logradouro || "",
      }));
      toast.success("Endereço preenchido pelo CEP.");
      // Após preencher pelo CEP, tenta geocodificar automaticamente
      // pra já deixar lat/lng prontos.
      void autoGeocodeFromForm();
    } catch {
      // silencioso — CEP pode não existir na base
    } finally {
      setCepLoading(false);
    }
  }

  // ============== AUTO-GEOCODE: usa campos atuais do form ==============
  async function autoGeocodeFromForm(): Promise<boolean> {
    if (!form.address && !form.postalCode && !form.city) {
      toast.error(
        "Preencha pelo menos o endereço, CEP ou cidade antes de buscar as coordenadas."
      );
      return false;
    }
    setAutoGeoLoading(true);
    try {
      const res = await fetch("/api/geocode/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: form.address,
          number: form.number,
          neighborhood: form.neighborhood,
          city: form.city,
          state: form.state,
          postalCode: form.postalCode,
        }),
      });
      const d = await res.json();
      if (!res.ok) {
        toast.error(d.error || "Não foi possível localizar o endereço.");
        return false;
      }
      setForm((f) => ({
        ...f,
        latitude: String(d.result.lat),
        longitude: String(d.result.lng),
      }));
      if (errors.location) setErrors((e) => ({ ...e, location: "" }));
      toast.success("Localização definida automaticamente.");
      return true;
    } catch {
      toast.error("Falha ao consultar localização.");
      return false;
    } finally {
      setAutoGeoLoading(false);
    }
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!form.title.trim()) e.title = "Título obrigatório";
    if (!form.purpose) e.purpose = "Selecione a finalidade";
    if (!form.propertyType) e.propertyType = "Selecione o tipo";
    if (!form.price || Number(form.price) <= 0) e.price = "Preço inválido";
    if (!form.latitude || !form.longitude)
      e.location = "Selecione a localização no mapa";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const mutation = useMutation({
    mutationFn: async () => {
      const body: Record<string, unknown> = {
        title: form.title.trim(),
        purpose: form.purpose,
        propertyType: form.propertyType,
        price: Number(form.price),
        condominium: form.condominium ? Number(form.condominium) : null,
        iptu: form.iptu ? Number(form.iptu) : null,
        area: form.area ? Number(form.area) : null,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : null,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : null,
        parkingSpaces: form.parkingSpaces ? Number(form.parkingSpaces) : null,
        description: form.description.trim() || null,
        postalCode: form.postalCode.trim() || null,
        address: form.address.trim() || null,
        number: form.number.trim() || null,
        complement: form.complement.trim() || null,
        neighborhood: form.neighborhood.trim() || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        latitude: Number(form.latitude),
        longitude: Number(form.longitude),
        contactName: form.contactName.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        phone: form.phone.trim() || null,
        images: form.images,
        video: form.video
          ? {
              url: form.video.url,
              duration: form.video.duration,
              thumbnail: form.video.thumbnail,
            }
          : null,
      };
      const url = isEdit
        ? `/api/properties/${editProperty!.id}`
        : "/api/properties";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error || "Erro ao salvar imóvel.");
      return d;
    },
    onSuccess: () => {
      toast.success(
        isEdit
          ? "Imóvel atualizado com sucesso!"
          : "Imóvel cadastrado! Aguardando aprovação."
      );
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["properties"] });
      onDone();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) {
      toast.error("Revise os campos obrigatórios.");
      return;
    }
    mutation.mutate();
  }

  const isCommercial =
    form.propertyType === "SHOP" || form.propertyType === "COMMERCIAL_ROOM";

  return (
    <form onSubmit={submit} className="space-y-5 pb-20">
      {/* Informações */}
      <Section title="Informações" eyebrow="Passo 1" icon={<Building2 className="w-4 h-4" />}>
        <Field label="Título" error={errors.title} required>
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Ex.: Apartamento 2 quartos no Centro"
            className="h-9 bg-card/60 border-border/60 focus-visible:border-primary"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Finalidade" error={errors.purpose} required>
            <Select value={form.purpose} onValueChange={(v) => set("purpose", v)}>
              <SelectTrigger className="w-full h-9 bg-card/60 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PURPOSES).map((p) => (
                  <SelectItem key={p} value={p}>
                    {PURPOSE_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tipo" error={errors.propertyType} required>
            <Select
              value={form.propertyType}
              onValueChange={(v) => set("propertyType", v)}
            >
              <SelectTrigger className="w-full h-9 bg-card/60 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.values(PROPERTY_TYPES).map((t) => (
                  <SelectItem key={t} value={t}>
                    {PROPERTY_TYPE_LABELS[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <Field
          label="Preço (R$)"
          error={errors.price}
          required
          hint={
            form.purpose === "RENT" ? "Valor mensal do aluguel" : "Valor de venda"
          }
        >
          <Input
            type="number"
            inputMode="decimal"
            min="0"
            step="0.01"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            placeholder="Ex.: 250000 ou 1500"
            className="h-9 bg-card/60 border-border/60 focus-visible:border-primary tabular-nums"
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Condomínio (R$)">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.condominium}
              onChange={(e) => set("condominium", e.target.value)}
              placeholder="0"
              className="h-9 bg-card/60 border-border/60 focus-visible:border-primary tabular-nums"
            />
          </Field>
          <Field label="IPTU (R$/ano)">
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.iptu}
              onChange={(e) => set("iptu", e.target.value)}
              placeholder="0"
              className="h-9 bg-card/60 border-border/60 focus-visible:border-primary tabular-nums"
            />
          </Field>
        </div>

        <div
          className={cn(
            "grid gap-3",
            isCommercial ? "grid-cols-2" : "grid-cols-3"
          )}
        >
          <Field label="Área (m²)">
            <Input
              type="number"
              min="0"
              step="0.1"
              value={form.area}
              onChange={(e) => set("area", e.target.value)}
              placeholder="0"
              className="h-9 bg-card/60 border-border/60 focus-visible:border-primary tabular-nums"
            />
          </Field>
          {!isCommercial && (
            <>
              <Field label="Quartos">
                <Input
                  type="number"
                  min="0"
                  value={form.bedrooms}
                  onChange={(e) => set("bedrooms", e.target.value)}
                  placeholder="0"
                  className="h-9 bg-card/60 border-border/60 focus-visible:border-primary tabular-nums"
                />
              </Field>
              <Field label="Banheiros">
                <Input
                  type="number"
                  min="0"
                  value={form.bathrooms}
                  onChange={(e) => set("bathrooms", e.target.value)}
                  placeholder="0"
                  className="h-9 bg-card/60 border-border/60 focus-visible:border-primary tabular-nums"
                />
              </Field>
            </>
          )}
        </div>

        <Field label="Vagas de garagem">
          <Input
            type="number"
            min="0"
            value={form.parkingSpaces}
            onChange={(e) => set("parkingSpaces", e.target.value)}
            placeholder="0"
            className="h-9 bg-card/60 border-border/60 focus-visible:border-primary tabular-nums"
          />
        </Field>
      </Section>

      {/* Localização */}
      <Section title="Localização" eyebrow="Passo 2" icon={<MapPin className="w-4 h-4" />}>
        <div className="relative">
          <Label className="eyebrow !text-[10px] text-muted-foreground/80">
            Buscar endereço (sugestões)
          </Label>
          <div className="relative mt-1.5">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={geoQuery}
              onChange={(e) => setGeoQuery(e.target.value)}
              onFocus={() => geoResults.length && setGeoOpen(true)}
              onBlur={() => {
                blurTimer.current = setTimeout(() => setGeoOpen(false), 180);
              }}
              placeholder="Endereço, bairro ou cidade"
              className="pl-9 pr-9 h-9 bg-card/60 border-border/60 focus-visible:border-primary"
            />
            {geoLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
            )}
          </div>
          {errors.location && (
            <p className="text-[11px] text-rose-400 mt-1">{errors.location}</p>
          )}
          {geoOpen && geoResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-popover border border-border/60 rounded-lg shadow-lg max-h-64 overflow-y-auto scroll-area">
              {geoResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onMouseDown={() => {
                    if (blurTimer.current) clearTimeout(blurTimer.current);
                    pickGeo(r);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-accent/60 flex items-start gap-2 border-b border-border/40 last:border-0"
                >
                  <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-sm font-medium clamp-1">
                      {r.displayName.split(",")[0]}
                    </div>
                    <div className="text-[11px] text-muted-foreground clamp-1">
                      {r.displayName.split(",").slice(1).join(",").trim()}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={autoGeocodeFromForm}
          disabled={autoGeoLoading}
          className="w-full h-9 border-primary/40 text-primary hover:bg-primary/10 hover:border-primary"
        >
          {autoGeoLoading ? (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          ) : (
            <Crosshair className="w-4 h-4 mr-1.5" />
          )}
          Buscar coordenadas automaticamente
        </Button>

        {form.latitude && form.longitude ? (
          <div className="flex items-center gap-2 text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-md px-3 py-2">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span className="tabular-nums">
              Lat: {Number(form.latitude).toFixed(5)}, Lng:{" "}
              {Number(form.longitude).toFixed(5)}
            </span>
          </div>
        ) : (
          <p className="text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/30 rounded-md px-3 py-2">
            Preencha o CEP ou o endereço abaixo e clique em &quot;Buscar
            coordenadas&quot;.
          </p>
        )}
        <p className="text-[11px] text-muted-foreground">
          O ponto é gerado a partir do endereço. Você pode ajustar depois.
        </p>

        <div className="grid grid-cols-3 gap-3">
          <Field label="CEP">
            <div className="relative">
              <Input
                value={form.postalCode}
                onChange={(e) => set("postalCode", e.target.value)}
                onBlur={(e) => {
                  const v = e.target.value;
                  if (v.replace(/\D/g, "").length === 8) {
                    void lookupCep(v);
                  }
                }}
                placeholder="00000-000"
                className="h-9 bg-card/60 border-border/60 focus-visible:border-primary tabular-nums pr-9"
                maxLength={9}
              />
              {cepLoading && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-primary" />
              )}
            </div>
          </Field>
          <Field label="Endereço" className="col-span-2">
            <Input
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Rua / Avenida"
              className="h-9 bg-card/60 border-border/60 focus-visible:border-primary"
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Número">
            <Input
              value={form.number}
              onChange={(e) => set("number", e.target.value)}
              className="h-9 bg-card/60 border-border/60 focus-visible:border-primary"
            />
          </Field>
          <Field label="Complemento">
            <Input
              value={form.complement}
              onChange={(e) => set("complement", e.target.value)}
              placeholder="Apto, bloco…"
              className="h-9 bg-card/60 border-border/60 focus-visible:border-primary"
            />
          </Field>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Bairro" className="col-span-2">
            <Input
              value={form.neighborhood}
              onChange={(e) => set("neighborhood", e.target.value)}
              className="h-9 bg-card/60 border-border/60 focus-visible:border-primary"
            />
          </Field>
          <Field label="Cidade">
            <Input
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
              className="h-9 bg-card/60 border-border/60 focus-visible:border-primary"
            />
          </Field>
        </div>
        <Field label="Estado (UF)">
          <Input
            value={form.state}
            maxLength={2}
            onChange={(e) => set("state", e.target.value.toUpperCase())}
            placeholder="MG"
            className="h-9 bg-card/60 border-border/60 focus-visible:border-primary uppercase"
          />
        </Field>
      </Section>

      {/* Conteúdo */}
      <Section title="Conteúdo" eyebrow="Passo 3" icon={<Images className="w-4 h-4" />}>
        <Field label="Descrição">
          <Textarea
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Descreva o imóvel, diferenciais, condições…"
            className="bg-card/60 border-border/60 focus-visible:border-primary"
          />
        </Field>

        <div>
          <Label className="eyebrow !text-[10px] text-muted-foreground/80">
            Fotos (JPG, PNG ou WebP — máx 8MB cada)
          </Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {form.images.map((url, i) => (
              <div
                key={i}
                className="relative w-20 h-20 rounded-lg overflow-hidden border bg-muted ring-1 ring-border/40 group"
              >
                <img
                  src={url}
                  alt={`Foto ${i + 1}`}
                  className="w-full h-full object-cover"
                />
                {i === 0 && (
                  <span className="absolute top-0.5 left-0.5 bg-primary text-primary-foreground text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm">
                    Capa
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  aria-label="Remover imagem"
                  className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white grid place-items-center hover:bg-black/80"
                >
                  <X className="w-3 h-3" />
                </button>
                <div className="absolute bottom-0 inset-x-0 flex justify-between px-1 py-0.5 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={() => moveImage(i, -1)}
                    disabled={i === 0}
                    aria-label="Mover para esquerda"
                    className="text-white disabled:opacity-30"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(i, 1)}
                    disabled={i === form.images.length - 1}
                    aria-label="Mover para direita"
                    className="text-white disabled:opacity-30"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
            <label
              className={cn(
                "w-20 h-20 rounded-lg border-2 border-dashed grid place-items-center cursor-pointer transition-all hover:border-primary hover:bg-primary/5 text-muted-foreground",
                uploading && "opacity-60 pointer-events-none"
              )}
            >
              {uploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              ) : (
                <div className="flex flex-col items-center gap-0.5">
                  <Upload className="w-4 h-4" />
                  <span className="text-[9px] font-medium">Enviar</span>
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                className="hidden"
                onChange={(e) => {
                  handleUpload(e.target.files);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">
            A primeira imagem é a foto de capa. Use as setas para reordenar.
          </p>
        </div>

        {/* Vídeo (até 30s) */}
        <div>
          <Label className="eyebrow !text-[10px] text-muted-foreground/80 flex items-center gap-1.5">
            <Video className="w-3 h-3" /> Vídeo (opcional, até {MAX_VIDEO_SECONDS}s)
          </Label>
          {form.video || videoPreview ? (
            <div className="mt-2 relative w-full max-w-xs aspect-video rounded-lg overflow-hidden border bg-muted ring-1 ring-border/40 group">
              <video
                src={videoPreview?.url || form.video?.url}
                poster={videoPreview?.thumbnail || form.video?.thumbnail || undefined}
                className="w-full h-full object-cover"
                controls
                playsInline
                preload="metadata"
              />
              <div className="absolute top-1.5 left-1.5 bg-foreground/80 text-background text-[9px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1">
                <PlayCircle className="w-3 h-3" />
                {(videoPreview?.duration ?? form.video?.duration ?? 0).toFixed(1)}s
              </div>
              <button
                type="button"
                onClick={removeVideo}
                aria-label="Remover vídeo"
                className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 text-white grid place-items-center hover:bg-black/90"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <label
              className={cn(
                "mt-2 w-full max-w-xs aspect-video rounded-lg border-2 border-dashed grid place-items-center cursor-pointer transition-all hover:border-primary hover:bg-primary/5 text-muted-foreground",
                uploadingVideo && "opacity-60 pointer-events-none"
              )}
            >
              {uploadingVideo ? (
                <div className="flex flex-col items-center gap-1.5">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <span className="text-[11px]">Enviando…</span>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1.5 py-4">
                  <Video className="w-6 h-6" />
                  <span className="text-xs font-medium">Enviar vídeo do computador</span>
                  <span className="text-[10px] text-muted-foreground/80">
                    MP4, WebM ou MOV · até {MAX_VIDEO_SECONDS}s · máx 50MB
                  </span>
                </div>
              )}
              <input
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                className="hidden"
                onChange={(e) => {
                  const f = e.currentTarget.files?.[0] || null;
                  void handleVideoUpload(f);
                  e.currentTarget.value = "";
                }}
              />
            </label>
          )}
          <p className="text-[11px] text-muted-foreground mt-1.5">
            Mostre o imóvel em movimento. Apenas um vídeo por anúncio.
          </p>
        </div>
      </Section>

      {/* Contato */}
      <Section title="Contato" eyebrow="Passo 4" icon={<UserRound className="w-4 h-4" />}>
        <Field label="Responsável">
          <Input
            value={form.contactName}
            onChange={(e) => set("contactName", e.target.value)}
            placeholder="Nome de quem atenderá o anúncio"
            className="h-9 bg-card/60 border-border/60 focus-visible:border-primary"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="WhatsApp">
            <Input
              value={form.whatsapp}
              onChange={(e) => set("whatsapp", e.target.value)}
              placeholder="(31) 9…"
              className="h-9 bg-card/60 border-border/60 focus-visible:border-primary tabular-nums"
            />
          </Field>
          <Field label="Telefone">
            <Input
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="(31) 3…"
              className="h-9 bg-card/60 border-border/60 focus-visible:border-primary tabular-nums"
            />
          </Field>
        </div>
      </Section>

      {/* Sticky footer */}
      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-background/95 backdrop-blur-md border-t border-border/60 flex items-center gap-2">
        <Button type="button" variant="ghost" onClick={onDone} className="hover:bg-muted">
          Cancelar
        </Button>
        <Button
          type="submit"
          className="ml-auto shadow-sm shadow-primary/20"
          disabled={mutation.isPending}
        >
          {mutation.isPending && (
            <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
          )}
          {isEdit ? "Salvar alterações" : "Cadastrar imóvel"}
        </Button>
      </div>
    </form>
  );
}

function Section({
  title,
  eyebrow,
  icon,
  children,
}: {
  title: string;
  eyebrow?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5">
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary grid place-items-center ring-1 ring-primary/25 shrink-0">
            {icon}
          </div>
        )}
        <div className="min-w-0">
          {eyebrow && (
            <div className="eyebrow !text-[10px] text-primary/80">{eyebrow}</div>
          )}
          <h3 className="text-sm font-semibold text-foreground tracking-tight">
            {title}
          </h3>
        </div>
      </div>
      <div className="space-y-3">{children}</div>
      <Separator />
    </div>
  );
}

function Field({
  label,
  error,
  required,
  hint,
  className,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <Label className="eyebrow !text-[10px] text-muted-foreground/80">
        {label}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </Label>
      <div className="mt-1.5">{children}</div>
      {hint && !error && (
        <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>
      )}
      {error && <p className="text-[11px] text-rose-400 mt-1">{error}</p>}
    </div>
  );
}
