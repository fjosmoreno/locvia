"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, Loader2, Trash2, MapPin } from "lucide-react";
import { useUI } from "@/lib/store";
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
  const inputRef = useRef<HTMLInputElement>(null);

  // scroll para baixo ao receber mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ai.messages, ai.loading]);

  // foca o input ao abrir
  useEffect(() => {
    if (ai.open) {
      const t = setTimeout(() => inputRef.current?.focus(), 220);
      return () => clearTimeout(t);
    }
  }, [ai.open]);

  async function ask(text: string) {
    const message = text.trim();
    if (!message || ai.loading) return;

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
        propertyIds: (data.properties || []).map((p: { id: string }) => p.id),
      });
      if (data.flyTo) {
        flyTo(data.flyTo.lat, data.flyTo.lng, data.flyTo.zoom || 14);
      }
    } catch {
      setAiError("Não consegui conectar. Tente novamente.");
    }
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(input);
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
          aria-label="Pergunte ao LOCVIA — busca conversacional"
        >
          <Sparkles className="w-3.5 h-3.5" />
          Pergunte ao LOCVIA
        </button>
      </div>
    );
  }

  // Estado aberto — painel conversacional sobre o mapa (não toma a tela)
  return (
    <div className="absolute left-3 right-3 sm:right-auto bottom-8 z-[1050] w-[calc(100%-24px)] sm:w-auto sm:max-w-sm pointer-events-auto animate-scale-in">
      <div
        className="overlay-panel flex flex-col"
        style={{ maxHeight: "min(70vh, 560px)" }}
      >
        {/* Header */}
        <div className="overlay-panel-header">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="overlay-panel-icon"
              style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
            >
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">Pergunte ao LOCVIA</div>
              <div className="text-[10px] text-muted-foreground -mt-0.5 truncate">
                {ai.highlightedIds
                  ? `${ai.highlightedIds.length} imóveis destacados`
                  : "busca conversacional"}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {ai.highlightedIds && (
              <button
                onClick={clearAi}
                className="overlay-panel-close"
                title="Limpar busca da IA"
                aria-label="Limpar busca da IA"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={closeAi}
              className="overlay-panel-close"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Mensagens */}
        <div
          ref={scrollRef}
          className="overlay-scroll flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[140px]"
        >
          {ai.messages.length === 0 && (
            <div className="space-y-2.5">
              <p className="text-xs text-muted-foreground px-1 leading-relaxed">
                Descreva o imóvel que procura em linguagem natural — eu encontro no mapa.
              </p>
              <div className="space-y-1.5">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => ask(s)}
                    className="suggestion-pill"
                  >
                    <span>{s}</span>
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
                  "chat-bubble",
                  m.role === "user" ? "is-user" : "is-assistant"
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
              <div className="chat-bubble is-assistant flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                procurando imóveis…
              </div>
            </div>
          )}

          {ai.error && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl px-3 py-2">
              {ai.error}
            </div>
          )}
        </div>

        {/* Input — 44px touch target */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="p-3 border-t border-border flex items-center gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Descreva o imóvel que procura…"
            disabled={ai.loading}
            aria-label="Pergunte ao LOCVIA"
            className={cn(
              "glass-input flex-1 h-11 px-4 rounded-full text-sm outline-none",
              "placeholder:text-muted-foreground/70"
            )}
          />
          <button
            type="submit"
            disabled={ai.loading || !input.trim()}
            aria-label="Enviar pergunta"
            className={cn(
              "w-11 h-11 grid place-items-center rounded-full shrink-0 transition-all",
              "bg-primary text-primary-foreground shadow-md",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "hover:brightness-110 active:scale-94",
              !ai.loading && input.trim() && "shadow-[0_0_0_3px_rgba(0,212,255,0.18),0_0_22px_rgba(0,212,255,0.28)]"
            )}
          >
            {ai.loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
