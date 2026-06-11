#!/usr/bin/env node
/**
 * Popula um cenário completo de testes na lmfit-api via REST:
 *   - Fornecedores
 *   - Clientes (com telefone/WhatsApp)
 *   - Produtos com variantes (cor × tamanho) + preço varejo/atacado
 *   - Compras (supplier → estoque)
 *   - Pedidos (clientes) em canais variados
 *   - Rascunho público (fluxo /public/order-drafts)
 *   - Notas fiscais
 *
 * Uso:
 *   npm run seed:demo
 *   npm run seed:demo -- --only=customers,products
 *   npm run seed:demo -- --verbose
 *
 * Flags:
 *   --only=csv   Executa apenas os módulos informados
 *                (customers,suppliers,products,purchases,orders,drafts,invoices)
 *   --skip=csv   Pula módulos.
 *   --verbose    Loga payloads das respostas com erro.
 *
 * Variáveis (.env / .env.local):
 *   NEXT_PUBLIC_API_URL        base da API (default http://127.0.0.1:4000)
 *   SEED_ADMIN_EMAIL           default admin@lmfit.local
 *   SEED_ADMIN_PASSWORD        obrigatório
 *
 * Reenvio: 409/422 de duplicidade são ignorados; o script sempre tenta
 * reusar registros já existentes (busca por `search` ou lista).
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const PLACEHOLDER_IMAGE =
  "https://d1a9qnv764bsoo.cloudfront.net/stores/006/316/201/themes/common/logo-813858800-1750428827-d18edfd75754df23704c77cbd129bbc91750428827-1024-1024.webp?w=400";

function loadEnvFile(filePath, { overwrite } = { overwrite: false }) {
  try {
    const raw = fs.readFileSync(filePath, "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const eq = t.indexOf("=");
      if (eq === -1) continue;
      const key = t.slice(0, eq).trim();
      let val = t.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (val === "") continue;
      if (!overwrite && process.env[key] !== undefined && process.env[key] !== "") continue;
      process.env[key] = val;
    }
  } catch {
    /* missing file */
  }
}

const root = process.cwd();
loadEnvFile(path.join(root, ".env"), { overwrite: false });
loadEnvFile(path.join(root, ".env.local"), { overwrite: true });

const baseURL = (process.env.NEXT_PUBLIC_API_URL || process.env.API_URL || "http://127.0.0.1:4000").replace(
  /\/+$/,
  "",
);
const email = process.env.SEED_ADMIN_EMAIL || process.env.ADMIN_EMAIL || "admin@kivoni.local";
const password = process.env.SEED_ADMIN_PASSWORD || process.env.ADMIN_PASSWORD || "";

const args = process.argv.slice(2);
const flags = {
  verbose: args.includes("--verbose") || args.includes("-v"),
  only: parseList(args.find((a) => a.startsWith("--only="))),
  skip: parseList(args.find((a) => a.startsWith("--skip="))),
};

function parseList(arg) {
  if (!arg) return null;
  const raw = arg.split("=")[1] ?? "";
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.length ? new Set(list) : null;
}

function moduleEnabled(name) {
  if (flags.skip?.has(name)) return false;
  if (flags.only) return flags.only.has(name);
  return true;
}

function slugFromSku(sku) {
  const s = String(sku)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "demo-produto";
}

function extractMessage(data) {
  if (!data || typeof data !== "object") return "";
  const m = data.message;
  if (typeof m === "string") return m;
  if (Array.isArray(m)) return m.join(" ");
  return "";
}

function isDuplicateError(status, data) {
  if (status === 409) return true;
  const msg = extractMessage(data);
  if (status === 422 && msg && /duplic|unique|j[aá] existe|already|exist/i.test(msg)) return true;
  return false;
}

function extractListItems(data) {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    if (Array.isArray(data.items)) return data.items;
    if (Array.isArray(data.data)) return data.data;
    if (Array.isArray(data.results)) return data.results;
  }
  return [];
}

function rowId(row) {
  return row?._id ?? row?.id ?? null;
}

async function apiFetch(endpoint, { method = "GET", token, body, query } = {}) {
  const qs = query
    ? `?${new URLSearchParams(
        Object.entries(query).filter(([, v]) => v !== undefined && v !== null && v !== ""),
      ).toString()}`
    : "";
  const url = `${baseURL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}${qs}`;
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { ok: res.ok, status: res.status, data };
}

