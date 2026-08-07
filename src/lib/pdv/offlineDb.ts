import { openDB, type DBSchema, type IDBPDatabase } from "idb";

export type CatalogSnapshotRow = {
  variantId: string;
  productId: string;
  sku: string;
  barcode?: string;
  productName: string;
  color?: string;
  size?: string;
  unitPrice: number;
  imageUrl?: string;
  /** Quantidade alocada a este local no momento da última atualização da foto. */
  quantity: number;
};

export type PendingSaleStatus = "pending" | "syncing" | "synced" | "failed";

export type PendingSalePayload = {
  customerId: string;
  paymentMethod: "pix" | "cash" | "card";
  notes?: string;
  lines: Array<{
    variantId: string;
    quantity: number;
    unitPrice: number;
    description?: string;
    isOrder?: boolean;
  }>;
};

export type PendingSaleRow = {
  clientSaleId: string;
  payload: PendingSalePayload;
  status: PendingSaleStatus;
  lastError?: string;
  createdAtLocal: string;
  /** Preenchido quando o servidor confirma — número/id do pedido resultante. */
  orderId?: string;
  orderNumber?: number;
  /** Indica que a venda foi auto-convertida (parte virou encomenda) na sincronização. */
  partialBackorder?: boolean;
  /** Quantas vezes uma tentativa de sincronização falhou — usado pelo backoff automático. */
  retryCount?: number;
  /** Antes deste instante, o motor de sincronização não tenta de novo automaticamente. */
  nextRetryAt?: string;
};

/** One entry per offline sale that the server auto-downgraded (partial encomenda) at
 *  sync time — persisted so an operator who's already left the terminal still sees it
 *  the next time they open the PDV, not just as an ephemeral toast. Keyed by
 *  `clientSaleId` itself so a replayed sync event overwrites rather than duplicates. */
export type SyncHistoryEntry = {
  id: string;
  clientSaleId: string;
  orderId: string;
  orderNumber: number;
  downgradedLines?: Array<{ variantId: string; requested: number; fulfilled: number }>;
  occurredAt: string;
};

/** Small key-value store for standalone bits the PDV needs offline that don't fit the other
 *  stores' shapes — currently just the tenant's walk-in ("Consumidor Final") customer, so
 *  checkout with no customer picked (the most common counter sale) doesn't need a live network
 *  call to resolve who to bill it to. */
export type MetaRow = { key: string; value: unknown };

export type PendingCustomerStatus = "pending" | "syncing" | "synced" | "failed";

/** A customer typed by name at the counter while offline — gets a temporary `localId`
 *  (see `LOCAL_CUSTOMER_PREFIX` in `customerOutbox.ts`) usable in the cart immediately;
 *  `syncEngine` creates the real customer server-side and repoints any queued sales as soon
 *  as the connection allows, same idea as `pendingSales` but for who the sale bills to. */
export type PendingCustomerRow = {
  localId: string;
  name: string;
  status: PendingCustomerStatus;
  lastError?: string;
  createdAtLocal: string;
  /** Preenchido quando o servidor confirma — o id real do cliente. */
  realCustomerId?: string;
};

interface PdvOfflineDB extends DBSchema {
  catalogSnapshot: {
    key: string;
    value: CatalogSnapshotRow;
    indexes: { barcode: string; productId: string };
  };
  pendingSales: {
    key: string;
    value: PendingSaleRow;
    indexes: { status: string };
  };
  syncHistory: {
    key: string;
    value: SyncHistoryEntry;
    indexes: { occurredAt: string };
  };
  meta: {
    key: string;
    value: MetaRow;
  };
  pendingCustomers: {
    key: string;
    value: PendingCustomerRow;
    indexes: { status: string };
  };
}

const DB_NAME = "kivoni-pdv-offline";
const DB_VERSION = 6;

let dbPromise: Promise<IDBPDatabase<PdvOfflineDB>> | null = null;

/** Lazily opens (and upgrades) the PDV offline database — safe to call repeatedly,
 *  every caller shares the same connection. */
export function getOfflineDb(): Promise<IDBPDatabase<PdvOfflineDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PdvOfflineDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("catalogSnapshot")) {
          const store = db.createObjectStore("catalogSnapshot", { keyPath: "variantId" });
          store.createIndex("barcode", "barcode");
          store.createIndex("productId", "productId");
        }
        if (!db.objectStoreNames.contains("pendingSales")) {
          const store = db.createObjectStore("pendingSales", { keyPath: "clientSaleId" });
          store.createIndex("status", "status");
        }
        if (!db.objectStoreNames.contains("syncHistory")) {
          const store = db.createObjectStore("syncHistory", { keyPath: "id" });
          store.createIndex("occurredAt", "occurredAt");
        }
        if (!db.objectStoreNames.contains("meta")) {
          db.createObjectStore("meta", { keyPath: "key" });
        }
        if (!db.objectStoreNames.contains("pendingCustomers")) {
          const store = db.createObjectStore("pendingCustomers", { keyPath: "localId" });
          store.createIndex("status", "status");
        }
      },
    });
  }
  return dbPromise;
}
