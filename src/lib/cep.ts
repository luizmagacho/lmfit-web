export type CepAddress = {
  cep: string;
  logradouro: string;
  bairro: string;
  cidade: string;
  uf: string;
  complemento?: string;
};

export function onlyCepDigits(v: string): string {
  return String(v ?? "").replace(/\D/g, "").slice(0, 8);
}

export function maskCep(v: string): string {
  const d = onlyCepDigits(v);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

export function isValidCep(v: string): boolean {
  return onlyCepDigits(v).length === 8;
}

export async function lookupCep(
  cep: string,
  { signal, timeoutMs = 4000 }: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<CepAddress | null> {
  const digits = onlyCepDigits(cep);
  if (digits.length !== 8) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    else signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  try {
    const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      cep?: string;
      logradouro?: string;
      bairro?: string;
      localidade?: string;
      uf?: string;
      complemento?: string;
      erro?: boolean | string;
    };
    if (data.erro) return null;
    return {
      cep: maskCep(digits),
      logradouro: data.logradouro ?? "",
      bairro: data.bairro ?? "",
      cidade: data.localidade ?? "",
      uf: data.uf ?? "",
      complemento: data.complemento,
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
