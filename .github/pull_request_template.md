<!-- MADETRUE pull request — short, honest, human. -->

## What this PR is

<!-- Phase + step, or the issue ticket. Example: "Phase 8 · Step 1 — Nearby-makers map on the homepage" -->

Fixes # <!-- link the GitHub issue this closes; remove if none -->

## What changed

<!-- One bullet per real change. Nothing unrelated to the title above — drive-by refactors get sent back. -->

-
-

## Verification

<!-- CI re-runs every gate on push. Open the PR only when all boxes below are ticked. -->

- [ ] `npx tsc --noEmit` — clean
- [ ] `npx eslint .` — 0 errors (new warnings not allowed)
- [ ] `npm run build` — compiles
- [ ] Hand-smoke tested my routes on the dev server:

      | Route | Status |
      |---|---|
      | `/…` | 200 |

## Mobile-first check (UI changes only)

<!-- Open DevTools, 375px width, the MADETRUE way: phone first. -->

- [ ] Checked at 375px and scaled up (tablet → desktop) — no broken layout, no horizontal scroll, thumb-sized buttons
- [ ] Copy stays warm and human — no corporate jargon, empty states invite
- [ ] Colors only from the palette: green `#2D6A4F` · brown `#7D5A3C` · cream `#F9F5F0` · gold `#E9A84C`
- [ ] Product badges use only the 5 official tag strings (`Same Day Delivery`, `Pickup Available`, `Fresh Today`, `Locally Made`, `Eco-Friendly`)

## Secrets & data

- [ ] No keys or tokens in this diff — anything env-related lives in my local `.env.local`, never in git

## Screenshots (encouraged)

<!-- Drag a 375px screenshot here so the reviewer sees the result without running your branch. -->
