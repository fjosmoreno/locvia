"use client";

import { useState, useCallback, useEffect } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Expand, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PropertyGallery({
  images,
  alt,
}: {
  images: { id: string; url: string }[];
  alt: string;
}) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: false, align: "start" });
  const [selected, setSelected] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);

  const scrollTo = useCallback(
    (i: number) => emblaApi?.scrollTo(i),
    [emblaApi]
  );
  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelected(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi, onSelect]);

  if (!images.length) {
    return (
      <div className="aspect-[16/10] w-full bg-muted grid place-items-center text-muted-foreground text-sm">
        Sem fotos
      </div>
    );
  }

  return (
    <>
      <div className="relative group">
        <div className="gallery-embla" ref={emblaRef}>
          <div className="flex">
            {images.map((im) => (
              <div key={im.id} className="gallery-embla__slide">
                { }
                <img
                  src={im.url}
                  alt={alt}
                  className="w-full aspect-[16/10] object-cover bg-muted"
                  loading="lazy"
                />
              </div>
            ))}
          </div>
        </div>

        {images.length > 1 && (
          <>
            <button
              onClick={scrollPrev}
              disabled={selected === 0}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-full bg-white/90 backdrop-blur shadow disabled:opacity-0 transition-opacity hover:bg-white"
              aria-label="Anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={scrollNext}
              disabled={selected === images.length - 1}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 grid place-items-center rounded-full bg-white/90 backdrop-blur shadow disabled:opacity-0 transition-opacity hover:bg-white"
              aria-label="Próxima"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-white text-[11px] font-medium">
              {selected + 1} / {images.length}
            </div>
          </>
        )}

        <button
          onClick={() => setFullscreen(true)}
          className="absolute top-2 right-2 w-8 h-8 grid place-items-center rounded-full bg-white/90 backdrop-blur shadow hover:bg-white"
          aria-label="Tela cheia"
        >
          <Expand className="w-4 h-4" />
        </button>
      </div>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto scroll-area pb-1">
          {images.map((im, i) => (
            <button
              key={im.id}
              onClick={() => scrollTo(i)}
              className={cn(
                "shrink-0 w-16 h-12 rounded-md overflow-hidden border-2 transition-colors",
                selected === i ? "border-primary" : "border-transparent opacity-70 hover:opacity-100"
              )}
            >
              { }
              <img src={im.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen */}
      {fullscreen && (
        <div
          className="fixed inset-0 z-[2000] bg-black/95 flex items-center justify-center"
          onClick={() => setFullscreen(false)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => setFullscreen(false)}
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-full max-w-4xl max-h-[85vh]" onClick={(e) => e.stopPropagation()}>
            <div className="overflow-hidden" ref={emblaRef}>
              <div className="flex">
                {images.map((im) => (
                  <div key={im.id} className="flex-[0_0_100%] min-w-0">
                    { }
                    <img src={im.url} alt={alt} className="w-full max-h-[85vh] object-contain" />
                  </div>
                ))}
              </div>
            </div>
            {images.length > 1 && (
              <>
                <button
                  onClick={scrollPrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  aria-label="Anterior"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>
                <button
                  onClick={scrollNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-11 h-11 grid place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
                  aria-label="Próxima"
                >
                  <ChevronRight className="w-6 h-6" />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
