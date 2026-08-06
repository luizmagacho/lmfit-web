import "fake-indexeddb/auto";
import * as React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

vi.mock("@/lib/pdv/syncEngine", () => ({
  flushNow: vi.fn(),
  onSyncActivity: vi.fn(() => () => undefined),
  retryFailedNow: vi.fn(),
  startAutoSync: vi.fn(() => () => undefined),
}));

const refreshSyncStatus = vi.fn().mockResolvedValue(undefined);
let mockSyncStatus = { pendingCount: 0, syncingCount: 0, failedCount: 0 };

vi.mock("@/stores/usePdvStore", () => ({
  usePdvStore: (selector: (s: unknown) => unknown) =>
    selector({ syncStatus: mockSyncStatus, refreshSyncStatus }),
}));

vi.mock("@/lib/pdv/syncHistory", () => ({
  listRecentSyncHistory: vi.fn(),
}));

import { listRecentSyncHistory } from "@/lib/pdv/syncHistory";
import { SyncStatusBadge } from "./SyncStatusBadge";

const listRecentSyncHistoryMock = listRecentSyncHistory as ReturnType<typeof vi.fn>;

describe("SyncStatusBadge", () => {
  beforeEach(() => {
    mockSyncStatus = { pendingCount: 0, syncingCount: 0, failedCount: 0 };
    listRecentSyncHistoryMock.mockReset();
    listRecentSyncHistoryMock.mockResolvedValue([]);
  });

  afterEach(cleanup);

  it("renders nothing when the queue is empty and there is no sync history", async () => {
    render(<SyncStatusBadge />);
    await waitFor(() => expect(listRecentSyncHistoryMock).toHaveBeenCalled());
    expect(document.body.textContent?.trim()).toBe("");
  });

  it("shows the live pending count when the queue has entries", async () => {
    mockSyncStatus = { pendingCount: 2, syncingCount: 0, failedCount: 0 };
    render(<SyncStatusBadge />);
    expect(await screen.findByText(/2 venda\(s\) aguardando conexão/)).toBeDefined();
  });

  it("shows sync history even when the live queue is empty (operator returning after a reload)", async () => {
    listRecentSyncHistoryMock.mockResolvedValue([
      { id: "s1", clientSaleId: "s1", orderId: "o1", orderNumber: 42, occurredAt: "2026-07-20T10:00:00.000Z" },
    ]);

    render(<SyncStatusBadge />);

    expect(await screen.findByText(/1 venda\(s\) ajustada\(s\) na sincronização/)).toBeDefined();
    expect(document.body.textContent).not.toContain("Pedido #42"); // collapsed by default
  });

  it("expands the history list on click, revealing the order details", async () => {
    listRecentSyncHistoryMock.mockResolvedValue([
      { id: "s1", clientSaleId: "s1", orderId: "o1", orderNumber: 42, occurredAt: "2026-07-20T10:00:00.000Z" },
    ]);

    render(<SyncStatusBadge />);
    const toggle = await screen.findByText(/1 venda\(s\) ajustada\(s\) na sincronização/);
    fireEvent.click(toggle);

    await waitFor(() => expect(document.body.textContent).toContain("Pedido #42"));
  });
});