// ------------------------------------------------------------------
// Datasets
// ------------------------------------------------------------------

const suppliers = [
  { name: "Malharia Brás Sul", email: "contato@malhariabras.local", phone: "1133221100" },
  { name: "Têxtil Moka Distribuidor", email: "vendas@textil-moka.local", phone: "1133330011" },
  { name: "Confecções Luar", email: "atendimento@luar.local", phone: "1134445522" },
];

const customers = [
  {
    name: "Cliente Demo Alpha",
    email: "demo.alpha@kivoni.local",
    phone: "11999990001",
    whatsappWaId: "5511999990001",
    legalName: "Alpha Demo LTDA",
    role: "retail",
  },
  {
    name: "Cliente Demo Beta",
    email: "demo.beta@kivoni.local",
    phone: "11999990002",
    whatsappWaId: "5511999990002",
    legalName: "Beta Demo ME",
    role: "retail",
  },
  {
    name: "Atacadista Gamma",
    email: "demo.gamma@kivoni.local",
    phone: "21988887777",
    whatsappWaId: "5521988887777",
    legalName: "Gamma Comércio",
    role: "wholesaler",
  },
  {
    name: "Boutique Delta",
    email: "demo.delta@kivoni.local",
    phone: "11955556666",
    whatsappWaId: "5511955556666",
    legalName: "Delta Moda Fitness",
    role: "wholesaler",
  },
  {
    name: "Consumidora Épsilon",
    email: "demo.epsilon@kivoni.local",
    phone: "11977774444",
    legalName: null,
    role: "retail",
  },
];

/** Fabrica variantes cor × tamanho com SKU determinístico. */
function variantMatrix({ prefix, colors, sizes, basePrice, wholesalePrice, baseStock }) {
  const out = [];
  for (const c of colors) {
    for (const s of sizes) {
      out.push({
        sku: `${prefix}-${c.code}-${s.code}`,
        color: c.label,
        size: s.label,
        price: basePrice,
        priceWholesale: wholesalePrice,
        quantityInStock: baseStock,
        quantityOnHand: baseStock,
      });
    }
  }
  return out;
}

const products = [
  {
    name: "Legging Fluid",
    category: "Leggings",
    description: "Legging cintura alta tecido flex, ideal para treino intenso.",
    weightGrams: 220,
    active: true,
    basePrice: 149.9,
    wholesalePrice: 99.9,
    compareAtPrice: 179.9,
    minWholesaleQty: 6,
    variants: variantMatrix({
      prefix: "LEG-FLU",
      colors: [
        { code: "BK", label: "Preto" },
        { code: "GR", label: "Grafite" },
        { code: "RS", label: "Rosê" },
      ],
      sizes: [
        { code: "P", label: "P" },
        { code: "M", label: "M" },
        { code: "G", label: "G" },
      ],
      basePrice: 149.9,
      wholesalePrice: 99.9,
      baseStock: 24,
    }),
  },
  {
    name: "Top Nadador",
    category: "Tops",
    description: "Top nadador com bojo removível.",
    weightGrams: 150,
    active: true,
    basePrice: 89.9,
    wholesalePrice: 59.9,
    compareAtPrice: null,
    minWholesaleQty: 6,
    variants: variantMatrix({
      prefix: "TOP-NAD",
      colors: [
        { code: "BK", label: "Preto" },
        { code: "WH", label: "Branco" },
        { code: "VD", label: "Verde" },
      ],
      sizes: [
        { code: "P", label: "P" },
        { code: "M", label: "M" },
        { code: "G", label: "G" },
      ],
      basePrice: 89.9,
      wholesalePrice: 59.9,
      baseStock: 30,
    }),
  },
  {
    name: "Shorts Run",
    category: "Shorts",
    description: "Shorts leve com bolso lateral e cordão ajustável.",
    weightGrams: 180,
    active: true,
    basePrice: 119.0,
    wholesalePrice: 79.0,
    compareAtPrice: null,
    minWholesaleQty: 6,
    variants: variantMatrix({
      prefix: "SHT-RUN",
      colors: [
        { code: "BK", label: "Preto" },
        { code: "AZ", label: "Azul Royal" },
      ],
      sizes: [
        { code: "P", label: "P" },
        { code: "M", label: "M" },
        { code: "G", label: "G" },
        { code: "GG", label: "GG" },
      ],
      basePrice: 119.0,
      wholesalePrice: 79.0,
      baseStock: 18,
    }),
  },
  {
    name: "Meia Compressão",
    category: "Acessórios",
    description: "Meia de compressão para corrida (unissex).",
    weightGrams: 90,
    active: true,
    basePrice: 39.9,
    wholesalePrice: 24.9,
    compareAtPrice: null,
    minWholesaleQty: 12,
    variants: [
      {
        sku: "MEIA-CMP-UN",
        color: "Único",
        size: "Único",
        price: 39.9,
        priceWholesale: 24.9,
        quantityInStock: 120,
        quantityOnHand: 120,
      },
    ],
  },
];

