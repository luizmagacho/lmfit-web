# Loop Engineering Process v2 — PLAN → REFINEMENT → IMPLEMENT → TEST → VERIFY → DOCUMENT → PLAN AGAIN

How every loop in [ROADMAP.md](./ROADMAP.md) is executed to conquer its goal. One loop = one
deployable increment, driven by one spec file in [`specs/`](./specs/) that carries a **Follow-up
record** through all seven phases. The spec is the source of truth: if code and spec disagree,
fix one of them before the loop can close.

```
            ┌──────────────────────────── PLAN AGAIN ◄─────────────────────────┐
            ▼                                                                  │
   PLAN ──► REFINEMENT ──► IMPLEMENT ──► TEST ──► VERIFY ──► DOCUMENT ─────────┘
  (draft      (challenge     (build       (prove    (prove it    (make it
   the spec)   the spec)      small)       by code)  live)        durable)
```

Each phase has an **entry criterion**, a **follow-up checklist** (copied into the spec and checked
off with evidence), and an **exit gate**. A phase only starts when the previous gate is checked.
Failing a gate sends the loop back — TEST/VERIFY failures return to IMPLEMENT; a broken assumption
returns to PLAN.

## Ground rules

- **One loop in flight at a time.** Finish (or explicitly park) before starting the next.
- **Specs are executable contracts**: every acceptance criterion must be verifiable by a command or
  a browser walk-through someone else could repeat.
- **Never skip TEST or VERIFY.** They prove different things: TEST = automated proof by code;
  VERIFY = live proof in the running product. "Tests pass" alone never closes a loop.
- **Multi-tenant paranoia**: every new endpoint/query is written and reviewed with `tenantId`
  scoping; every public endpoint assumes hostile input.
- **Server is the price/stock authority.** Client-side money math is display-only (pattern already
  enforced in `order-drafts.service.ts`).

## Spec lifecycle

`Draft → Ready → In progress → Testing → Verifying → Done`
(status field at the top of each spec; update it at every gate).

---

## Phase 1 — PLAN (draft the spec)

**Purpose:** turn the loop's outline in ROADMAP.md into a concrete draft spec.
**Entry:** previous loop is Done (or parked with carry-overs recorded); ROADMAP outline exists.

**Follow-up checklist:**
- [ ] Read the previous loop's carry-overs and the relevant blueprint sections (STOREFRONT-V2, ARCHITECTURE)
- [ ] **Explore the actual code** the loop touches — list concrete files/endpoints in the spec
      (Loop 0 lesson: the codebase repeatedly has more built than documented; never plan from memory)
- [ ] Write Goal, Scope (in/out), first draft of Acceptance Criteria and Task list
- [ ] List open decisions (e.g. "which PSP?") with options — not yet resolved
- [ ] List risks and unknowns to be attacked in REFINEMENT

**Exit gate:** spec exists with status `Draft`, linked from ROADMAP's table.

## Phase 2 — REFINEMENT (challenge the spec)

**Purpose:** make the plan survive contact with reality *before* writing code — the cheapest place
to fail. This is where scope is cut, ACs become testable, and decisions get resolved.

