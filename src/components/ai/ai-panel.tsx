"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, Loader2, Trash2, MapPin } from "lucide-react";
import { useUI } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Encontre apartamentos de 2 quartos perto de mim",
  "Quero uma loja de até R$ 5 mil no Eldorado",
  "Casas para comprar com garagem",
  "Salas comerciais pequenas no centro",
  "O que existe para alugar nesta região?",
];

export function AiPanel() {
  const {
    ai,
    openAi,
    closeAi,
    setAiLoading,
    addAiMessage,
    setAiResult,
    setAiError,
    clearAi,
    userLocation,
    flyTo,
  } = useUI();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // scroll para baixo ao receber mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ai.messages, ai.loading]);

  async function ask(text: string) {
    const message = text.trim();
    if (!message || ai.loading) return;

    // adiciona mensagem do usuário
    addAiMessage({ role: "user", content: message, timestamp: Date.now() });
    setInput("");
    setAiLoading(true);
    setAiError(null);

    try {
      const history = ai.messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch("/api/ai/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message,
          history,
          userLocation: userLocation || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "Tive um problema. Tente novamente.");
        return;
      }
      setAiResult({
        reply: data.reply,
        filters: data.filters,
        propertyIds: (data.properties || []).map((p: any) => p.id),
      });
      // voa para a localização extraída (se IA sugeriu)
      if (data.flyTo) {
        flyTo(data.flyTo.lat, data.flyTo.lng, data.flyTo.zoom || 14);
      }
    } catch {
      setAiError("Não consegui conectar. Tente novamente.");
    }
  }

  // Estado fechado — botão flutuante "✨ Pergunte ao LOCVIA"
  if (!ai.open) {
    return (
      <div className="absolute left-3 bottom-8 z-[1050] pointer-events-auto">
        <button
          onClick={openAi}
          className="search-area-btn animate-scale-in"
          style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
        >
          <Sparkles className="w-3.5 h-3.5" />
          Pergunte ao LOCVIA
        </button>
      </div>
    );
  }

  // Estado aberto — painel conversacional sobre o mapa (não toma a tela)
  return (
    <div className="absolute left-3 bottom-8 z-[1050] w-[calc(100%-24px)] max-w-sm pointer-events-auto animate-scale-in">
      <div
        className="rounded-2xl border border-border overflow-hidden flex flex-col"
        style={{
          background: "rgba(11, 17, 32, 0.92)",
          backdropFilter: "blur(16px)",
          boxShadow: "var(--shadow-xl), var(--glow-primary)",
          maxHeight: "min(70vh, 520px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div
              className="w-7 h-7 rounded-lg grid place-items-center"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div>
              <div className="text-sm font-semibold text-foreground">Pergunte ao LOCVIA</div>
              <div className="text-[10px] text-muted-foreground -mt-0.5">
                {ai.highlightedIds ? `${ai.highlightedIds.length} imóveis destacados` : "busca conversacional"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {ai.highlightedIds && (
              <button
                onClick={clearAi}
                className="text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-secondary transition-colors flex items-center gap-1"
                title="Limpar busca da IA"
              >
                <Trash2 className="w-3 h-3" /> Limpar
              </button>
            )}
            <button
              onClick={closeAi}
              className="w-7 h-7 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mensagens */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto scroll-area px-4 py-3 space-y-3 min-h-[120px]"
        >
          {ai.messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Descreva o imóvel que procura em linguagem natural. Exemplos:
              </p>
              <div className="space-y-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-secondary/60 hover:bg-secondary text-foreground/90 transition-colors border border-border"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {ai.messages.map((m, i) => (
            <div
              key={i}
              className={cn(
                "flex",
                m.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              <div
                className={cn(
                  "max-w-[85%] px-3 py-2 rounded-2xl text-sm",
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-secondary text-foreground rounded-bl-md"
                )}
              >
                {m.content}
                {m.propertyIds && m.propertyIds.length > 0 && (
                  <div className="text-[10px] mt-1 opacity-80 flex items-center gap-1">
                    <MapPin className="w-2.5 h-2.5" />
                    {m.propertyIds.length} no mapa
                  </div>
                )}
              </div>
            </div>
          ))}

          {ai.loading && (
            <div className="flex justify-start">
              <div className="bg-secondary text-foreground rounded-2xl rounded-bl-md px-3 py-2 flex items-center gap-2 text-sm">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                procurando imóveis…
              </div>
            </div>
          )}

          {ai.error && (
            <div className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
              {ai.error}
            </div>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="p-3 border-t border-border flex items-center gap-2"
        >
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Descreva o imóvel que procura…"
            disabled={ai.loading}
            className="bg-secondary border-border text-sm h-10"
            autoFocus
          />
          <Button
            type="submit"
            size="icon"
            disabled={ai.loading || !input.trim()}
            className="h-10 w-10 shrink-0"
          >
            {ai.loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
