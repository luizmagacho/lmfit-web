import { ResourceList } from "@/components/ResourceList";

export default function DraftsPage() {
  return (
    <ResourceList
      title="Rascunhos de pedido"
      endpoint="/order-drafts"
      idKey="sessionToken"
      columns={[
        { key: "sessionToken", label: "Token", editable: false },
        { key: "status", label: "Status" },
        { key: "customerId", label: "Cliente" },
        { key: "waId", label: "WhatsApp" },
        { key: "orderId", label: "Pedido" },
        { key: "updatedAt", label: "Atualizado", editable: false },
      ]}
    />
  );
}
