# Loop 21 — Streetwear/Off-White: acabamento de marca

**Status:** Done
**Roadmap entry:** ROADMAP.md §Loop 21 · **Depends on:** Loop 19 (sectionTexture/grain), Loop 20 (padrão de flourish gated por família)
**Repos touched:** lmfit-web

## Goal

Dos 4 itens que o STOREFRONT-V3-FIDELIDADE.md §4 lista pro Streetwear/Off-White, **2 já foram
entregues** em loops anteriores sem terem sido creditados a este loop: grão/ruído (Loop 19, via
`sectionTexture: "grain"` + `SectionCard`) e aspas literais nos títulos (já presentes desde o
Loop 12 em `IndustrialHeader`/`IndustrialHome`/`IndustrialPDP`/`StorefrontFooter`/`MarqueeTape`).
Restam os 2 que nenhum loop tocou: **numeração estilo industrial** ("Nº 0001" por produto) e
**setas** (motivo gráfico recorrente do Off-White) — mais a **fita diagonal**, que o plano já
descreve como "estender `MarqueeTape`, não recriar".

## Scope

**In:**
- `ProductGrid.tsx`: card ganha um selo numerado (`Nº 0001`, `Nº 0002`...) no canto inferior
  esquerdo da foto, só quando `layoutFamily === "industrial"` — mesmo padrão de gate já
  estabelecido pelo `sticker` do Loop 20 (reaproveita `layoutFamily`, não inventa token novo).
- `IndustrialHeader.tsx`/`IndustrialHome.tsx`: seta (`ArrowUpRight`, lucide-react, já uma
  dependência do projeto) como acento visual antes dos links de navegação e dos rótulos de seção
  entre aspas.
- `MarqueeTape.tsx` ganha `variant?: "horizontal" | "diagonal"` (default `"horizontal"` — o
  carimbo de "estender, não recriar" do plano). `"diagonal"` vira uma fita/ribbon rotacionada,
  usada como selo de canto sobre a galeria da PDP industrial (`IndustrialPDP.tsx`).

**Out (explicitamente):**
- Qualquer refatoração do grão/aspas já entregues (Loop 19/12) — só creditar no doc, sem retocar código.
- Numeração/setas em qualquer outra família — item exclusivo do Streetwear no plano.

## Decisions

| Decision | Choice | Why |
|---|---|---|
| Onde numerar | `ProductGrid.tsx`, gated por `layoutFamily === "industrial"` | Mesmo padrão do `sticker` (Loop 20) — reaproveita token já real, evita fork por família |
| Numeração usa índice pós-filtro ou pré-filtro? | Pós-filtro/ordenação (o `idx` que o `.map` já usa) | É a ordem que o cliente realmente vê na tela — numerar por um índice "cru" da API seria invisível/sem sentido pro usuário |
| Texto da fita diagonal | `"ORIGINAL"` fixo (sem campo novo no tenant) | Gênero-neutro, qualquer lojista faria sentido; inventar um campo configurável pra 1 palavra é over-engineering pro escopo deste loop |
| `MarqueeTape` variant default | `"horizontal"` | Nenhum chamador existente pode quebrar — `IndustrialHome`'s uso atual continua idêntico sem passar a prop |

## Acceptance criteria

- [ ] AC1 — Preset Streetwear: cada card da PLP mostra um selo `Nº 000N` (N = posição+1 na grade
      visível), canto inferior esquerdo da foto. *(verify: teste unitário + browser)*
- [ ] AC2 — Qualquer outro preset: nenhum selo de numeração aparece. *(verify: teste unitário)*
- [ ] AC3 — `IndustrialHeader`: seta antes de "LOJA"/"TROCAS"; `IndustrialHome`: seta antes de
      "HOME"/«PRODUCTS»". *(verify: browser)*
- [ ] AC4 — `MarqueeTape` sem `variant` (ou `variant="horizontal"`) renderiza EXATAMENTE a mesma
      estrutura de antes — regressão zero pro uso já existente em `IndustrialHome`. *(verify: teste
      unitário comparando snapshot de classes)*
- [ ] AC5 — `MarqueeTape` com `variant="diagonal"` renderiza uma fita rotacionada, não a barra
      horizontal de sempre; usada como selo de canto sobre a galeria da `IndustrialPDP`. *(verify:
      teste unitário + browser)*

## Design notes

Arquivos: `src/components/organisms/ProductGrid.tsx`, `src/components/organisms/MarqueeTape.tsx`,
`src/layouts/storefront/industrial/{IndustrialHeader,IndustrialHome,IndustrialPDP}.tsx`.

```tsx
// ProductGrid.tsx — selo numerado, só industrial
{layoutFamily === "industrial" ? (
  <span className="absolute bottom-2 left-2 px-1 text-[9px] font-bold"
        style={{ backgroundColor: "#000", color: "#fff", fontFamily: "'Space Mono', monospace" }}>
    Nº {String(idx + 1).padStart(4, "0")}
  </span>
) : null}
```

```tsx
// MarqueeTape.tsx — variant diagonal (selo de canto, não barra full-width)
export function MarqueeTape({ text, variant = "horizontal" }: { text: string; variant?: "horizontal" | "diagonal" }) {
  if (variant === "diagonal") {
    return (
      <div aria-hidden className="absolute top-3 -right-12 w-44 rotate-45 select-none overflow-hidden z-10">
        <div className="py-1 text-center" style={{ backgroundColor: "#000" }}>
          <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: "#fff", fontFamily: "'Space Mono', monospace" }}>
            {text}
          </span>
        </div>
      </div>
    );
  }
  // ... implementação horizontal existente, sem mudança
}
```

