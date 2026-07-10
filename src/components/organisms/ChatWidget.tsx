"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, Loader2 } from "lucide-react";
import { lmfitTokens } from "@/theme/tokens";
import { sendPublicChatMessage, type ChatMessage } from "@/lib/publicChat";
import { useCartStore } from "@/stores/useCartStore";

const MAX_HISTORY = 20;
const GREETING: DisplayMessage = {
  role: "assistant",
  content: "Oi! Posso ajudar a encontrar um produto, ver preços de atacado ou tirar dúvidas sobre a loja. O que você procura?",
};

type DisplayMessage = ChatMessage & { addedToCart?: boolean; isOrder?: boolean };

// API responses format monetary fields as pt-BR strings (e.g. "299,90"); parse defensively
// since chat actions may carry either a string or a plain number.
function extractPrice(val: unknown): number {
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const parsed = parseFloat(val.replace(/\./g, "").replace(",", "."));
    if (!isNaN(parsed)) return parsed;
  }
  return 0;
}

export function ChatWidget() {
  const cart = useCartStore();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([GREETING]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  async function submit() {
    const text = input.trim();
    if (!text || sending) return;
    setError(null);
    setInput("");
    const next: DisplayMessage[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setSending(true);
    try {
      const history = next.slice(-MAX_HISTORY).map(({ role, content }) => ({ role, content }));
      const { reply, actions } = await sendPublicChatMessage(text, history);

      let addedToCart = false;
      let isOrder = false;
      for (const action of actions) {
        if (action.type !== "add_to_cart") continue;
        cart.addOrIncrement(
          {
            variantId: action.variantId,
            productId: action.productId,
            productName: action.productName,
            sku: action.sku,
            color: action.color,
            size: action.size,
            priceRetail: extractPrice(action.priceRetail),
            priceWholesale: action.priceWholesale === null ? null : extractPrice(action.priceWholesale),
            minWholesaleQty: action.minWholesaleQty,
            imageUrl: action.imageUrl,
          },
          action.quantity,
          action.isOrder,
        );
        addedToCart = true;
        if (action.isOrder) isOrder = true;
      }
      setMessages((prev) => [...prev, { role: "assistant", content: reply, addedToCart, isOrder }]);
    } catch {
      setError("Não foi possível enviar sua mensagem agora. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open ? (
        <div
          className="w-[min(90vw,340px)] h-[min(70vh,480px)] rounded-2xl border shadow-xl flex flex-col overflow-hidden bg-[var(--card-bg)]"
          style={{ borderColor: lmfitTokens.border }}
        >
          <div
            className="flex items-center justify-between px-4 py-3 border-b"
            style={{ borderColor: lmfitTokens.border, backgroundColor: lmfitTokens.primary }}
          >
            <span className="text-sm font-semibold text-white">Assistente da loja</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Fechar chat"
              className="text-white/90 hover:text-white"
            >
              <X size={18} />
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === "user" ? "items-end" : "items-start"}`}>
                <div
                  className="max-w-[85%] rounded-xl px-3 py-2 text-sm leading-snug whitespace-pre-wrap"
                  style={
                    m.role === "user"
                      ? { backgroundColor: lmfitTokens.primary, color: "#fff" }
                      : { backgroundColor: "var(--lmfit-surface)", color: lmfitTokens.text }
                  }
                >
                  {m.content}
                </div>
                {m.addedToCart ? (
                  <a
                    href="/checkout"
                    className="mt-1 text-xs font-medium underline"
                    style={{ color: lmfitTokens.primary }}
                  >
                    {m.isOrder ? "Ver carrinho e confirmar encomenda →" : "Ver carrinho e finalizar compra →"}
                  </a>
                ) : null}
              </div>
            ))}
            {sending ? (
              <div className="flex justify-start">
                <div
                  className="rounded-xl px-3 py-2 text-sm flex items-center gap-2"
                  style={{ backgroundColor: "var(--lmfit-surface)", color: lmfitTokens.textMuted }}
                >
                  <Loader2 size={14} className="animate-spin" />
                  digitando...
                </div>
              </div>
            ) : null}
          </div>

          {error ? (
            <p className="px-3 text-xs" style={{ color: lmfitTokens.error }}>
              {error}
            </p>
          ) : null}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
            className="flex items-center gap-2 p-3 border-t"
            style={{ borderColor: lmfitTokens.border }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escreva sua mensagem..."
              className="flex-1 min-h-10 rounded-lg border px-3 py-1.5 text-sm bg-[var(--card-bg)]"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              aria-label="Enviar"
              className="flex items-center justify-center w-10 h-10 rounded-lg text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
              style={{ backgroundColor: lmfitTokens.primary }}
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Fechar chat" : "Abrir chat"}
        className="flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg hover:opacity-90 active:scale-95 transition-all"
        style={{ backgroundColor: lmfitTokens.primary }}
      >
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </div>
  );
}
