"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Language = "pt-BR" | "en";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>("pt-BR");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("lmfit-language") as Language | null;
    if (stored === "en" || stored === "pt-BR") {
      setLanguageState(stored);
    }
    setMounted(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("lmfit-language", lang);
  };

  // A very simple translation helper for generic terms
  const t = (key: string, defaultText?: string) => {
    const dictionary: Record<string, Record<Language, string>> = {
      "nav.dashboard": { "pt-BR": "Início", "en": "Dashboard" },
      "nav.pdv": { "pt-BR": "PDV Mobile", "en": "Mobile POS" },
      "nav.inventory": { "pt-BR": "Edição em lote", "en": "Batch Edit" },
      "nav.customers": { "pt-BR": "Clientes", "en": "Customers" },
      "nav.pipeline": { "pt-BR": "CRM · Funil", "en": "CRM · Pipeline" },
      "nav.tasks": { "pt-BR": "CRM · Tarefas", "en": "CRM · Tasks" },
      "nav.segments": { "pt-BR": "CRM · Segmentos", "en": "CRM · Segments" },
      "nav.suppliers": { "pt-BR": "Fornecedores", "en": "Suppliers" },
      "nav.products": { "pt-BR": "Produtos", "en": "Products" },
      "nav.orders": { "pt-BR": "Pedidos", "en": "Orders" },
      "nav.purchases": { "pt-BR": "Compras", "en": "Purchases" },
      "nav.production": { "pt-BR": "Produção", "en": "Production" },
      "nav.invoices": { "pt-BR": "Notas fiscais", "en": "Invoices" },
      "nav.financial": { "pt-BR": "Financeiro", "en": "Financial" },
      "nav.reports": { "pt-BR": "Relatórios", "en": "Reports" },
      "nav.escalations": { "pt-BR": "WhatsApp", "en": "WhatsApp" },
      "nav.users": { "pt-BR": "Usuários", "en": "Users" },
      "nav.settings": { "pt-BR": "Configurações", "en": "Settings" },
      "status.open": { "pt-BR": "Em aberto", "en": "Open" },
      "status.picking": { "pt-BR": "Em separação", "en": "Picking" },
      "status.shipped": { "pt-BR": "Enviado", "en": "Shipped" },
      "status.completed": { "pt-BR": "Concluído", "en": "Completed" },
      "status.cancelled": { "pt-BR": "Cancelado", "en": "Cancelled" },
      "channel.in_person": { "pt-BR": "Presencial", "en": "In Person" },
      "channel.online": { "pt-BR": "Online", "en": "Online" },
      "channel.site": { "pt-BR": "Site", "en": "Website" },
      "channel.whatsapp": { "pt-BR": "WhatsApp", "en": "WhatsApp" },
      "channel.banca": { "pt-BR": "Banca", "en": "Stall" },
      "orders.id": { "pt-BR": "ID", "en": "ID" },
      "orders.reference": { "pt-BR": "Referência", "en": "Reference" },
      "orders.customer": { "pt-BR": "Cliente", "en": "Customer" },
      "orders.channel": { "pt-BR": "Canal", "en": "Channel" },
      "orders.status": { "pt-BR": "Status", "en": "Status" },
      "orders.total": { "pt-BR": "Total", "en": "Total" },
      "orders.date": { "pt-BR": "Data", "en": "Date" },
      "orders.actions": { "pt-BR": "Ações", "en": "Actions" },
      "filter.all": { "pt-BR": "Todos", "en": "All" },
    };

    return dictionary[key]?.[language] ?? defaultText ?? key;
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
