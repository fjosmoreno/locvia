"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, MapPin, BedDouble, Bath, Car, Maximize, BadgeCheck,
  MessageCircle, Phone, Heart, Share2, Navigation, Flag, Loader2,
  Building2, User, Clock, ShieldCheck, Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

// Mini mapa estático (grid 3x3 de tiles)
function tileCoords(lat: number, lng: number, z: number) {
  const n = Math.pow(2, z);
  const x = Math.floor(((lng + 180) / 360) * n);
  const latRad = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n);
  return { x, y, z };
}

function MiniMap({ lat, lng }: { lat: number; lng: number }) {
  const z = 15;
  const { x, y } = tileCoords(lat, lng, z);
  const tiles: { dx: number; dy: number }[] = [];
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) tiles.push({ dx, dy });
  return (
    <div className="relative w-full aspect-[16/8] rounded-2xl overflow-hidden border border-border bg-[#eef0ec]">
      <div className="grid grid-cols-3 grid-rows-3 w-[300%] h-[300%] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {tiles.map(({ dx, dy }) => {
          const sub = ["a", "b", "c", "d"][Math.abs((x + dx + y + dy) % 4)];
          const url = `https://${sub}.basemaps.cartocdn.com/light_all/${z}/${x + dx}/${y + dy}.png`;
          return (
             
            <img key={`${dx}-${dy}`} src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
          );
        })}
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <div className="w-8 h-8 rounded-full bg-foreground border-[3px] border-white shadow-lg grid place-items-center">
          <MapPin className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
        </div>
      </div>
    </div>
  );
}

