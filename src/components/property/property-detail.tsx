"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  MapPin,
  BedDouble,
  Bath,
  Car,
  Maximize,
  BadgeCheck,
  MessageCircle,
  Phone,
  Heart,
  Share2,
  Navigation,
  Flag,
  Building2,
  User,
  Clock,
  ShieldCheck,
  Star,
  Eye,
  Sparkles,
  Tag,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { PropertyGallery } from "@/components/property/property-gallery";
import { useUI } from "@/lib/store";
import { useFavorite, useLead } from "@/hooks/use-favorite";
import { formatPrice, formatDistance, formatRelativeTime } from "@/lib/geo";
import { whatsappLink, directionsUrl } from "@/lib/geocode";
import { PROPERTY_TYPE_LABELS, PURPOSE_LABELS } from "@/lib/constants";
import type { Property } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// =================================================================
//  MINI-MAPA — grid 3x3 de tiles dark, com marcador foreground
// =================================================================
function tileCoords(lat: number, lng: number, z: number) {
  const n = Math.pow(2, z);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  );
  return { x, y, z };
}

function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const z = 15;
  const { x, y } = tileCoords(lat, lng, z);
  const tiles: { dx: number; dy: number }[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) tiles.push({ dx, dy });
  return (
    <div className="relative w-full aspect-[16/8] rounded-2xl overflow-hidden border border-border bg-[#0c1424]">
      <div className="grid grid-cols-3 grid-rows-3 w-[300%] h-[300%] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {tiles.map(({ dx, dy }) => {
          const sub = ["a", "b", "c", "d"][Math.abs((x + dx + y + dy) % 4)];
          // CARTO dark tiles — integra com o navy do tema
          const url = `https://${sub}.basemaps.cartocdn.com/dark_all/${z}/${x + dx}/${y + dy}.png`;
          return (
            <img
              key={`${dx}-${dy}`}
              src={url}
              alt=""
              className="w-full h-full object-cover"
              loading="lazy"
            />
          );
        })}
      </div>
      {/* Halo glow sob o marcador */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full w-16 h-16 rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, oklch(0.78 0.15 220 / 0.35) 0%, transparent 70%)",
        }}
      />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <div className="w-9 h-9 rounded-full bg-primary border-[3px] border-white shadow-[0_4px_14px_rgba(0,0,0,0.55),0_0_18px_oklch(0.78_0.15_220)] grid place-items-center">
          <MapPin className="w-4 h-4 text-primary-foreground" strokeWidth={2.6} />
        </div>
      </div>
      {/* Vignette sutil para integrar com o navy */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, transparent 50%, rgba(11,17,32,0.45) 100%)",
        }}
      />
    </div>
  );
}

