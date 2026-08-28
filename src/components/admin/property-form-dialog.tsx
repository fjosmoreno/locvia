"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Home as HomeIcon,
  Loader2,
  MapPin,
  Tag,
  Sparkles,
  ImageIcon,
  Plus,
  X,
  Upload,
} from "lucide-react";
import {
  PROPERTY_TYPES,
  PURPOSES,
  PROPERTY_STATUS,
  PROPERTY_TYPE_LABELS,
} from "@/lib/constants";

const PURPOSE_LABELS: Record<string, string> = {
  RENT: "Alugar",
  SALE: "Comprar",
};

const STATUS_OPTIONS = [
  { value: PROPERTY_STATUS.ACTIVE, label: "Ativo (publicar agora)" },
  { value: PROPERTY_STATUS.PENDING_APPROVAL, label: "Aguardando aprovação" },
  { value: PROPERTY_STATUS.PAUSED, label: "Pausado" },
  { value: PROPERTY_STATUS.DRAFT, label: "Rascunho" },
];

const BADGE_OPTIONS = [
  { value: "none", label: "Sem selo" },
  { value: "OFFER", label: "Oferta" },
  { value: "RECOMMENDED", label: "Recomendado" },
];

// Subset que o form precisa pra editar (vem do GET /api/admin/properties/[id])
export interface EditableProperty {
  id: string;
  title: string;
  description: string | null;
  purpose: string;
  propertyType: string;
  price: number;
  condominium: number | null;
  iptu: number | null;
  area: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  parkingSpaces: number | null;
  address: string | null;
  number: string | null;
  complement: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: number;
  longitude: number;
  contactName: string | null;
  whatsapp: string | null;
  phone: string | null;
  status: string;
  featured: boolean;
  badge: string | null;
  images: { id: string; url: string }[];
  agencyId: string | null;
  ownerId: string | null;
  brokerId: string | null;
}

export interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (property: { id: string; title: string }) => void;
  onUpdated?: (property: { id: string; title: string }) => void;
  /** Quando definido, o dialog entra em modo de edição. */
  editProperty?: EditableProperty | null;
}

interface AdminAgency {
  id: string;
  name: string;
  status: string;
}
interface AdminOwner {
  id: string;
  verificationStatus: string;
  user: { id: string; name: string; email: string };
}

function formatPhone(value: string): string {
  const v = value.replace(/\D/g, "").slice(0, 11);
  if (v.length <= 2) return v ? `(${v}` : "";
  if (v.length <= 6) return `(${v.slice(0, 2)}) ${v.slice(2)}`;
  if (v.length <= 10) return `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
  return `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
}

function formatCEP(value: string): string {
  const v = value.replace(/\D/g, "").slice(0, 8);
  if (v.length <= 5) return v;
  return `${v.slice(0, 5)}-${v.slice(5)}`;
}

