---
name: Bug report
about: Something is broken — tell us so the owning squad can fix it fast
title: "Bug: "
labels: bug
---

## What's broken

<!-- One crisp sentence a teammate can act on. Example: "Basket badge doesn't update after adding a product from /sellers/seller-1" -->

## Where it happened

- Page / URL:
- Device: **phone / laptop**
- Screen width (for UI bugs): **e.g. 375px**
- Browser:

## Steps to repeat

1.
2.
3.

## What should happen instead

<!-- Say what you expected, and whether it comes from the AGENTS.md design rules or is a new idea. -->

## Screenshot or recording

<!-- A 375px screenshot beats a paragraph. Drag it in. -->

## Before you submit — quick sanity checks

<!-- Your report helps more when these are ruled out. -->

- [ ] Reproduced in a fresh incognito window (rules out a stale browser session)
- [ ] Tried clearing mock data: DevTools → Application → Local Storage → delete the `madetrue_*` keys, then reload — our data layer runs on localStorage until the Supabase phase
