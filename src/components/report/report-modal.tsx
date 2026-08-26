"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useUI } from "@/lib/store";
import { REPORT_REASONS } from "@/lib/constants";
import { toast } from "sonner";
import { Flag, Loader2 } from "lucide-react";

export function ReportModal() {
  const { drawer, reportPropertyId, closeReport } = useUI();
  const open = drawer === "report";
  const qc = useQueryClient();
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: reportPropertyId, reason, description }),
      });
      if (!res.ok) throw new Error();
    },
    onSuccess: () => {
      toast.success("Denúncia enviada. Nossa equipe irá analisar.");
      qc.invalidateQueries({ queryKey: ["reports"] });
      setReason("");
      setDescription("");
      closeReport();
    },
    onError: () => toast.error("Não foi possível enviar a denúncia."),
  });

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason) {
      toast.error("Selecione um motivo.");
      return;
    }
    mutation.mutate();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && closeReport()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-destructive" /> Denunciar anúncio
          </DialogTitle>
          <DialogDescription>
            Ajude-nos a manter a plataforma íntegra. Informe o problema com este imóvel.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Motivo</Label>
            <RadioGroup value={reason} onValueChange={setReason} className="mt-2 space-y-1.5">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r}
                  htmlFor={`reason-${r}`}
                  className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent/50 cursor-pointer text-sm"
                >
                  <RadioGroupItem id={`reason-${r}`} value={r} />
                  {r}
                </label>
              ))}
            </RadioGroup>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Detalhes (opcional)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o problema..."
              className="mt-1"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeReport}>
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
              Enviar denúncia
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