export function PropertyFormDialog({
  open,
  onOpenChange,
  onCreated,
  onUpdated,
  editProperty,
}: PropertyFormDialogProps) {
  const isEdit = !!editProperty;
  const [submitting, setSubmitting] = React.useState(false);

  // ===== Dados básicos =====
  const [title, setTitle] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [purpose, setPurpose] = React.useState<string>(PURPOSES.RENT);
  const [propertyType, setPropertyType] = React.useState<string>(PROPERTY_TYPES.APARTMENT);
  const [price, setPrice] = React.useState("");
  const [condominium, setCondominium] = React.useState("");
  const [iptu, setIptu] = React.useState("");

  // ===== Características =====
  const [area, setArea] = React.useState("");
  const [bedrooms, setBedrooms] = React.useState("");
  const [bathrooms, setBathrooms] = React.useState("");
  const [parkingSpaces, setParkingSpaces] = React.useState("");

  // ===== Endereço =====
  const [address, setAddress] = React.useState("");
  const [number, setNumber] = React.useState("");
  const [complement, setComplement] = React.useState("");
  const [neighborhood, setNeighborhood] = React.useState("");
  const [city, setCity] = React.useState("");
  const [state, setState] = React.useState("");
  const [postalCode, setPostalCode] = React.useState("");
  const [latitude, setLatitude] = React.useState("");
  const [longitude, setLongitude] = React.useState("");

  // ===== Anunciante =====
  const [agencyId, setAgencyId] = React.useState("");
  const [ownerId, setOwnerId] = React.useState("");

  // ===== Contato =====
  const [contactName, setContactName] = React.useState("");
  const [whatsapp, setWhatsapp] = React.useState("");
  const [phone, setPhone] = React.useState("");

  // ===== Publicação =====
  const [status, setStatus] = React.useState<string>(PROPERTY_STATUS.ACTIVE);
  const [featured, setFeatured] = React.useState(false);
  const [badge, setBadge] = React.useState("");

  // ===== Imagens =====
  const [imageUrls, setImageUrls] = React.useState<string[]>([""]);
  const [uploadingImage, setUploadingImage] = React.useState(false);

  // ===== Pre-fill ao abrir modo de edição =====
  React.useEffect(() => {
    if (!open) return;
    if (editProperty) {
      const p = editProperty;
      setTitle(p.title ?? "");
      setDescription(p.description ?? "");
      setPurpose(p.purpose ?? PURPOSES.RENT);
      setPropertyType(p.propertyType ?? PROPERTY_TYPES.APARTMENT);
      setPrice(p.price != null ? String(p.price) : "");
      setCondominium(p.condominium != null ? String(p.condominium) : "");
      setIptu(p.iptu != null ? String(p.iptu) : "");
      setArea(p.area != null ? String(p.area) : "");
      setBedrooms(p.bedrooms != null ? String(p.bedrooms) : "");
      setBathrooms(p.bathrooms != null ? String(p.bathrooms) : "");
      setParkingSpaces(p.parkingSpaces != null ? String(p.parkingSpaces) : "");
      setAddress(p.address ?? "");
      setNumber(p.number ?? "");
      setComplement(p.complement ?? "");
      setNeighborhood(p.neighborhood ?? "");
      setCity(p.city ?? "");
      setState(p.state ?? "");
      setPostalCode(p.postalCode ?? "");
      setLatitude(p.latitude != null ? String(p.latitude) : "");
      setLongitude(p.longitude != null ? String(p.longitude) : "");
      setAgencyId(p.agencyId ?? "");
      setOwnerId(p.ownerId ?? "");
      setContactName(p.contactName ?? "");
      setWhatsapp(p.whatsapp ?? "");
      setPhone(p.phone ?? "");
      setStatus(p.status ?? PROPERTY_STATUS.ACTIVE);
      setFeatured(Boolean(p.featured));
      setBadge(p.badge ?? "");
      const imgs = p.images?.length ? p.images.map((i) => i.url) : [""];
      setImageUrls(imgs);
    }
    // Quando abre em modo CREATE, limpa o form
  }, [open, editProperty]);

  // ===== Listas =====
  const agenciesQ = useQuery<{ agencies: AdminAgency[] }>({
    queryKey: ["admin", "agencies", "all-for-picker"],
    enabled: open,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await fetch("/api/admin/agencies");
      if (!res.ok) throw new Error("Falha ao listar imobiliárias");
      return res.json();
    },
  });
  const ownersQ = useQuery<{ owners: AdminOwner[] }>({
    queryKey: ["admin", "owners", "all-for-picker"],
    enabled: open,
    staleTime: 30_000,
    queryFn: async () => {
      const res = await fetch("/api/admin/owners");
      if (!res.ok) throw new Error("Falha ao listar proprietários");
      return res.json();
    },
  });

  function reset() {
    setTitle(""); setDescription(""); setPurpose(PURPOSES.RENT);
    setPropertyType(PROPERTY_TYPES.APARTMENT); setPrice(""); setCondominium(""); setIptu("");
    setArea(""); setBedrooms(""); setBathrooms(""); setParkingSpaces("");
    setAddress(""); setNumber(""); setComplement(""); setNeighborhood("");
    setCity(""); setState(""); setPostalCode(""); setLatitude(""); setLongitude("");
    setAgencyId(""); setOwnerId("");
    setContactName(""); setWhatsapp(""); setPhone("");
    setStatus(PROPERTY_STATUS.ACTIVE); setFeatured(false); setBadge("");
    setImageUrls([""]);
  }

  function handleClose(o: boolean) {
    if (submitting) return;
    if (!o) reset();
    onOpenChange(o);
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files || !files.length) return;
    setUploadingImage(true);
    try {
      const valid: File[] = [];
      for (const f of Array.from(files)) {
        if (!["image/jpeg", "image/png", "image/webp", "image/jpg"].includes(f.type)) {
          toast.error(`${f.name}: formato não suportado. Use JPG, PNG ou WebP.`);
          continue;
        }
        if (f.size > 8 * 1024 * 1024) {
          toast.error(`${f.name}: excede 8MB.`);
          continue;
        }
        valid.push(f);
      }
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
        setImageUrls((prev) => {
          const next = [...prev];
          // substitui o primeiro slot vazio se houver
          const emptyIdx = next.findIndex((u) => !u);
          if (emptyIdx >= 0) next[emptyIdx] = uploaded[0];
          else next.push(...uploaded);
          if (uploaded.length > 1) next.push(...uploaded.slice(1));
          return next;
        });
        toast.success(uploaded.length === 1 ? "Imagem enviada." : `${uploaded.length} imagens enviadas.`);
      }
    } finally {
      setUploadingImage(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!title.trim() || !price) {
      toast.error("Preencha título e preço.");
      return;
    }
    if (!isEdit && !agencyId && !ownerId) {
      toast.error("Vincule a uma imobiliária ou proprietário.");
      return;
    }
    const priceNum = Number(price.replace(/\D/g, ""));
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      toast.error("Preço inválido.");
      return;
    }
    if (isEdit) {
      if (!latitude || !longitude) {
        toast.error("Latitude e longitude são obrigatórias na edição.");
        return;
      }
    }

    const cleanedImages = imageUrls.map((u) => u.trim()).filter(Boolean);

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description || null,
        purpose,
        propertyType,
        price: priceNum,
        condominium: condominium ? Number(condominium.replace(/\D/g, "")) : null,
        iptu: iptu ? Number(iptu.replace(/\D/g, "")) : null,
        area: area ? Number(area.replace(",", ".")) : null,
        bedrooms: bedrooms ? Number(bedrooms) : null,
        bathrooms: bathrooms ? Number(bathrooms) : null,
        parkingSpaces: parkingSpaces ? Number(parkingSpaces) : null,
        address: address || null,
        number: number || null,
        complement: complement || null,
        neighborhood: neighborhood || null,
        city: city || null,
        state: state || null,
        postalCode: postalCode.replace(/\D/g, "") || null,
        latitude: latitude ? Number(latitude.replace(",", ".")) : undefined,
        longitude: longitude ? Number(longitude.replace(",", ".")) : undefined,
        contactName: contactName || null,
        whatsapp: whatsapp || null,
        phone: phone || null,
        status,
        featured,
        badge: badge && badge !== "none" ? badge : null,
      };
      if (!isEdit) {
        body.images = cleanedImages.length ? cleanedImages : undefined;
      } else {
        // Em edição, só envia images se houver ao menos uma URL (PUT substitui todas)
        if (cleanedImages.length) body.images = cleanedImages;
      }
      // anunciante — prioridade: imobiliária, depois proprietário
      if (agencyId) body.agencyId = agencyId;
      else if (ownerId) body.ownerId = ownerId;

      const url = isEdit
        ? `/api/admin/properties/${editProperty!.id}`
        : "/api/admin/properties";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || (isEdit ? "Falha ao atualizar imóvel." : "Falha ao cadastrar imóvel."));
        return;
      }
      if (isEdit) {
        toast.success(`"${data.property.title}" atualizado.`);
        onUpdated?.({ id: data.property.id, title: data.property.title });
      } else {
        toast.success(`"${data.property.title}" cadastrado.`, {
          description: status === PROPERTY_STATUS.ACTIVE
            ? "Imóvel já está no ar."
            : `Status: ${status}.`,
        });
        onCreated?.({ id: data.property.id, title: data.property.title });
      }
      reset();
      onOpenChange(false);
    } catch {
      toast.error("Erro de rede. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[92vh] overflow-y-auto scroll-area p-0">
        <DialogHeader className="px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 text-primary grid place-items-center ring-1 ring-primary/25">
              <HomeIcon className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base tracking-tight">
                {isEdit ? "Editar imóvel" : "Cadastrar imóvel"}
              </DialogTitle>
              <DialogDescription className="text-xs">
                {isEdit
                  ? "Atualize qualquer campo do anúncio — incluindo endereço, lat/lng, fotos e status."
                  : "Cria o anúncio vinculado a uma imobiliária ou proprietário. Status padrão: ativo."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={submit} className="px-5 py-4 space-y-5">
          {/* === DADOS BÁSICOS === */}
          <Section title="Dados básicos" icon={<Tag className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Título do anúncio" required className="sm:col-span-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex.: Apartamento 2 quartos na Savassi"
                  required
                />
              </Field>
              <Field label="Finalidade" required>
                <Select value={purpose} onValueChange={setPurpose}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PURPOSES.RENT}>{PURPOSE_LABELS.RENT}</SelectItem>
                    <SelectItem value={PURPOSES.SALE}>{PURPOSE_LABELS.SALE}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Tipo de imóvel" required>
                <Select value={propertyType} onValueChange={setPropertyType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.values(PROPERTY_TYPES).map((t) => (
                      <SelectItem key={t} value={t}>
                        {PROPERTY_TYPE_LABELS[t] || t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Preço (R$)" required>
                <Input
                  inputMode="numeric"
                  value={price}
                  onChange={(e) => setPrice(e.target.value.replace(/\D/g, ""))}
                  placeholder="350000"
                  required
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {purpose === PURPOSES.RENT ? "Valor mensal" : "Valor de venda"}
                </p>
              </Field>
              <Field label="Condomínio (R$)">
                <Input
                  inputMode="numeric"
                  value={condominium}
                  onChange={(e) => setCondominium(e.target.value.replace(/\D/g, ""))}
                  placeholder="850"
                />
              </Field>
              <Field label="IPTU anual (R$)">
                <Input
                  inputMode="numeric"
                  value={iptu}
                  onChange={(e) => setIptu(e.target.value.replace(/\D/g, ""))}
                  placeholder="1200"
                />
              </Field>
              <Field label="Descrição" className="sm:col-span-2">
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detalhes do imóvel: andar, vista, mobília, condições…"
                  rows={3}
                />
              </Field>
            </div>
          </Section>

          {/* === CARACTERÍSTICAS === */}
          <Section title="Características" icon={<Sparkles className="w-3.5 h-3.5" />}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Área (m²)">
                <Input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="68"
                />
              </Field>
              <Field label="Quartos">
                <Input
                  inputMode="numeric"
                  value={bedrooms}
                  onChange={(e) => setBedrooms(e.target.value.replace(/\D/g, ""))}
                  placeholder="2"
                />
              </Field>
              <Field label="Banheiros">
                <Input
                  inputMode="numeric"
                  value={bathrooms}
                  onChange={(e) => setBathrooms(e.target.value.replace(/\D/g, ""))}
                  placeholder="1"
                />
              </Field>
              <Field label="Vagas">
                <Input
                  inputMode="numeric"
                  value={parkingSpaces}
                  onChange={(e) => setParkingSpaces(e.target.value.replace(/\D/g, ""))}
                  placeholder="1"
                />
              </Field>
            </div>
          </Section>

          {/* === ENDEREÇO === */}
          <Section
            title="Localização"
            icon={<MapPin className="w-3.5 h-3.5" />}
            hint="Sem lat/lng, o sistema tenta geocodificar o endereço."
          >
            <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
              <Field label="CEP" className="sm:col-span-2">
                <Input
                  value={postalCode}
                  onChange={(e) => setPostalCode(formatCEP(e.target.value))}
                  placeholder="30130-000"
                />
              </Field>
              <Field label="Estado" className="sm:col-span-1">
                <Input
                  value={state}
                  onChange={(e) => setState(e.target.value.toUpperCase().slice(0, 2))}
                  placeholder="MG"
                />
              </Field>
              <Field label="Cidade" className="sm:col-span-3">
                <Input
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Belo Horizonte"
                />
              </Field>
              <Field label="Bairro" className="sm:col-span-3">
                <Input
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  placeholder="Savassi"
                />
              </Field>
              <Field label="Rua" className="sm:col-span-4">
                <Input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Rua Pernambuco"
                />
              </Field>
              <Field label="Número" className="sm:col-span-1">
                <Input
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  placeholder="1000"
                />
              </Field>
              <Field label="Complemento" className="sm:col-span-2">
                <Input
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                  placeholder="Apto 302"
                />
              </Field>
              <Field label="Latitude" className="sm:col-span-1">
                <Input
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  placeholder="-19.92"
                />
              </Field>
              <Field label="Longitude" className="sm:col-span-1">
                <Input
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  placeholder="-43.93"
                />
              </Field>
            </div>
          </Section>

          {/* === ANUNCIANTE — só no CREATE (na edição exibimos o atual) === */}
          {!isEdit && (
            <Section title="Anunciante" icon={<HomeIcon className="w-3.5 h-3.5" />}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Imobiliária" hint={agencyId ? "Selecionada — prioridade" : undefined}>
                  <Select
                    value={agencyId || "none"}
                    onValueChange={(v) => {
                      setAgencyId(v === "none" ? "" : v);
                      if (v !== "none") setOwnerId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar imobiliária" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Nenhuma —</SelectItem>
                      {agenciesQ.data?.agencies
                        ?.filter((a) => a.status === "APPROVED")
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Proprietário" hint={ownerId ? "Selecionado" : undefined}>
                  <Select
                    value={ownerId || "none"}
                    onValueChange={(v) => {
                      setOwnerId(v === "none" ? "" : v);
                      if (v !== "none") setAgencyId("");
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar proprietário" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">— Nenhum —</SelectItem>
                      {ownersQ.data?.owners
                        ?.filter((o) => o.verificationStatus === "VERIFIED")
                        .map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.user.name} ({o.user.email})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                Vincule a <strong>uma</strong> imobiliária ou <strong>um</strong> proprietário.
                Se ambos preenchidos, a imobiliária tem prioridade.
              </p>
            </Section>
          )}

          {/* === CONTATO === */}
          <Section title="Contato do anúncio">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Nome de contato">
                <Input
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Nome exibido nos leads"
                />
              </Field>
              <Field label="WhatsApp">
                <Input
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                  placeholder="(31) 99999-9999"
                />
              </Field>
              <Field label="Telefone">
                <Input
                  value={phone}
                  onChange={(e) => setPhone(formatPhone(e.target.value))}
                  placeholder="(31) 3000-0000"
                />
              </Field>
            </div>
          </Section>

          {/* === IMAGENS (com upload) === */}
          <Section
            title="Imagens"
            icon={<ImageIcon className="w-3.5 h-3.5" />}
            hint={isEdit ? "Adicionar novas ou substituir. A primeira vira a capa." : "Faça upload (JPG/PNG/WebP até 8MB) ou cole URLs."}
          >
            <div className="space-y-2">
              {imageUrls.map((url, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  {url ? (
                    <div className="relative w-12 h-12 rounded-md overflow-hidden border border-border/60 shrink-0 bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute bottom-0 inset-x-0 bg-primary/85 text-primary-foreground text-[8px] font-bold text-center py-0.5">
                          CAPA
                        </span>
                      )}
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-md border border-dashed border-border/60 grid place-items-center shrink-0 text-muted-foreground/60">
                      <ImageIcon className="w-3.5 h-3.5" />
                    </div>
                  )}
                  <Input
                    value={url}
                    onChange={(e) => {
                      const next = [...imageUrls];
                      next[i] = e.target.value;
                      setImageUrls(next);
                    }}
                    placeholder={`https://... (imagem ${i + 1})`}
                    className="flex-1"
                  />
                  {imageUrls.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => setImageUrls(imageUrls.filter((_, idx) => idx !== i))}
                      className="shrink-0"
                      title="Remover"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setImageUrls([...imageUrls, ""])}
                  className="gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Adicionar URL
                </Button>
                <label
                  className={
                    "inline-flex items-center gap-1.5 rounded-md text-xs font-medium h-8 px-3 border border-border/60 bg-background hover:bg-accent cursor-pointer transition-colors " +
                    (uploadingImage ? "opacity-60 pointer-events-none" : "")
                  }
                >
                  {uploadingImage ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Upload className="w-3.5 h-3.5" />
                  )}
                  Enviar do computador
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleImageUpload(e.target.files);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
            </div>
          </Section>

          {/* === PUBLICAÇÃO === */}
          <Section title="Publicação">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Field label="Status">
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Selo">
                <Select value={badge || "none"} onValueChange={setBadge}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {BADGE_OPTIONS.map((b) => (
                      <SelectItem key={b.value} value={b.value}>
                        {b.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Destaque">
                <Select
                  value={featured ? "1" : "0"}
                  onValueChange={(v) => setFeatured(v === "1")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Normal</SelectItem>
                    <SelectItem value="1">Destacar na vitrine</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Section>

          <DialogFooter className="px-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <HomeIcon className="w-4 h-4" />
              )}
              {isEdit ? "Salvar alterações" : "Cadastrar imóvel"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  icon,
  hint,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card/40 p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
          {icon}
          {title}
        </div>
        {hint && (
          <span className="text-[11px] text-muted-foreground/80 font-normal normal-case tracking-normal">
            {hint}
          </span>
        )}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  required,
  hint,
  children,
  className = "",
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`space-y-1.5 ${className}`}>
      <Label className="text-xs font-medium text-foreground/80">
        {label}
        {required && <span className="text-rose-400 ml-0.5">*</span>}
        {hint && (
          <span className="text-[10px] text-muted-foreground ml-1.5 font-normal">{hint}</span>
        )}
      </Label>
      {children}
    </div>
  );
}
