"use client";

import { useSession } from "next-auth/react";
import { Heart, History, Bell, GitCompare } from "lucide-react";
import { useUI } from "@/lib/store";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

/**
 * Botões flutuantes de acesso rápido (canto superior direito do mapa, abaixo da topbar).
 * - Favoritos (com count)
 * - Histórico de vistos
 * - Alertas salvos
 * - Comparador (com count)
 *
 * Aparecem apenas quando autenticado (exceto comparador, que é client-side).
 */
export function FloatingShortcuts() {
  const { data: session } = useSession();
  const { openDrawer, compareIds, drawer } = useUI();

  // count de favoritos
  const { data: favCount = 0 } = useQuery<number>({
    queryKey: ["favorites-count"],
    enabled: !!session,
    queryFn: async () => {
      const res = await fetch("/api/favorites");
      if (!res.ok) return 0;
      const d = await res.json();
      return d.properties?.length || 0;
    },
    staleTime: 60_000,
  });

  // count de alertas
  const { data: alertsCount = 0 } = useQuery<number>({
    queryKey: ["saved-searches-count"],
    enabled: !!session,
    queryFn: async () => {
      const res = await fetch("/api/saved-searches");
      if (!res.ok) return 0;
      const d = await res.json();
      return d.searches?.length || 0;
    },
    staleTime: 60_000,
  });

  // Esconde quando um drawer/sheet está aberto
  if (drawer) return null;
  if (!session && compareIds.length === 0) return null;

  return (
    <div className="absolute right-3 top-[120px] sm:top-[128px] z-[1040] flex flex-col gap-2 pointer-events-auto">
      {session && (
        <ShortcutButton
          icon={<Heart className="w-4 h-4" />}
          label="Favoritos"
          count={favCount}
          onClick={() => openDrawer("favorites")}
        />
      )}
      {session && (
        <ShortcutButton
          icon={<History className="w-4 h-4" />}
          label="Vistos"
          onClick={() => openDrawer("history")}
        />
      )}
      {session && (
        <ShortcutButton
          icon={<Bell className="w-4 h-4" />}
          label="Alertas"
          count={alertsCount}
          onClick={() => openDrawer("saved-searches")}
        />
      )}
      {compareIds.length > 0 && (
        <ShortcutButton
          icon={<GitCompare className="w-4 h-4" />}
          label="Comparar"
          count={compareIds.length}
          highlight
          onClick={() => openDrawer("compare")}
        />
      )}
    </div>
  );
}

function ShortcutButton({
  icon,
  label,
  count,
  highlight,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  highlight?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "map-overlay-btn relative",
        highlight && "is-active"
      )}
      style={{ width: 42, height: 42 }}
      aria-label={label}
      title={label}
    >
      {icon}
      {count != null && count > 0 && (
        <span
          className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full text-[10px] font-bold"
          style={{
            background: highlight ? "var(--primary-foreground)" : "var(--primary)",
            color: highlight ? "var(--primary)" : "var(--primary-foreground)",
            boxShadow: "0 0 0 2px var(--card)",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
