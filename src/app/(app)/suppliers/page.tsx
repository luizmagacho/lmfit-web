import { ResourceList } from "@/components/ResourceList";

export default function SuppliersPage() {
  return (
    <ResourceList
      title="Fornecedores"
      endpoint="/suppliers"
      columns={[
        { key: "_id", label: "ID" },
        { key: "name", label: "Nome" },
        { key: "email", label: "E-mail" },
        { key: "phone", label: "Telefone" },
      ]}
    />
  );
}
