"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================
// Tipos (espelham as APIs /api/admin/* e /api/plans?manage=1)
// ============================================================

export interface AdminStats {
  counts: {
    users: number;
    agencies: number;
    pendingAgencies: number;
    owners: number;
    properties: number;
    activeProperties: number;
    leads: number;
    favorites: number;
    reports: number;
    openReports: number;
    subscriptions: number;
    revenue: number;
  };
  topProperties: {
    id: string;
    title: string;
    views: number;
    status: string;
    price: number;
    purpose: string;
  }[];
  leadsBySource: Record<string, number>;
}

export interface AgencyAdmin {
  id: string;
  name: string;
  cnpj: string | null;
  creci: string | null;
  responsibleName: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  status: string;
  verified: boolean;
  createdAt: string;
  user: { email: string; phone: string | null };
  _count: { properties: number };
  subscription: { plan: { name: string; code: string } } | null;
}

export interface PropertyAdmin {
  id: string;
  title: string;
  purpose: string;
  propertyType: string;
  price: number;
  status: string;
  views: number;
  createdAt: string;
  images: { url: string; isPrimary: boolean }[];
  agency: { name: string } | null;
  owner: { user: { name: string } } | null;
  featured?: boolean;
  badge?: string | null;
}

export interface UserAdmin {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
}

export interface PlanAdmin {
  id: string;
  code: string;
  name: string;
  description: string | null;
  maxProperties: number;
  price: number;
  billingCycle: string;
  durationDays: number | null;
  active: boolean;
  sortOrder: number;
}

export interface ReportAdmin {
  id: string;
  reason: string;
  description: string | null;
  status: string;
  createdAt: string;
  property: { id: string; title: string; status: string } | null;
  user: { id: string; name: string; email: string } | null;
}

// ============================================================
// Status badges — tons dark-friendly (translúcidos sobre navy)
// ============================================================

const AGENCY_STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  APPROVED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  BLOCKED: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

const AGENCY_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  BLOCKED: "Bloqueada",
};

const AGENCY_STATUS_DOT: Record<string, string> = {
  PENDING: "bg-amber-400",
  APPROVED: "bg-emerald-400",
  BLOCKED: "bg-rose-400",
};

const PROPERTY_STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-zinc-500/15 text-zinc-300 border-zinc-500/25",
  PENDING_APPROVAL: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  ACTIVE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  PAUSED: "bg-zinc-500/15 text-zinc-300 border-zinc-500/25",
  RENTED: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  SOLD: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  EXPIRED: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  REJECTED: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

const PROPERTY_STATUS_DOT: Record<string, string> = {
  DRAFT: "bg-zinc-400",
  PENDING_APPROVAL: "bg-amber-400",
  ACTIVE: "bg-emerald-400",
  PAUSED: "bg-zinc-400",
  RENTED: "bg-teal-400",
  SOLD: "bg-teal-400",
  EXPIRED: "bg-zinc-500",
  REJECTED: "bg-rose-400",
};

const USER_STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  BLOCKED: "bg-rose-500/15 text-rose-300 border-rose-500/30",
};

const USER_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativo",
  BLOCKED: "Bloqueado",
};

const ROLE_STYLE: Record<string, string> = {
  USER: "bg-zinc-500/15 text-zinc-300 border-zinc-500/25",
  OWNER: "bg-teal-500/15 text-teal-300 border-teal-500/30",
  BROKER: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  AGENCY: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  ADMIN: "bg-primary/20 text-primary border-primary/40",
};

const REPORT_STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  REVIEWING: "bg-violet-500/15 text-violet-300 border-violet-500/30",
  RESOLVED: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  DISMISSED: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
};

const REPORT_STATUS_LABEL: Record<string, string> = {
  OPEN: "Aberta",
  REVIEWING: "Em análise",
  RESOLVED: "Resolvida",
  DISMISSED: "Dispensada",
};

function withDot(className: string, dotClass?: string) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {dotClass && (
        <span className={cn("w-1.5 h-1.5 rounded-full", dotClass)} />
      )}
    </span>
  );
}

export function AgencyStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium",
        AGENCY_STATUS_STYLE[status] ?? AGENCY_STATUS_STYLE.PENDING
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          AGENCY_STATUS_DOT[status] ?? AGENCY_STATUS_DOT.PENDING
        )}
      />
      {AGENCY_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export function PropertyStatusBadge({ status }: { status: string }) {
  const label = PROPERTY_STATUS_LABEL_LOOKUP[status] ?? status;
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium",
        PROPERTY_STATUS_STYLE[status] ?? PROPERTY_STATUS_STYLE.DRAFT
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          PROPERTY_STATUS_DOT[status] ?? PROPERTY_STATUS_DOT.DRAFT
        )}
      />
      {label}
    </Badge>
  );
}

// lookup local (espelha PROPERTY_STATUS_LABELS de constants)
const PROPERTY_STATUS_LABEL_LOOKUP: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_APPROVAL: "Aguardando",
  ACTIVE: "Ativo",
  PAUSED: "Pausado",
  RENTED: "Alugado",
  SOLD: "Vendido",
  EXPIRED: "Expirado",
  REJECTED: "Rejeitado",
};

