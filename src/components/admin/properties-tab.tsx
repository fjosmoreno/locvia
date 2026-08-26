"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  Ban,
  Pause,
  Play,
  Star,
  Tag,
  Trash2,
  MoreHorizontal,
  Eye,
  Home,
  Loader2,
  ImageIcon,
  X,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  PropertyStatusBadge,
  EmptyState,
  ErrorState,
  ListSkeleton,
  formatDate,
  type PropertyAdmin,
} from "@/components/admin/shared";
import { formatPrice } from "@/lib/geo";
import { PROPERTY_TYPE_LABELS } from "@/lib/constants";

type StatusFilter =
  | "ALL"
  | "ACTIVE"
  | "PENDING_APPROVAL"
  | "PAUSED"
  | "RENTED"
  | "SOLD"
  | "REJECTED";

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "ACTIVE", label: "Ativos" },
  { value: "PENDING_APPROVAL", label: "Pendentes" },
  { value: "PAUSED", label: "Pausados" },
  { value: "RENTED", label: "Alugados" },
  { value: "SOLD", label: "Vendidos" },
  { value: "REJECTED", label: "Rejeitados" },
];

type BadgeKind = "OFFER" | "RECOMMENDED" | null;

const BADGE_LABELS: Record<string, string> = {
  OFFER: "Oferta",
  RECOMMENDED: "Recomendado",
};

