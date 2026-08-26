"use client";

import { useState, useRef, type ReactNode } from "react";
import { ChevronUp, ChevronDown, GripHorizontal } from "lucide-react";
import { useUI } from "@/lib/store";
import { cn } from "@/lib/utils";

type Snap = "peek" | "half" | "full";

const SNAP_HEIGHT: Record<Snap, string> = {
  peek: "8rem",
  half: "50%",
  full: "calc(100dvh - 64px)",
};

/** Painel inferior (mobile) com snap peek/half/full + arrasto. */
export function MobilePanel({ children }: { children: ReactNode }) {
  const { panelView, selectedPropertyId, properties, loadingProperties } = useUI();
  const [snap, setSnap] = useState<Snap>("half");
  const dragging = useRef(false);
  const startY = useRef(0);
  const startH = useRef(0);
  const [dragH, setDragH] = useState<number | null>(null);

  // detalhe sempre full
  const effectiveSnap = panelView === "detail" && selectedPropertyId ? "full" : snap;
  const height = dragH != null ? `${dragH}px` : SNAP_HEIGHT[effectiveSnap];

  function onPointerDown(e: React.PointerEvent) {
    dragging.current = true;
    startY.current = e.clientY;
    startH.current = (e.currentTarget.parentElement?.getBoundingClientRect().height) || 0;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    const delta = startY.current - e.clientY;
    const next = Math.max(120, Math.min(window.innerHeight - 64, startH.current + delta));
    setDragH(next);
  }
  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    const h = dragH ?? 0;
    setDragH(null);
    const vh = window.innerHeight;
    if (h < vh * 0.25) setSnap("peek");
    else if (h < vh * 0.75) setSnap("half");
    else setSnap("full");
  }

  const count = properties.length;

  return (
    <div
      className="md:hidden fixed inset-x-0 bottom-0 z-[1000] bg-card border-t border-border rounded-t-2xl shadow-2xl flex flex-col transition-[height] duration-300 ease-out"
      style={{ height }}
    >
      {/* Handle / header (drag area) */}
      <div
        className="shrink-0 pt-2 pb-1.5 cursor-grab active:cursor-grabbing touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="flex justify-center mb-1">
          <GripHorizontal className="w-6 h-2 text-muted-foreground/60" />
        </div>
        <div className="flex items-center justify-between px-4">
          <div className="text-xs font-semibold text-foreground">
            {panelView === "detail"
              ? "Detalhes"
              : loadingProperties
              ? "Buscando…"
              : `${count} ${count === 1 ? "imóvel" : "imóveis"}`}
          </div>
          <button
            onClick={() => setSnap(effectiveSnap === "full" ? "half" : "full")}
            className="text-muted-foreground p-1"
            aria-label="Expandir/recolher"
          >
            {effectiveSnap === "full" ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      <div className={cn("flex-1 min-h-0 overflow-hidden", effectiveSnap === "peek" && "hidden")}>
        {children}
      </div>
    </div>
  );
}
