"use client";

import * as React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Save,
  Loader2,
  Info,
  Sparkles,
  Check,
  RotateCcw,
  Home,
  Building,
  Crown,
  UserRound,
  Infinity as InfinityIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  EmptyState,
  ErrorState,
  ListSkeleton,
  type PlanAdmin,
} from "@/components/admin/shared";
import { PLAN_CODES } from "@/lib/constants";
import { cn } from "@/lib/utils";

const BILLING_LABELS: Record<string, string> = {
  MONTHLY: "Mensal",
  ONCE: "Único",
};

interface DraftPlan {
  name: string;
  price: string;
  maxProperties: string;
  durationDays: string;
  billingCycle: string;
  active: boolean;
}

function toDraft(p: PlanAdmin): DraftPlan {
  return {
    name: p.name,
    price: String(p.price ?? 0),
    maxProperties: String(p.maxProperties ?? 0),
    durationDays: p.durationDays ? String(p.durationDays) : "",
    billingCycle: p.billingCycle || "MONTHLY",
    active: p.active,
  };
}

const PLAN_ICON: Record<string, React.ReactNode> = {
  [PLAN_CODES.START]: <Home className="w-4 h-4" />,
  [PLAN_CODES.PRO]: <Building className="w-4 h-4" />,
  [PLAN_CODES.BUSINESS]: <Crown className="w-4 h-4" />,
  [PLAN_CODES.ENTERPRISE]: <Crown className="w-4 h-4" />,
  [PLAN_CODES.OWNER_SINGLE]: <UserRound className="w-4 h-4" />,
};

