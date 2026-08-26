"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, MapPin, BedDouble, Bath, Car, Maximize, BadgeCheck,
  MessageCircle, Phone, Heart, Share2, Navigation, Flag, Loader2,
  Building2, User, Clock, ShieldCheck,
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
import {
  PROPERTY_TYPE_LABELS, PURPOSE_LABELS,
} from "@/lib/constants";
import type { Property } from "@/lib/types";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Mini mapa estático (grid 3x3 de tiles OSM/CARTO)
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
    <div className="relative w-full aspect-[16/8] rounded-xl overflow-hidden border border-border bg-[#e8edf2]">
      <div className="grid grid-cols-3 grid-rows-3 w-[300%] h-[300%] absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        {tiles.map(({ dx, dy }) => {
          const sub = ["a", "b", "c"][Math.abs((x + dx + y + dy) % 3)];
          const url = `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x + dx}/${y + dy}.png`;
          return (
             
            <img key={`${dx}-${dy}`} src={url} alt="" className="w-full h-full object-cover" loading="lazy" />
          );
        })}
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-full">
        <div className="w-7 h-7 rounded-full bg-primary border-2 border-white shadow-lg grid place-items-center">
          <MapPin className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.5} />
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

  // busca completa se não estiver no store
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
        <Skeleton className="aspect-[16/10] w-full rounded-xl" />
        <Skeleton className="h-6 w-1/2" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!p) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">Imóvel indisponível.</p>
        <Button variant="outline" size="sm" className="mt-3" onClick={closeProperty}>
          Voltar
        </Button>
      </div>
    );
  }

  const dist = p.distance;

  function trackLead(source: string) {
    lead.mutate({ propertyId: p!.id, source });
  }

  function handleWhatsapp() {
    trackLead("WHATSAPP");
    const msg = `Olá! Tenho interesse no imóvel "${p!.title}" (${formatPrice(p!.price, p!.purpose)}) visto no MapImóvel.`;
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
      // user cancelled
    }
  }

  const advertiser = p.advertiser;
  const totalMonthly = p.purpose === "RENT" ? (p.price + (p.condominium || 0) + ((p.iptu || 0) / 12)) : null;

  return (
    <div className="flex flex-col h-full bg-card">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-card/95 backdrop-blur border-b border-border px-3 py-2.5 flex items-center gap-2">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={closeProperty}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] text-muted-foreground">
            {PROPERTY_TYPE_LABELS[p.propertyType]} · {PURPOSE_LABELS[p.purpose]}
          </div>
          <div className="text-sm font-semibold text-foreground clamp-1">{p.title}</div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={toggle}
          aria-label="Favoritar"
        >
          <Heart className={cn("w-5 h-5", isFavorited && "fill-rose-500 text-rose-500")} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto scroll-area">
        {/* Galeria */}
        <div className="p-3">
          <PropertyGallery images={p.images} alt={p.title} />
        </div>

        {/* Preço + título */}
        <div className="px-4 pb-3">
          <div className="flex items-baseline gap-2 flex-wrap">
            <span className="text-2xl font-bold text-primary">
              {formatPrice(p.price, p.purpose)}
            </span>
            {p.badge === "OFFER" && (
              <Badge className="bg-amber-500 text-white">Oferta</Badge>
            )}
            {p.badge === "RECOMMENDED" && (
              <Badge className="bg-violet-600 text-white">Recomendado</Badge>
            )}
          </div>
          {dist != null && (
            <div className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Navigation className="w-3 h-3" /> {formatDistance(dist)} de você
            </div>
          )}
          <div className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
            <MapPin className="w-3.5 h-3.5" />
            {p.address && p.number ? `${p.address}, ${p.number}` : ""}
            {p.address && p.number ? " · " : ""}
            {p.neighborhood} — {p.city}/{p.state}
          </div>
        </div>

        {/* Características */}
        <div className="px-4 pb-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Feature icon={<Maximize className="w-4 h-4" />} label="Área" value={p.area ? `${p.area} m²` : "—"} />
            <Feature icon={<BedDouble className="w-4 h-4" />} label="Quartos" value={p.bedrooms != null ? String(p.bedrooms) : "—"} />
            <Feature icon={<Bath className="w-4 h-4" />} label="Banheiros" value={p.bathrooms != null ? String(p.bathrooms) : "—"} />
            <Feature icon={<Car className="w-4 h-4" />} label="Vagas" value={p.parkingSpaces != null ? String(p.parkingSpaces) : "—"} />
          </div>
        </div>

        <Separator />

        {/* Custos */}
        <div className="px-4 py-4 space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Custos</h3>
          <div className="space-y-1.5 text-sm">
            <CostRow label={p.purpose === "RENT" ? "Aluguel" : "Preço"} value={formatPrice(p.price)} />
            {p.condominium != null && <CostRow label="Condomínio" value={formatPrice(p.condominium)} />}
            {p.iptu != null && <CostRow label="IPTU (anual)" value={formatPrice(p.iptu)} />}
            {totalMonthly != null && (
              <div className="pt-2 mt-1 border-t border-dashed border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Total mensal estimado</span>
                <span className="text-sm font-bold text-foreground">{formatPrice(totalMonthly)}</span>
              </div>
            )}
          </div>
        </div>

        <Separator />

        {/* Descrição */}
        {p.description && (
          <>
            <div className="px-4 py-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Descrição</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
                {p.description}
              </p>
            </div>
            <Separator />
          </>
        )}

        {/* Localização */}
        <div className="px-4 py-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Localização</h3>
          <MiniMap lat={p.latitude} lng={p.longitude} />
          <div className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {p.neighborhood} — {p.city}/{p.state}
          </div>
        </div>

        <Separator />

        {/* Anunciante */}
        {advertiser && (
          <div className="px-4 py-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Anunciante</h3>
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-primary/10 grid place-items-center text-primary shrink-0">
                {advertiser.type === "AGENCY" ? (
                  <Building2 className="w-5 h-5" />
                ) : (
                  <User className="w-5 h-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-semibold text-foreground truncate">{advertiser.name}</span>
                  {advertiser.verified && (
                    <Badge variant="secondary" className="text-[10px] gap-0.5 bg-emerald-100 text-emerald-700">
                      <BadgeCheck className="w-3 h-3" /> Verificado
                    </Badge>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  {advertiser.type === "AGENCY"
                    ? "Imobiliária"
                    : advertiser.type === "BROKER"
                    ? "Corretor"
                    : "Proprietário"}
                </div>
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Metadados */}
        <div className="px-4 py-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatRelativeTime(p.lastConfirmedAt)}
          </span>
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> {p.views} visualizações
          </span>
        </div>

        <div className="h-32" />
      </div>

      {/* Barra de ações fixa no rodapé do painel */}
      <div className="border-t border-border bg-card p-3 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          {p.whatsapp && (
            <Button onClick={handleWhatsapp} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <MessageCircle className="w-4 h-4 mr-1.5" /> WhatsApp
            </Button>
          )}
          {p.phone && (
            <Button onClick={handlePhone} variant="outline">
              <Phone className="w-4 h-4 mr-1.5" /> Telefone
            </Button>
          )}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button onClick={handleInterest} variant="secondary" size="sm" className="text-xs">
            Tenho interesse
          </Button>
          <Button onClick={handleDirections} variant="secondary" size="sm" className="text-xs">
            <Navigation className="w-3.5 h-3.5 mr-1" /> Como chegar
          </Button>
          <Button onClick={handleShare} variant="secondary" size="sm" className="text-xs">
            <Share2 className="w-3.5 h-3.5 mr-1" /> {copied ? "Copiado!" : "Compartilhar"}
          </Button>
        </div>
        <button
          onClick={() => openReport(p.id)}
          className="w-full text-[11px] text-muted-foreground hover:text-destructive flex items-center justify-center gap-1 pt-1"
        >
          <Flag className="w-3 h-3" /> Denunciar anúncio
        </button>
      </div>
    </div>
  );
}

function Feature({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/60 p-2.5 text-center">
      <div className="text-muted-foreground grid place-items-center mb-1">{icon}</div>
      <div className="text-sm font-semibold text-foreground">{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function CostRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground text-xs">{label}</span>
      <span className="text-foreground font-medium">{value}</span>
    </div>
  );
}
