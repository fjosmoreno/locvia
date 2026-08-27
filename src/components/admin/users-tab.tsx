"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users as UsersIcon,
  MoreHorizontal,
  Ban,
  CheckCircle2,
  Shield,
  Loader2,
  Mail,
  Phone,
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
  RoleBadge,
  UserStatusBadge,
  EmptyState,
  ErrorState,
  ListSkeleton,
  formatDate,
  type UserAdmin,
} from "@/components/admin/shared";
import { ROLES } from "@/lib/constants";
import { cn } from "@/lib/utils";

type RoleFilter = "ALL" | keyof typeof ROLES;

const FILTERS: { value: RoleFilter; label: string }[] = [
  { value: "ALL", label: "Todos" },
  { value: "USER", label: "Usuários" },
  { value: "OWNER", label: "Proprietários" },
  { value: "BROKER", label: "Corretores" },
  { value: "AGENCY", label: "Imobiliárias" },
  { value: "ADMIN", label: "Administradores" },
];

const ROLE_OPTIONS: { value: string; label: string }[] = [
  { value: "USER", label: "Usuário" },
  { value: "OWNER", label: "Proprietário" },
  { value: "BROKER", label: "Corretor" },
  { value: "AGENCY", label: "Imobiliária" },
  { value: "ADMIN", label: "Administrador" },
];

const ROLE_AVATAR_COLOR: Record<string, string> = {
  USER: "from-zinc-500/20 to-zinc-600/20 text-zinc-300 ring-zinc-500/30",
  OWNER: "from-teal-500/20 to-teal-600/20 text-teal-300 ring-teal-500/30",
  BROKER: "from-cyan-500/20 to-cyan-600/20 text-cyan-300 ring-cyan-500/30",
  AGENCY: "from-emerald-500/20 to-emerald-600/20 text-emerald-300 ring-emerald-500/30",
  ADMIN: "from-primary/25 to-primary/10 text-primary ring-primary/40",
};

