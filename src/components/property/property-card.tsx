"use client";

import { useState } from "react";
import {
  Heart,
  MapPin,
  BedDouble,
  Bath,
  Car,
  Maximize,
  BadgeCheck,
  Star,
  ImageIcon,
  ArrowUpRight,
  Eye,
  GitCompare,
  Clock,
} from "lucide-react";
import { useUI } from "@/lib/store";
import { useFavorite } from "@/hooks/use-favorite";
import { formatPrice, formatDistance } from "@/lib/geo";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PropertyCardProps {
  property: Property;
  /** Modo "destacado" — quando IA/rota ativa, glow ciano contínuo */
  highlighted?: boolean;
}

export function PropertyCard({ property, highlighted = false }: PropertyCardProps) {
  const { openProperty, compareIds, toggleCompare } = useUI();
  const { isFavorited, toggle } = useFavorite(property.id);
  const [bounce, setBounce] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const img = property.images[0]?.url;
  const dist = property.distance;
  const typeLabel = PROPERTY_TYPE_LABELS[property.propertyType] || property.propertyType;
  const inCompare = compareIds.includes(property.id);
  const isNew = Date.now() - new Date(property.createdAt).getTime() < 7 * 86400000;
  const photoCount = property.images.length;

  function handleFav(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isFavorited) {
      setBounce(true);
      setTimeout(() => setBounce(false), 450);
    }
    toggle();
  }

  return (
    <article
      onClick={() => openProperty(property)}
      className={cn("property-card group animate-scale-in", highlighted && "is-highlighted")}
      role="button"
      tabIndex={0}
      aria-label={`Imóvel: ${property.title}, ${formatPrice(property.price, property.purpose)}`}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openProperty(property);
        }
      }}
    >
      {/* Imagem — protagonista */}
      <div className="card-img-wrap aspect-[4/3]">
        {img ? (
          <>
            {/* Skeleton enquanto carrega */}
            {!imgLoaded && (
              <div className="absolute inset-0 skeleton-aaa" aria-hidden />
            )}
            <img
              src={img}
              alt={property.title}
              loading="lazy"
              decoding="async"
              onLoad={() => setImgLoaded(true)}
              className={cn(
                "w-full h-full object-cover transition-opacity duration-500",
                imgLoaded ? "opacity-100" : "opacity-0"
              )}
            />
          </>
        ) : (
          <div className="img-placeholder" aria-label="Imóvel sem foto">
            <div className="flex flex-col items-center gap-1.5">
              <ImageIcon className="w-7 h-7" strokeWidth={1.4} />
              <span className="text-[10px] font-medium tracking-wide uppercase opacity-70">
                Sem foto
              </span>
            </div>
          </div>
        )}

        {/* Gradientes sobre imagem — top + bottom para legibilidade */}
        {img && (
          <>
            <div className="card-img-overlay-top" />
            <div className="card-img-overlay-bottom" />
          </>
        )}

        {/* Badges topo esquerdo — Destaque / Oferta / Recomendado / Novo */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5 z-[2]">
          {property.featured && (
            <span className="img-badge featured">
              <Star className="w-2.5 h-2.5 fill-current" /> Destaque
            </span>
          )}
          {property.badge === "OFFER" && (
            <span className="img-badge offer">Oferta</span>
          )}
          {property.badge === "RECOMMENDED" && (
            <span className="img-badge recommended">Recomendado</span>
          )}
          {isNew && (
            <span className="img-badge" style={{ background: "var(--success)", color: "#fff" }}>
              <Clock className="w-2.5 h-2.5" /> Novo
            </span>
          )}
        </div>

        {/* Contador de fotos — inferior esquerdo (sobre imagem) */}
        {photoCount > 1 && (
          <div className="absolute bottom-2.5 left-2.5 z-[2]">
            <span className="img-badge type-tag flex items-center gap-1">
              <ImageIcon className="w-2.5 h-2.5" />
              {typeLabel} · {photoCount}
            </span>
          </div>
        )}
        {photoCount <= 1 && (
          <div className="absolute bottom-2.5 left-2.5 z-[2]">
            <span className="img-badge type-tag">{typeLabel}</span>
          </div>
        )}

        {/* Distância — inferior direito (sobre imagem) */}
        {dist != null && (
          <div className="absolute bottom-2.5 right-2.5 z-[2]">
            <span className="img-badge distance">
              <MapPin className="w-2.5 h-2.5 text-primary" />
              {formatDistance(dist)}
            </span>
          </div>
        )}

        {/* Favorito — topo direito */}
        <button
          onClick={handleFav}
          className={cn(
            "fav-btn absolute top-2.5 right-2.5 z-[3]",
            isFavorited && "is-fav",
            bounce && "animate-fav-bounce"
          )}
          aria-label={isFavorited ? "Remover dos favoritos" : "Favoritar imóvel"}
          aria-pressed={isFavorited}
        >
          <Heart className={cn("w-4 h-4 transition-colors", isFavorited && "fill-current")} />
        </button>

        {/* Comparar — abaixo do favorito */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleCompare(property.id);
          }}
          className={cn(
            "fav-btn absolute top-12 right-2.5 z-[3]",
            inCompare && "is-active-compare"
          )}
          aria-label={inCompare ? "Remover do comparador" : "Adicionar ao comparador"}
          aria-pressed={inCompare}
          title="Comparar imóveis"
        >
          <GitCompare className={cn("w-4 h-4 transition-colors", inCompare && "text-primary")} />
        </button>

        {/* CTA hover — "Ver detalhes" */}
        <div className="card-cta" aria-hidden>
          Ver detalhes <ArrowUpRight className="w-3 h-3" />
        </div>
      </div>

      {/* Corpo — hierarquia premium */}
      <div className="p-4 space-y-2 relative z-[2]">
        {/* Linha 1: Preço (protagonista) + views discretas */}
        <div className="flex items-end justify-between gap-2">
          <div className="price text-[17px] font-bold text-foreground leading-none tracking-tight">
            {formatPrice(property.price, property.purpose)}
          </div>
          {property.views > 0 && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground shrink-0">
              <Eye className="w-3 h-3" />
              <span className="tabular-nums">{property.views}</span>
            </div>
          )}
        </div>

        {/* Condomínio + IPTU (se disponíveis) */}
        {(property.condominium != null || property.iptu != null) && (
          <div className="flex items-center gap-2 text-[10.5px] text-muted-foreground">
            {property.condominium != null && (
              <span>Cond. {formatPrice(property.condominium)}</span>
            )}
            {property.condominium != null && property.iptu != null && <span>·</span>}
            {property.iptu != null && <span>IPTU {formatPrice(property.iptu)}/ano</span>}
          </div>
        )}

        {/* Linha 2: Título — clamp 1 */}
        <h3 className="text-[13px] font-medium text-foreground clamp-1 leading-snug">
          {property.title}
        </h3>

        {/* Linha 3: Localização — MapPin + bairro/cidade */}
        <div className="text-[11.5px] text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0 text-primary/70" />
          <span className="clamp-1">
            {property.neighborhood}
            {property.city ? `, ${property.city}` : ""}
          </span>
        </div>

        {/* Linha 4: Specs — quartos / banheiros / vagas / área com separadores */}
        <div className="spec-row pt-1.5">
          {property.bedrooms != null && (
            <span className="spec-item">
              <BedDouble className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="tabular-nums">{property.bedrooms}</span>
              <span className="spec-label">quartos</span>
            </span>
          )}
          {property.bathrooms != null && (
            <span className="spec-item">
              <Bath className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="tabular-nums">{property.bathrooms}</span>
            </span>
          )}
          {property.parkingSpaces != null && (
            <span className="spec-item">
              <Car className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="tabular-nums">{property.parkingSpaces}</span>
            </span>
          )}
          {property.area != null && (
            <span className="spec-item">
              <Maximize className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="tabular-nums">{property.area}</span>
              <span className="spec-label">m²</span>
            </span>
          )}
        </div>

        {/* Linha 5: Anunciante verificado — pill premium */}
        {property.advertiser?.verified && (
          <div className="pt-1">
            <span className="verified-pill">
              <BadgeCheck className="w-3 h-3" />
              {property.advertiser.type === "AGENCY"
                ? "Imobiliária verificada"
                : "Anunciante verificado"}
            </span>
          </div>
        )}
      </div>
    </article>
  );
}

/** Skeleton AAA — shimmer ciano sutil */
export function PropertyCardSkeleton() {
  return (
    <div className="rounded-[18px] overflow-hidden bg-card border border-border/60">
      {/* Imagem skeleton */}
      <div className="aspect-[4/3] w-full skeleton-aaa" />
      {/* Corpo skeleton */}
      <div className="p-4 space-y-2.5">
        {/* Preço + views */}
        <div className="flex justify-between items-center">
          <div className="h-5 w-2/5 skeleton-aaa" />
          <div className="h-3 w-8 skeleton-aaa" />
        </div>
        {/* Título */}
        <div className="h-3.5 w-full skeleton-aaa" />
        {/* Localização */}
        <div className="h-3 w-3/4 skeleton-aaa" />
        {/* Specs */}
        <div className="flex gap-3 pt-1">
          <div className="h-3 w-12 skeleton-aaa" />
          <div className="h-3 w-10 skeleton-aaa" />
          <div className="h-3 w-10 skeleton-aaa" />
          <div className="h-3 w-12 skeleton-aaa" />
        </div>
        {/* Verified pill */}
        <div className="h-[18px] w-32 skeleton-aaa rounded-full" />
      </div>
    </div>
  );
}
