"use client";

import { useState } from "react";
import { Heart, MapPin, BedDouble, Bath, Car, Maximize, BadgeCheck, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useUI } from "@/lib/store";
import { useFavorite } from "@/hooks/use-favorite";
import { formatPrice, formatDistance } from "@/lib/geo";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants";
import type { Property } from "@/lib/types";
import { cn } from "@/lib/utils";

export function PropertyCard({ property }: { property: Property }) {
  const { openProperty } = useUI();
  const { isFavorited, toggle } = useFavorite(property.id);
  const [bounce, setBounce] = useState(false);
  const img = property.images[0]?.url;
  const dist = property.distance;

  function handleFav(e: React.MouseEvent) {
    e.stopPropagation();
    if (!isFavorited) {
      setBounce(true);
      setTimeout(() => setBounce(false), 450);
    }
    toggle();
  }

  return (
    <div
      onClick={() => openProperty(property)}
      className="property-card group"
    >
      {/* Imagem — protagonista */}
      <div className="card-img-wrap aspect-[4/3]">
        {img ? (
           
          <img
            src={img}
            alt={property.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-muted-foreground text-xs">
            Sem foto
          </div>
        )}

        {/* Gradiente sutil para legibilidade dos badges */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/0 pointer-events-none" />

        {/* Badges topo esquerdo */}
        <div className="absolute top-2.5 left-2.5 flex gap-1.5">
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
        </div>

        {/* Distância — badge sobre a imagem, inferior direito */}
        {dist != null && (
          <div className="absolute bottom-2.5 right-2.5">
            <span className="img-badge distance">
              <MapPin className="w-2.5 h-2.5 text-primary" />
              {formatDistance(dist)}
            </span>
          </div>
        )}

        {/* Favorito */}
        <button
          onClick={handleFav}
          className={cn("fav-btn absolute top-2.5 right-2.5", isFavorited && "is-fav", bounce && "animate-fav-bounce")}
          aria-label={isFavorited ? "Remover dos favoritos" : "Favoritar"}
        >
          <Heart className={cn("w-4 h-4 transition-colors", isFavorited && "fill-current")} />
        </button>
      </div>

      {/* Corpo */}
      <div className="p-3.5 space-y-1">
        {/* Preço — protagonista tipográfico */}
        <div className="price text-lg font-bold text-foreground leading-none">
          {formatPrice(property.price, property.purpose)}
        </div>

        <div className="text-[13px] font-medium text-foreground clamp-1 pt-0.5">
          {property.title}
        </div>

        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
          <MapPin className="w-3 h-3 shrink-0" />
          <span className="clamp-1">
            {property.neighborhood}
            {property.city ? `, ${property.city}` : ""}
          </span>
        </div>

        {/* Specs */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 pt-1 text-[11px] text-muted-foreground">
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
          <div className="flex items-center gap-1 text-[10px] text-primary font-medium pt-1">
            <BadgeCheck className="w-3 h-3" /> Anunciante verificado
          </div>
        )}
      </div>
    </div>
  );
}

export function PropertyCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-card border border-border/60">
      <div className="aspect-[4/3] w-full skeleton-premium" />
      <div className="p-3.5 space-y-2.5">
        <div className="h-5 w-2/3 skeleton-premium rounded" />
        <div className="h-3.5 w-full skeleton-premium rounded" />
        <div className="h-3 w-1/2 skeleton-premium rounded" />
        <div className="flex gap-2 pt-1">
          <div className="h-3 w-10 skeleton-premium rounded" />
          <div className="h-3 w-10 skeleton-premium rounded" />
          <div className="h-3 w-10 skeleton-premium rounded" />
        </div>
      </div>
    </div>
  );
}
