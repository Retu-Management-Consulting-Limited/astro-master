# UX Hardening — A–K fixes + R1–R6 rules (2026-06-14)

A code-grounded UX review found 11 issues from 6 root causes. This pass fixes
them and pins the root causes as rules (DESIGN-SYSTEM §10–§12, `WORKFLOW.md`).
This doc doubles as the PR-gate record (R3 state clauses + R4 claim reconciliation).

## Shipped fixes

| Item | What changed | Files |
|---|---|---|
| **A1** 假「懂你度 62%」 | Real `understanding()` fn (tested), live `useUnderstanding()` hook on today/chat/me/history; capped <100, grows with returning days | `lib/understanding.ts` (+test), 4 screens |
| **A2** 猜的上升盖真值 | Reading header shows real `ascSign`; the calibration guess only appears when birth time is **unknown**, labeled「据描述推测」 | `app/reading/page.tsx` |
| **G** 非语义交互 / 无 focus | `div onClick`→`<button>`, global `:focus-visible`, button reset, `prefers-reduced-motion` override | `globals.css`, today/chat/me/reading/synastry/theme/share/wealth |
| **H** 异步无 aria-live | `role="status"`/`aria-live` on MollyThinking, chat stream, share toast | `MollyThinking.tsx`, chat, share |
| **K1** 假社会证明 | 「已有 12.8 万人」→「内测中 · 说穿你」 | `app/page.tsx` |
| **B3** 示例分数太逼真 | Demo synastry score blurred + connect-CTA until a real partner connects | `app/synastry/page.tsx` |
| **B2/C** 等待无兜底 | Poll re-runs on revisit; copy tells A they can leave & it auto-updates | `app/synastry/page.tsx` |
| **B4** 预填假出生数据 | Invite form defaults emptied + submit guard | `app/synastry/invite/[token]/page.tsx` |
| **B1** 单 token 覆盖丢人 | Capped token **list** (tested), polls all pending, never overwrites | `lib/synastryTokens.ts` (+test), synastry |
| **D** 变现/病毒无常驻入口 | 财运 + 合盘 are stable rows in 我的 | `app/me/page.tsx` |
| **F** 退出不一致 | Shared `<BackButton>` (←/✕, focusable, labelled) | `components/BackButton.tsx` + 4 screens |
| **I** 表单语义缺失 | `htmlFor`/`autoComplete`/checkbox→`role="checkbox"` button | input + invite forms |

## Documented decisions (E / J / K2) — R4/R5 calls, not built this pass

- **E — 付费墙 (R5):** Pricing (¥98) is undecided. Code stays the「即将开放」stub
  ([theme/[id]/page.tsx](../web/src/app/theme/[id]/page.tsx)); mockup `design/19-money-mirror.html`
  is **ahead of an undecided business decision** and must be read as「依赖定价决策」,
  not as an implementation spec. Build the paywall only after pricing is set, in one PR.
- **J — 双语 (R4):** `next-intl` is installed but unwired; all content is Chinese and
  `<html lang="zh">`. Decision: **撤回「双语」对外宣称** until next-intl is actually wired —
  do not advertise bilingual support meanwhile. No false claim now ships in the UI.
- **K2 — 通用 AI 审核:** The crisis layer ([lib/ai/safety.ts](../web/src/lib/ai/safety.ts))
  is solid (deterministic pre-LLM self-harm catch + verified hotlines + fallback).
  General「离谱输出」moderation remains a tracked item (STATUS §8.3); out of scope here.

## Tests

- New unit tests: `understanding.test.ts` (5), `synastryTokens.test.ts` (4).
- Gate: `tsc --noEmit` = 0, `vitest run` all green, `next build` ok, Playwright E2E (funnel/PWA/settings) green.