// ------------------------------------------------------------------
// Helpers de "upsert" com fallback de busca quando já existe
// ------------------------------------------------------------------

async function upsert(endpoint, body, { token, matchKey, matchValue, label, searchParam = "search" } = {}) {
  const r = await apiFetch(endpoint, { method: "POST", token, body });
  if (r.ok) return { created: true, row: r.data };
  if (!isDuplicateError(r.status, r.data)) {
    if (flags.verbose) console.warn(`  ! ${label ?? endpoint}:`, r.status, r.data);
    return { created: false, row: null, error: r };
  }
  if (matchKey && matchValue) {
    const found = await findOne(endpoint, { token, key: matchKey, value: matchValue, searchParam });
    if (found) return { created: false, existing: true, row: found };
  }
  return { created: false, existing: true, row: null };
}

async function findOne(endpoint, { token, key, value, searchParam = "search" }) {
  const r = await apiFetch(endpoint, { token, query: { [searchParam]: value, page: 1, limit: 50 } });
  if (!r.ok) return null;
  const items = extractListItems(r.data);
  const match = items.find((it) => {
    if (!it || typeof it !== "object") return false;
    const v = it[key];
    return v != null && String(v).toLowerCase() === String(value).toLowerCase();
  });
  return match ?? null;
}

// ------------------------------------------------------------------
// Executores por módulo
// ------------------------------------------------------------------

async function seedSuppliers(token) {
  console.log("\n▸ Fornecedores");
  const out = [];
  for (const s of suppliers) {
    const res = await upsert("/suppliers", s, {
      token,
      matchKey: "email",
      matchValue: s.email,
      label: `Fornecedor ${s.name}`,
    });
    if (res.row) {
      out.push(res.row);
      console.log(`  ${res.created ? "+" : "="} ${s.name} (${rowId(res.row) ?? "?"})`);
    } else {
      console.log(`  ! ${s.name} não disponível`);
    }
  }
  return out;
}

async function seedCustomers(token) {
  console.log("\n▸ Clientes");
  const out = [];
  for (const c of customers) {
    const { role, ...body } = c;
    const res = await upsert("/customers", body, {
      token,
      matchKey: "email",
      matchValue: body.email,
      label: `Cliente ${body.name}`,
    });
    if (res.row) {
      out.push({ ...res.row, _seedRole: role });
      console.log(`  ${res.created ? "+" : "="} ${body.name} (${rowId(res.row) ?? "?"}) [${role}]`);
    } else {
      console.log(`  ! ${body.name} não criado nem encontrado`);
    }
  }
  return out;
}

/**
 * A API pode aceitar produtos "flat" (sem variants) ou "nested" (com variants).
 * Tentamos nested primeiro (caso ideal) e caímos para flat usando a 1ª variante.
 */
