"use client";

import { ResourceList } from "@/components/ResourceList";
import { useTenant } from "@/context/TenantContext";

export default function UsersPage() {
  const { tenant } = useTenant();
  const maxUsers = tenant?.limits?.maxUsers ?? 0;
  const limitText = maxUsers === -1 ? "Ilimitado" : maxUsers.toString();

  return (
    <>
      <div className="mb-4 text-sm text-[var(--lmfit-muted)]" style={{ color: "var(--lmfit-text-muted)" }}>
        Limite de usuários: {limitText}
      </div>
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
    </>
  );
}
