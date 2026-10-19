# Elsewhere - The Living Atlas

Elsewhere is a local-first prompt and project exploration application. The distribution at `index.html` remains a standalone HTML document containing all application JavaScript and CSS. The v14 creative atlas extends, rather than replaces, the existing v12 prompt engine and v13 project/continuity engine.

## Run

Open `index.html` directly for the self-contained edition (without service-worker installation), or serve the directory over localhost/HTTPS for the PWA edition. On a secure served origin the application can cache its public app shell for offline reopening.

The initial access-lock password is `Dexter`. **Change it after first unlock.** This is a local UI lock, not server-side authentication or encrypted browser storage.

## Development

Node.js 20+ (no runtime npm dependencies) is required for source-to-standalone consistency checks.

```bash
node --test tests/*.test.mjs
node tools/guard_reset14.mjs --check
node tools/rebuild14.mjs --check
node tools/rebuild14.mjs
```

`src/elsewhere14.js` and `src/elsewhere14.css` are authored source modules. `tools/rebuild14.mjs` updates their marked inline copies in `index.html`. **Do not edit both copies independently.** Existing v12/v13 modules remain preserved inline; v14 fixes to their state bridge are deliberate compatibility patches.

Optional browser test, when Playwright + Chromium are installed:

```bash
python3 tests/browser_smoke.py
python3 tests/browser_uplift.py
```

Browser smoke runs against a synthetic DOM/stub, not a complete live-site regression. Test the actual GitHub Pages deployment separately on phone, desktop, and offline before merging.

## Storage and privacy

- Prompt generation and personal projects operate locally, without an account or remote content API.
- Existing v12/v13 data remains in same-origin localStorage **unencrypted**. The lock is not a security boundary.
- For user-controlled encrypted **backup files**, Vault uses AES-256-GCM with PBKDF2-SHA-256 (310,000 iterations) and per-file random salt and IV. The passphrase is not persisted.
- Encrypted-backup import validates format and requires confirmation. Download a prior-state backup before replacing the current workspace. There is no password recovery for a lost vault passphrase.
- Multiple open tabs detect external Elsewhere storage changes and block stale-tab writes pending reload. This prevents known same-origin multi-tab overwrite patterns, not malicious same-origin scripts.
- Serve sensitive projects on a **dedicated domain origin** you control. `westkitty.github.io/Elsewhere-Pages` shares the origin with other repositories under `westkitty.github.io`; the URL path does not isolate browser storage.
- The service worker only caches known public app-shell files; it does not cache vaults or exported user data.

See [PRIVACY.md](PRIVACY.md) for deployment boundaries and recovery procedures.

## Features

- Nine creative paths and deterministic prompt packs with no-repeat progress.
- Versioned project artifacts, possible/established facts, relationships, grounded prompts, continuity previews, source references, and recovery.
- Response editor, explicit draft saving, possible-fact promotion, alternatives, and deterministic follow-up questions.
- Living Atlas: zoomable/pannable SVG, relationship status, artifact drilldowns, timeline reveal, labels, comparisons, and manual possible connections.
- Cross-project search remains off until explicitly enabled; source data is never automatically merged between projects.
- Responsive low-stimulation presentation, reduced-motion support, and PWA offline shell.

## Gaps requiring additional infrastructure

True account authentication, encrypted browser persistence, protected cross-device sync, automatic DNS/domain ownership changes, and reliable cross-device E2EE collaboration are not implemented. They require a separate threat model and infrastructure/ownership choices; the public-static site must not misrepresent a password prompt as authorization.

## Writing recovery and graph navigation

Unsaved responses are recovered from a limited (maximum 12,000 characters), browser-tab-scoped `sessionStorage` cache. The app never silently replaces a typed response; use **Recover unsaved writing** to restore it. A successfully persisted response removes the temporary recovery copy. If writing cannot be persisted, the editor keeps its text and warns. Browser session storage is plaintext and is not guaranteed to survive tab closure, private-mode teardown, or browser storage eviction. Use **Save draft** or export a vault for durable backups.

The Atlas renders at most 120 nodes per page; all active project artifacts can be inspected with **Earlier/Later**, filtered by the on-screen search, or opened from the keyboard-accessible directory. Connections to hidden endpoints are not rendered, so the displayed link count describes only visible nodes.

## Verified vault restore procedure

An encrypted vault restore uses a masked passphrase dialog. The app validates cross-record references and duplicate project identities, downloads an **encrypted** pre-restore checkpoint using that passphrase, and asks you to confirm you actually saved it before replacing the workspace. Only persistent browser storage permits a destructive restore. The new records must pass durable read-back verification before old project records are pruned. A failed write triggers an attempted rollback and a clearly labeled stop state if that rollback cannot be verified. Browser file downloads cannot be proved by page JavaScript; verify the checkpoint exists before confirming.