async function seedProducts(token) {
  console.log("\n▸ Produtos");
  const out = [];
  for (const p of products) {
    const slug = slugFromSku(p.name);
    const nestedBody = {
      name: p.name,
      slug,
      category: p.category,
      description: p.description ?? null,
      primaryImageUrl: PLACEHOLDER_IMAGE,
      active: p.active !== false,
      weightGrams: p.weightGrams ?? null,
      compareAtPrice: p.compareAtPrice ?? null,
      price: p.basePrice,
      priceRetail: p.basePrice,
      priceWholesale: p.wholesalePrice,
      minWholesaleQty: p.minWholesaleQty ?? 6,
      sku: p.variants[0]?.sku,
      quantityInStock: p.variants.reduce((a, v) => a + (v.quantityInStock ?? 0), 0),
      variants: p.variants,
    };

    let r = await apiFetch("/products", { method: "POST", token, body: nestedBody });

    if (!r.ok && !isDuplicateError(r.status, r.data)) {
      // Fallback: alguns backends só aceitam produto "flat" (cria a variante à parte).
      const first = p.variants[0];
      const flatBody = {
        name: p.name,
        slug,
        sku: first?.sku,
        category: p.category,
        description: p.description ?? null,
        primaryImageUrl: PLACEHOLDER_IMAGE,
        active: p.active !== false,
        price: p.basePrice,
        priceRetail: p.basePrice,
        priceWholesale: p.wholesalePrice,
        minWholesaleQty: p.minWholesaleQty ?? 6,
        quantityInStock: first?.quantityInStock ?? 0,
        weightGrams: p.weightGrams ?? null,
        compareAtPrice: p.compareAtPrice ?? null,
      };
      r = await apiFetch("/products", { method: "POST", token, body: flatBody });
    }

    let row = null;
    let created = false;
    if (r.ok) {
      row = r.data;
      created = true;
    } else {
      // A API pode devolver 409 / 422 (duplicidade explícita) ou até 500
      // (erro genérico de índice único). Tentamos localizar por slug/sku
      // antes de desistir para tornar o seed idempotente.
      row =
        (await findOne("/products", { token, key: "slug", value: slug })) ??
        (await findOne("/products", { token, key: "sku", value: p.variants[0]?.sku }));
      if (!row && flags.verbose) console.warn(`  ! ${p.name}:`, r.status, r.data);
    }

    if (!row) {
      console.log(`  ! ${p.name} não criado nem encontrado`);
      continue;
    }
    out.push(row);
    const variants = Array.isArray(row.variants) ? row.variants : [];
    console.log(
      `  ${created ? "+" : "="} ${p.name} (${rowId(row) ?? "?"}) — ${variants.length || 1} variante(s)`,
    );
  }
  return out;
}

function collectVariantRefs(products) {
  const refs = [];
  for (const p of products) {
    const variants = Array.isArray(p.variants) && p.variants.length > 0 ? p.variants : [p];
    for (const v of variants) {
      const id = rowId(v) ?? rowId(p);
      if (!id) continue;
      refs.push({
        productId: rowId(p),
        variantId: id,
        sku: v.sku ?? p.sku ?? "",
        price: typeof v.price === "number" ? v.price : p.price ?? 0,
        priceWholesale: v.priceWholesale ?? p.priceWholesale ?? null,
        color: v.color ?? "Único",
        size: v.size ?? "Único",
      });
    }
  }
  return refs;
}

async function seedPurchases(token, suppliersRows, productsRows) {
  console.log("\n▸ Compras (suppliers → estoque)");
  if (!suppliersRows.length || !productsRows.length) {
    console.log("  · precisa de fornecedores e produtos; pulando.");
    return [];
  }
  const variantRefs = collectVariantRefs(productsRows);
  if (!variantRefs.length) {
    console.log("  · nenhum variantId disponível; pulando.");
    return [];
  }

  // Statuses aceitos pela API hoje: `pending` (default) e `received`.
  const samples = [
    {
      reference: "SEED-PO-001",
      status: "received",
      supplier: suppliersRows[0],
      pick: variantRefs.slice(0, 4),
    },
    {
      reference: "SEED-PO-002",
      status: "pending",
      supplier: suppliersRows[1 % suppliersRows.length],
      pick: variantRefs.slice(4, 8),
    },
  ];

  const out = [];
  for (const s of samples) {
    const body = {
      supplierId: rowId(s.supplier),
      reference: s.reference,
      status: s.status,
      notes: "Seed de demonstração",
      lines: s.pick.map((v, i) => ({
        variantId: v.variantId,
        quantityOrdered: 12 + i * 2,
        quantityReceived: s.status === "received" ? 12 + i * 2 : 0,
        unitPrice: Math.max(5, Number(((v.price ?? 0) * 0.55).toFixed(2))),
      })),
    };
    const r = await apiFetch("/purchases", { method: "POST", token, body });
    if (r.ok) {
      out.push(r.data);
      console.log(`  + ${s.reference} (${rowId(r.data) ?? "?"}) · ${body.lines.length} linha(s)`);
    } else if (isDuplicateError(r.status, r.data)) {
      console.log(`  = ${s.reference} já existia`);
    } else if (flags.verbose) {
      console.warn(`  ! ${s.reference}:`, r.status, r.data);
    } else {
      console.log(`  ! ${s.reference} falhou (${r.status})`);
    }
  }
  return out;
}

