"use client";

import { ResourceList } from "@/components/ResourceList";

export function CustomersPageClient() {
  return (
    <ResourceList
      title="Clientes"
      endpoint="/customers"
      detailHref={(row) => {
        const id = row._id != null ? (typeof row._id === "object" ? JSON.stringify(row._id) : String(row._id)) : "";
        return id ? `/customers/${encodeURIComponent(id)}` : null;
      }}
      columns={[
        { key: "_id", label: "ID", editable: false, hideInForm: true },
        { key: "name", label: "Nome" },
        { key: "email", label: "E-mail", hiddenOnMobile: true },
        { key: "phone", label: "Telefone", hiddenOnMobile: true },
        { key: "whatsappWaId", label: "WhatsApp" },
        { key: "legalName", label: "Razão social", hiddenOnMobile: true },
      ]}
      tableColumns={["name", "email", "phone", "whatsappWaId", "legalName"]}
    />
  );
}
