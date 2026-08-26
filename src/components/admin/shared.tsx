"use client";

import * as React from "react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
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
// Status badges
// ============================================================

const AGENCY_STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  BLOCKED: "bg-rose-100 text-rose-800 border-rose-200",
};

const AGENCY_STATUS_LABEL: Record<string, string> = {
  PENDING: "Pendente",
  APPROVED: "Aprovada",
  BLOCKED: "Bloqueada",
};

const PROPERTY_STATUS_STYLE: Record<string, string> = {
  DRAFT: "bg-zinc-100 text-zinc-700 border-zinc-200",
  PENDING_APPROVAL: "bg-amber-100 text-amber-800 border-amber-200",
  ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  PAUSED: "bg-zinc-100 text-zinc-700 border-zinc-200",
  RENTED: "bg-teal-100 text-teal-800 border-teal-200",
  SOLD: "bg-teal-100 text-teal-800 border-teal-200",
  EXPIRED: "bg-zinc-100 text-zinc-500 border-zinc-200",
  REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
};

const USER_STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-emerald-100 text-emerald-800 border-emerald-200",
  BLOCKED: "bg-rose-100 text-rose-800 border-rose-200",
};

const USER_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "Ativo",
  BLOCKED: "Bloqueado",
};

const ROLE_STYLE: Record<string, string> = {
  USER: "bg-zinc-100 text-zinc-700 border-zinc-200",
  OWNER: "bg-teal-100 text-teal-800 border-teal-200",
  BROKER: "bg-cyan-100 text-cyan-800 border-cyan-200",
  AGENCY: "bg-emerald-100 text-emerald-800 border-emerald-200",
  ADMIN: "bg-primary text-primary-foreground border-transparent",
};

const REPORT_STATUS_STYLE: Record<string, string> = {
  OPEN: "bg-amber-100 text-amber-800 border-amber-200",
  REVIEWING: "bg-violet-100 text-violet-800 border-violet-200",
  RESOLVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  DISMISSED: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

const REPORT_STATUS_LABEL: Record<string, string> = {
  OPEN: "Aberta",
  REVIEWING: "Em análise",
  RESOLVED: "Resolvida",
  DISMISSED: "Dispensada",
};

export function AgencyStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(AGENCY_STATUS_STYLE[status] ?? AGENCY_STATUS_STYLE.PENDING)}
    >
      {AGENCY_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export function PropertyStatusBadge({ status }: { status: string }) {
  // importa label do constants para evitar duplicar
  const label = PROPERTY_STATUS_LABEL_LOOKUP[status] ?? status;
  return (
    <Badge
      variant="outline"
      className={cn(
        PROPERTY_STATUS_STYLE[status] ?? PROPERTY_STATUS_STYLE.DRAFT
      )}
    >
      {label}
    </Badge>
  );
}

// lookup local (espelha PROPERTY_STATUS_LABELS de constants)
const PROPERTY_STATUS_LABEL_LOOKUP: Record<string, string> = {
  DRAFT: "Rascunho",
  PENDING_APPROVAL: "Aguardando aprovação",
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
      className={cn(USER_STATUS_STYLE[status] ?? USER_STATUS_STYLE.ACTIVE)}
    >
      {USER_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(ROLE_STYLE[role] ?? ROLE_STYLE.USER)}
    >
      {ROLE_LABEL_LOOKUP[role] ?? role}
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

export function ReportStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        REPORT_STATUS_STYLE[status] ?? REPORT_STATUS_STYLE.OPEN
      )}
    >
      {REPORT_STATUS_LABEL[status] ?? status}
    </Badge>
  );
}

// ============================================================
// KPI card
// ============================================================

export function KpiCard({
  label,
  value,
  icon,
  hint,
  hintTone = "default",
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: React.ReactNode;
  hintTone?: "default" | "warn" | "success";
}) {
  return (
    <Card className="p-4 gap-2 shadow-none">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        {icon && (
          <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary grid place-items-center">
            {icon}
          </div>
        )}
      </div>
      <div className="text-2xl font-bold text-foreground leading-tight">
        {value}
      </div>
      {hint && (
        <div
          className={cn(
            "text-[11px] font-medium",
            hintTone === "warn" && "text-amber-700",
            hintTone === "success" && "text-emerald-700",
            hintTone === "default" && "text-muted-foreground"
          )}
        >
          {hint}
        </div>
      )}
    </Card>
  );
}

// ============================================================
// Empty + error states
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
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      {icon && (
        <div className="w-14 h-14 rounded-2xl bg-muted grid place-items-center text-muted-foreground mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-[300px]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
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
    <div className="flex flex-col items-center justify-center text-center py-14 px-6">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 text-rose-600 grid place-items-center mb-4 text-2xl">
        !
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">
        Falha ao carregar
      </h3>
      <p className="text-xs text-muted-foreground max-w-[300px]">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 text-xs font-medium text-primary hover:underline"
        >
          Tentar novamente
        </button>
      )}
    </div>
  );
}

// ============================================================
// Loading skeletons
// ============================================================

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border bg-card p-3"
        >
          <Skeleton className="h-12 w-12 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-7 w-16 rounded-md" />
        </div>
      ))}
    </div>
  );
}

export function KpiGridSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 p-4">
      {Array.from({ length: 9 }).map((_, i) => (
        <Card key={i} className="p-4 gap-2 shadow-none">
          <Skeleton className="h-3 w-1/2" />
          <Skeleton className="h-7 w-2/3" />
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
