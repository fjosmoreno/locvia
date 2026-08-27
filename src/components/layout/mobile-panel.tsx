"use client";

import { useState, useRef, type ReactNode, useEffect } from "react";
import { ChevronUp, ChevronDown, MapPin } from "lucide-react";
import { useUI } from "@/lib/store";
import { cn } from "@/lib/utils";

type Snap = "peek" | "half" | "full";

const SNAP_HEIGHT: Record<Snap, string> = {
  peek: "9rem",
  half: "52%",
  full: "calc(100dvh - 56px)",
};

const SNAP_ORDER: Snap[] = ["peek", "half", "full"];

/** Painel inferior (mobile) — drag com snap peek/half/full + spring AAA. */
export function MobilePanel({ children }: { children: ReactNode }) {
  const { panelView, selectedPropertyId, properties, loadingProperties, ai, route } = useUI();
  const [snap, setSnap] = useState<Snap>("half");
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);
  const [dragH, setDragH] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const isDetail = panelView === "detail" && selectedPropertyId;
  const effectiveSnap: Snap = isDetail ? "full" : snap;
  const height = dragH != null ? `${dragH}px` : SNAP_HEIGHT[effectiveSnap];

  function onPointerDown(e: React.PointerEvent) {
    if (isDetail) return; // detalhe fica full
    dragging.current = true;
    setIsDragging(true);
    startY.current = e.clientY;
    startH.current = e.currentTarget.parentElement?.getBoundingClientRect().height || 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const delta = startY.current - e.clientY;
    const next = Math.max(120, Math.min(window.innerHeight - 56, startH.current + delta));
    setDragH(next);
  }
  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    setIsDragging(false);
    const h = dragH ?? 0;
    setDragH(null);
    const vh = window.innerHeight;
    if (h < vh * 0.22) setSnap("peek");
    else if (h < vh * 0.72) setSnap("half");
    else setSnap("full");
  }

  const count = properties.length;
  const aiActive = ai.highlightSource === "ai" && ai.highlightedIds?.length;
  const routeActive = route.properties.length > 0;

  // when a detail opens, force full; when closed, restore half if was peek
  useEffect(() => {
    if (isDetail) {
      // detail = full snap, automatic via effectiveSnap
    }
  }, [isDetail]);

  function cycleSnap() {
    if (isDetail) return;
    const idx = SNAP_ORDER.indexOf(snap);
    const next = SNAP_ORDER[(idx + 1) % SNAP_ORDER.length];
    setSnap(next);
  }

  const title = isDetail
    ? "Detalhes do imóvel"
    : loadingProperties && count === 0
    ? "Buscando imóveis…"
    : `${count} ${count === 1 ? "imóvel" : "imóveis"}`;

  return (
    <div
      className={cn(
        "mobile-sheet sheet-shadow-top md:hidden fixed inset-x-0 bottom-0 z-[1000]",
        "bg-card border-t border-border/60 rounded-t-3xl flex flex-col",
        isDragging && "dragging"
      )}
      style={{ height }}
    >
      {/* Handle / header (drag area) — 44px touch target */}
      <div
        className={cn(
          "sheet-handle-area shrink-0 select-none",
          isDragging && "is-dragging"
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="flex justify-center mb-2">
          <div className="sheet-handle" />
        </div>
        <div className="flex items-center justify-between px-4 gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Snap dots indicator */}
            {!isDetail && (
              <div className="snap-dots shrink-0">
                {SNAP_ORDER.map((s) => (
                  <span
                    key={s}
                    className={cn("snap-dot", effectiveSnap === s && "is-active")}
                  />
                ))}
              </div>
            )}
            <div className="text-sm font-semibold text-foreground truncate">
              {title}
            </div>
            {/* Inline badges — AI / Route */}
            {(aiActive || routeActive) && !isDetail && (
              <div className="flex items-center gap-1.5 shrink-0">
                {aiActive && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/12 border border-primary/22">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_6px_var(--primary)]" />
                    IA
                  </span>
                )}
                {routeActive && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary px-2 py-0.5 rounded-full bg-primary/12 border border-primary/22">
                    <MapPin className="w-2.5 h-2.5" />
                    {route.properties.length}
                  </span>
                )}
              </div>
            )}
          </div>
          {!isDetail && (
            <button
              onClick={cycleSnap}
              className="sheet-expand-btn"
              aria-label={effectiveSnap === "full" ? "Recolher" : "Expandir"}
              title={
                effectiveSnap === "peek"
                  ? "Expandir para metade"
                  : effectiveSnap === "half"
                  ? "Expandir para tela cheia"
                  : "Recolher"
              }
            >
              {effectiveSnap === "full" ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronUp className="w-4 h-4" />
              )}
            </button>
          )}
        </div>
      </div>

      <div className={cn("flex-1 min-h-0 overflow-hidden", effectiveSnap === "peek" && "hidden")}>
        {children}
      </div>
    </div>
  );
}
