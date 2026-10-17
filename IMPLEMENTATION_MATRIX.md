# Elsewhere 14 implementation matrix

This is the acceptance ledger for the 24 concrete recommendations made during the Elsewhere uplift review. "Partial" means the named capability exists only within its documented constraints. Tests are attached to specific behavior; none should be represented as production certification.

| # | Proposed capability | State | Evidence / next gate |
|---|---|---|---|
| 1 | Lossless v12/v13 migration | Implemented | Greyson pack counters, Spanish setting, prompt progress preservation; migration unit tests. |
| 2 | Dedicated privacy origin | Blocked - external | Needs owned domain + Pages custom-domain / DNS configuration; documented in PRIVACY.md. |
| 3 | Verified snapshot backups | Partial | Plain and encrypted snapshots; import/export contract tests; actual live cross-origin restore still required. |
| 4 | Multi-tab conflict detection | Implemented | Storage event blocks stale-tab writes and presents reload; production two-tab proof pending. |
| 5 | Storage quota and failure recovery | Partial | Failed v13 dirty writes retained for retry and UI warns session-only; quota injection test pending. |
| 6 | Reversible imports with previews | Partial | Import confirmation and pre-import downloadable snapshot; no automatic undo transaction. |
| 7 | First-class responses to prompts | Implemented | Response textarea -> note/artifact with source prompt; browser smoke. |
| 8 | Project-aware follow-up questions | Partial | Source-text-anchored deterministic follow-ups; deeper project-context ranking pending. |
| 9 | Idea-to-artifact promotion | Implemented | Response type picker, possible fact, alternative note; browser smoke. |
| 10 | Branching what-if explorations | Implemented | Alternative branch artifact; no established canon mutation. |
| 11 | Side-by-side creative comparisons | Implemented | Two saved artifacts; UI smoke. |
| 12 | Return to unfinished discoveries | Implemented | Explicit project scratchpad save / resume; smoke. |
| 13 | Stronger prompt-source provenance | Partial | Stable source references attached to saved responses; logical entailment checking remains heuristic. |
| 14 | Established / possible / invented distinctions | Implemented | Statuses visible and new generated hypotheses always possible, not established. |
| 15 | Semantic contradiction review | Existing / partial | v13 heuristic contradiction checker preserved; natural-language semantic entailment is not proven. |
| 16 | Visual consequence previews | Partial | Existing v13 canon shockwave / new atlas linked-record counts; requires direct flow test. |
| 17 | Alternative timelines | Partial | Alternative notes and explicit project timeline events; advanced branching timeline editor pending. |
| 18 | Evidence-linked change history | Partial | Source-linked response and timeline events; immutable full mutation journal pending. |
| 19 | Interactive project constellations | Implemented | Pan, zoom, click, keyboard navigation, relationship tooltips, possible link creation. |
| 20 | Temporal exploration trails | Implemented | Reveal-by-history slider, event list. |
| 21 | Meaningful portal transitions | Partial | Existing v13 portal transitions and reduced-motion-aware tabs; new atlas path transitions limited. |
| 22 | Project-state visual atmospheres | Partial | Existing project/theme accent and atlas mood styling; no distinct weather simulation. |
| 23 | Cross-project discovery with boundaries | Implemented | Opt-in scoped search, explicit project switch, no canon mixing. |
| 24 | Cinematic and low-stimulation modes | Partial | Existing quality/motion controls and new reduced-motion CSS; performance measurements pending. |

## Additional previous-chat suggestions

- Modular authored sources: **implemented** via `src/elsewhere14.js`, `src/elsewhere14.css`, verified inlined single-file distribution; v12/v13 legacy remains embedded to avoid a breaking rewrite.
- Offline installed PWA: **implemented static shell** (manifest, icons, service worker); actual installed-device proof pending.
- Encrypted stored browser data: **not implemented**. Encrypted backup files only. Full at-rest encryption requires a passphrase-gated data adapter plus recovery/migration strategy.
- Server-side authentication: **not possible on unauthenticated static GitHub Pages**. Existing `Dexter` access prompt is a convenience UI gate, not a security control.
- Automated testing: **implemented** for isolated domain and UI paths. Full original-site browser acceptance is still a merge gate.
- Deployment: feature branch/PR only until release acceptance gates pass. No DNS changes or production-domain cutover.
