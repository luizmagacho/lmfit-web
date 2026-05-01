import { ResourceList } from "@/components/ResourceList";

export default function UsersPage() {
  return (
    <ResourceList
      title="Usuários"
      endpoint="/users"
      columns={[
        { key: "_id", label: "ID" },
        { key: "name", label: "Nome" },
        { key: "email", label: "E-mail" },
        { key: "role", label: "Papel" },
      ]}
    />
  );
}
