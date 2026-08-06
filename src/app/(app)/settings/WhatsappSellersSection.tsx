"use client";

import { useEffect, useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { lmfitTokens } from "@/theme/tokens";
import { useLanguage } from "@/context/LanguageContext";
import { http } from "@/lib/http";
import { extractListItems, documentId } from "@/lib/normalizeApiList";

type SellerUser = { _id: string; name?: string; email?: string; assignedLocationId?: string };

type WhatsappSender = {
  _id: string;
  waId: string;
  label?: string;
  allowed: boolean;
  linkedUserId?: SellerUser | string | null;
};

function linkedUserLabel(sender: WhatsappSender): string | null {
  const u = sender.linkedUserId;
  if (!u || typeof u === "string") return null;
  return u.name || u.email || null;
}

export function WhatsappSellersSection() {
  const { language } = useLanguage();
  const isEn = language === "en";

  const [senders, setSenders] = useState<WhatsappSender[]>([]);
  const [users, setUsers] = useState<SellerUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [waId, setWaId] = useState("");
  const [label, setLabel] = useState("");
  const [linkedUserId, setLinkedUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function reload() {
    const [sendersRes, usersRes] = await Promise.all([
      http.get("/internal/whatsapp/senders"),
      http.get("/users", { params: { page: 1, limit: 200 } }),
    ]);
    setSenders(extractListItems(sendersRes.data) as WhatsappSender[]);
    setUsers(extractListItems(usersRes.data) as SellerUser[]);
  }

  useEffect(() => {
    reload().finally(() => setLoading(false));
  }, []);

  async function handleAdd() {
    if (!waId.trim()) return;
    setSaving(true);
    setError("");
    try {
      await http.post("/internal/whatsapp/senders", {
        waId: waId.trim(),
        label: label.trim() || undefined,
        linkedUserId: linkedUserId || undefined,
      });
      setWaId("");
      setLabel("");
      setLinkedUserId("");
      await reload();
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          (isEn ? "Could not add this number." : "Não foi possível adicionar esse número."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleAllowed(sender: WhatsappSender) {
    setSenders((prev) => prev.map((s) => (s._id === sender._id ? { ...s, allowed: !s.allowed } : s)));
    try {
      await http.patch(`/internal/whatsapp/senders/${sender._id}`, { allowed: !sender.allowed });
    } catch {
      await reload();
    }
  }

  async function handleRemove(sender: WhatsappSender) {
    const confirmMsg = isEn
      ? `Remove ${sender.label || sender.waId}? They will no longer be able to sell via WhatsApp.`
      : `Remover ${sender.label || sender.waId}? Esse número não vai mais poder vender pelo WhatsApp.`;
    if (!window.confirm(confirmMsg)) return;
    await http.delete(`/internal/whatsapp/senders/${sender._id}`);
    await reload();
  }

  return (
    <div className="space-y-4 pt-6 border-t" style={{ borderColor: lmfitTokens.border }}>
      <div>
        <h3 className="text-sm font-bold tracking-wide uppercase text-neutral-400 dark:text-neutral-500">
          {isEn ? "Authorized Sellers" : "Vendedores Autorizados"}
        </h3>
        <p className="text-xs mt-1" style={{ color: lmfitTokens.textMuted }}>
          {isEn
            ? "Phone numbers allowed to sell by voice or text on WhatsApp — the sale is registered under the linked user's store, with real stock deduction."
            : "Números autorizados a vender por voz ou texto no WhatsApp — a venda é registrada na loja do usuário vinculado, com baixa de estoque de verdade."}
        </p>
      </div>

      {senders.length > 0 && (
        <div className="overflow-x-auto rounded-xl border" style={{ borderColor: lmfitTokens.border }}>
          <table className="w-full text-sm">
            <tbody>
              {senders.map((s) => (
                <tr key={s._id} className="border-b last:border-0" style={{ borderColor: lmfitTokens.border }}>
                  <td className="px-3.5 py-2.5">
                    <div className="font-medium" style={{ color: lmfitTokens.text }}>
                      {s.label || (isEn ? "(no name)" : "(sem nome)")}
                    </div>
                    <div className="text-xs" style={{ color: lmfitTokens.textMuted }}>
                      {s.waId}
                    </div>
                  </td>
                  <td className="px-3.5 py-2.5 text-xs" style={{ color: lmfitTokens.textMuted }}>
                    {linkedUserLabel(s) || (isEn ? "No linked user" : "Sem usuário vinculado")}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={s.allowed}
                        onChange={() => toggleAllowed(s)}
                        className="w-4 h-4 rounded accent-violet-500"
                      />
                      <span className="text-xs" style={{ color: lmfitTokens.textMuted }}>
                        {isEn ? "Allowed" : "Permitido"}
                      </span>
                    </label>
                  </td>
                  <td className="px-3.5 py-2.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleRemove(s)}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      aria-label={isEn ? "Remove" : "Remover"}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && senders.length === 0 && (
        <p className="text-xs italic" style={{ color: lmfitTokens.textMuted }}>
          {isEn ? "No sellers added yet." : "Nenhum vendedor cadastrado ainda."}
        </p>
      )}

      {/* Not a <form> on purpose — this section renders inside SettingsClient's own outer <form>,
          and nested forms are invalid HTML (the browser silently mis-handles submission). */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            {isEn ? "Phone (with country code)" : "Telefone (com DDI)"}
          </label>
          <input
            type="tel"
            value={waId}
            onChange={(e) => setWaId(e.target.value)}
            placeholder="Ex: 5511999998888"
            className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            {isEn ? "Name" : "Nome"}
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={isEn ? "Ex: John (seller)" : "Ex: Luiz (vendedor)"}
            className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            {isEn ? "Linked user (store)" : "Usuário vinculado (loja)"}
          </label>
          <select
            value={linkedUserId}
            onChange={(e) => setLinkedUserId(e.target.value)}
            className="w-full px-3.5 py-2.5 rounded-xl border bg-gray-50/50 dark:bg-neutral-900/50 text-sm outline-none transition-all focus:ring-1 focus:ring-violet-500"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          >
            <option value="">{isEn ? "None" : "Nenhum"}</option>
            {users.map((u) => (
              <option key={documentId(u)} value={documentId(u)}>
                {u.name || u.email}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleAdd}
          disabled={saving || !waId.trim()}
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
          style={{ backgroundColor: lmfitTokens.primary }}
        >
          <UserPlus className="w-4 h-4" />
          {isEn ? "Add" : "Adicionar"}
        </button>
      </div>

      {!linkedUserId && waId.trim() && (
        <p className="text-xs" style={{ color: lmfitTokens.textMuted }}>
          {isEn
            ? "Without a linked user, this number won't know which store location to deduct stock from — the sale will be blocked until you link one."
            : "Sem um usuário vinculado, esse número não vai saber de qual loja tirar o estoque — a venda fica bloqueada até vincular um."}
        </p>
      )}

      {error && (
        <p className="text-xs font-medium text-red-500">{error}</p>
      )}
    </div>
  );
}
