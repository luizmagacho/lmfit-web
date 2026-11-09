"use client";

import { useEffect, useMemo, useState } from "react";
import { ResourceList, type ResourceColumn } from "@/components/ResourceList";
import { useTenant } from "@/context/TenantContext";
import { http } from "@/lib/http";

const NO_LOCATION = "__none__";

type LocationRow = { _id: string; name: string };

export default function UsersPage() {
  const { tenant } = useTenant();
  const maxUsers = tenant?.limits?.maxUsers ?? 0;
  const limitText = maxUsers === -1 ? "Ilimitado" : maxUsers.toString();

  const [locations, setLocations] = useState<LocationRow[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data } = await http.get<{ items: LocationRow[] }>("/locations");
        if (!cancelled) setLocations(data.items ?? []);
      } catch {
        if (!cancelled) setLocations([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const locationNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const l of locations) m.set(l._id, l.name);
    return m;
  }, [locations]);

  // A API exige `password` (mín. 6 caracteres) pra criar usuário, mas essa coluna nunca existiu
  // no formulário — resultado: toda tentativa de criar usuário caía no erro de validação do
  // backend sem nenhum campo na tela pra corrigir. `excel: false` porque senha não faz sentido em
  // planilha de import/export; `tableColumns` abaixo garante que ela só aparece no formulário, não
  // como coluna da tabela.
  const columns: ResourceColumn[] = useMemo(
    () => [
      { key: "_id", label: "ID" },
      { key: "name", label: "Nome" },
      { key: "email", label: "E-mail" },
      {
        key: "password",
        label: "Senha",
        fieldType: "password",
        excel: false,
        placeholder: "Mínimo 6 caracteres (deixe em branco ao editar para manter a atual)",
      },
      { key: "role", label: "Papel" },
      {
        key: "assignedLocationId",
        label: "Local de trabalho (PDV)",
        fieldType: "select",
        selectOptions: [
          { value: NO_LOCATION, label: "Sem local atribuído" },
          ...locations.map((l) => ({ value: l._id, label: l.name })),
        ],
      },
    ],
    [locations],
  );

  const tableColumns = ["_id", "name", "email", "role", "assignedLocationId"];

  return (
    <>
      <div className="mb-4 text-sm text-[var(--lmfit-muted)]" style={{ color: "var(--lmfit-text-muted)" }}>
        Limite de usuários: {limitText}
      </div>
      <p className="mb-4 text-sm" style={{ color: "var(--lmfit-text-muted)" }}>
        O local de trabalho define de qual local o PDV desse funcionário vende (e, no modo
        offline, qual fatia de estoque ele usa).
      </p>
      <ResourceList
        title="Usuários"
        endpoint="/users"
        columns={columns}
        tableColumns={tableColumns}
        cellRender={{
          assignedLocationId: (row) => {
            const id = row.assignedLocationId as string | undefined | null;
            if (!id) return "—";
            return locationNameById.get(id) ?? "—";
          },
        }}
        validateBeforeSubmit={({ modal, formValues }) => {
          // Só exige senha na criação — editando, campo em branco significa "manter a atual"
          // (a API também já ignora um `password` vazio/nulo no PATCH).
          const pwd = formValues.password ?? "";
          if (modal === "create" && pwd.trim().length < 6) {
            return "A senha deve ter no mínimo 6 caracteres.";
          }
          return null;
        }}
        mergeSubmitPayload={(payload, { modal }) => {
          let next = payload;
          if (next.assignedLocationId === NO_LOCATION) {
            next = { ...next, assignedLocationId: null };
          }
          if (modal === "edit" && !next.password) {
            next = { ...next };
            delete next.password;
          }
          return next;
        }}
      />
    </>
  );
}
