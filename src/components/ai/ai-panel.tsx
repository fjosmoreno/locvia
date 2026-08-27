"use client";

import { useState, useRef, useEffect } from "react";
import { Sparkles, Send, X, Loader2, Trash2, MapPin, MessageCircle, ChevronUp } from "lucide-react";
import { useUI } from "@/lib/store";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Apartamentos de 2 quartos perto de mim",
  "Loja de até R$ 5 mil no Eldorado",
  "Casas para comprar com garagem",
  "Salas comerciais no centro",
  "O que existe para alugar aqui?",
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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [ai.messages, ai.loading]);

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
        // Duplo flyTo: um imediato, outro após os properties carregarem (garante que o mapa
        // voe para a região correta mesmo com race conditions de query/cache)
        flyTo(data.flyTo.lat, data.flyTo.lng, data.flyTo.zoom || 14);
        setTimeout(() => flyTo(data.flyTo.lat, data.flyTo.lng, data.flyTo.zoom || 14), 1200);
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
      <div className="absolute left-3 bottom-8 z-[1050] pointer-events-auto md:left-3">
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

  // MOBILE: após resposta com imóveis, mostrar chip compacto (mapa fica visível)
  // Desktop mantém painel completo.
  const hasResults = ai.highlightedIds && ai.highlightedIds.length > 0;
  const lastAssistantMsg = [...ai.messages].reverse().find((m) => m.role === "assistant");

  return (
    <>
      {/* MOBILE — chip compacto flutuante no topo quando há resultados */}
      <div className="md:hidden absolute left-3 right-3 top-[64px] z-[1050] pointer-events-auto animate-scale-in">
        <div
          className="rounded-2xl flex items-center gap-2.5 p-2 pl-3"
          style={{
            background: "rgba(19, 28, 49, 0.94)",
            backdropFilter: "saturate(180%) blur(18px)",
            WebkitBackdropFilter: "saturate(180%) blur(18px)",
            border: "1px solid rgba(0, 212, 255, 0.25)",
            boxShadow:
              "0 4px 12px rgba(0,0,0,0.40), 0 12px 32px rgba(0,0,0,0.45), 0 0 0 1px rgba(0,212,255,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",
          }}
        >
          <div
            className="w-8 h-8 rounded-lg grid place-items-center shrink-0"
            style={{ background: "var(--primary)", color: "var(--primary-foreground)" }}
          >
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            {hasResults ? (
              <>
                <div className="text-[12px] font-bold text-primary leading-tight">
                  {ai.highlightedIds!.length} imóveis encontrados
                </div>
                {lastAssistantMsg && (
                  <div className="text-[10.5px] text-muted-foreground truncate leading-tight mt-0.5">
                    {lastAssistantMsg.content.slice(0, 60)}
                  </div>
                )}
              </>
            ) : (
              <div className="text-[12px] font-medium text-foreground truncate">
                Pergunte ao LOCVIA
              </div>
            )}
          </div>
          {/* Botão expandir (abre o painel completo para nova pergunta) */}
          <button
            onClick={() => {
              inputRef.current?.focus();
            }}
            className="shrink-0 w-8 h-8 grid place-items-center rounded-lg bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
            aria-label="Nova pergunta"
            title="Nova pergunta"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
          {hasResults && (
            <button
              onClick={clearAi}
              className="shrink-0 w-8 h-8 grid place-items-center rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              aria-label="Limpar busca"
              title="Limpar busca"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={closeAi}
            className="shrink-0 w-8 h-8 grid place-items-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            aria-label="Fechar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MOBILE — input fixo no rodapé para nova pergunta (não cobre o mapa) */}
      <div className="md:hidden absolute left-3 right-3 bottom-[64px] z-[1050] pointer-events-auto animate-panel-in">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            ask(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Descreva o imóvel que procura…"
            disabled={ai.loading}
            aria-label="Pergunte ao LOCVIA"
            className="flex-1 h-12 px-4 rounded-full text-sm outline-none"
            style={{
              background: "rgba(19, 28, 49, 0.94)",
              backdropFilter: "saturate(180%) blur(18px)",
              WebkitBackdropFilter: "saturate(180%) blur(18px)",
              border: "1px solid rgba(255, 255, 255, 0.10)",
              color: "var(--foreground)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.40)",
            }}
          />
          <button
            type="submit"
            disabled={ai.loading || !input.trim()}
            aria-label="Enviar pergunta"
            className={cn(
              "w-12 h-12 grid place-items-center rounded-full shrink-0 transition-all",
              "bg-primary text-primary-foreground shadow-md",
              "disabled:opacity-40 disabled:cursor-not-allowed",
              "active:scale-94"
            )}
          >
            {ai.loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
        {/* Loading badge enquanto processa */}
        {ai.loading && (
          <div className="mt-2 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
            procurando imóveis…
          </div>
        )}
        {/* Erro */}
        {ai.error && (
          <div className="mt-2 text-[11px] text-destructive bg-destructive/10 rounded-lg px-3 py-2 text-center">
            {ai.error}
          </div>
        )}
      </div>

      {/* DESKTOP — painel completo (mantém comportamento anterior) */}
      <div className="hidden md:block absolute left-3 bottom-8 z-[1050] w-[calc(100%-24px)] max-w-sm pointer-events-auto animate-scale-in">
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

          {/* Input desktop */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              ask(input);
            }}
            className="p-3 border-t border-border flex items-center gap-2"
          >
            <input
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
                "hover:brightness-110 active:scale-94"
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
    </>
  );
}
