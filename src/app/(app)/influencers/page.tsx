import { ResourceList } from "@/components/ResourceList";

export default function InfluencersPage() {
  return (
    <ResourceList
      title="Influenciadores"
      endpoint="/influencers"
      columns={[
        { key: "_id", label: "ID", editable: false, hiddenOnMobile: true },
        { key: "name", label: "Nome", required: true },
        { key: "instagramHandle", label: "Instagram" },
        { key: "email", label: "E-mail", fieldType: "email" },
        { key: "phone", label: "Telefone", fieldType: "tel" },
        { key: "commissionRate", label: "Comissão (%)", fieldType: "number" },
        { key: "active", label: "Ativo", fieldType: "checkbox", defaultValue: "true" },
        { key: "notes", label: "Observações", fieldType: "textarea", formSpan: "full" },
      ]}
      tableColumns={["name", "instagramHandle", "email", "commissionRate", "active"]}
    />
  );
}