export function UsersTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = React.useState<RoleFilter>("ALL");
  const [blockTarget, setBlockTarget] = React.useState<UserAdmin | null>(null);
  const [adminTarget, setAdminTarget] = React.useState<UserAdmin | null>(null);
  const [promoteRole, setPromoteRole] = React.useState<string>("USER");

  const { data, isLoading, isError, refetch } = useQuery<{ users: UserAdmin[] }>({
    queryKey: ["admin", "users", filter],
    queryFn: async () => {
      const url =
        filter === "ALL" ? "/api/admin/users" : `/api/admin/users?role=${filter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Falha ao carregar usuários");
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
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Falha ao atualizar usuário");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "stats"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleStatus = (u: UserAdmin) => {
    const next = u.status === "ACTIVE" ? "BLOCKED" : "ACTIVE";
    updateMutation.mutate(
      { id: u.id, body: { status: next } },
      {
        onSuccess: () =>
          toast.success(
            next === "BLOCKED"
              ? `${u.name} foi bloqueado.`
              : `${u.name} foi reativado.`
          ),
      }
    );
  };

  const changeRole = (u: UserAdmin, role: string) => {
    updateMutation.mutate(
      { id: u.id, body: { role } },
      {
        onSuccess: () =>
          toast.success(`Perfil de ${u.name} alterado para ${roleLabel(role)}.`),
      }
    );
  };

  const confirmBlock = () => {
    if (!blockTarget) return;
    updateMutation.mutate(
      { id: blockTarget.id, body: { status: "BLOCKED" } },
      {
        onSuccess: () => {
          toast.success(`${blockTarget.name} foi bloqueado.`);
          setBlockTarget(null);
        },
      }
    );
  };

  const confirmPromote = () => {
    if (!adminTarget) return;
    changeRole(adminTarget, promoteRole);
    setAdminTarget(null);
  };

  return (
    <div className="flex flex-col">
      {/* Filtros */}
      <div className="p-3 border-b border-border/60 bg-muted/20">
        <Select
          value={filter}
          onValueChange={(v) => setFilter(v as RoleFilter)}
        >
          <SelectTrigger className="h-9 w-full sm:w-56 bg-background border-border/60">
            <SelectValue placeholder="Filtrar por perfil" />
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
          message="Não foi possível carregar a lista de usuários."
          onRetry={() => refetch()}
        />
      ) : !data?.users?.length ? (
        <EmptyState
          icon={<UsersIcon className="w-7 h-7" />}
          title="Nenhum usuário encontrado."
          description="Não há usuários com o filtro selecionado."
        />
      ) : (
        <div className="p-3 space-y-3">
          {data.users.map((u) => (
            <UserCard
              key={u.id}
              u={u}
              pending={updateMutation.isPending}
              onToggleStatus={toggleStatus}
              onChangeRole={changeRole}
              onConfirmBlock={(uu) => setBlockTarget(uu)}
              onConfirmPromote={(uu, role) => {
                setPromoteRole(role);
                setAdminTarget(uu);
              }}
            />
          ))}
        </div>
      )}

      {/* Confirmar bloqueio */}
      <AlertDialog
        open={!!blockTarget}
        onOpenChange={(o) => !o && setBlockTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bloquear usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              {blockTarget?.name} perderá acesso à plataforma. A conta pode ser
              reativada a qualquer momento.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={confirmBlock}
            >
              Bloquear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar mudança de role sensível (admin) */}
      <AlertDialog
        open={!!adminTarget}
        onOpenChange={(o) => !o && setAdminTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração de perfil</AlertDialogTitle>
            <AlertDialogDescription>
              {promoteRole === "ADMIN" ? (
                <>
                  Você está prestes a conceder privilégios de{" "}
                  <strong>administrador</strong> para{" "}
                  <strong>{adminTarget?.name}</strong>. Essa pessoa terá acesso
                  total ao painel administrativo.
                </>
              ) : (
                <>
                  Remover privilégios de administrador de{" "}
                  <strong>{adminTarget?.name}</strong>? O novo perfil será{" "}
                  <strong>{roleLabel(promoteRole)}</strong>.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmPromote}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function UserCard({
  u,
  pending,
  onToggleStatus,
  onChangeRole,
  onConfirmBlock,
  onConfirmPromote,
}: {
  u: UserAdmin;
  pending: boolean;
  onToggleStatus: (u: UserAdmin) => void;
  onChangeRole: (u: UserAdmin, role: string) => void;
  onConfirmBlock: (u: UserAdmin) => void;
  onConfirmPromote: (u: UserAdmin, role: string) => void;
}) {
  const initial = (u.name || u.email || "?").charAt(0).toUpperCase();
  const avatarColor = ROLE_AVATAR_COLOR[u.role] ?? ROLE_AVATAR_COLOR.USER;

  return (
    <div className="rounded-xl border border-border/60 bg-card/60 backdrop-blur-sm p-3 transition-all duration-200 hover:bg-card hover:border-primary/30 hover:shadow-md">
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "w-11 h-11 rounded-full grid place-items-center shrink-0 font-semibold text-base ring-1 bg-gradient-to-br",
            avatarColor
          )}
        >
          {initial}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground truncate tracking-tight">
              {u.name || "Sem nome"}
            </h3>
            <RoleBadge role={u.role} />
          </div>
          <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1">
            <span className="flex items-center gap-1 truncate">
              <Mail className="w-3 h-3 shrink-0" /> {u.email}
            </span>
            {u.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" /> {u.phone}
              </span>
            )}
            <span className="flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> {formatDate(u.createdAt)}
            </span>
          </div>
        </div>
        <UserStatusBadge status={u.status} />
      </div>

      <div className="flex flex-wrap items-center gap-2 pt-2 mt-2 border-t border-border/40">
        <Button
          size="sm"
          variant={u.status === "ACTIVE" ? "outline" : "default"}
          onClick={() => onToggleStatus(u)}
          disabled={pending || u.role === "ADMIN"}
          className={u.status !== "ACTIVE" ? "shadow-sm shadow-primary/20" : ""}
        >
          {pending ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : u.status === "ACTIVE" ? (
            <Ban className="w-3.5 h-3.5" />
          ) : (
            <CheckCircle2 className="w-3.5 h-3.5" />
          )}
          {u.status === "ACTIVE" ? "Bloquear" : "Ativar"}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="outline" className="h-8 w-8">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Alterar perfil</DropdownMenuLabel>
            {ROLE_OPTIONS.filter((r) => r.value !== u.role).map((r) => (
              <DropdownMenuItem
                key={r.value}
                onClick={() => {
                  // promover para ADMIN exige confirmação
                  if (r.value === "ADMIN") {
                    onConfirmPromote(u, "ADMIN");
                  } else if (u.role === "ADMIN") {
                    onConfirmPromote(u, r.value);
                  } else {
                    onChangeRole(u, r.value);
                  }
                }}
              >
                <Shield className="w-3.5 h-3.5" /> {r.label}
              </DropdownMenuItem>
            ))}
            {u.status !== "BLOCKED" && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onConfirmBlock(u)}
                >
                  <Ban className="w-3.5 h-3.5" /> Bloquear acesso
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function roleLabel(role: string): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}
