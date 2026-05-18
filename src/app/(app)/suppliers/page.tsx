import { ResourceList } from "@/components/ResourceList";

export default function SuppliersPage() {
  return (
    <ResourceList
      title="Fornecedores"
      endpoint="/suppliers"
      columns={[
        { key: "_id", label: "ID", editable: false, hiddenOnMobile: true },
        { key: "name", label: "Nome", required: true },
        { key: "city", label: "Cidade" },
        { key: "state", label: "UF" },
        { key: "websiteUrl", label: "Site", fieldType: "url" },
        { key: "phone", label: "Telefone", fieldType: "tel" },
        { key: "taxId", label: "CPF/CNPJ" },
        { key: "notes", label: "Observações", fieldType: "textarea", formSpan: "full" },
      ]}
      tableColumns={["name", "city", "state", "websiteUrl", "phone"]}
    />
  );
}