**Follow-up checklist:**
- [ ] Resolve every open decision and record it in the Decisions table with a one-line why
      (ask the owner now if the call isn't ours — never mid-implementation)
- [ ] Verify each assumption against the code (grep/read/curl — e.g. "does the module already
      exist?"; the external-preview reconciliation caught `returns` being recreated needlessly)
- [ ] Rewrite each AC until it names its verification: *(verify: command / browser step / test name)*
- [ ] Cut or defer anything that doesn't serve this loop's goal (record in Out of scope)
- [ ] Order the task list by dependency; split any task bigger than ~half a day
- [ ] Size check: still S/M/L as ROADMAP says? If it grew, split the loop in ROADMAP first
- [ ] Definition of Ready review: scope fits, ACs testable, decisions resolved, tasks ordered

**Exit gate:** spec status `Ready`. No code before this gate.

## Phase 3 — IMPLEMENT (build small)

**Purpose:** working code, smallest coherent steps.
**Entry:** spec `Ready`. Set status `In progress`.

**Follow-up checklist:**
- [ ] Work the task list top-down; tick each task in the spec as it lands
- [ ] Follow existing patterns before inventing (`ResourceList` for admin CRUD, zustand stores like
      `useCartStore`, `@TenantId()` guards, BRL masks, webhook retry+DLQ pattern)
- [ ] Keep `npx tsc --noEmit` green at every task boundary, not just at the end
- [ ] New env vars → `.env.example` + spec Config section, same commit
- [ ] Blockers or discovered scope → back to the spec (new task or carry-over), never improvised

**Exit gate:** every task checked; typecheck green in every touched repo.

## Phase 4 — TEST (prove it by code)

**Purpose:** automated evidence that the logic is right — unit/integration tests that outlive this loop.
**Entry:** implementation tasks done. Set status `Testing`.

**Follow-up checklist:**
- [ ] Unit tests for every new pure/branching logic (jest in `lmfit-api`, vitest in `lmfit-web`),
      following house style (mocked mongoose models via `chain()`, direct instantiation)
- [ ] Each testable AC has at least one test that names it (e.g. `it('AC4: rejects quantity above stock…')`)
- [ ] Negative paths tested: invalid input, wrong tenant, replay/idempotency, expiration
- [ ] Full suite green in every touched repo (`npm test`) — record the counts in the spec
- [ ] No test deleted/weakened to pass; flaky tests fixed or quarantined with a carry-over

**Exit gate:** suites green with new tests covering the loop's ACs; counts recorded in the spec.

## Phase 5 — VERIFY (prove it live)

**Purpose:** the user-visible flow works in the real running product — tests can't see UX dead ends
(Loop 0 found the 422 checkout blocker and the "rascunho já foi enviado" dead end only by walking).
**Entry:** TEST gate passed. Set status `Verifying`.

**Follow-up checklist:**
- [ ] Drive the full flow in the browser on `kivoni.localhost:3000` (+ API on `:4000`) — click it,
      don't just curl it; capture screenshots of key states
- [ ] Walk the AC checklist one by one, marking `✅ verified <how>` or `❌ failed` in the spec
- [ ] Cross-tenant probe on every new endpoint: wrong/missing `x-tenant-slug`, wrong role → rejected
- [ ] Regression sweep of adjacent flows (PDV sale, admin product edit, previous loops' happy paths)
- [ ] Verify as the right persona (e.g. anonymous consumer vs. logged staff — pricing differs by role)
- [ ] Any ❌ → back to IMPLEMENT; re-run TEST before returning here

**Exit gate:** every AC ✅ with evidence noted in the spec's Verification record.

## Phase 6 — DOCUMENT (make it durable)

**Purpose:** the next person (or next loop) starts from truth, not archaeology.
**Entry:** all ACs verified.

**Follow-up checklist:**
- [ ] Spec: status `Done`, Result section filled (what shipped, deviations, evidence)
- [ ] ROADMAP.md: flip the loop's status, add a Changelog row
- [ ] Update living docs touched by the loop: ARCHITECTURE.md (flow/gaps), CLAUDE.md (commands/env),
      README, `planos-e-funcionalidades.md` (plan gating), STOREFRONT-V2 (if design decisions changed)
- [ ] Promote durable decisions from the spec's Decisions table to ARCHITECTURE.md if global
- [ ] Clean up: test data flagged, dev harnesses hidden, TODOs converted to carry-overs

**Exit gate:** docs merged; a newcomer could pick up the next loop from the docs alone.

## Phase 7 — PLAN AGAIN (retro → next loop)

**Purpose:** close the feedback loop — the "Again" that makes this a loop, not a waterfall.

**Follow-up checklist:**
- [ ] Retro (3 lines in the spec's Result): what helped, what hurt, what to change in the process
- [ ] Carry-overs → next loop's PLAN input or new ROADMAP line items (nothing lives in heads)
- [ ] Re-prioritize: does the next loop still make sense given what was learned? Reorder ROADMAP
      if not, with a Changelog note saying why
- [ ] Update project memory (roadmap status, next loop, key new facts)
- [ ] Start the next loop's PLAN

**Exit gate:** next loop's PLAN has started (or the track is explicitly paused).

---

## Spec template (v2 — includes the Follow-up record)

Copy to `specs/loop-NN-<slug>.md`:

```markdown
# Loop NN — <name>

**Status:** Draft | Ready | In progress | Testing | Verifying | Done
**Roadmap entry:** ROADMAP.md §Loop NN · **Depends on:** Loop MM
**Repos touched:** lmfit-api / lmfit-web / lmfit-mobile

## Goal
One paragraph: the user-visible outcome when this loop is done.

## Scope
**In:** …
**Out (explicitly):** …

## Decisions
| Decision | Choice | Why |
|---|---|---|

## Acceptance criteria
- [ ] AC1 — Given … when … then … *(verify: <command / browser step / test name>)*

## Design notes
Endpoints, schemas, files, patterns to follow. Written during PLAN/REFINEMENT after exploring the code.

## Config
New env vars / tenant settings introduced.

## Tasks
- [ ] 1. …

## Follow-up record
### PLAN        — [ ] explored code · [ ] draft spec · [ ] decisions listed          → Draft on <date>
### REFINEMENT  — [ ] decisions resolved · [ ] assumptions checked · [ ] ACs testable · [ ] DoR review → Ready on <date>
### IMPLEMENT   — [ ] tasks done · [ ] tsc green per task · [ ] env documented       → done on <date>
### TEST        — [ ] AC-named tests · [ ] negative paths · suites: api _/_ · web _/_ → green on <date>
### VERIFY      — [ ] browser walk + screenshots · [ ] AC checklist · [ ] cross-tenant probe · [ ] regression sweep → all ✅ on <date>
### DOCUMENT    — [ ] spec Result · [ ] ROADMAP changelog · [ ] living docs           → merged on <date>
### PLAN AGAIN  — [ ] retro · [ ] carry-overs filed · [ ] roadmap re-prioritized · [ ] memory updated → next loop started on <date>

## Verification record
Filled during VERIFY: AC → evidence (test name, screenshot, curl output).

## Result
Filled during DOCUMENT: what shipped, deviations, retro, carry-overs for the next loop.
```

---

## Process changelog

| Date | Change |
|---|---|
| 2026-07-15 | v1: Plan → Implement → Verify → Document → Again |
| 2026-07-15 | v2: added **REFINEMENT** (challenge the spec before code — motivated by the external-preview reconciliation catching a would-be duplicated `returns` module) and split **TEST** (automated proof) from **VERIFY** (live proof) — motivated by Loop 0, where green tests alone would have missed the 422 checkout blocker; added the per-phase Follow-up record to the spec template. |
