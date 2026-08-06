"use client";

import { useState } from "react";
import { globalHttp } from "@/lib/globalHttp";

/** Ilha client isolada: todo o estado do formulário e a chamada de API ficam fora do shell
 *  servidor da landing — só quem interage com o form paga esse JS. */
export function StoreRequestForm() {
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [desiredDomain, setDesiredDomain] = useState("");
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState(false);

  async function handleRequestSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setFormSubmitting(true);
    try {
      await globalHttp.post("/public/tenants/request", {
        storeName,
        ownerName,
        ownerEmail,
        ownerPhone,
        desiredDomain,
      });
      setFormSuccess(true);
    } catch (err: any) {
      console.error("Erro ao solicitar loja na landing page:", err);
      const msg = err.response?.data?.message;
      setFormError(
        Array.isArray(msg) ? msg.join(", ") : msg || "Erro ao enviar solicitação. Verifique os dados e tente novamente.",
      );
    } finally {
      setFormSubmitting(false);
    }
  }

  if (formSuccess) {
    return (
      <div className="space-y-4 py-8 text-center" style={{ color: "white" }}>
        <div
          className="w-16 h-16 bg-white/20 text-white rounded-full flex items-center justify-center mx-auto border border-white/40 mb-4 animate-bounce"
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-8 h-8 animate-none">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
        </div>
        <h3 className="text-2xl font-bold">Solicitação Recebida com Sucesso!</h3>
        <p className="text-white/80 max-w-md mx-auto">
          Sua loja online <strong>{storeName}</strong> estará ativa em até <strong>24 horas</strong>.
        </p>
        <div className="bg-white/10 p-5 rounded-2xl border border-white/20 text-sm max-w-sm mx-auto text-left space-y-2 my-6">
          <p>🌐 <strong>Domínio:</strong> {desiredDomain}.kivoni.com.br</p>
          <p>👤 <strong>Responsável:</strong> {ownerName}</p>
          <p>📧 <strong>E-mail:</strong> {ownerEmail}</p>
        </div>
        <p className="text-xs text-white/60 mb-6">Enviamos um e-mail de confirmação para {ownerEmail}.</p>
        <button
          onClick={() => {
            setFormSuccess(false);
            setStoreName("");
            setOwnerName("");
            setOwnerEmail("");
            setOwnerPhone("");
            setDesiredDomain("");
          }}
          className="kivo-btn"
          style={{ background: "white", color: "#7c3aed", margin: "0 auto" }}
        >
          Solicitar Outra Loja
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      {formError && (
        <div className="bg-red-500/20 border border-red-500/30 text-red-200 p-4 rounded-xl text-sm font-medium mb-4 text-left">
          {formError}
        </div>
      )}

      <form onSubmit={handleRequestSubmit} className="kivo-cta-form">
        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="landing-store-name">Nome da Loja / Empresa</label>
          <input
            id="landing-store-name"
            type="text"
            placeholder="Ex: Minha Confecção"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
            disabled={formSubmitting}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="landing-owner-name">Nome do Responsável</label>
          <input
            id="landing-owner-name"
            type="text"
            placeholder="Seu nome completo"
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            required
            disabled={formSubmitting}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="landing-owner-email">E-mail do Responsável</label>
          <input
            id="landing-owner-email"
            type="email"
            placeholder="voce@dominio.com"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            required
            disabled={formSubmitting}
          />
        </div>

        <div style={{ marginBottom: "1rem" }}>
          <label htmlFor="landing-owner-phone">WhatsApp / Celular</label>
          <input
            id="landing-owner-phone"
            type="text"
            placeholder="Ex: (11) 99999-9999"
            value={ownerPhone}
            onChange={(e) => setOwnerPhone(e.target.value)}
            required
            disabled={formSubmitting}
          />
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <label htmlFor="landing-desired-domain">Link desejado (Subdomínio)</label>
          <div className="domain-input-wrapper">
            <input
              id="landing-desired-domain"
              type="text"
              placeholder="ex: minha-loja"
              value={desiredDomain}
              onChange={(e) => setDesiredDomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
              required
              disabled={formSubmitting}
            />
            <span>.kivoni.com.br</span>
          </div>
        </div>

        <button
          type="submit"
          className="kivo-btn kivo-btn--primary"
          style={{ background: "white", color: "#7c3aed" }}
          disabled={formSubmitting}
        >
          {formSubmitting ? "Enviando..." : "Solicitar Minha Loja ✨"}
        </button>
      </form>
    </div>
  );
}
