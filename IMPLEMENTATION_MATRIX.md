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

## Bounded follow-up uplift (local patch, awaiting repo integration)

- **Recovery / encrypted imports:** masked passphrase dialog; pre-restore encrypted recovery file; duplicate-identity/reference validation; persistent-storage preflight; read-back verification; rollback and stop-on-uncertainty. Pure transaction tests cover success, write failure, rollback failure, and read-back mismatch. Full browser-origin restore remains unverified.
- **Unsaved writing:** per-tab session cache, explicit Recover button, word count, per-project recovery, preserved text on persistence failure, and a stale-tab text-export escape hatch. The session cache is plaintext, has a seven-day entry expiry, and is not guaranteed by every browser to survive a closed tab.
- **Atlas scale/accessibility:** bounded 120-node graph pages, correct endpoint-only edges, filter by name/type/summary/tags, keyboard-accessible list, and throttled timeline recomputation. Synthetic Chromium test includes a 255-node project.
- **Reset safety:** guard preserving custom lock credentials and unrelated same-origin keys; patch script is idempotent and fails on unexpected code. Browser-integrated reset still requires a full canonical-index test.
- **Delivery state:** source/test/package changes exist in a local working copy only; no commit, push, PR update, main merge, or live deployment has occurred in this follow-up.

## Five-pass source uplift — validated locally, not yet integrated remotely

| Pass | Implemented change | Evidence | Remaining acceptance |
|---|---|---|---|
| 1 — Vault integrity | full project/content readback; rollback after partial-import throw; import ID scoping; active-project reference validation; 35 MB import cap | Node crypto, fault-injection and content-mismatch tests | Actual browser restore + same-origin storage recovery |
| 2 — Writing durability | idempotent retry for response, possible-fact and alternative saves; explicit unencrypted text escape hatch | Synthetic Chromium failure-then-retry test | Real quota exceeded on supported devices |
| 3 — Atlas editing | opt-in pointer/keyboard node placement, project-specific saved coordinates, undo/reset, relationship redraw | Synthetic Chromium drag + undo, bounded graph unit tests | Android touch and browser reload persistence |
| 4 — Large-project UX | 24-record pages, sorting and filtering, contextual comparison notes, project-switch refresh | Synthetic Chromium with 105 items | 5k+ artifact performance and touch affordances |
| 5 — Release evidence | x5 safety verifier, local apply script, additional tests and docs | Node checks and synthetic browser suites | Full canonical index build and CI after user-authorized integration |

The Dexter lock is still only a **local UI lock**. Browser-stored content is **not encrypted at rest**. Do not merge until full-page/device regressions and saved-data restore are verified.

## OMNI five-pass source uplift — 2026-10-17

| Capability | Source status | Local evidence | Required full-page evidence |
| --- | --- | --- | --- |
| Explicit encrypted pre-import checkpoint | Implemented | Chromium cancellation and insecure-context fail-closed; Node crypto suite | HTTPS file download + decrypt + restore roundtrip |
| Writer source lineage and interrupted-draft recovery | Implemented | Chromium source-link save, immediate visibility flush, prior reload fixture | Real reload and project switch with changed password |
| Deliberate canon review with rationale | Implemented | Chromium 25-fact pagination, rationale gate and saved revision | Real v13 domain revisions, quota failure and recoverability |
| Atlas fit, focus and mobile opt-in | Implemented | Pure geometry test, Chromium camera and 390px viewport | Real tablet touch, keyboard and SVG scaling |
| Reproducible test and handoff | Implemented | 26 Node checks; 5 Chromium fixture scripts; authorship audit PASS | Rebuild original 655 KB index, complete original migration suite and live PWA acceptance |

*The feature-branch remote, main branch, deployment and authentication infrastructure were not modified in this work unit.*


## iPhone-first OMNI x5 acceptance — 2026-10-17

| Pass | Implemented mobile experience | Verified locally | Still required |
| --- | --- | --- | --- |
| One-hand navigation | Existing 4-view tablist docked above iPhone safe area; layout under keyboard avoids blocked actions | Chromium touch emulation on five sizes, target geometry | Real Safari address bar and keyboard viewport |
| Comfortable writing | 16px+ fields, split Save response/Draft, foldaway advanced tools, Done editing, near-save messages, recovery on background | Synthetic draft, save, project navigation and focus tests | Real page reload and persistent quota injection |
| Thumb-friendly Library | Eight-card pages on phone, large primary actions, bounded filters and previous/next | Chromium 32-record page test | Screen reader interaction on actual iPhone |
| Atlas under fingertips | List browse and large hits; two-finger camera-only zoom; explicit layout editor | CDP two-point touch, saved coordinates unchanged | Pinch and pointer cancellation on real Safari |
| Visual and accessibility QA | Safe-area dock, landscape, focus, reduced-motion and de-cluttered Vault export | Zero sideways scroll 320/375/393/440/844 landscape fixtures; focus sizing checked | VoiceOver, installed PWA, secure-origin vault, real app HTML |

The Dexter access lock remains client-side only. Neither browser storage nor on-device draft recovery is encrypted at rest. The release is a local source artifact; do not imply production deployment.
