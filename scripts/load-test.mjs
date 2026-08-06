#!/usr/bin/env node
// Loop 10 — smoke de carga antes de apontar tráfego real: (1) navegação anônima em /catalogo
// (GET /public/catalog/products, o endpoint de leitura mais batido da loja) e (2) um fluxo
// completo de guest checkout (rascunho → patch → submit no branch manual/WhatsApp, que não
// depende de nenhum gateway de pagamento real). NÃO faz parte do `npm test`/CI — é um script pra
// rodar manualmente antes do lançamento, contra um tenant descartável (staging ou dev), nunca
// produção: o cenário 2 cria pedidos de verdade a cada execução.
//
// As taxas abaixo (`OVERALL_RATE`/`CHECKOUT_RATE`) são propositalmente limitadas por design:
// o rate-limiter global (`TenantThrottlerGuard`) conta por tenant, não por visitante, então um
// autocannon sem freio (milhares de req/s) sempre esbarra nele — isso não é bug, é o rate-limit
// funcionando. Este script simula o volume de uma loja com tráfego real (dezenas de visitantes
// navegando + poucos checkouts por minuto), não um teste de ruptura do rate-limiter em si
// (esse já está coberto por unit tests em payment-webhook-dispatcher.service.spec.ts e afins).
import autocannon from "autocannon";

const API_URL = process.env.LOAD_TEST_API_URL || "http://localhost:4000";
const TENANT_SLUG = process.env.LOAD_TEST_TENANT || "kivoni";
const DURATION = Number(process.env.LOAD_TEST_DURATION || 10);
const CONNECTIONS = Number(process.env.LOAD_TEST_CONNECTIONS || 10);
// Catálogo: bem abaixo do teto de 1000/min por tenant (catalog.controller.ts) — simula ~8 req/s
// (480/min) de navegação concorrente, deixando margem de sobra.
const OVERALL_RATE = Number(process.env.LOAD_TEST_RATE || 8);
// Checkout: quantidade de sequências completas (draft → patch → submit) a rodar, espaçadas no
// tempo — não usa autocannon aqui porque seu `overallRate` tem piso de 1 req/s (60/min), acima
// do teto de 20/min do submit (public-order-drafts.controller.ts); um loop sequencial simples
// simula melhor "poucos checkouts por minuto" do que uma ferramenta de flood.
const CHECKOUT_ITERATIONS = Number(process.env.LOAD_TEST_CHECKOUT_ITERATIONS || 5);
const CHECKOUT_INTERVAL_MS = Number(process.env.LOAD_TEST_CHECKOUT_INTERVAL_MS || 5000);

function printSummary(label, result) {
  console.log(`\n--- ${label} ---`);
  console.log(`Requisições: ${result.requests.total} total, ${result.requests.average.toFixed(1)}/s média`);
  console.log(`Latência: p50=${result.latency.p50}ms p99=${result.latency.p99}ms`);
  console.log(`Erros: ${result.errors} | Timeouts: ${result.timeouts} | Non-2xx: ${result.non2xx}`);
  const ok = result.errors === 0 && result.non2xx === 0;
  console.log(ok ? "PASS" : "FAIL — revisar antes de subir tráfego real");
  return ok;
}

async function runCatalogBrowse() {
  const result = await autocannon({
    url: `${API_URL}/public/catalog/products?limit=20`,
    connections: CONNECTIONS,
    duration: DURATION,
    overallRate: OVERALL_RATE,
    headers: { "x-tenant-slug": TENANT_SLUG },
  });
  return printSummary("Cenário 1: navegação anônima em /catalogo", result);
}

async function findAVariant() {
  const res = await fetch(`${API_URL}/public/catalog/products?limit=5`, {
    headers: { "x-tenant-slug": TENANT_SLUG },
  });
  const data = await res.json();
  const items = Array.isArray(data) ? data : data.items || [];
  for (const product of items) {
    const variant = (product.variants || []).find((v) => (v.quantityInStock ?? 0) > 0);
    if (variant) return variant._id || variant.id;
  }
  return null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runOneCheckout(variantId) {
  const draftRes = await fetch(`${API_URL}/public/order-drafts`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-tenant-slug": TENANT_SLUG },
    body: JSON.stringify({}),
  });
  if (!draftRes.ok) return { ok: false, step: "draft", status: draftRes.status };
  const { sessionToken } = await draftRes.json();

  const patchRes = await fetch(`${API_URL}/public/order-drafts/${sessionToken}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", "x-tenant-slug": TENANT_SLUG },
    body: JSON.stringify({
      lines: [{ variantId, quantity: 1 }],
      shippingMethod: "pickup",
      metadata: { customer: { name: "Load Test", phone: "11999999999" } },
    }),
  });
  if (!patchRes.ok) return { ok: false, step: "patch", status: patchRes.status };

  const submitRes = await fetch(`${API_URL}/public/order-drafts/${sessionToken}/submit`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-tenant-slug": TENANT_SLUG },
    body: JSON.stringify({ payment: { method: "manual" } }),
  });
  if (!submitRes.ok) return { ok: false, step: "submit", status: submitRes.status };

  return { ok: true };
}

async function runGuestCheckoutFlow() {
  const variantId = await findAVariant();
  if (!variantId) {
    console.log("\n--- Cenário 2 ---\nNenhuma variante encontrada nesse tenant — pulando (rode o cenário 1 sozinho, ou seede produtos primeiro).");
    return true;
  }

  console.log(`\n--- Cenário 2: guest checkout completo (draft → patch → submit manual) ---`);
  const failures = [];
  for (let i = 0; i < CHECKOUT_ITERATIONS; i++) {
    const result = await runOneCheckout(variantId);
    if (!result.ok) failures.push(result);
    if (i < CHECKOUT_ITERATIONS - 1) await sleep(CHECKOUT_INTERVAL_MS);
  }

  console.log(`Checkouts: ${CHECKOUT_ITERATIONS} tentados, ${CHECKOUT_ITERATIONS - failures.length} concluídos`);
  if (failures.length) {
    console.log(`Falhas: ${failures.map((f) => `${f.step}=${f.status}`).join(", ")}`);
  }
  const ok = failures.length === 0;
  console.log(ok ? "PASS" : "FAIL — revisar antes de subir tráfego real");
  return ok;
}

const ok1 = await runCatalogBrowse();
const ok2 = await runGuestCheckoutFlow();
console.log(`\n=== Resultado final: ${ok1 && ok2 ? "PASS" : "FAIL"} ===`);
process.exit(ok1 && ok2 ? 0 : 1);