export function UserStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium",
        USER_STATUS_STYLE[status] ?? USER_STATUS_STYLE.ACTIVE
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === "BLOCKED" ? "bg-rose-400" : "bg-emerald-400"
        )}
      />
      {USER_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

const ROLE_LABEL_LOOKUP: Record<string, string> = {
  USER: "Usuário",
  OWNER: "Proprietário",
  BROKER: "Corretor",
  AGENCY: "Imobiliária",
  ADMIN: "Administrador",
};

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "font-medium",
        ROLE_STYLE[role] ?? ROLE_STYLE.USER
      )}
    >
      {ROLE_LABEL_LOOKUP[role] ?? role}
    </Badge>
  );
}

export function ReportStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 font-medium",
        REPORT_STATUS_STYLE[status] ?? REPORT_STATUS_STYLE.OPEN
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          status === "OPEN"
            ? "bg-amber-400"
            : status === "REVIEWING"
            ? "bg-violet-400"
            : status === "RESOLVED"
            ? "bg-emerald-400"
            : "bg-zinc-500"
        )}
      />
      {REPORT_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

// ============================================================
// KPI card — glass dark + hover lift + trend indicator
// ============================================================

export function KpiCard({
  label,
  value,
  icon,
  hint,
  hintTone = "default",
  trend,
  trendLabel,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  hintTone?: "default" | "warn" | "success";
  trend?: "up" | "down" | "flat";
  trendLabel?: React.ReactNode;
}) {
  return (
    <Card className="group relative overflow-hidden p-4 gap-0 shadow-none border-border/60 bg-card/60 backdrop-blur-sm transition-all duration-200 hover:border-primary/40 hover:bg-card hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/5">
      {/* Glow accent */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-8 w-24 h-24 rounded-full bg-primary/5 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
      />
      <div className="flex items-start justify-between gap-2 relative">
        <div className="eyebrow !text-[10.5px] text-muted-foreground/80">
          {label}
        </div>
        {icon && (
          <div className="w-8 h-8 rounded-lg bg-primary/12 text-primary grid place-items-center ring-1 ring-primary/20 shadow-sm shadow-primary/10">
            {icon}
          </div>
        )}
      </div>
      <div className="mt-2.5 text-[1.65rem] font-semibold text-foreground leading-none tracking-tight price tabular-nums">
        {value}
      </div>
      {(hint || trend) && (
        <div className="mt-2 flex items-center gap-1.5 text-[11px] font-medium flex-wrap">
          {trend === "up" && (
            <span className="inline-flex items-center gap-0.5 text-emerald-400">
              <ArrowUpRight className="w-3 h-3" />
              {trendLabel}
            </span>
          )}
          {trend === "down" && (
            <span className="inline-flex items-center gap-0.5 text-rose-400">
              <ArrowDownRight className="w-3 h-3" />
              {trendLabel}
            </span>
          )}
          {trend === "flat" && (
            <span className="inline-flex items-center gap-0.5 text-muted-foreground">
              <Minus className="w-3 h-3" />
              {trendLabel}
            </span>
          )}
          {hint && (
            <span
              className={cn(
                hintTone === "warn" && "text-amber-400",
                hintTone === "success" && "text-emerald-400",
                hintTone === "default" && "text-muted-foreground"
              )}
            >
              {hint}
            </span>
          )}
        </div>
      )}
    </Card>
  );
}

// ============================================================
// Empty + error states — premium
// ============================================================

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in">
      {icon && (
        <div className="relative mb-5">
          <div
            aria-hidden
            className="absolute inset-0 bg-primary/15 blur-2xl rounded-full"
          />
          <div className="relative w-16 h-16 rounded-2xl bg-card border border-border/60 grid place-items-center text-muted-foreground shadow-sm">
            {icon}
          </div>
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground mb-1.5">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-[320px] leading-relaxed">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6 animate-fade-in">
      <div className="relative mb-5">
        <div
          aria-hidden
          className="absolute inset-0 bg-rose-500/15 blur-2xl rounded-full"
        />
        <div className="relative w-16 h-16 rounded-2xl bg-card border border-rose-500/30 grid place-items-center text-rose-400 shadow-sm">
          <span className="text-2xl font-bold">!</span>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1.5">
        Falha ao carregar
      </h3>
      <p className="text-xs text-muted-foreground max-w-[320px] leading-relaxed">
        {message}
      </p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-5 text-xs font-semibold text-primary hover:underline underline-offset-4"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

// ============================================================
// Loading skeletons — shimmer premium
// ============================================================

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border/60 bg-card/60 p-3"
        >
          <div className="h-12 w-12 rounded-lg shrink-0 skeleton-premium" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/2 rounded skeleton-premium" />
            <div className="h-3 w-3/4 rounded skeleton-premium" />
          </div>
          <div className="h-7 w-16 rounded-md skeleton-premium" />
        </div>
      ))}
    </div>
  );
}

export function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <Card
          key={i}
          className="p-4 gap-2 shadow-none border-border/60 bg-card/60"
        >
          <div className="h-3 w-1/2 rounded skeleton-premium" />
          <div className="h-7 w-2/3 rounded skeleton-premium mt-2" />
        </Card>
      ))}
    </div>
  );
}

// ============================================================
// Filter select reutilizável
// ============================================================

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export { withDot };