The v13 reset guard only resets known Elsewhere v13 project keys and explicit core/index/legacy data keys. It must preserve the changed access-lock password and other applications' same-origin storage. Apply `node tools/guard_reset14.mjs --apply` once to the canonical checkout before release; CI enforces `--check`.

## Five-pass quality edition (local patch)

The five implementation passes preserve the v12/v13 prompt engine, Greyson EN/ES pack progress, custom Dexter entrance password, and the v14 single-file packaging contract.

1. **Verified restores:** after encrypted import, read back actual project contents and Greyson settings rather than checking project IDs only. A partially mutating importer, tampered content, and unsafe identifiers trigger rollback. This is browser-local consistency checking, not tamper-proof cloud storage.
2. **Retry-safe writing:** when browser storage fails, save attempts reuse the same pending artifact or fact in the current tab instead of duplicating it. The editor retains the response and offers an explicit **Download writing (unencrypted)** action. Session draft storage is still plaintext and best-effort.
3. **Interactive placement:** opt in to **Arrange nodes**, drag a node or use arrow keys (Shift for fine steps), undo a placement, or reset custom positions. Positions remain part of that project's metadata, not canonical facts.
4. **Large-workspace Library:** twenty-four artifacts per page with newest, oldest, and alphabetical order; changing the search resets the page; comparison reports shared tags without merging or changing canon.
5. **Proof and safety:** source-integrity script, expanded Node regression suite, synthetic Chromium interaction suites, and a fail-closed application script that verifies the exact base revision and refuses a dirty working tree.

The X5 cumulative patch **contains the earlier uplift patch**. Apply it once to the exact `feature/elsewhere-14-living-atlas` baseline commit `e9d98de54c9726787a90225dd5395d582ac4b054`; do not apply the old patch first. The provided `apply_x5.sh` checks branch, commit and clean state, applies the patch, runs `guard_reset14.mjs --apply` and `rebuild14.mjs`, and executes the tests. It never commits, pushes or deploys.

Optional synthetic browser regression tests (Chromium, Python Playwright):

```sh
python3 tests/browser_smoke.py
python3 tests/browser_uplift.py
python3 tests/browser_x5.py
python3 tests/browser_x5_writer.py
```

**Release blockers remain:** real standalone HTML launch, changed-password unlock, persistent v12/v13 roundtrip, PWA offline replay, multi-tab stale-write recovery and mobile device checks must pass on the actual repository checkout. The synthetic fixture tests are not a substitute.

## Creative continuation and canon review

From an artifact in Library or the Atlas detail panel, select **Continue writing** to open an empty response tied to that source. The source artifact is not edited; new saved responses record its ID in `meta.inspiredByArtifactId`. Session draft recovery preserves the source link when the referenced artifact still exists.

The **Canon decisions** queue presents ideas and possible facts in pages of ten. Establishing one requires an explicit user confirmation and an explanatory rationale, recorded in the domain's revision history. The queue does not treat generated suggestions as verified facts or change records in the background.

Atlas offers **Fit visible** and **Center selected** without saving camera changes into project spatial coordinates. Large project paging, keyboard node layout, and undo still work as in the existing X5 workflow.

## Import privacy

Legacy/plain import controls first require a masked, separately chosen 12+ character passphrase and an encrypted recovery download. If WebCrypto cannot run, importing stops. The optional plain export remains available only after an explicit warning that the JSON contains unencrypted writing. Remember: neither the Dexter entrance screen nor tab draft storage encrypts browser-local data.

## Release acceptance

This source overlay is not a built application: rebuild `index.html` on the existing feature-branch checkout, run `node --test tests/*.test.mjs`, `node tools/rebuild14.mjs --check`, and the original-user-journey browser/device tests before a merge or deploy. See `OMNI_HANDOFF.md` for package scripts and exact state checks.


## iPhone-first interface

On narrow and landscape touch viewports, the existing Write / Atlas / Library / Vault views use one bottom, safe-area-aware tablist. No duplicate navigation data is introduced. iOS-friendly 16px+ inputs, >=44px hit targets, visible Save response / Save draft actions, a single Done editing keyboard exit, and immediately adjacent save/failure feedback reduce common iPhone friction. Advanced creative tools, raw JSON export and manual map arrangement are disclosed only on request.