export function PlansTab() {
  const qc = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery<{ plans: PlanAdmin[] }>({
    queryKey: ["admin", "plans"],
    queryFn: async () => {
      const res = await fetch("/api/plans?manage=1");
      if (!res.ok) throw new Error("Falha ao carregar planos");
      return res.json();
    },
  });

  const [drafts, setDrafts] = React.useState<Record<string, DraftPlan>>({});

  React.useEffect(() => {
    if (data?.plans) {
      setDrafts((prev) => {
        const next: Record<string, DraftPlan> = {};
        for (const p of data.plans) {
          next[p.id] = prev[p.id] ?? toDraft(p);
        }
        return next;
      });
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: Record<string, unknown>;
    }) => {
      const res = await fetch(`/api/plans/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error || "Falha ao salvar plano");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "plans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const save = (plan: PlanAdmin) => {
    const d = drafts[plan.id];
    if (!d) return;
    const price = Number(d.price.replace(",", "."));
    const maxProperties = Number(d.maxProperties);
    if (Number.isNaN(price) || price < 0) {
      toast.error("Preço inválido.");
      return;
    }
    if (Number.isNaN(maxProperties) || maxProperties < 0) {
      toast.error("Limite de imóveis inválido.");
      return;
    }
    const body: Record<string, unknown> = {
      name: d.name,
      price,
      maxProperties,
      billingCycle: d.billingCycle,
      active: d.active,
    };
    if (d.durationDays !== "") {
      const dur = Number(d.durationDays);
      if (!Number.isNaN(dur) && dur > 0) body.durationDays = dur;
    } else {
      body.durationDays = null;
    }
    updateMutation.mutate(
      { id: plan.id, body },
      {
        onSuccess: () => toast.success(`Plano "${d.name}" salvo.`),
      }
    );
  };

  const reset = (plan: PlanAdmin) => {
    setDrafts((prev) => ({ ...prev, [plan.id]: toDraft(plan) }));
    toast.info("Alterações descartadas.");
  };

  const isDirty = (plan: PlanAdmin): boolean => {
    const d = drafts[plan.id];
    if (!d) return false;
    const orig = toDraft(plan);
    return (
      d.name !== orig.name ||
      d.price !== orig.price ||
      d.maxProperties !== orig.maxProperties ||
      d.durationDays !== orig.durationDays ||
      d.billingCycle !== orig.billingCycle ||
      d.active !== orig.active
    );
  };

  if (isLoading) return <ListSkeleton rows={4} />;
  if (isError)
    return (
      <ErrorState
        message="Não foi possível carregar a lista de planos."
        onRetry={() => refetch()}
      />
    );
  if (!data?.plans?.length)
    return (
      <EmptyState
        icon={<Sparkles className="w-7 h-7" />}
        title="Nenhum plano configurado."
        description="Cadastre planos para que anunciantes possam assinar."
      />
    );

  return (
    <div className="p-4 space-y-4">
      {/* Aviso importante */}
      <div className="flex items-start gap-3 rounded-xl bg-primary/8 border border-primary/25 p-3.5 text-xs text-foreground/85">
        <div className="w-7 h-7 rounded-lg bg-primary/15 text-primary grid place-items-center shrink-0 ring-1 ring-primary/25">
          <Info className="w-3.5 h-3.5" />
        </div>
        <div className="leading-relaxed">
          <strong className="text-primary">Preços e limites são configuráveis</strong>{" "}
          — não há valores fixos no código. Edite cada card e clique em{" "}
          <em>Salvar</em> para aplicar.
        </div>
      </div>

      {data.plans
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((plan) => {
          const d = drafts[plan.id] ?? toDraft(plan);
          const dirty = isDirty(plan);
          return (
            <Card
              key={plan.id}
              className={cn(
                "p-4 gap-3 shadow-none border-border/60 bg-card/60 backdrop-blur-sm transition-all",
                d.active
                  ? "ring-1 ring-primary/20 hover:border-primary/40"
                  : "opacity-90 hover:opacity-100"
              )}
            >
              <div className="flex items-center gap-2 flex-wrap">
                <div
                  className={cn(
                    "w-9 h-9 rounded-lg grid place-items-center shrink-0 ring-1",
                    d.active
                      ? "bg-primary/15 text-primary ring-primary/25"
                      : "bg-muted text-muted-foreground ring-border/40"
                  )}
                >
                  {PLAN_ICON[plan.code] ?? <Sparkles className="w-4 h-4" />}
                </div>
                <h3 className="font-semibold text-foreground flex-1 min-w-0 truncate tracking-tight">
                  {d.name || "Sem nome"}
                </h3>
                <Badge
                  variant="outline"
                  className="bg-muted/50 text-muted-foreground border-border/60 font-mono text-[10px]"
                >
                  {plan.code}
                </Badge>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={d.active}
                    onCheckedChange={(checked) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [plan.id]: { ...d, active: checked },
                      }))
                    }
                  />
                  <span
                    className={cn(
                      "text-[11px] font-medium",
                      d.active ? "text-emerald-400" : "text-muted-foreground"
                    )}
                  >
                    {d.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nome">
                  <Input
                    value={d.name}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [plan.id]: { ...d, name: e.target.value },
                      }))
                    }
                    className="h-9"
                  />
                </Field>
                <Field label="Ciclo de cobrança">
                  <Select
                    value={d.billingCycle}
                    onValueChange={(v) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [plan.id]: { ...d, billingCycle: v },
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 w-full bg-background">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MONTHLY">Mensal</SelectItem>
                      <SelectItem value="ONCE">Único</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Preço (R$)">
                  <Input
                    value={d.price}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [plan.id]: { ...d, price: e.target.value },
                      }))
                    }
                    inputMode="decimal"
                    className="h-9 tabular-nums"
                  />
                </Field>
                <Field label="Máx. de imóveis">
                  <Input
                    value={d.maxProperties}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [plan.id]: { ...d, maxProperties: e.target.value },
                      }))
                    }
                    inputMode="numeric"
                    className="h-9 tabular-nums"
                  />
                </Field>
                <Field label="Duração (dias, opcional)">
                  <Input
                    value={d.durationDays}
                    onChange={(e) =>
                      setDrafts((prev) => ({
                        ...prev,
                        [plan.id]: { ...d, durationDays: e.target.value },
                      }))
                    }
                    placeholder="Ex.: 30"
                    inputMode="numeric"
                    className="h-9 tabular-nums"
                  />
                </Field>
              </div>

              {plan.description && (
                <p className="text-[11px] text-muted-foreground italic leading-relaxed">
                  {plan.description}
                </p>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                <Button
                  size="sm"
                  onClick={() => save(plan)}
                  disabled={!dirty || updateMutation.isPending}
                  className={cn(dirty && "shadow-sm shadow-primary/20")}
                >
                  {updateMutation.isPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Save className="w-3.5 h-3.5" />
                  )}
                  Salvar
                </Button>
                {dirty && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => reset(plan)}
                    disabled={updateMutation.isPending}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Desfazer
                  </Button>
                )}
                {!dirty && (
                  <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Salvo
                  </span>
                )}
              </div>
            </Card>
          );
        })}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="eyebrow !text-[10px] text-muted-foreground/80">
        {label}
      </Label>
      {children}
    </div>
  );
}

export { BILLING_LABELS };