export function PropertiesTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = React.useState<StatusFilter>("ALL");
  const [rejectTarget, setRejectTarget] = React.useState<PropertyAdmin | null>(null);
  const [rejectReason, setRejectReason] = React.useState("");
  const [deleteTarget, setDeleteTarget] = React.useState<PropertyAdmin | null>(null);

  // notas de rejeição (cliente-side)
  const [rejectNotes, setRejectNotes] = React.useState<Record<string, string>>({});

  const { data, isLoading, isError, refetch } = useQuery<{ properties: PropertyAdmin[] }>({
    queryKey: ["admin", "properties", filter],
    queryFn: async () => {
      const url =
        filter === "ALL"
          ? "/api/admin/properties"
          : `/api/admin/properties?status=${filter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Falha ao carregar imóveis");
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/admin/properties/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Falha ao atualizar imóvel");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "properties"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/admin/properties/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Falha ao excluir imóvel");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "properties"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const setStatus = (p: PropertyAdmin, status: string, msg: string) => {
    updateMutation.mutate(
      { id: p.id, body: { status } },
      { onSuccess: () => toast.success(msg) }
    );
  };

  const toggleFeatured = (p: PropertyAdmin) => {
    updateMutation.mutate(
      { id: p.id, body: { featured: !p.featured } },
      {
        onSuccess: () =>
          toast.success(
            p.featured ? "Destaque removido." : "Imóvel destacado."
          ),
      }
    );
  };

  const setBadge = (p: PropertyAdmin, badge: BadgeKind) => {
    updateMutation.mutate(
      { id: p.id, body: { badge } },
      {
        onSuccess: () =>
          toast.success(
            badge ? `Selo "${BADGE_LABELS[badge]}" aplicado.` : "Selo removido."
          ),
      }
    );
  };

  const confirmReject = () => {
    if (!rejectTarget) return;
    updateMutation.mutate(
      { id: rejectTarget.id, body: { status: "REJECTED" } },
      {
        onSuccess: () => {
          setRejectNotes((prev) => ({
            ...prev,
            [rejectTarget.id]: rejectReason || "—",
          }));
          toast.success("Imóvel rejeitado.", {
            description: rejectReason
              ? `Motivo: ${rejectReason}`
              : "Sem justificativa informada.",
          });
          setRejectTarget(null);
          setRejectReason("");
        },
      }
    );
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success("Imóvel excluído permanentemente.");
        setDeleteTarget(null);
      },
    });
  };

  return (
    <div className="flex flex-col">
      {/* Filtros */}
      <div className="p-3 border-b border-border bg-muted/30">
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as StatusFilter)}
        >
          <SelectTrigger className="h-8 w-full sm:w-56 bg-background">
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
          message="Não foi possível carregar a lista de imóveis."
          onRetry={() => refetch()}
        />
      ) : !data?.properties?.length ? (
        <EmptyState
          icon={<Home className="w-7 h-7" />}
          title="Nenhum imóvel encontrado."
          description="Não há imóveis com o filtro selecionado."
        />
      ) : (
        <div className="p-3 space-y-3">
          {data.properties.map((p) => (
            <div
              key={p.id}
              className="rounded-xl border border-border bg-card p-3 space-y-3"
            >
              <div className="flex items-start gap-3">
                {/* thumb */}
                <div className="w-16 h-16 rounded-lg bg-muted overflow-hidden shrink-0 grid place-items-center text-muted-foreground">
                  {p.images?.[0]?.url ? (
                    <img
                      src={p.images[0].url}
                      alt={p.title}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <ImageIcon className="w-5 h-5" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                      {p.title}
                    </h3>
                    <PropertyStatusBadge status={p.status} />
                  </div>
                  <div className="text-sm font-bold text-primary mt-0.5">
                    {formatPrice(p.price, p.purpose)}
                  </div>
                  <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
                    <span className="font-medium text-foreground/70">
                      {PROPERTY_TYPE_LABELS[p.propertyType] || p.propertyType}
                    </span>
                    <span className="flex items-center gap-1">
                      <Eye className="w-3 h-3" /> {p.views}
                    </span>
                    <span>{formatDate(p.createdAt)}</span>
                  </div>
                  {p.agency?.name && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Anunciante:{" "}
                      <span className="text-foreground font-medium">
                        {p.agency.name}
                      </span>
                    </div>
                  )}
                  {p.owner?.user?.name && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      Proprietário:{" "}
                      <span className="text-foreground font-medium">
                        {p.owner.user.name}
                      </span>
                    </div>
                  )}
                  {p.featured && (
                    <div className="mt-1">
                      <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 text-[11px] font-medium">
                        <Star className="w-3 h-3 fill-primary" /> Destaque
                      </span>
                    </div>
                  )}
                  {p.badge && (
                    <div className="mt-1">
                      <span
                        className={
                          "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium border " +
                          (p.badge === "OFFER"
                            ? "bg-amber-100 text-amber-800 border-amber-200"
                            : "bg-violet-100 text-violet-800 border-violet-200")
                        }
                      >
                        <Tag className="w-3 h-3" /> {BADGE_LABELS[p.badge]}
                      </span>
                    </div>
                  )}
                  {rejectNotes[p.id] && (
                    <div className="mt-1 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-md px-2 py-1">
                      Nota de rejeição: {rejectNotes[p.id]}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-border/60 mt-1">
                {p.status !== "ACTIVE" && (
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => setStatus(p, "ACTIVE", "Imóvel aprovado e publicado.")}
                    disabled={updateMutation.isPending}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" /> Aprovar
                  </Button>
                )}
                {p.status !== "PAUSED" && p.status !== "REJECTED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStatus(p, "PAUSED", "Imóvel pausado.")}
                    disabled={updateMutation.isPending}
                  >
                    <Pause className="w-3.5 h-3.5" /> Pausar
                  </Button>
                )}
                {p.status !== "REJECTED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setRejectTarget(p);
                      setRejectReason("");
                    }}
                    disabled={updateMutation.isPending}
                  >
                    <Ban className="w-3.5 h-3.5" /> Rejeitar
                  </Button>
                )}
                {p.status === "PAUSED" && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setStatus(p, "ACTIVE", "Imóvel reativado.")}
                    disabled={updateMutation.isPending}
                  >
                    <Play className="w-3.5 h-3.5" /> Reativar
                  </Button>
                )}
                <Button
                  size="sm"
                  variant={p.featured ? "secondary" : "outline"}
                  onClick={() => toggleFeatured(p)}
                  disabled={updateMutation.isPending}
                >
                  <Star
                    className={
                      "w-3.5 h-3.5 " + (p.featured ? "fill-primary" : "")
                    }
                  />
                  {p.featured ? "Destacado" : "Destacar"}
                </Button>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button size="icon" variant="outline" className="h-8 w-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Selo</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setBadge(p, "OFFER")}>
                      <Tag className="w-3.5 h-3.5" /> Oferta
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setBadge(p, "RECOMMENDED")}>
                      <Tag className="w-3.5 h-3.5" /> Recomendado
                    </DropdownMenuItem>
                    {p.badge && (
                      <DropdownMenuItem onClick={() => setBadge(p, null)}>
                        <X className="w-3.5 h-3.5" /> Remover selo
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => setDeleteTarget(p)}
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Excluir imóvel
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Dialog de rejeição */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={(o) => !o && setRejectTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar imóvel</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. O anúncio sairá da vitrine pública
              e será marcado como rejeitado.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">Motivo (opcional)</Label>
            <Textarea
              id="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ex.: fotos em baixa qualidade, preço fora do mercado…"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Confirmar rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de exclusão */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir imóvel?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e removerá o anúncio, suas fotos, leads e
              denúncias associadas. Não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="w-4 h-4 animate-spin" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
