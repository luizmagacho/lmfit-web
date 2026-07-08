"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "@/stores/useCartStore";
import { lmfitTokens } from "@/theme/tokens";

export function AtacadoClient() {
  const router = useRouter();
  const cart = useCartStore();

  const [form, setForm] = useState({
    name: "",
    cnpj: "",
    email: "",
    phone: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.cnpj) return;
    
    cart.setCustomer({
      name: form.name,
      phone: form.phone,
    });
    cart.setRole("wholesaler");
    router.push("/catalogo");
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-[var(--card-bg)] rounded-xl shadow-sm border" style={{ borderColor: lmfitTokens.border }}>
      <h1 className="text-2xl font-bold text-center mb-2" style={{ color: lmfitTokens.text }}>
        Área do Atacado
      </h1>
      <p className="text-center text-sm mb-6" style={{ color: lmfitTokens.textMuted }}>
        Preencha o formulário abaixo para acessar nossos preços exclusivos para lojistas e revendedores.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: lmfitTokens.text }}>
            Nome Completo / Razão Social
          </label>
          <input
            type="text"
            required
            className="w-full border rounded-md px-3 py-2 text-sm"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Sua empresa LTDA"
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: lmfitTokens.text }}>
            CNPJ
          </label>
          <input
            type="text"
            required
            className="w-full border rounded-md px-3 py-2 text-sm"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={form.cnpj}
            onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
            placeholder="00.000.000/0000-00"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: lmfitTokens.text }}>
            Telefone / WhatsApp
          </label>
          <input
            type="tel"
            required
            className="w-full border rounded-md px-3 py-2 text-sm"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="(11) 99999-9999"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1" style={{ color: lmfitTokens.text }}>
            E-mail (opcional)
          </label>
          <input
            type="email"
            className="w-full border rounded-md px-3 py-2 text-sm"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="contato@empresa.com"
          />
        </div>

        <button
          type="submit"
          className="w-full py-2.5 rounded-md text-white font-medium transition-colors"
          style={{ backgroundColor: lmfitTokens.primary }}
        >
          Acessar Catálogo de Atacado
        </button>
      </form>
    </div>
  );
}
