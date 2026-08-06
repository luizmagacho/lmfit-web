# Loop 23 — Separar a família minimal: Luxo vs. Wellness vs. Minimal

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 23 · **Depends on:** Loop 19 (composição), decisão §3.2 (ramificar por preset dentro da família, sem componente novo)
**Repos touched:** lmfit-web

## Goal

`MinimalHome.tsx` hoje é idêntico pros 3 presets da família minimal (Luxo/Calvin Klein, Wellness/
Lululemon, Minimal/anti-design) — só cor/fonte varia. Mas Luxo e Wellness são gêneros opostos
(austeridade fotográfica vs. acolhimento lifestyle). Este loop ramifica `MinimalHome` por preset
(`useThemePreset`, novo hook em `TenantContext.tsx`), sem criar família nova (decisão do Loop 19
§3.2: só vale a pena quando 2 presets da mesma família são gêneros genuinamente opostos — que é
exatamente o caso aqui).

## Scope

**In:**
- Novo `useThemePreset()` em `TenantContext.tsx` — expõe o ID bruto do preset ativo (não só os
  tokens derivados de `useThemeTokens()`), necessário pra ramificar por preset específico.
- `MinimalHome.tsx` ramifica em 3:
  - **Luxo**: "cromo quase zero" de verdade — só hero + grid, SEM lookbook/cupom (mais silencioso
    que o comportamento genérico de hoje).
  - **Wellness**: ganha `CategoryChips` ("compre por atividade", componente já existente —
    reusa) + `TrustBar` (faixa de benefício, mesmo componente genérico do resto do app) antes do
    grid.
  - **Minimal**: comportamento de hoje, inalterado (hero, respiro, grid, lookbook/cupom
    secundários) — já é "nada além do essencial" por natureza.

**Out (explicitamente):**
- Faixa de depoimento pro Wellness — exigiria campo novo no schema do tenant + UI de admin pra
  cadastrar depoimentos; fora do escopo desta loop (carry-over documentado, não descartado).
- `MinimalHeader`/`MinimalPDP` — o plano não descreve divergência pra esses, só pra Home.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Como ramificar | `useThemePreset()` novo hook, não um token de composição existente | Nenhum token do Loop 19 distingue Wellness de Minimal (ambos "uniform"/"single"/"none") — a diferença é de GÊNERO, não de composição de grade/hero |
| Componente novo pra Wellness/Luxo | Não | Mesma família, HomeSlots idêntico — ramificar dentro do componente é o padrão já decidido no Loop 19 §3.2 |
| Depoimento do Wellness | Adiado (fora do escopo) | Exigiria schema novo + admin UI; over-engineering pro que este loop pode entregar de verdade hoje |
| Faixa de benefício do Wellness | Reusa `TrustBar` (não um componente novo) | Já é exatamente "ícone + rótulo de benefício"; inventar um componente novo pra isso seria duplicar |

## Acceptance criteria

- [ ] AC1 — Preset Luxo: `MinimalHome` renderiza hero + grid, SEM lookbook/cupom, mesmo que o
      tenant tenha ambos configurados. *(verify: teste unitário + browser)*
- [ ] AC2 — Preset Wellness: `MinimalHome` renderiza `CategoryChips` + `TrustBar` antes do grid.
      *(verify: teste unitário + browser)*
- [ ] AC3 — Preset Minimal (monocromo): `MinimalHome` continua exatamente como antes deste loop —
      regressão zero. *(verify: teste unitário)*
- [ ] AC4 — `useThemePreset()` retorna o preset resolvido (com fallback pro default quando
      inválido/ausente, mesmo comportamento de `resolveThemePreset`). *(verify: teste unitário)*

## Tasks

- [x] 1. `useThemePreset()` em `TenantContext.tsx`.
- [x] 2. `MinimalHome.tsx`: ramificação Luxo/Wellness/Minimal.
- [x] 3. Testes unitários (AC1-4).
- [x] 4. `tsc --noEmit` limpo; suíte completa verde.
- [x] 5. Verificação ao vivo: os 3 presets da família minimal com composições de home genuinamente diferentes.
- [x] 6. **Não previsto no PLAN**: `LojaClient.test.tsx` (suíte de regressão do Loop 19a) quebrou —
      seu mock de `@/context/TenantContext` não exportava `useThemePreset`. Corrigido no mesmo
      passe (1 linha no mock).

