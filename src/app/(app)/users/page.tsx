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

  const columns: ResourceColumn[] = useMemo(
    () => [
      { key: "_id", label: "ID" },
      { key: "name", label: "Nome" },
      { key: "email", label: "E-mail" },
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
        cellRender={{
          assignedLocationId: (row) => {
            const id = row.assignedLocationId as string | undefined | null;
            if (!id) return "—";
            return locationNameById.get(id) ?? "—";
          },
        }}
        mergeSubmitPayload={(payload) => {
          if (payload.assignedLocationId === NO_LOCATION) {
            return { ...payload, assignedLocationId: null };
          }
          return payload;
        }}
      />
    </>
  );
}
