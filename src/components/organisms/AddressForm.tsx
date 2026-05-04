"use client";

import { useCallback, useState } from "react";
import { isValidCep, lookupCep, maskCep, onlyCepDigits } from "@/lib/cep";
import { useCheckoutStore } from "@/stores/useCheckoutStore";
import { lmfitTokens } from "@/theme/tokens";

export function AddressForm({ onValid }: { onValid?: (ok: boolean) => void }) {
  const { address, setAddress } = useCheckoutStore();
  const [cep, setCep] = useState<string>(address?.cep ?? "");
  const [looking, setLooking] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [form, setForm] = useState({
    logradouro: address?.logradouro ?? "",
    numero: address?.numero ?? "",
    complemento: address?.complemento ?? "",
    bairro: address?.bairro ?? "",
    cidade: address?.cidade ?? "",
    uf: address?.uf ?? "",
  });

  const commit = useCallback(
    (patch: Partial<typeof form>, cepRaw = cep) => {
      const next = { ...form, ...patch };
      setForm(next);
      if (
        isValidCep(cepRaw) &&
        next.logradouro.trim() &&
        next.numero.trim() &&
        next.bairro.trim() &&
        next.cidade.trim() &&
        next.uf.trim()
      ) {
        setAddress({ cep: maskCep(cepRaw), ...next });
        onValid?.(true);
      } else {
        setAddress(null);
        onValid?.(false);
      }
    },
    [form, cep, setAddress, onValid],
  );

  const handleCepBlur = useCallback(async () => {
    const d = onlyCepDigits(cep);
    if (d.length !== 8) {
      setErr("CEP inválido.");
      return;
    }
    setErr(null);
    setLooking(true);
    const data = await lookupCep(d);
    setLooking(false);
    if (!data) {
      setErr("Não encontramos esse CEP. Preencha manualmente.");
      return;
    }
    commit(
      {
        logradouro: data.logradouro || form.logradouro,
        bairro: data.bairro || form.bairro,
        cidade: data.cidade || form.cidade,
        uf: data.uf || form.uf,
        complemento: data.complemento || form.complemento,
      },
      data.cep,
    );
  }, [cep, commit, form]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-6 gap-3">
      <label className="text-xs sm:col-span-2" style={{ color: lmfitTokens.textMuted }}>
        CEP
        <input
          type="text"
          inputMode="numeric"
          autoComplete="postal-code"
          className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-[var(--card-bg)]"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          value={maskCep(cep)}
          onChange={(e) => setCep(onlyCepDigits(e.target.value))}
          onBlur={handleCepBlur}
          placeholder="00000-000"
          maxLength={9}
        />
        {looking ? (
          <span className="text-xs" style={{ color: lmfitTokens.textMuted }}>Buscando…</span>
        ) : err ? (
          <span className="text-xs" style={{ color: lmfitTokens.error }}>{err}</span>
        ) : null}
      </label>
      <label className="text-xs sm:col-span-4" style={{ color: lmfitTokens.textMuted }}>
        Endereço
        <input
          type="text"
          autoComplete="street-address"
          className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-[var(--card-bg)]"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          value={form.logradouro}
          onChange={(e) => commit({ logradouro: e.target.value })}
        />
      </label>
      <label className="text-xs sm:col-span-2" style={{ color: lmfitTokens.textMuted }}>
        Número
        <input
          type="text"
          inputMode="numeric"
          className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-[var(--card-bg)]"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          value={form.numero}
          onChange={(e) => commit({ numero: e.target.value })}
        />
      </label>
      <label className="text-xs sm:col-span-4" style={{ color: lmfitTokens.textMuted }}>
        Complemento
        <input
          type="text"
          className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-[var(--card-bg)]"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          value={form.complemento}
          onChange={(e) => commit({ complemento: e.target.value })}
        />
      </label>
      <label className="text-xs sm:col-span-2" style={{ color: lmfitTokens.textMuted }}>
        Bairro
        <input
          type="text"
          className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-[var(--card-bg)]"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          value={form.bairro}
          onChange={(e) => commit({ bairro: e.target.value })}
        />
      </label>
      <label className="text-xs sm:col-span-3" style={{ color: lmfitTokens.textMuted }}>
        Cidade
        <input
          type="text"
          className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-[var(--card-bg)]"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          value={form.cidade}
          onChange={(e) => commit({ cidade: e.target.value })}
        />
      </label>
      <label className="text-xs sm:col-span-1" style={{ color: lmfitTokens.textMuted }}>
        UF
        <input
          type="text"
          maxLength={2}
          className="mt-1 w-full min-h-10 border rounded px-2 py-1.5 text-sm bg-[var(--card-bg)] uppercase"
          style={{ borderColor: lmfitTokens.border, color: lmfitTokens.text }}
          value={form.uf}
          onChange={(e) => commit({ uf: e.target.value.toUpperCase() })}
        />
      </label>
    </div>
  );
}