export function PropertyDetail({ propertyId }: { propertyId: string }) {
  const { closeProperty, openReport, flyTo, userLocation, selectedProperty } = useUI();
  const { isFavorited, toggle } = useFavorite(propertyId);
  const lead = useLead();
  const [copied, setCopied] = useState(false);
  const [bounce, setBounce] = useState(false);

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
      <div className="p-4 space-y-3">
        <Skeleton className="h-9 w-9 rounded-full" />
        <div className="aspect-[16/10] w-full skeleton-premium rounded-2xl" />
        <Skeleton className="h-7 w-1/2 rounded-lg" />
        <Skeleton className="h-4 w-3/4 rounded" />
        <div className="grid grid-cols-4 gap-2 pt-2">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (!p) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Imóvel indisponível.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={closeProperty}>Voltar</Button>
      </div>
    );
  }

  const dist = p.distance;

  function handleFav() {
    if (!isFavorited) {
      setBounce(true);
      setTimeout(() => setBounce(false), 450);
    }
    toggle();
  }
  function trackLead(source: string) { lead.mutate({ propertyId: p!.id, source }); }
  function handleWhatsapp() {
    trackLead("WHATSAPP");
    const msg = `Olá! Tenho interesse no imóvel "${p!.title}" (${formatPrice(p!.price, p!.purpose)}) visto no LOCVIA.`;
    window.open(whatsappLink(p!.whatsapp || p!.phone || "", msg), "_blank");
  }
  function handlePhone() {
    trackLead("PHONE");
    window.location.href = `tel:${(p!.phone || p!.whatsapp || "").replace(/\D/g, "")}`;
  }
  function handleInterest() {
    trackLead("INTEREST");
    toast.success("Interesse registrado! O anunciante será avisado.", { duration: 2500 });
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
        await navigator.share({ title: p!.title, text: `${p!.title} — ${formatPrice(p!.price, p!.purpose)}`, url });
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

  const advertiser = p.advertiser;
  const totalMonthly =
    p.purpose === "RENT" ? p.price + (p.condominium || 0) + (p.iptu || 0) / 12 : null;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header — minimalista, glass */}
      <div className="sticky top-0 z-10 glass-surface border-b border-border/60 px-3 py-2.5 flex items-center gap-2">
        <button
          onClick={closeProperty}
          className="w-9 h-9 grid place-items-center rounded-full hover:bg-accent transition-colors shrink-0"
          aria-label="Voltar ao mapa"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <div className="eyebrow">
            {PROPERTY_TYPE_LABELS[p.propertyType]} · {PURPOSE_LABELS[p.purpose]}
          </div>
          <div className="text-sm font-semibold text-foreground clamp-1">{p.title}</div>
        </div>
        <button
          onClick={handleFav}
          className={cn(
            "w-9 h-9 grid place-items-center rounded-full hover:bg-accent transition-colors shrink-0",
            bounce && "animate-fav-bounce"
          )}
          aria-label="Favoritar"
        >
          <Heart className={cn("w-5 h-5 transition-colors", isFavorited ? "fill-rose-500 text-rose-500" : "text-muted-foreground")} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-area">
        {/* Galeria */}
        <div className="p-4 pb-3">
          <PropertyGallery images={p.images} alt={p.title} />
        </div>

        {/* Bloco principal: preço + localização */}
        <div className="px-4 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="price text-3xl font-bold text-foreground leading-none">
              {formatPrice(p.price, p.purpose)}
            </div>
            {dist != null && (
              <div className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-semibold">
                <Navigation className="w-3.5 h-3.5" />
                {formatDistance(dist)}
              </div>
            )}
          </div>

          <h1 className="text-base font-semibold text-foreground mt-3 clamp-2">{p.title}</h1>
          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span className="clamp-1">
              {p.address && p.number ? `${p.address}, ${p.number} · ` : ""}
              {p.neighborhood} — {p.city}/{p.state}
            </span>
          </div>

          {/* Badges de status */}
          <div className="flex flex-wrap gap-1.5 mt-3">
            {p.featured && (
              <span className="img-badge featured"><Star className="w-2.5 h-2.5 fill-current" /> Destaque</span>
            )}
            {p.badge === "OFFER" && <span className="img-badge offer">Oferta</span>}
            {p.badge === "RECOMMENDED" && <span className="img-badge recommended">Recomendado</span>}
          </div>
        </div>

        {/* Características — grid premium */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <Feature icon={<Maximize className="w-4 h-4" />} label="Área" value={p.area ? `${p.area} m²` : "—"} />
            <Feature icon={<BedDouble className="w-4 h-4" />} label="Quartos" value={p.bedrooms != null ? String(p.bedrooms) : "—"} />
            <Feature icon={<Bath className="w-4 h-4" />} label="Banheiros" value={p.bathrooms != null ? String(p.bathrooms) : "—"} />
            <Feature icon={<Car className="w-4 h-4" />} label="Vagas" value={p.parkingSpaces != null ? String(p.parkingSpaces) : "—"} />
          </div>
        </div>

        <Separator />

        {/* Custos */}
        <div className="px-4 py-5">
          <h3 className="eyebrow mb-3">Custos</h3>
          <div className="space-y-2.5">
            <CostRow label={p.purpose === "RENT" ? "Aluguel" : "Preço"} value={formatPrice(p.price)} strong />
            {p.condominium != null && <CostRow label="Condomínio" value={formatPrice(p.condominium)} />}
            {p.iptu != null && <CostRow label="IPTU (anual)" value={formatPrice(p.iptu)} />}
            {totalMonthly != null && (
              <div className="pt-3 mt-1 border-t border-dashed border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total mensal estimado</span>
                <span className="price text-base font-bold text-foreground">{formatPrice(totalMonthly)}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Descrição */}
        {p.description && (
          <>
            <div className="px-4 py-5">
              <h3 className="eyebrow mb-3">Descrição</h3>
              <p className="text-sm text-foreground/80 whitespace-pre-line leading-relaxed">
                {p.description}
              </p>
            </div>
            <Separator />
          </>
        )}

        {/* Localização */}
        <div className="px-4 py-5">
          <h3 className="eyebrow mb-3">Localização</h3>
          <MiniMap lat={p.latitude} lng={p.longitude} />
          <div className="text-xs text-muted-foreground mt-2.5 flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            {p.neighborhood} — {p.city}/{p.state}
          </div>
        </div>

        <Separator />

        {/* Anunciante */}
        {advertiser && (
          <div className="px-4 py-5">
            <h3 className="eyebrow mb-3">Anunciante</h3>
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-card border border-border">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 grid place-items-center text-primary shrink-0">
                {advertiser.type === "AGENCY" ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground truncate">{advertiser.name}</span>
                  {advertiser.verified && (
                    <Badge variant="secondary" className="text-[10px] gap-0.5 bg-emerald-100 text-emerald-700 shrink-0">
                      <BadgeCheck className="w-3 h-3" /> Verificado
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {advertiser.type === "AGENCY" ? "Imobiliária" : advertiser.type === "BROKER" ? "Corretor" : "Proprietário"}
                </div>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Metadados */}
        <div className="px-4 py-3.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Clock className="w-3 h-3" /> {formatRelativeTime(p.lastConfirmedAt)}
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3 h-3" /> {p.views} visualizações
          </span>
        </div>

        <div className="h-40" />
      </div>

      {/* Barra de ações — sticky, premium */}
      <div className="border-t border-border bg-card/95 backdrop-blur p-3 space-y-2.5">
        {/* CTAs principais */}
        <div className="flex gap-2">
          {p.whatsapp && (
            <Button
              onClick={handleWhatsapp}
              className="flex-1 h-11 bg-foreground hover:bg-foreground/90 text-white rounded-xl gap-2"
            >
              <MessageCircle className="w-4 h-4" /> Conversar no WhatsApp
            </Button>
          )}
          {p.phone && (
            <Button onClick={handlePhone} variant="outline" className="h-11 rounded-xl px-4">
              <Phone className="w-4 h-4" />
            </Button>
          )}
          <Button onClick={handleDirections} variant="outline" className="h-11 rounded-xl px-4">
            <Navigation className="w-4 h-4" />
          </Button>
        </div>

        {/* CTAs secundárias */}
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={handleInterest} variant="secondary" size="sm" className="h-9 rounded-lg text-xs font-medium">
            Tenho interesse
          </Button>
          <Button onClick={handleShare} variant="secondary" size="sm" className="h-9 rounded-lg text-xs font-medium">
            <Share2 className="w-3.5 h-3.5 mr-1" /> {copied ? "Copiado!" : "Compartilhar"}
          </Button>
          <Button onClick={handleFav} variant="secondary" size="sm" className="h-9 rounded-lg text-xs font-medium">
            <Heart className={cn("w-3.5 h-3.5 mr-1", isFavorited && "fill-rose-500 text-rose-500")} />
            {isFavorited ? "Salvo" : "Salvar"}
          </Button>
        </div>

        <button
          onClick={() => openReport(p.id)}
          className="w-full text-[11px] text-muted-foreground hover:text-destructive flex items-center justify-center gap-1 pt-0.5 transition-colors"
        >
          <Flag className="w-3 h-3" /> Denunciar anúncio
        </button>
      </div>
    </div>
  );
}

function Feature({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 text-center">
      <div className="text-muted-foreground grid place-items-center mb-1.5">{icon}</div>
      <div className="text-base font-bold text-foreground leading-none">{value}</div>
      <div className="text-[10px] text-muted-foreground mt-1 uppercase tracking-wide">{label}</div>
    </div>
  );
}

function CostRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? "text-foreground text-sm font-medium" : "text-muted-foreground text-sm"}>{label}</span>
      <span className={strong ? "price text-base font-bold text-foreground" : "text-foreground font-medium text-sm"}>{value}</span>
    </div>
  );
}
