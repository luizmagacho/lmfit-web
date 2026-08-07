"use client";

import * as React from "react";
import { useState } from "react";
import { isAxiosError } from "axios";
import { http } from "@/lib/http";
import { enqueueCustomer } from "@/lib/pdv/customerOutbox";
import { flushNow } from "@/lib/pdv/syncEngine";
import { lmfitTokens } from "@/theme/tokens";
import { X } from "lucide-react";

export function NewCustomerModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: (customer: { id: string; name: string }) => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await http.post("/customers", {
        name,
        email: email || undefined,
        whatsapp: whatsapp || undefined,
        roles: ["customer"],
      });
      onSuccess({ id: data._id || data.id, name: data.name });
    } catch (err: any) {
      // Sem conexão (o servidor nunca respondeu, `err.response` vem vazio): entra na fila em
      // vez de travar o vendedor no meio da venda — o e-mail/WhatsApp digitados aqui se perdem
      // nesse caso (a fila só guarda o nome), mas o cliente pode ser completado depois que
      // sincronizar. Um erro de validação de verdade (nome duplicado etc.) continua mostrando
      // a mensagem real, já que entrar na fila nunca ia resolver isso sozinho.
      if (isAxiosError(err) && !err.response) {
        try {
          const localId = await enqueueCustomer(name.trim());
          onSuccess({ id: localId, name: name.trim() });
          void flushNow();
          return;
        } catch {
          // falls through to the generic error below
        }
      }
      setError(err.response?.data?.message || "Erro ao criar cliente");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div 
        className="bg-[var(--card-bg)] w-full max-w-md rounded-xl shadow-xl overflow-hidden border"
        style={{ borderColor: lmfitTokens.border }}
      >
        <div className="flex justify-between items-center p-4 border-b" style={{ borderColor: lmfitTokens.border }}>
          <h2 className="font-semibold text-lg" style={{ color: lmfitTokens.text }}>Novo Cliente</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-2 bg-red-50 text-red-600 text-sm rounded border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: lmfitTokens.text }}>
              Nome *
            </label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-transparent"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              placeholder="Ex: João Silva"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: lmfitTokens.text }}>
              WhatsApp (opcional)
            </label>
            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-transparent"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              placeholder="Ex: 11999999999"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: lmfitTokens.text }}>
              E-mail (opcional)
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border rounded-md px-3 py-2 text-sm bg-transparent"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
              placeholder="Ex: joao@email.com"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium rounded-md border bg-transparent hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim()}
              className="px-4 py-2 text-sm font-medium rounded-md text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: lmfitTokens.primary }}
            >
              {loading ? "Salvando..." : "Salvar e Selecionar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