## Follow-up record
### PLAN        — [x] explored code · [x] draft spec · [x] decisions listed → Draft on 2026-07-31
### REFINEMENT  — [x] decisions resolved · [x] assumptions checked · [x] ACs testable · [x] DoR review → Ready on 2026-07-31
### IMPLEMENT   — [x] tasks done · [x] tsc green per task → done on 2026-07-31
### TEST        — [x] AC-named tests · [x] pre-existing suite fixed → api 312/312 (unchanged), web 465/465 (+3) → green on 2026-07-31
### VERIFY      — [x] browser/DOM walk · [x] AC checklist → all ✅ on 2026-07-31
### DOCUMENT    — [x] spec Result · [x] ROADMAP changelog → merged on 2026-07-31
### PLAN AGAIN  — [x] retro · [x] carry-overs filed → on 2026-07-31

## Verification record

Verificado ao vivo contra o tenant `kivoni` real, numa instância temporária do `lmfit-api`
(porta 4001), alternando entre os 3 presets da família minimal.

- **AC1** ✅ — Preset `luxo`: `hasLookbookText`/`hasCategoryChipsNav`/`hasTrustBarText` todos
  `false` no DOM real, mesmo com o tenant tendo lookbook configurado ("Look Torcedor Completo") e
  `showTrustBar: true` explicitamente ligado pro teste — confirma que Luxo omite ativamente, não
  só por falta de config.
- **AC2** ✅ — Preset `studio` (Wellness): `hasCategoryChipsNav` e `hasTrustBarText` ambos `true`,
  `hasLookbookText` também `true` (Wellness é convidativo, mantém tudo).
- **AC3** ✅ — Preset `monocromo` (Minimal): `hasLookbookText: true`, chips/trustbar `false` — o
  comportamento de sempre, intacto.

Toda a massa de verificação foi revertida ao final: preset do tenant de volta a `streetwear`,
`showTrustBar` de volta a `false`, `.env.local` de volta a `4000`, instância temporária do
`lmfit-api` encerrada por PID exato.

## Result

**O que foi entregue:** novo `useThemePreset()` hook (thin wrapper sobre `resolveThemePreset`, já
exaustivamente testado) e `MinimalHome.tsx` ramificando por preset dentro do MESMO componente
(decisão do Loop 19 §3.2, sem família nova): Luxo vira "cromo quase zero" de verdade (só hero+grid),
Wellness ganha `CategoryChips` (compra por atividade) + `TrustBar` (faixa de benefício) — ambos
componentes já existentes, reaproveitados — e Minimal permanece com o comportamento original,
inalterado.

**Desvio do plano:** a faixa de depoimento pro Wellness (mencionada no plano original) foi
deliberadamente deixada de fora — exigiria schema novo no tenant + UI de admin pra cadastrar
depoimentos, o que seria escopo de outro loop, não um flourish visual como os anteriores. Registrado
como carry-over explícito, não descartado silenciosamente.

**Achado real durante o TEST, não IMPLEMENT**: a suíte de regressão do Loop 19a
(`LojaClient.test.tsx`) quebrou porque seu mock de `TenantContext` não incluía o hook novo — um
lembrete de que qualquer novo hook exportado de um módulo já mockado em testes existentes precisa
ser adicionado a TODOS os mocks desse módulo, não só ao do teste que motivou a mudança.

**Retro:**
- O que ajudou: rodar a suíte COMPLETA (não só o teste novo) antes de declarar pronto — o
  `MinimalHome.test.tsx` isolado passava perfeitamente, mas só a suíte inteira revelou a quebra em
  `LojaClient.test.tsx`. Reforça a disciplina já estabelecida nesta sessão de sempre rodar a suíte
  completa antes do VERIFY.
- Mudar no processo: ao adicionar um hook novo a um módulo de contexto já mockado em múltiplos
  arquivos de teste, fazer um `grep` por `vi.mock("@/context/TenantContext"` logo depois de
  escrever o hook, antes mesmo de rodar a suíte — teria pego a lacuna mais cedo.

**Carry-overs para o próximo PLAN:**
1. Faixa de depoimento do Wellness (ver "Desvio do plano" acima).
2. Próximo: Loop 24 (separar a família classic: Atlético vs. Essencial vs. Impacto) — o último
   item de "maior ganho de diferenciação" (prioridade 2) do STOREFRONT-V3-FIDELIDADE.md.
