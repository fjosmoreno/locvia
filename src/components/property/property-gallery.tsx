"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface GalleryImage {
  id: string;
  url: string;
}

/**
 * Galeria AAA do imóvel.
 *
 * - Carrossel embla com transições suaves
 * - Botões prev/next em glass dark (bg-black/50 backdrop-blur)
 * - Contador discreto "1/5" + dots quando ≤ 6 fotos
 * - Botão fullscreen (expand) no canto superior direito
 * - Thumbnails horizontais scrolláveis com borda ciano no ativo
 * - Fullscreen mode bg-black/96, setas grandes, ESC + teclado
 * - Lazy loading + fade-in das imagens (skeleton shimmer enquanto carrega)
 * - Aspect 16/10 consistente
 */
export function PropertyGallery({
  images,
  alt,
}: {
  images: GalleryImage[];
  alt: string;
}) {
  // Inline carousel
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start" });
  // Fullscreen carousel — instância separada (corrige bug anterior de reutilizar emblaRef)
  const [fsRef, fsApi] = useEmblaCarousel({ loop: false, align: "start" });

  const [selected, setSelected] = useState(0);
  const [fsSelected, setFsSelected] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);

  const scrollTo = useCallback(
    (i: number) => emblaApi?.scrollTo(i),
    [emblaApi]
  );
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const fsScrollTo = useCallback(
    (i: number) => fsApi?.scrollTo(i),
    [fsApi]
  );
  const fsPrev = useCallback(() => fsApi?.scrollPrev(), [fsApi]);
  const fsNext = useCallback(() => fsApi?.scrollNext(), [fsApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  const onFsSelect = useCallback(() => {
    if (!fsApi) return;
    setFsSelected(fsApi.selectedScrollSnap());
  }, [fsApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  useEffect(() => {
    if (!fsApi) return;
    fsApi.on("select", onFsSelect);
    onFsSelect();
    return () => {
      fsApi.off("select", onFsSelect);
    };
  }, [fsApi, onFsSelect]);

  // Sincroniza fullscreen: ao abrir, faz scroll para a mesma imagem ativa
  const openFullscreen = useCallback(
    (atIndex?: number) => {
      setFullscreen(true);
      // sync após mount do fs carousel
      requestAnimationFrame(() => {
        const target = atIndex ?? selected;
        fsApi?.scrollTo(target, true);
        setFsSelected(target);
      });
    },
    [fsApi, selected]
  );

  // ESC + setas no teclado quando fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setFullscreen(false);
      else if (e.key === "ArrowLeft") fsPrev();
      else if (e.key === "ArrowRight") fsNext();
    }
    window.addEventListener("keydown", onKey);
    // Trava scroll do body
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [fullscreen, fsPrev, fsNext]);

  if (!images.length) {
    return (
      <div className="aspect-[16/10] w-full bg-muted rounded-[20px] grid place-items-center text-muted-foreground text-sm">
        Sem fotos
      </div>
    );
  }

  // Sempre mostra o contador "1/N" + dots quando ≤ 6 fotos
  const showDots = images.length > 1 && images.length <= 6;

  return (
    <>
      {/* ===== Galeria inline ===== */}
      <div className="relative group">
        <div className="gallery-embla shadow-lg" ref={emblaRef}>
          <div className="flex">
            {images.map((im, i) => (
              <div
                key={im.id}
                className="gallery-embla__slide cursor-zoom-in"
                onClick={() => openFullscreen(i)}
              >
                <GalleryImageWithFade
                  src={im.url}
                  alt={`${alt} — foto ${i + 1}`}
                  className="w-full aspect-[16/10] object-cover bg-muted"
                />
              </div>
            ))}
          </div>

          {/* Gradiente sutil no rodapé para legibilidade dos controles */}
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 h-16"
            style={{
              background:
                "linear-gradient(to top, rgba(0,0,0,0.45), transparent)",
            }}
          />
        </div>

        {images.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              disabled={selected === 0}
              className="gallery-ctrl absolute left-3 top-1/2 -translate-y-1/2"
              aria-label="Foto anterior"
            >
              <ChevronLeft className="w-5 h-5" strokeWidth={2.2} />
            </button>
            <button
              onClick={scrollNext}
              disabled={selected === images.length - 1}
              className="gallery-ctrl absolute right-3 top-1/2 -translate-y-1/2"
              aria-label="Próxima foto"
            >
              <ChevronRight className="w-5 h-5" strokeWidth={2.2} />
            </button>

            {/* Contador discreto bottom-right — sempre "1/N" */}
            <div className="absolute bottom-3 right-3 gallery-counter">
              <span>{selected + 1}</span>
              <span className="opacity-50">/</span>
              <span>{images.length}</span>
              {showDots && (
                <>
                  <span className="opacity-30 mx-0.5">·</span>
                  <span className="dot-row">
                    {images.map((_, i) => (
                      <span
                        key={i}
                        className={cn("dot", i === selected && "is-active")}
                      />
                    ))}
                  </span>
                </>
              )}
            </div>
          </>
        )}

        {/* Fullscreen button top-right */}
        <button
          onClick={() => openFullscreen()}
          className="gallery-ctrl absolute top-3 right-3"
          aria-label="Ver em tela cheia"
        >
          <Expand className="w-4 h-4" strokeWidth={2.2} />
        </button>
      </div>

      {/* ===== Thumbnails horizontais ===== */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-2.5 overflow-x-auto scroll-x pb-1">
          {images.map((im, i) => (
            <button
              key={im.id}
              onClick={() => scrollTo(i)}
              className={cn("gallery-thumb", selected === i && "is-active")}
              aria-label={`Ver foto ${i + 1}`}
            >
              <img src={im.url} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {/* ===== Fullscreen mode ===== */}
      {fullscreen && (
        <div
          className="gallery-fs"
          ref={stageRef}
          onClick={(e) => {
            if (e.target === stageRef.current) setFullscreen(false);
          }}
        >
          {/* Top bar: contador + fechar */}
          <div className="gallery-fs-topbar">
            <div className="gallery-counter">
              <span>{fsSelected + 1}</span>
              <span className="opacity-50">/</span>
              <span>{images.length}</span>
            </div>
            <button
              className="gallery-ctrl"
              onClick={() => setFullscreen(false)}
              aria-label="Fechar tela cheia"
            >
              <X className="w-4 h-4" strokeWidth={2.4} />
            </button>
          </div>

          {/* Stage */}
          <div className="gallery-fs-stage">
            {images.length > 1 && (
              <>
                <button
                  onClick={fsPrev}
                  disabled={fsSelected === 0}
                  className="gallery-fs-arrow left"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-6 h-6" strokeWidth={2.2} />
                </button>
                <button
                  onClick={fsNext}
                  disabled={fsSelected === images.length - 1}
                  className="gallery-fs-arrow right"
                  aria-label="Próxima"
                >
                  <ChevronRight className="w-6 h-6" strokeWidth={2.2} />
                </button>
              </>
            )}

            <div className="overflow-hidden w-full max-w-5xl" ref={fsRef}>
              <div className="flex">
                {images.map((im, i) => (
                  <div key={im.id} className="flex-[0_0_100%] min-w-0">
                    <img
                      src={im.url}
                      alt={`${alt} — foto ${i + 1}`}
                      className="gallery-fs-img w-full max-h-[78vh] object-contain"
                      loading="eager"
                      onLoad={(e) =>
                        (e.currentTarget as HTMLImageElement).classList.add(
                          "is-loaded"
                        )
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom bar: thumbnails */}
          {images.length > 1 && (
            <div className="gallery-fs-bottombar">
              {images.map((im, i) => (
                <button
                  key={im.id}
                  onClick={() => fsScrollTo(i)}
                  className={cn(
                    "gallery-fs-thumb",
                    fsSelected === i && "is-active"
                  )}
                  aria-label={`Foto ${i + 1}`}
                >
                  <img src={im.url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}

/**
 * Imagem com fade-in suave quando carrega, e placeholder shimmer.
 */
function GalleryImageWithFade({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className="relative">
      {!loaded && <div className="gallery-img-placeholder" />}
      <img
        src={src}
        alt={alt}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        className={cn("gallery-img", loaded && "is-loaded", className)}
      />
    </div>
  );
}