async function seedOrders(token, customersRows, productsRows) {
  console.log("\n▸ Pedidos");
  if (!customersRows.length || !productsRows.length) {
    console.log("  · precisa de clientes e produtos; pulando.");
    return [];
  }
  const variantRefs = collectVariantRefs(productsRows);
  if (!variantRefs.length) {
    console.log("  · nenhum variantId disponível; pulando.");
    return [];
  }

  const pickVariant = (idx) => variantRefs[idx % variantRefs.length];

  const samples = [
    {
      reference: "SEED-ORD-001",
      channel: "in_person",
      status: "paid",
      customer: customersRows.find((c) => c._seedRole === "retail") ?? customersRows[0],
      lines: [
        { ref: pickVariant(0), qty: 2 },
        { ref: pickVariant(1), qty: 1 },
      ],
    },
    {
      reference: "SEED-ORD-002",
      channel: "whatsapp",
      status: "paid",
      customer: customersRows.find((c) => c._seedRole === "wholesaler") ?? customersRows[0],
      wholesale: true,
      lines: [
        { ref: pickVariant(2), qty: 8 },
        { ref: pickVariant(3), qty: 6 },
      ],
    },
    {
      reference: "SEED-ORD-003",
      channel: "site",
      status: "fulfilled",
      customer: customersRows[customersRows.length - 1],
      lines: [{ ref: pickVariant(4), qty: 3 }],
    },
    {
      reference: "SEED-ORD-004",
      channel: "online",
      status: "draft",
      customer: customersRows[0],
      lines: [{ ref: pickVariant(5), qty: 1 }],
    },
  ];

  const out = [];
  for (const s of samples) {
    const body = {
      customerId: rowId(s.customer),
      channel: s.channel,
      status: s.status,
      reference: s.reference,
      notes: `Seed (${s.channel})`,
      lines: s.lines.map(({ ref, qty }) => ({
        variantId: ref.variantId,
        quantity: qty,
        unitPrice: s.wholesale
          ? Number(ref.priceWholesale ?? ref.price ?? 0)
          : Number(ref.price ?? 0),
        description: `${ref.sku} (${[ref.color, ref.size].filter(Boolean).join(" · ")})`,
      })),
    };
    const r = await apiFetch("/orders", { method: "POST", token, body });
    if (r.ok) {
      out.push(r.data);
      console.log(
        `  + ${s.reference} [${s.channel}/${s.status}] (${rowId(r.data) ?? "?"}) · ${body.lines.length} linha(s)`,
      );
    } else if (isDuplicateError(r.status, r.data)) {
      console.log(`  = ${s.reference} já existia`);
    } else if (flags.verbose) {
      console.warn(`  ! ${s.reference}:`, r.status, r.data);
    } else {
      console.log(`  ! ${s.reference} falhou (${r.status})`);
    }
  }
  return out;
}

async function seedPublicDraft(productsRows) {
  console.log("\n▸ Rascunho público (/public/order-drafts)");
  const refs = collectVariantRefs(productsRows);
  if (!refs.length) {
    console.log("  · sem variantes; pulando.");
    return null;
  }
  const r = await apiFetch("/public/order-drafts", {
    method: "POST",
    body: {
      waId: "5511999990001",
      metadata: {
        customer: { name: "Cliente Link Público", phone: "11999990001" },
        source: "seed",
      },
    },
  });
  if (!r.ok) {
    if (flags.verbose) console.warn("  ! draft:", r.status, r.data);
    console.log(`  ! criação falhou (${r.status})`);
    return null;
  }
  const sessionToken = r.data?.sessionToken;
  if (!sessionToken) {
    console.log("  ! resposta sem sessionToken");
    return null;
  }
  const patch = await apiFetch(`/public/order-drafts/${sessionToken}`, {
    method: "PATCH",
    body: {
      lines: refs.slice(0, 2).map((v) => ({
        variantId: v.variantId,
        quantity: 1,
        unitPrice: v.price,
      })),
      status: "review",
    },
  });
  if (patch.ok) console.log(`  + draft ${sessionToken} com ${(patch.data?.lines ?? []).length} linha(s)`);
  else console.log(`  ! patch falhou (${patch.status})`);
  return sessionToken;
}

