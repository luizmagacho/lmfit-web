"use client";

import { ResourceList, type ResourceColumn } from "@/components/ResourceList";
import { useLanguage } from "@/context/LanguageContext";

const columns: ResourceColumn[] = [
  // `excel: false` — Materiais não tem endpoint de import em lote no backend, então uma planilha
  // reimportada cai no fallback ingênuo linha-a-linha do ResourceList, que trata qualquer "ID"
  // presente como PATCH (atualização) em vez de POST (criação). Um "ID" em branco preenchido pelo
  // usuário com 1, 2, 3... (natural ao ver a coluna no modelo baixado) então tenta atualizar
  // materiais que não existem e falha 100% das linhas. Sem a coluna no modelo/import, toda linha
  // vira criação — o único caso de uso real hoje (cadastro em massa de insumos novos).
  { key: "_id", label: "ID", editable: false, hiddenOnMobile: true, hideInForm: true, excel: false },
  { key: "name", label: "Name", required: true },
  { key: "unit", label: "Unit (un, m, kg)", required: false },
  { key: "quantityOnHand", label: "Stock Qty", fieldType: "number", required: true, numberStep: "0.01" },
  { key: "costPrice", label: "Unit Cost", fieldType: "number", required: false },
  { key: "notes", label: "Notes", fieldType: "textarea", formSpan: "full" },
  { key: "active", label: "Active", fieldType: "checkbox", defaultValue: "true" },
];

export function MaterialsClient() {
  const { language } = useLanguage();

  const localizedColumns = columns.map((c) => {
    if (language === "en") return c;
    switch (c.key) {
      case "name": return { ...c, label: "Nome" };
      case "unit": return { ...c, label: "Unidade (un, m, kg)" };
      case "quantityOnHand": return { ...c, label: "Qtd. Estoque" };
      case "costPrice": return { ...c, label: "Valor Unitário" };
      case "notes": return { ...c, label: "Notas" };
      case "active": return { ...c, label: "Ativo" };
      default: return c;
    }
  });

  return (
    <ResourceList
      title={language === "en" ? "Raw Materials" : "Matérias-Primas"}
      endpoint="/materials"
      columns={localizedColumns}
    />
  );
}
