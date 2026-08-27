"use client";

import { useState, useMemo } from "react";
import { Calculator, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/geo";
import { cn } from "@/lib/utils";

/** Calculadora de financiamento inline (Price table — SAC simplificado). */
export function FinanceCalculator({
  price,
  purpose,
}: {
  price: number;
  purpose: string;
}) {
  const [open, setOpen] = useState(false);
  const [downPct, setDownPct] = useState(20); // 20% entrada
  const [years, setYears] = useState(30); // 30 anos
  const [rate, setRate] = useState(10.5); // 10.5% a.a.

  const { financed, monthly, total, interest } = useMemo(() => {
    const down = (price * downPct) / 100;
    const fin = price - down;
    const i = rate / 100 / 12; // taxa mensal
    const n = years * 12; // nº parcelas
    // Tabela Price: PMT = PV * [i(1+i)^n] / [(1+i)^n - 1]
    const monthlyPmt =
      i === 0 ? fin / n : (fin * (i * Math.pow(1 + i, n))) / (Math.pow(1 + i, n) - 1);
    const totalPaid = monthlyPmt * n;
    return {
      financed: fin,
      monthly: monthlyPmt,
      total: totalPaid + down,
      interest: totalPaid - fin,
    };
  }, [price, downPct, years, rate]);

  if (purpose !== "SALE") return null; // só para venda

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-sm font-medium text-foreground transition-colors"
      >
        <Calculator className="w-4 h-4 text-primary" />
        Simular financiamento
      </button>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calculator className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Financiamento</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-muted-foreground hover:text-foreground p-1"
          aria-label="Fechar calculadora"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Entrada */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-xs text-muted-foreground">Entrada</Label>
          <span className="text-xs font-semibold text-foreground">
            {downPct}% · {formatPrice((price * downPct) / 100)}
          </span>
        </div>
        <Slider
          value={[downPct]}
          onValueChange={(v) => setDownPct(v[0])}
          min={10}
          max={50}
          step={5}
          className="w-full"
        />
      </div>

      {/* Prazo */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-xs text-muted-foreground">Prazo</Label>
          <span className="text-xs font-semibold text-foreground">{years} anos</span>
        </div>
        <Slider
          value={[years]}
          onValueChange={(v) => setYears(v[0])}
          min={5}
          max={35}
          step={1}
          className="w-full"
        />
      </div>

      {/* Taxa */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <Label className="text-xs text-muted-foreground">Taxa (a.a.)</Label>
          <span className="text-xs font-semibold text-foreground">{rate.toFixed(1)}%</span>
        </div>
        <Slider
          value={[rate]}
          onValueChange={(v) => setRate(v[0])}
          min={7}
          max={15}
          step={0.1}
          className="w-full"
        />
      </div>

      <div className="border-t border-border pt-3 space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Valor financiado</span>
          <span className="text-foreground font-medium">{formatPrice(financed)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Parcela estimada</span>
          <span className="price text-xl font-bold text-primary">
            {formatPrice(monthly)}
            <span className="text-xs text-muted-foreground font-normal">/mês</span>
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Total a pagar</span>
          <span className="text-foreground font-medium">{formatPrice(total)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Juros</span>
          <span className="text-amber-500 font-medium">{formatPrice(interest)}</span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">
        * Valores estimados via Tabela Price. Consulte imobiliária para condições reais.
      </p>
    </div>
  );
}