async function seedInvoices(token, ordersRows) {
  console.log("\n▸ Notas fiscais");
  if (!ordersRows.length) {
    console.log("  · sem pedidos; pulando.");
    return [];
  }
  const paidOrders = ordersRows.filter((o) => String(o.status) === "paid").slice(0, 2);
  if (!paidOrders.length) {
    console.log("  · nenhum pedido pago; pulando.");
    return [];
  }
  const out = [];
  for (const o of paidOrders) {
    const orderId = rowId(o);
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 10);
    const amount = Number(o.total ?? 0) || 1; // API exige `amount > 0`
    const body = {
      orderId,
      number: `SEED-NF-${String(orderId).slice(-6).toUpperCase()}`,
      status: "paid",
      amount,
      dueDate: dueDate.toISOString(),
      notes: "Fatura gerada pelo seed de demonstração",
    };
    const r = await apiFetch("/invoices", { method: "POST", token, body });
    if (r.ok) {
      out.push(r.data);
      console.log(`  + ${body.number} (${rowId(r.data) ?? "?"})`);
    } else if (isDuplicateError(r.status, r.data)) {
      console.log(`  = ${body.number} já existia`);
    } else if (flags.verbose) {
      console.warn(`  ! ${body.number}:`, r.status, r.data);
    } else {
      console.log(`  ! ${body.number} falhou (${r.status})`);
    }
  }
  return out;
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------

async function main() {
  if (!password) {
    console.error(
      "Defina SEED_ADMIN_PASSWORD (ou ADMIN_PASSWORD) no ambiente ou em .env.local para autenticar na API.",
    );
    process.exit(1);
  }

  console.log(`API: ${baseURL}`);
  console.log(`Admin: ${email}`);
  if (flags.only) console.log(`Módulos: ${[...flags.only].join(", ")}`);
  if (flags.skip) console.log(`Pulando: ${[...flags.skip].join(", ")}`);

  const login = await apiFetch("/auth/login", {
    method: "POST",
    body: { email, password },
  });
  if (!login.ok) {
    console.error("Falha no login:", login.status, login.data);
    process.exit(1);
  }
  const token = login.data?.accessToken;
  if (!token) {
    console.error("Resposta de login sem accessToken:", login.data);
    process.exit(1);
  }

  const suppliersRows = moduleEnabled("suppliers") ? await seedSuppliers(token) : [];
  const customersRows = moduleEnabled("customers") ? await seedCustomers(token) : [];
  const productsRows = moduleEnabled("products") ? await seedProducts(token) : [];

  // Módulos que dependem dos anteriores — buscam dados existentes se os
  // módulos-pais foram pulados, para que `--only=orders` também funcione.
  const suppliersForDeps = suppliersRows.length
    ? suppliersRows
    : moduleEnabled("purchases")
      ? await listFallback("/suppliers", token, 10)
      : [];
  const customersForDeps = customersRows.length
    ? customersRows
    : moduleEnabled("orders")
      ? (await listFallback("/customers", token, 10)).map((c) => ({ ...c, _seedRole: "retail" }))
      : [];
  const productsForDeps =
    productsRows.length
      ? productsRows
      : moduleEnabled("purchases") || moduleEnabled("orders") || moduleEnabled("drafts")
        ? await listFallback("/products", token, 20)
        : [];

  const purchases = moduleEnabled("purchases")
    ? await seedPurchases(token, suppliersForDeps, productsForDeps)
    : [];
  const orders = moduleEnabled("orders")
    ? await seedOrders(token, customersForDeps, productsForDeps)
    : [];
  if (moduleEnabled("drafts")) await seedPublicDraft(productsForDeps);
  if (moduleEnabled("invoices")) await seedInvoices(token, orders);

  console.log("\nResumo:");
  console.log(`  fornecedores: ${suppliersRows.length}`);
  console.log(`  clientes:     ${customersRows.length}`);
  console.log(`  produtos:     ${productsRows.length}`);
  console.log(`  compras:      ${purchases.length}`);
  console.log(`  pedidos:      ${orders.length}`);
  console.log(
    "\nDica: abra /dashboard, /pdv, /inventory e /catalogo para ver os dados populados.",
  );
}

async function listFallback(endpoint, token, limit = 20) {
  const r = await apiFetch(endpoint, { token, query: { page: 1, limit } });
  return r.ok ? extractListItems(r.data) : [];
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
