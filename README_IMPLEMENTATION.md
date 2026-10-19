# Elsewhere OMNI20 — Additive UI implementation package

This is **implemented, executable source**, not just a prompt. It adds a single task-centered navigation layer and groups existing features without replacing the v12/v13/v14 creative/storage engines.

**Delivery state:** local patch package for `westkitty/Elsewhere-Pages`, targeting inspected `main` commit `0d3c0aabfe9d2e293432745bc1c0417794d78ed2`. It has NOT been applied to the GitHub repository because the repository cannot be cloned in this environment and a feature-branch push was not requested.

Contents:
- `src/elsewhere-omni20.js` — new task-based interface adapter and read-only artifact inspector.
- `src/elsewhere-omni20.css` — navigation, accessible mobile dock, grouped controls and inspector.
- `tools/install_omni20.mjs` — checked, reversible/idempotent installer extending the existing standalone rebuild.
- `tests/omni20.test.mjs` — built-in Node integration/guard tests.
- `tests/browser_omni20.py` and `tests/fixture-omni20.html` — Chromium *synthetic fixture* interactions.
- `tests/browser-shots/` — screenshots from synthetic fixtures, never claim live-site visual proof.
- `docs/OMNI20-IMPLEMENTATION.md` — full 20-item traceability, install/runbook and release gates.

## Apply

Extract this archive into the **existing Elsewhere-Pages checkout root**. From that root run:

```sh
node tools/install_omni20.mjs
node tools/install_omni20.mjs --check
node --test tests/*.test.mjs
node tools/rebuild14.mjs --check
```

The installer does not commit, push or deploy. It detects mismatched source/build markers, refuses to overwrite dirty integration targets, keeps existing v14 authorship intact, and adds a factual append-only Bible entry. Confirm all original and new browser journeys before release.

## Compatibility boundary

PR #2 Arrival-first and PR #3 Infinite Door are different outstanding branches; the adapter can detect and launch their public entrypoints when installed, but **does not silently merge these branches**. This limitation matters to the 20-item completion claim.
