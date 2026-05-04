"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { axiosErrorMessage } from "@/lib/apiErrors";
import { http } from "@/lib/http";
import type { CrmTaskLocal } from "@/lib/crm/types";
import { newId, readLocalTasks, writeLocalTasks } from "@/lib/crm/localStores";
import { extractListItems } from "@/lib/normalizeApiList";
import { lmfitTokens } from "@/theme/tokens";

export function TasksClient() {
  const [mode, setMode] = useState<"loading" | "api" | "local">("loading");
  const [apiErr, setApiErr] = useState<string | null>(null);
  const [tasks, setTasks] = useState<CrmTaskLocal[]>([]);
  const [title, setTitle] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [customerId, setCustomerId] = useState("");

  const load = useCallback(async () => {
    setMode("loading");
    setApiErr(null);
    try {
      const { data } = await http.get<unknown>("/crm/tasks", { params: { page: 1, limit: 100 } });
      const items = extractListItems(data);
      const mapped: CrmTaskLocal[] = items
        .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
        .map((row) => ({
          id: String(row._id ?? row.id ?? newId("task")),
          title: String(row.title ?? "Tarefa"),
          customerId: row.customerId != null ? String(row.customerId) : undefined,
          dueAt: String(row.dueAt ?? row.dueDate ?? new Date().toISOString()),
          assignee: row.assigneeUserId != null ? String(row.assigneeUserId) : undefined,
          done: Boolean(row.doneAt ?? row.done),
          createdAt: String(row.createdAt ?? new Date().toISOString()),
        }));
      setTasks(mapped);
      setMode("api");
    } catch (e) {
      if (isAxiosError(e) && (e.response?.status === 404 || e.response?.status === 501)) {
        setApiErr(null);
      } else if (isAxiosError(e)) {
        setApiErr(axiosErrorMessage(e));
      }
      setTasks(readLocalTasks());
      setMode("local");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function persist(next: CrmTaskLocal[]) {
    setTasks(next);
    if (mode === "local") writeLocalTasks(next);
  }

  function toggle(id: string) {
    persist(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  }

  function addLocal() {
    if (!title.trim() || !dueAt.trim()) return;
    const t: CrmTaskLocal = {
      id: newId("task"),
      title: title.trim(),
      customerId: customerId.trim() || undefined,
      dueAt: new Date(dueAt).toISOString(),
      done: false,
      createdAt: new Date().toISOString(),
    };
    persist([t, ...tasks]);
    setTitle("");
    setDueAt("");
    setCustomerId("");
  }

  const sorted = [...tasks].sort((a, b) => (a.dueAt < b.dueAt ? -1 : 1));

  if (mode === "loading") {
    return <p className="text-sm" style={{ color: lmfitTokens.textMuted }}>Carregando tarefas…</p>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight" style={{ color: lmfitTokens.text }}>
        CRM · Tarefas
      </h1>
      {mode === "local" ? (
        <p className="text-sm rounded-md border px-3 py-2" style={{ borderColor: lmfitTokens.border, backgroundColor: lmfitTokens.warningBg, color: lmfitTokens.text }}>
          Modo local até <code className="text-xs">GET /crm/tasks</code> existir na API.
        </p>
      ) : null}
      {apiErr ? (
        <p className="text-sm" style={{ color: lmfitTokens.error }}>
          {apiErr}
        </p>
      ) : null}

      <div className="rounded-lg border bg-[var(--card-bg)] p-4 space-y-3" style={{ borderColor: lmfitTokens.border }}>
        <h2 className="font-medium text-sm" style={{ color: lmfitTokens.text }}>
          Nova tarefa (modo local)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <input
            className="border rounded-md px-3 py-2 text-sm min-h-11"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            placeholder="Título"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <input
            type="datetime-local"
            className="border rounded-md px-3 py-2 text-sm min-h-11"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            value={dueAt}
            onChange={(e) => setDueAt(e.target.value)}
          />
          <input
            className="border rounded-md px-3 py-2 text-sm min-h-11"
            style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
            placeholder="Cliente (ID opcional)"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="min-h-11 px-4 rounded-md text-sm font-medium text-white touch-manipulation disabled:opacity-50"
          style={{ backgroundColor: lmfitTokens.primary }}
          disabled={mode !== "local"}
          onClick={() => addLocal()}
        >
          Adicionar (local)
        </button>
      </div>

      <ul className="space-y-2">
        {sorted.map((t) => (
          <li
            key={t.id}
            className="rounded-lg border bg-[var(--card-bg)] px-3 py-3 flex flex-wrap items-start justify-between gap-2"
            style={{ borderColor: lmfitTokens.border }}
          >
            <div>
              <p className={`font-medium ${t.done ? "line-through opacity-60" : ""}`} style={{ color: lmfitTokens.text }}>
                {t.title}
              </p>
              <p className="text-xs mt-1" style={{ color: lmfitTokens.textMuted }}>
                Vence: {new Date(t.dueAt).toLocaleString("pt-BR")}
                {t.customerId ? (
                  <>
                    {" · "}
                    <Link href={`/customers/${encodeURIComponent(t.customerId)}`} className="underline">
                      Cliente
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
            {mode === "local" ? (
              <button
                type="button"
                className="text-xs min-h-9 px-3 rounded border touch-manipulation"
                style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
                onClick={() => toggle(t.id)}
              >
                {t.done ? "Reabrir" : "Concluir"}
              </button>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