The Library shows eight artifact records per page on phone viewports. The Atlas retains the graphical layout but offers an accessible Browse as list path, mobile-fit controls and two-finger camera zoom without mutating saved node positions. Do not intercept full-screen Safari gestures or the system browser back action outside the Atlas canvas. Maintain `prefers-reduced-motion`, screen reader labels and keyboard access.

**Tests run for this iPhone change:** 11/11 focused Node tests, original OMNI Chromium fixture, five emulated viewport configurations (320x568, 375x812, 393x852, 440x956 and 844x390), and Chromium CDP two-point touch/pinch. No horizontal overflow was observed in those fixture cases, all four tab targets were at least 44px, and the input text was at least 16px. Those checks are not a real iPhone or WebKit pass. An optional local HTTP-origin browser test was blocked by environment policy (`ERR_BLOCKED_BY_ADMINISTRATOR`); HTTPS vault downloads, offline installed PWA, VoiceOver on device and real Safari keyboard behavior are release gates.

## iPhone workspace continuity

The mobile workspace offers a project selector, visible saved-draft continuation, three per-browser reading sizes, explicit copy/share actions and return-to-position navigation. Those controls reuse existing v13 project state; they do not migrate or rewrite the user data schema. See `docs/iPhone-workspace-acceptance.md` for validation and release gates. Physical Safari validation is still required before release.

## Arrival and Quiet Echoes (v15 experience layer)

The first unlocked visit of a day now begins with **How are you doing today?** rather than consuming a generated prompt. A single optional sentence and seven direct choices steer the existing v12 path engine toward conversation, deeper reflection, play, curiosity, calm, surprise, or a genuine blank page. **Skip — just give me something** generates a normal prompt without retaining a check-in observation. A small toolbar can change direction at any time; writing and project history are preserved. In Settings, the check-in can be daily, every visit, or disabled.

**Quiet Echoes** is an intentionally light, optional comparison to a curated figure, not personality classification or therapy. Twenty-one figures span sports, movies, music, authors, history, mythology, and fiction. It uses local theme labels from chosen check-in directions, and it waits for several visits before showing a small, dismissible comparison no more than once a week. The user can investigate the explanation, opt into a follow-up question, hide suggestions for 30 days, change figure categories and frequency, or erase just the matching history.

Newly saved journal writing **is not analyzed for figure matching by default**. A separate setting allows processing newly saved responses locally into up to three simple theme labels; the original text never enters the matching record. This rule-based feature has no remote AI service and cannot understand nuanced writing like a human conversation. Matching uses a separate `elsewhere:arrival:v1` browser storage key (plaintext), is not synced across devices, and **is not included** in encrypted Vault backup exports. Existing v12/v13/v14 data contracts, the Dexter UI gate, project/canon write rules, and the offline standalone source-of-truth model remain unchanged. See [PRIVACY.md](PRIVACY.md).

## Threefold content edition (2026-10-17)

This edition increases **usable, authored content**, not the number of controls visible on arrival. The original first 1,024 generated indices for each path remain in place; each path continues into two new independent 1,024-index banks without resetting per-path progress.

| Content surface | Before | After | Delivery |
|---|---:|---:|---|
| Generated path prompts across nine paths | 9,216 | **27,648** | First 1,024 preserved; two new banks per path |
| Themed subjects in each of eight reflection paths | 16 | **48** | 32 new authored subjects per path |
| Angles, endings, and opener formulations in each reflection path | 4 each | **12 each** | Two newly authored sets |
| Curated pack prompts, each of 12 packs | 12 | **36** | 24 new standalone questions per pack |
| Spanish prompts, each of four Greyson packs | 12 | **36** | 24 additional independently translated questions |
| Creative question formulations per builder (ten builders) | 4 | **12** | Existing four preserved; eight new follow-on forms |
| Pop lenses | 10 | **30** | 20 new optional editorial perspectives |
| Twist options per wildness level | 16 | **48** | New strange and unhinged twists; normal stays empty |
| Deeper follow-up questions per path | 6 | **18** | 12 new questions per path |
| Prompt-example endings | 4 | **12** | Eight additions |
| Prompt-enhancement instructions | 8 | **24** | Sixteen additions |
| Quiet Echoes figure profiles | 21 | **63** | 42 added profiles across seven categories |

The original prompt engine remains deterministic and offline. Content modules are embedded in `index.html` as deferred scripts, behind the existing Dexter UI lock. The builder script still owns the embedded v14/v15 source copies; content-bank modules are separate, audited sources. Never reset existing browser storage to expose new prompts. The original no-repeat state extends into new indices.

The threefold count describes content depth and available variations, not literal tripling of navigation components, data exports or UI buttons. This is intentional: increasing those would make the first screen intrusive and would not improve journaling.
