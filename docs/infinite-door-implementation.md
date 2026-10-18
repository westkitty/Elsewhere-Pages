# Elsewhere Infinite Door — 20-point implementation ledger

Date: 2026-10-18
Review PR: https://github.com/westkitty/Elsewhere-Pages/pull/3
Base PR (arrival and triple content): https://github.com/westkitty/Elsewhere-Pages/pull/2

This ledger distinguishes implemented source changes from independently verified user behavior.

| # | Recommendation | Code location | State |
|---|---|---|---|
| 1 | Interleave all content banks | `index.html`, `permutedIndex` | Implemented; preserving stable prompt IDs, order intentionally changed |
| 2 | Semantic anti-repeat memory | `src/elsewhere-infinite-engine.js`, `score` | Partial: lightweight format/category/tag overlap; no natural-language semantic model |
| 3 | Connect underused content | `index.html`, third-bank helpers and rendered wild twists | Implemented; source test |
| 4 | Encounter Director | Infinite engine `choose`, eligibility, scoring | Implemented |
| 5 | Different encounter forms | Infinite content `forms` | 12 distinct forms implemented |
| 6 | Exceptional authored encounters | Infinite content `forms` | 120 authored encounters; quantity below aspirational 150 |
| 7 | Encounter-specific hidden doors | `view`, content `door` | Implemented |
| 8 | Responsive arrival clarification | `src/elsewhere-arrival.js` | Partial: short route choice and keyword intent, no conditional clarifying question yet |
| 9 | Curiosity Collision Engine | 36 content pairs, `collide` | Implemented: authored, offline |
| 10 | Short playable adventures | Six interactive `adventures` | Implemented; branch choice drives response, not branched story topology |
| 11 | Reality shifter | Six `transformations`, `view` | Implemented: editorial transformations, not generative AI |
| 12 | Voluntary multi-day trails | Six `trails`, resumable step | Implemented |
| 13 | Optional older-theme callbacks | `callback`, separate opt-in | Implemented using previous prompt category only; never saved writing |
| 14 | Rotating Quiet Echo figures | `src/elsewhere-arrival.js`, `echoHistory` | Implemented cooldown |
| 15 | Alternative editorial perspectives | Six `lenses`, `view` | Implemented occasional optional disclosure |
| 16 | Physical observation alternatives | Nine `physical` prompts + imagination alternatives | Implemented |
| 17 | Time-aware selection | `score` | Implemented optional local-clock preference; no weather or location |
| 18 | Serendipity Thermostat | `settings`, `score` | Implemented familiar/unexpected/wild, separate intensity control |
| 19 | Non-intrusive rejection | `view`, `dismissed`, `suppression` | Implemented strong suppression, alternate encounter |
| 20 | Freshness Observatory | `simulate`, settings simulation, `tests/serendipity.test.mjs` | Partial: 100-visit automated selection gate and local counters; real-world perceived novelty and runtime performance not yet instrumented |

## Protected contracts

- Same repository, same Dexter gate, same v12/v13/v14 state ownership and original offline structure.
- Stable authored prompt IDs for all 27,648 generated indices; interleaved order is an intentional experience change, not a schema reset.
- Separate local-only `elsewhere:infinite:v1` discovery record; ordinary response storage is not scanned or erased.
- Optional callbacks reference prior prompt **categories**, not old journal text.
- No canon modifications, no online AI, no location requests, no paid dependencies.
- English and Spanish Greyson authored packs remain accessible through existing v12 routes.
- All discoveries are optional, pauseable or dismissible; no daily streak pressure.

## Evidence and limitations

- GitHub Actions CI checks source syntax, 26 deferred standalone script carriers, source synchronization, original data reset guard, migrated state unit tests, new content consistency, and the 100-visit chooser test.
- Browser-level unlock, actual mobile Safari/WebKit, keyboard screen-reader interaction, two-tab updates, and installed offline PWA are **not** proven by passing Node tests.
- The full set of 20 proposals is **not** certified complete: numbers 2, 8, and 20 remain partially implemented; item 10 deliberately uses small linear branching rather than a full stateful game. Signature examples are 120, not the suggested aspirational 150.
- Do not merge PR #3 until parent PR #2 is integrated and a real-device browser acceptance pass succeeds; keep the existing public Pages deployment unchanged meanwhile.

## Verification commands

```bash
node --test tests/*.test.mjs
node tools/guard_reset14.mjs --check
node tools/verify_x5.mjs
node tools/rebuild14.mjs --check
```