`IndustrialPDP.tsx` precisa de `position: relative` + `overflow-hidden` no wrapper da galeria pra
a fita diagonal ficar contida (clipping) — hoje o wrapper já tem `border: 2px solid #000`, só
falta as duas classes extras.

## Tasks

- [x] 1. `ProductGrid.tsx`: selo numerado gated por `layoutFamily === "industrial"`.
- [x] 2. `IndustrialHeader.tsx`/`IndustrialHome.tsx`: seta `ArrowUpRight` como acento.
- [x] 3. `MarqueeTape.tsx`: `variant` prop (horizontal default + diagonal novo).
- [x] 4. `IndustrialPDP.tsx`: fita diagonal "ORIGINAL" sobre a galeria.
- [x] 5. Testes unitários (AC1-5), incluindo regressão do `variant` default.
- [x] 6. `tsc --noEmit` limpo; suíte completa verde.
- [x] 7. Verificação ao vivo: Streetwear com selo numerado + setas + fita diagonal na PDP; outro preset sem nenhum desses elementos.

## Follow-up record
### PLAN        — [x] explored code · [x] draft spec · [x] decisions listed → Draft on 2026-07-31
### REFINEMENT  — [x] decisions resolved · [x] assumptions checked · [x] ACs testable · [x] DoR review → Ready on 2026-07-31
### IMPLEMENT   — [x] tasks done · [x] tsc green per task → done on 2026-07-31
### TEST        — [x] AC-named tests · [x] negative paths · suites: api 312/312 (unchanged) · web 459/459 (+5) → green on 2026-07-31
### VERIFY      — [x] browser/DOM walk · [x] AC checklist → all ✅ on 2026-07-31
### DOCUMENT    — [x] spec Result · [x] ROADMAP changelog → merged on 2026-07-31
### PLAN AGAIN  — [x] retro · [x] carry-overs filed → on 2026-07-31

## Verification record

Verificado ao vivo contra o tenant `kivoni` real, numa instância temporária do `lmfit-api`
(porta 4001 — reaproveitando uma instância já saudável de um loop anterior desta sessão em vez de
subir uma nova).

- **AC1** ✅ — Ao vivo: 10 cards da PLP sob `streetwear` mostraram selos `Nº 0001` a `Nº 0010`,
  sequenciais, canto inferior esquerdo da foto. Screenshot capturado.
- **AC2** ✅ — Ao vivo: preset `essencial`, `document.body.textContent.includes("Nº ")` retornou
  `false` — nenhum vazamento. `ProductGrid.render.test.tsx` cobre o mesmo caso.
- **AC3** ✅ — Ao vivo: screenshot mostrou "↗ "LOJA"", "↗ "TROCAS"" no header e "↗ «PRODUCTS»" no
  rótulo de seção da home — a seta aparece antes de cada elemento, exatamente como desenhado.
- **AC4** ✅ — `MarqueeTape.test.tsx`: sem `variant` (ou `variant="horizontal"`) continua
  produzindo a mesma classe/estrutura (`border-y-2`, 20 instâncias de texto via as 2 cópias × 10
  repetições) — regressão zero confirmada por teste.
- **AC5** ✅ — Ao vivo: PDP de "Camisa Flamengo I 2024" sob `streetwear` mostrou a fita diagonal
  preta "ORIGINAL" rotacionada no canto superior direito da galeria — screenshot capturado,
  visualmente idêntico ao desenho da spec.

Toda a massa de verificação foi revertida ao final: preset do tenant de volta a `streetwear`,
`.env.local` de volta a `4000`, instância temporária do `lmfit-api` encerrada por PID exato.

## Result

**O que foi entregue:** dos 4 itens do plano pro Streetwear/Off-White, os 2 que faltavam depois
dos Loops 19/20 (grão + aspas já entregues antes, sem crédito formal): selo numerado industrial
(`Nº 000N`, gated por `layoutFamily === "industrial"`, mesmo padrão do `sticker` do Loop 20), seta
`ArrowUpRight` como acento recorrente (header + rótulos de seção da home), e `MarqueeTape.tsx`
ganhando um `variant="diagonal"` — uma fita/ribbon rotacionada usada como selo "ORIGINAL" sobre a
galeria da PDP industrial, estendendo o componente do Loop 12 em vez de recriar, exatamente como
o plano pedia.

**Desvio do plano:** nenhum. Todas as decisões do PLAN (texto fixo "ORIGINAL" sem campo novo no
tenant, `variant` default preservando 100% do comportamento antigo, numeração pelo índice
pós-filtro que o usuário realmente vê) se confirmaram sem ajuste durante o IMPLEMENT/VERIFY.

**Retro:**
- O que ajudou: o padrão de gate por `layoutFamily` já estabelecido no Loop 20 (`isSticker`) tornou
  o `isIndustrial` deste loop trivial de acrescentar — mesmo raciocínio, mesmo lugar no código,
  zero decisão nova precisou ser tomada sobre "onde" colocar a lógica.
- O que mudou desta vez: o painel de screenshot, instável nos Loops 19/20 (tela preta após scroll),
  funcionou normalmente aqui — as capturas confirmaram visualmente os 3 elementos novos (setas,
  selo numerado, fita diagonal) sem precisar só de inspeção de DOM via JS.

**Carry-overs para o próximo PLAN:**
1. `ExpressiveHome.tsx`/`IndustrialHome.tsx` continuam com `color-card`/`hard-frame` montados
   manualmente em vez de via `SectionCard` (carry-over desde o Loop 19, ainda adiável).
2. Próximo: Loop 22 (Editorial/Zara — lookbook assimétrico + separação de Boutique/Chanel), o
   último item de "acabamento de marca" listado no STOREFRONT-V3-FIDELIDADE.md antes da
   coreografia de movimento transversal (Loop 23+).
