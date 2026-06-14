# Design-craft pass (2026-06-14)

Follow-up to the A–K UX hardening: the items that needed an art/product call.
Built the buildable ones; documented the two that genuinely depend on a decision.

## Built

| Rec | What | Files |
|---|---|---|
| **1 — custom nav icons** | TabBar emoji glyphs (☾✶✦) → inline line-icons (moon / star / user) that follow active color; brand eye kept for 对话; `<nav aria-label>` + `aria-current` + 44px min target | `components/TabBar.tsx` |
| **2 — button tiers** | `.btn-ghost` (outline secondary) + `.btn-text` (tertiary) so the eye knows which gold is THE gold | `globals.css` |
| **3 — surface contrast** | `--field` #0f1320 → #141a29, `--field-bd` #262d3d → #2c3447 so cards read as objects, not voids. (Body text was already upright serif in code — italic is correctly reserved for 金句/lead — so no body change needed.) | `globals.css` |
| **4 — tap targets** | share template swatches 30×40 → 36×48 (toward the 44px floor); TabBar items min-height 44 | `share`, `TabBar` |
| **5 — mood check-in is real** | the today「此刻的你」emoji row was a dead control (no handler). Now real buttons: selectable, persisted to localStorage, `track("mood_checkin")`, confirms「我记下了」, `aria-pressed` | `app/today/page.tsx` |
| **9 — AI output guard** | `safeReply()`/`isBrokenReply()` (tested) catches empty / refusal / persona-break model output and swaps the Molly-voiced fallback; wired into chat | `lib/ai/safety.ts` (+test), `app/chat/page.tsx` |

## Deferred (decision-dependent — accepted recommendation = the call below, not a build)

- **6 — self-model「越用越准」deep loop.** The honest meter shipped already
  (`understanding()`). Making calibration answers + daily「说中了吗」actually
  change the reading is the retention roadmap item (STATUS §8.1). Recommendation
  accepted = **schedule it**; it's multi-day work touching the AI prompt layer,
  not part of this craft pass.
- **7 — ¥98 paywall.** Still blocked on a pricing decision (no number set).
  Keep the「即将开放」stub; wire the paywall in one PR once a price exists (R5).
- **8 — bilingual claim.** No user-facing「双语」claim ships in-app (verified:
  only an internal city-DB code comment uses the word). Decision: **do not
  advertise bilingual externally** until `next-intl` is actually wired. Nothing
  to remove in-app.

## Tests
- New: `safety` output-guard cases (+4). Gate: tsc 0, vitest green, build ok, playwright 9/9.
