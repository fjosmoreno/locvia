"use client";

import { useState, useRef, type ReactNode, useEffect } from "react";
import { ChevronUp, ChevronDown } from "lucide-react";
import { useUI } from "@/lib/store";
import { cn } from "@/lib/utils";

type Snap = "peek" | "half" | "full";

const SNAP_HEIGHT: Record<Snap, string> = {
  peek: "9rem",
  half: "52%",
  full: "calc(100dvh - 56px)",
};

/** Painel inferior (mobile) — drag com snap peek/half/full + spring. */
export function MobilePanel({ children }: { children: ReactNode }) {
  const { panelView, selectedPropertyId, properties, loadingProperties } = useUI();
  const [snap, setSnap] = useState<Snap>("half");
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);
  const [dragH, setDragH] = useState<number | null>(null);

  const isDetail = panelView === "detail" && selectedPropertyId;
  const effectiveSnap: Snap = isDetail ? "full" : snap;
  const height = dragH != null ? `${dragH}px` : SNAP_HEIGHT[effectiveSnap];

  function onPointerDown(e: React.PointerEvent) {
    if (isDetail) return; // detalhe fica full
    dragging.current = true;
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
    const h = dragH ?? 0;
    setDragH(null);
    const vh = window.innerHeight;
    if (h < vh * 0.22) setSnap("peek");
    else if (h < vh * 0.72) setSnap("half");
    else setSnap("full");
  }

  const count = properties.length;

  // quando abre um detalhe, volta pra half ao fechar
  useEffect(() => {
    if (!isDetail && snap === "full") {
      // mantém
    }
  }, [isDetail, snap]);

  return (
    <div
      className={cn(
        "mobile-sheet md:hidden fixed inset-x-0 bottom-0 z-[1000] bg-card border-t border-border/60 rounded-t-3xl flex flex-col"
      )}
      style={{ height, boxShadow: "0 -8px 30px rgba(20,28,24,0.12)" }}
    >
      {/* Handle / header (drag area) */}
      <div
        className="shrink-0 pt-2.5 pb-2 cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="flex justify-center mb-1.5">
          <div className="w-9 h-1 rounded-full bg-border" />
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="text-xs font-semibold text-foreground">
            {isDetail
              ? "Detalhes do imóvel"
              : loadingProperties
              ? "Buscando imóveis…"
              : `${count} ${count === 1 ? "imóvel" : "imóveis"}`}
          </div>
          <button
            onClick={() => setSnap(effectiveSnap === "full" ? "half" : "full")}
            className="w-7 h-7 grid place-items-center rounded-full bg-muted hover:bg-accent text-muted-foreground transition-colors"
            aria-label={effectiveSnap === "full" ? "Recolher" : "Expandir"}
          >
            {effectiveSnap === "full" ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className={cn("flex-1 min-h-0 overflow-hidden", effectiveSnap === "peek" && "hidden")}>
        {children}
      </div>
    </div>
  );
}
