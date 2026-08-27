"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Ban,
  RotateCcw,
  MoreHorizontal,
  Building2,
  BadgeCheck,
  Mail,
  Phone,
  Hash,
  FileBadge,
  Loader2,
  Home as HomeIcon,
  CreditCard,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AgencyStatusBadge,
  EmptyState,
  ErrorState,
  ListSkeleton,
  formatDate,
  type AgencyAdmin,
} from "@/components/admin/shared";
import { cn } from "@/lib/utils";

type StatusFilter = "ALL" | "PENDING" | "APPROVED" | "BLOCKED";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Todas" },
  { value: "PENDING", label: "Pendentes" },
  { value: "APPROVED", label: "Aprovadas" },
  { value: "BLOCKED", label: "Bloqueadas" },
];

export function AgenciesTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = React.useState<StatusFilter>("ALL");
  const [blockTarget, setBlockTarget] = React.useState<AgencyAdmin | null>(null);

  const { data, isLoading, isError, refetch } = useQuery<{ agencies: AgencyAdmin[] }>({
    queryKey: ["admin", "agencies", filter],
    queryFn: async () => {
      const url =
        filter === "ALL"
          ? "/api/admin/agencies"
          : `/api/admin/agencies?status=${filter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Falha ao carregar imobiliárias");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: { status: string; verified?: boolean };
    }) => {
      const res = await fetch(`/api/admin/agencies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Falha ao atualizar imobiliária");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "agencies"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const approve = (a: AgencyAdmin) => {
    updateMutation.mutate(
      { id: a.id, body: { status: "APPROVED", verified: true } },
      {
        onSuccess: () =>
          toast.success(`${a.name} aprovada e verificada.`, {
            description: "A imobiliária já pode anunciar imóveis.",
          }),
      }
    );
  };

  const review = (a: AgencyAdmin) => {
    updateMutation.mutate(
      { id: a.id, body: { status: "PENDING" } },
      {
        onSuccess: () => toast.success(`${a.name} voltou para análise.`),
      }
    );
  };

  const block = (a: AgencyAdmin) => {
    updateMutation.mutate(
      { id: a.id, body: { status: "BLOCKED" } },
      {
        onSuccess: () => toast.success(`${a.name} foi bloqueada.`),
      }
    );
    setBlockTarget(null);
  };

  return (
    <div className="flex flex-col">
      {/* Filtros */}
      <div className="p-3 border-b border-border/60 bg-muted/20">
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as StatusFilter)}
        >
          <SelectTrigger className="h-9 w-full sm:w-56 bg-background border-border/60">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f.value} value={f.value}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <ListSkeleton rows={4} />
      ) : isError ? (
        <ErrorState
          message="Não foi possível carregar a lista de imobiliárias."
          onRetry={() => refetch()}
        />
      ) : !data?.agencies?.length ? (
        <EmptyState
          icon={<Building2 className="w-7 h-7" />}
          title="Nenhuma imobiliária encontrada."
          description="Não há imobiliárias com o filtro selecionado."
        />
      ) : (
        <div className="p-3 space-y-3">
          {data.agencies.map((a) => (
            <AgencyCard
              key={a.id}
              agency={a}
              onApprove={approve}
              onReview={review}
              onBlock={(ag) => setBlockTarget(ag)}
              pending={updateMutation.isPending}
            />
          ))}
        </div>
      )}

      <AlertDialog
        open={!!blockTarget}
        onOpenChange={(o) => !o && setBlockTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear imobiliária?</AlertDialogTitle>
            <AlertDialogDescription>
              {blockTarget?.name} não poderá mais anunciar imóveis nem receber
              leads enquanto estiver bloqueada. A ação pode ser revertida depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={() => blockTarget && block(blockTarget)}
            >
              Bloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function AgencyCard({
  agency: a,
  onApprove,
  onReview,
  onBlock,
  pending,
}: {
  agency: AgencyAdmin;
  onApprove: (a: AgencyAdmin) => void;
  onReview: (a: AgencyAdmin) => void;
  onBlock: (a: AgencyAdmin) => void;
  pending: boolean;
}) {
  const isPending = a.status === "PENDING";
  return (
    <div
      className={cn(
        "rounded-xl border bg-card/60 backdrop-blur-sm p-4 space-y-3 transition-all duration-200 hover:bg-card hover:border-primary/30 hover:shadow-md",
        isPending
          ? "border-amber-500/40 ring-1 ring-amber-500/15"
          : "border-border/60"
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-11 h-11 rounded-xl grid place-items-center shrink-0 ring-1",
            isPending
              ? "bg-amber-500/15 text-amber-300 ring-amber-500/25"
              : "bg-primary/12 text-primary ring-primary/20"
          )}
        >
          <Building2 className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground truncate tracking-tight">
              {a.name}
            </h3>
            {a.verified && (
              <BadgeCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
          </div>
          <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <CalendarDays className="w-3 h-3" />
            <span>Cadastrada em {formatDate(a.createdAt)}</span>
          </div>
        </div>
        <AgencyStatusBadge status={a.status} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5 text-xs pt-1">
        {a.cnpj && (
          <Info icon={<Hash className="w-3 h-3" />} label="CNPJ" value={a.cnpj} />
        )}
        {a.creci && (
          <Info
            icon={<FileBadge className="w-3 h-3" />}
            label="CRECI"
            value={a.creci}
          />
        )}
        {a.responsibleName && (
          <Info label="Responsável" value={a.responsibleName} />
        )}
        {a.email && (
          <Info
            icon={<Mail className="w-3 h-3" />}
            label="E-mail"
            value={a.email}
          />
        )}
        {a.phone && (
          <Info
            icon={<Phone className="w-3 h-3" />}
            label="Telefone"
            value={a.phone}
          />
        )}
        {a.user?.email && (
          <Info
            icon={<Mail className="w-3 h-3" />}
            label="Login"
            value={a.user.email}
          />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-border/40">
        <MetaChip icon={<HomeIcon className="w-3 h-3" />}>
          {a._count?.properties ?? 0} imóvel(éis)
        </MetaChip>
        {a.subscription?.plan && (
          <MetaChip icon={<CreditCard className="w-3 h-3" />}>
            {a.subscription.plan.name}
          </MetaChip>
        )}
        <span className="flex-1" />
        {isPending && (
          <Button
            size="sm"
            onClick={() => onApprove(a)}
            disabled={pending}
            className="shadow-sm shadow-primary/20"
          >
            {pending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            Aprovar
          </Button>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="outline" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            {a.status !== "APPROVED" && (
              <DropdownMenuItem onClick={() => onApprove(a)}>
                <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar e verificar
              </DropdownMenuItem>
            )}
            {a.status !== "PENDING" && (
              <DropdownMenuItem onClick={() => onReview(a)}>
                <RotateCcw className="w-3.5 h-3.5" /> Reavaliar
              </DropdownMenuItem>
            )}
            {a.status !== "BLOCKED" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onBlock(a)}
                >
                  <Ban className="w-3.5 h-3.5" /> Bloquear
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      {icon && <span className="text-muted-foreground/70 shrink-0">{icon}</span>}
      <span className="text-muted-foreground shrink-0">{label}:</span>
      <span className="text-foreground/90 font-medium truncate">{value}</span>
    </div>
  );
}

function MetaChip({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/40 px-2 py-1 text-[11px] font-medium text-foreground/80">
      {icon && <span className="text-muted-foreground">{icon}</span>}
      {children}
    </span>
  );
}