// =================================================================
//  HELPERS DE PREÇO
// =================================================================
function formatPriceValue(value: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

// =================================================================
//  PROPERTY DETAIL — AAA
// =================================================================
export function PropertyDetail({ propertyId }: { propertyId: string }) {
  const {
    closeProperty,
    openReport,
    flyTo,
    userLocation,
    selectedProperty,
  } = useUI();
  const { isFavorited, toggle } = useFavorite(propertyId);
  const lead = useLead();
  const [copied, setCopied] = useState(false);
  const [bounce, setBounce] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Detecta scroll no container do detalhe para aplicar shadow no header
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    function onScroll() {
      setScrolled(el.scrollTop > 8);
    }
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const { data, isLoading } = useQuery<Property>({
    queryKey: ["property", propertyId],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (userLocation) {
        params.set("originLat", String(userLocation.lat));
        params.set("originLng", String(userLocation.lng));
      }
      const res = await fetch(`/api/properties/${propertyId}?${params}`);
      if (!res.ok) throw new Error("not found");
      const d = await res.json();
      return d.property;
    },
    enabled: !selectedProperty || selectedProperty.id !== propertyId,
    initialData: selectedProperty?.id === propertyId ? selectedProperty : undefined,
  });

  const p = data || selectedProperty;

  useEffect(() => {
    if (p) flyTo(p.latitude, p.longitude, 16);
  }, [p?.id]);

  if (isLoading && !p) {
    return (
      <div className="flex flex-col h-full bg-background">
        <div className="glass-surface border-b border-border/60 px-3 py-2.5 flex items-center gap-2">
          <Skeleton className="h-9 w-9 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-3.5 w-3/4" />
          </div>
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <div className="p-4 space-y-3">
          <div className="aspect-[16/10] w-full skeleton-premium rounded-[20px]" />
          <Skeleton className="h-9 w-1/2 rounded-lg" />
          <Skeleton className="h-4 w-3/4 rounded" />
          <div className="grid grid-cols-4 gap-2.5 pt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Imóvel indisponível.</p>
        <Button
          variant="outline"
          size="sm"
          className="mt-3"
          onClick={closeProperty}
        >
          Voltar
        </Button>
      </div>
    );
  }

  const dist = p.distance;
  const advertiser = p.advertiser;
  const totalMonthly =
    p.purpose === "RENT"
      ? p.price + (p.condominium || 0) + (p.iptu || 0) / 12
      : null;

  function handleFav() {
    if (!isFavorited) {
      setBounce(true);
      setTimeout(() => setBounce(false), 450);
    }
    toggle();
  }
  function trackLead(source: string) {
    lead.mutate({ propertyId: p!.id, source });
  }
  function handleWhatsapp() {
    trackLead("WHATSAPP");
    const msg = `Olá! Tenho interesse no imóvel "${p!.title}" (${formatPrice(
      p!.price,
      p!.purpose
    )}) visto no LOCVIA.`;
    window.open(whatsappLink(p!.whatsapp || p!.phone || "", msg), "_blank");
  }
  function handlePhone() {
    trackLead("PHONE");
    window.location.href = `tel:${(p!.phone || p!.whatsapp || "").replace(/\D/g, "")}`;
  }
  function handleInterest() {
    trackLead("INTEREST");
    toast.success("Interesse registrado! O anunciante será avisado.", {
      duration: 2500,
    });
  }
  function handleDirections() {
    trackLead("DIRECTIONS");
    const dest = { lat: p!.latitude, lng: p!.longitude };
    window.open(directionsUrl(dest, userLocation || undefined), "_blank");
  }
  async function handleShare() {
    trackLead("SHARE");
    const url = `${window.location.origin}/?imovel=${p!.id}`;
    try {
      if (navigator.share) {
        await navigator.share({
          title: p!.title,
          text: `${p!.title} — ${formatPrice(p!.price, p!.purpose)}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        toast.success("Link copiado!", { duration: 1800 });
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      /* cancelled */
    }
  }

  const advertiserTypeLabel =
    advertiser?.type === "AGENCY"
      ? "Imobiliária"
      : advertiser?.type === "BROKER"
      ? "Corretor"
      : "Proprietário";

  return (
    <div className="flex flex-col h-full bg-background">
      {/* ===== HEADER STICKY GLASS ===== */}
      <div
        className={cn(
          "sticky top-0 z-20 glass-surface border-b transition-shadow duration-200 px-3 py-2.5 flex items-center gap-2.5",
          scrolled
            ? "border-border/60 shadow-[0_4px_20px_rgba(0,0,0,0.35)]"
            : "border-transparent"
        )}
      >
        <button
          onClick={closeProperty}
          className="w-9 h-9 grid place-items-center rounded-full hover:bg-accent transition-colors shrink-0 group"
          aria-label="Voltar ao mapa"
        >
          <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-0.5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="eyebrow">
            {PROPERTY_TYPE_LABELS[p.propertyType]} · {PURPOSE_LABELS[p.purpose]}
          </div>
          <div className="text-sm font-semibold text-foreground clamp-1 -mt-0.5">
            {p.title}
          </div>
        </div>
        <button
          onClick={handleFav}
          className={cn(
            "w-9 h-9 grid place-items-center rounded-full hover:bg-accent transition-colors shrink-0",
            bounce && "animate-fav-bounce"
          )}
          aria-label={isFavorited ? "Remover dos favoritos" : "Favoritar"}
          aria-pressed={isFavorited}
        >
          <Heart
            className={cn(
              "w-5 h-5 transition-colors",
              isFavorited
                ? "fill-rose-500 text-rose-500"
                : "text-muted-foreground hover:text-foreground"
            )}
          />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-area" ref={scrollRef}>
        {/* ===== GALERIA (com badges overlay) ===== */}
        <div className="p-4 pb-3">
          <div className="relative">
            <PropertyGallery images={p.images} alt={p.title} />
            {/* Badges overlay sobre a galeria */}
            {(p.featured || p.badge === "OFFER" || p.badge === "RECOMMENDED") && (
              <div className="absolute top-7 left-7 z-10 flex flex-col gap-1.5 pointer-events-none">
                {p.featured && (
                  <span className="img-badge featured shadow-lg">
                    <Star className="w-2.5 h-2.5 fill-current" /> Destaque
                  </span>
                )}
                {p.badge === "OFFER" && (
                  <span className="img-badge offer shadow-lg">
                    <Tag className="w-2.5 h-2.5" /> Oferta
                  </span>
                )}
                {p.badge === "RECOMMENDED" && (
                  <span className="img-badge recommended shadow-lg">
                    <Sparkles className="w-2.5 h-2.5" /> Recomendado
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ===== BLOCO PREÇO + LOCALIZAÇÃO (protagonista) ===== */}
        <div className="px-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-1.5">
                <span className="price text-3xl font-bold text-foreground leading-none tracking-tight">
                  {formatPriceValue(p.price)}
                </span>
                {p.purpose === "RENT" && (
                  <span className="text-sm font-medium text-muted-foreground">
                    /mês
                  </span>
                )}
              </div>
            </div>
            {dist != null && (
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold border border-primary/20">
                <Navigation className="w-3.5 h-3.5" strokeWidth={2.4} />
                {formatDistance(dist)}
              </div>
            )}
          </div>

          <h1 className="text-base font-semibold text-foreground mt-3 clamp-2 leading-snug">
            {p.title}
          </h1>
          <div className="text-sm text-muted-foreground mt-1.5 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/70" />
            <span className="clamp-1">
              {p.address && p.number ? `${p.address}, ${p.number} · ` : ""}
              {p.neighborhood} — {p.city}/{p.state}
            </span>
          </div>
        </div>

        {/* ===== FEATURES GRID ===== */}
        <div className="px-4 pb-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Feature
              icon={<Maximize className="w-4 h-4" />}
              label="Área"
              value={p.area ? `${p.area} m²` : "—"}
            />
            <Feature
              icon={<BedDouble className="w-4 h-4" />}
              label="Quartos"
              value={p.bedrooms != null ? String(p.bedrooms) : "—"}
            />
            <Feature
              icon={<Bath className="w-4 h-4" />}
              label="Banheiros"
              value={p.bathrooms != null ? String(p.bathrooms) : "—"}
            />
            <Feature
              icon={<Car className="w-4 h-4" />}
              label="Vagas"
              value={p.parkingSpaces != null ? String(p.parkingSpaces) : "—"}
            />
          </div>
        </div>

        <Separator />

        {/* ===== CUSTOS ===== */}
        <div className="px-4 py-5">
          <h3 className="eyebrow mb-3.5">Custos</h3>
          <div className="space-y-3">
            <CostRow
              label={p.purpose === "RENT" ? "Aluguel" : "Preço"}
              value={formatPriceValue(p.price)}
              strong
            />
            {p.condominium != null && (
              <CostRow label="Condomínio" value={formatPriceValue(p.condominium)} />
            )}
            {p.iptu != null && (
              <CostRow label="IPTU (anual)" value={formatPriceValue(p.iptu)} />
            )}
            {totalMonthly != null && (
              <div className="pt-3 mt-1 border-t border-dashed border-border flex items-center justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Total mensal estimado
                  </div>
                  <div className="text-[10px] text-muted-foreground/70 mt-0.5">
                    Aluguel + Condomínio + IPTU/12
                  </div>
                </div>
                <span className="price text-lg font-bold text-primary leading-none">
                  {formatPriceValue(totalMonthly)}
                </span>
              </div>
            )}
          </div>
        </div>

        {p.description && (
          <>
            <Separator />
            {/* ===== DESCRIÇÃO ===== */}
            <div className="px-4 py-5">
              <h3 className="eyebrow mb-3.5">Descrição</h3>
              <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">
                {p.description}
              </p>
            </div>
          </>
        )}

        <Separator />

        {/* ===== LOCALIZAÇÃO (mini-mapa) ===== */}
        <div className="px-4 py-5">
          <h3 className="eyebrow mb-3.5">Localização</h3>
          <div className="relative group">
            <MiniMap lat={p.latitude} lng={p.longitude} />
            <button
              onClick={handleDirections}
              className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 h-9 px-3.5 rounded-xl bg-foreground text-background text-xs font-semibold shadow-lg hover:scale-[1.03] active:scale-95 transition-transform"
            >
              <Navigation className="w-3.5 h-3.5" strokeWidth={2.4} />
              Como chegar
            </button>
          </div>
          <div className="text-xs text-muted-foreground mt-2.5 flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-primary/70" />
            {p.neighborhood} — {p.city}/{p.state}
          </div>
        </div>

        <Separator />

        {/* ===== ANUNCIANTE ===== */}
        {advertiser && (
          <div className="px-4 py-5">
            <h3 className="eyebrow mb-3.5">Anunciante</h3>
            <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 grid place-items-center text-primary shrink-0 overflow-hidden border border-primary/15">
                {advertiser.logoUrl ? (
                  <img
                    src={advertiser.logoUrl}
                    alt={advertiser.name}
                    className="w-full h-full object-cover"
                  />
                ) : advertiser.type === "AGENCY" ? (
                  <Building2 className="w-5 h-5" strokeWidth={2} />
                ) : (
                  <User className="w-5 h-5" strokeWidth={2} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground truncate">
                    {advertiser.name}
                  </span>
                  {advertiser.verified && (
                    <span className="inline-flex items-center gap-0.5 px-1.5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold shrink-0 border border-primary/25">
                      <BadgeCheck className="w-3 h-3" strokeWidth={2.4} />
                      Verificado
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  {advertiserTypeLabel}
                </div>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* ===== METADADOS ===== */}
        <div className="px-4 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> {formatRelativeTime(p.lastConfirmedAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <Eye className="w-3 h-3" /> {p.views} visualizações
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3" /> Anúncio verificado LOCVIA
          </span>
        </div>

        <div className="h-44" />
      </div>

      {/* ===== STICKY ACTION BAR (inferior) ===== */}
      <div className="border-t border-border bg-card/95 backdrop-blur-xl p-3 space-y-2.5">
        {/* CTAs principais */}
        <div className="flex gap-2">
          {p.whatsapp && (
            <Button
              onClick={handleWhatsapp}
              className="flex-1 h-12 bg-foreground hover:bg-foreground/90 active:scale-[0.98] text-background rounded-xl gap-2 font-semibold shadow-md transition-transform"
            >
              <MessageCircle className="w-4 h-4 fill-current" strokeWidth={2.4} />
              Conversar no WhatsApp
            </Button>
          )}
          {p.phone && (
            <Button
              onClick={handlePhone}
              variant="outline"
              className="h-12 rounded-xl px-4 border-border hover:border-primary hover:text-primary active:scale-[0.97] transition-all"
              aria-label="Ligar"
            >
              <Phone className="w-4 h-4" strokeWidth={2.2} />
            </Button>
          )}
          <Button
            onClick={handleDirections}
            variant="outline"
            className="h-12 rounded-xl px-4 border-border hover:border-primary hover:text-primary active:scale-[0.97] transition-all"
            aria-label="Como chegar"
          >
            <Navigation className="w-4 h-4" strokeWidth={2.2} />
          </Button>
        </div>

        {/* CTAs secundárias */}
        <div className="grid grid-cols-3 gap-2">
          <Button
            onClick={handleInterest}
            variant="secondary"
            size="sm"
            className="h-9 rounded-lg text-xs font-medium active:scale-[0.97] transition-transform"
          >
            Tenho interesse
          </Button>
          <Button
            onClick={handleShare}
            variant="secondary"
            size="sm"
            className="h-9 rounded-lg text-xs font-medium active:scale-[0.97] transition-transform"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 mr-1 text-primary" /> Copiado!
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5 mr-1" /> Compartilhar
              </>
            )}
          </Button>
          <Button
            onClick={handleFav}
            variant="secondary"
            size="sm"
            className="h-9 rounded-lg text-xs font-medium active:scale-[0.97] transition-transform"
          >
            {isFavorited ? (
              <>
                <Heart className="w-3.5 h-3.5 mr-1 fill-rose-500 text-rose-500" />
                Salvo
              </>
            ) : (
              <>
                <Heart className="w-3.5 h-3.5 mr-1" /> Salvar
              </>
            )}
          </Button>
        </div>

        <button
          onClick={() => openReport(p.id)}
          className="w-full min-h-[36px] text-[11px] text-muted-foreground/70 hover:text-destructive flex items-center justify-center gap-1.5 pt-1.5 transition-colors"
        >
          <Flag className="w-3 h-3" /> Denunciar anúncio
        </button>
      </div>
    </div>
  );
}

// =================================================================
//  SUB-COMPONENTES
// =================================================================
function Feature({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 flex flex-col items-center justify-center text-center hover:border-primary/40 hover:bg-secondary/40 active:scale-[0.97] transition-all">
      <div className="text-primary/80 grid place-items-center mb-1.5">
        {icon}
      </div>
      <div className="text-lg font-bold text-foreground leading-none tracking-tight">
        {value}
      </div>
      <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-[0.08em] font-medium">
        {label}
      </div>
    </div>
  );
}

function CostRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span
        className={strong ? "text-foreground text-sm font-medium" : "text-muted-foreground text-sm"}
      >
        {label}
      </span>
      <span
        className={cn(
          "price text-sm",
          strong ? "text-base font-bold text-foreground" : "text-foreground font-medium"
        )}
      >
        {value}
      </span>
    </div>
  );
}
