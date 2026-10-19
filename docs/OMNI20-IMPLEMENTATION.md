# Elsewhere OMNI20 — implementation, parity, release gates

**Prepared:** 2026-10-19
**Source target:** `westkitty/Elsewhere-Pages`, baseline `main` observed as `0d3c0aabfe9d2e293432745bc1c0417794d78ed2`
**Authority:** user authorized the full merge; integration is gated by Node and assembled browser tests.
**Current evidence:** source-backed additive adapter, tested in local *synthetic* Chromium fixtures. **Not** verified against the complete deployed Elsewhere application or physical iPhone.

## Architecture

This package adds two authored standalone modules: `src/elsewhere-omni20.js` and `src/elsewhere-omni20.css`, incorporated inline in the existing `index.html` by the enhanced `tools/rebuild14.mjs` integration. The installer does not replace or migrate any v12/v13/v14 persistent data, change passwords, alter established canon, or change existing domain/business handlers. Legacy entrypoints remain in the DOM; the interface adapter routes user actions into them.

The v14 workspace is originally created using `.stage.after(workspace)` within `#ideaStage`. Because the new task-based UI sometimes hides the prompt stage, the adapter first moves the existing v14 workspace node **outside** `#ideaStage`, as a sibling within `<main>`. The original node, controls, listeners and data are retained; only its DOM parent changes. This avoids hiding the writing UI along with the prompt stage. The test fixture deliberately reproduces this arrangement.

The four destination tabs are **Explore**, **Write**, **Library**, and **Atlas**. Vault remains accessible by explicit commands and in the storage/recovery paths. One navigation surface replaces both competing legacy mobile docks; legacy actions route through All tools. The script makes no network requests and has no runtime npm dependencies.

The command catalog is contextual and detects installed features. It includes existing Greyson paths and EN/ES language buttons, original creative tools, all four destination views, direct vault access and incoming PR hooks. It does not claim to replace the underlying specialized tool engines. The two incoming branches are **not bundled or merged**.

## Twenty-item implementation traceability

| # | Prior recommendation | Source implementation | Status in this package |
|---:|---|---|---|
| 1 | Fix competing mobile docks | Hide legacy fixed nav and v14 dock under `.omni20-ready`; supply one safe-area dock and command access | Implemented, fixture tested |
| 2 | One navigation hierarchy | `om20Nav` manages Explore / Write / Library / Atlas; Vault remains direct in command catalog | Implemented, fixture tested |
| 3 | Write about this | Direct prompt-card button uses existing `Elsewhere14.setView('write')` and prompt refresh signal | Implemented, fixture tested |
| 4 | One active-project selector | Project selector derives options from original v13 state; invokes original v14 switch guard | Implemented, fixture tested |
| 5 | Truthful privacy copy | Corrected legacy footer disclosure; Vault explanations retained | Implemented, fixture tested |
| 6 | Distinct save semantics | Keep prompt label, explanatory writing note; original Save draft and Save response remain separate | Implemented, semantics preserved |
| 7 | Searchable command catalog | Keyboard shortcut and All tools menu exposes destinations and specialized legacy engines | Implemented, source-dependent |
| 8 | Context-preserving navigation | Same writer instance and data are retained across view changes; no drafts are rewritten | Implemented, fixture tested |
| 9 | PR #2 arrival integration | Existing arrival controls detectable, change-direction command appears when present | Compatibility bridge only: PR not merged |
| 10 | PR #3 Infinite Door | Optional engine detection and direct Explore-menu command | Compatibility bridge only: PR not merged |
| 11 | Separate Library operations | Saved work, Compare, Canon review, Other projects subviews reuse original DOM nodes | Implemented, fixture tested |
| 12 | Pending canon indicator | Reads actual review queue count and shows count only when nonzero | Implemented, fixture tested |
| 13 | Separate prompt fusion/record comparison | Different command labels and entrypoints, no merging of data models | Implemented |
| 14 | Atlas control taxonomy | View / Find / History / Arrange groups reuse original handlers | Implemented, fixture tested |
| 15 | Mobile Atlas directory path | Existing directory retained and new Browse Atlas as list command | Implemented using existing feature |
| 16 | Contextual artifact details | Read-only inspector uses original project records, lineage, relationships and original Continue writing action | Implemented, fixture tested; full-app unverified |
| 17 | Backup vs restore task flow | Encrypted backup fields inside disclosure, restore separately visible; original crypto retained | Implemented, fixture tested |
| 18 | Consistent persistence messaging | Live save feedback reflects existing v14 status; emergency writing download shown on error | Implemented, fixture tested |
| 19 | Group experience settings | Existing inputs moved into Creative, Appearance and Storage groups; reading-size command | Implemented, fixture tested |
| 20 | Focus/Zen and accessible landmarks | Both original modes reachable, duplicate `role=main` removed, reduced-motion and keyboard support | Implemented, fixture tested |

**Status interpretation:** 'Implemented' means actual authored JavaScript/CSS exists and the named behavior has been observed where the local fixture allows. It is **not** an assertion that code has been installed in the owner's repository, deployed, tested on iPhone, or proven zero-loss against the full historical app. Items #9–10 cannot be fully certified until the PR #2 → PR #3 dependency stack is accepted, integrated, and exercised in the full app.

## Install on an existing checkout

1. Preserve local work and make an encrypted Elsewhere vault backup through the current live application before experimenting with new interface code. Do not clear browser data.
2. Extract the package into the **root of your verified `westkitty/Elsewhere-Pages` checkout**. It adds only new `src/`, `tools/`, `tests/`, and `docs/` names; do not overwrite unrelated local files.
3. Run:

```sh
node tools/install_omni20.mjs
node tools/install_omni20.mjs --check
node --test tests/*.test.mjs
node tools/guard_reset14.mjs --check
node tools/verify_x5.mjs
node tools/rebuild14.mjs --check
```

The installer performs the matching source checks, re-embeds both OMNI20 modules in the standalone HTML, runs the OMNI20 Node tests and the original full Node test set, checks integrity, and appends an additive entry to `Elsewhere_bible.md`. It is idempotent. It rolls back its touched integration files when an internal step fails. It does not create a branch, stage, commit, push, merge, deploy, change passwords or migrate data.

The installer rejects a pre-existing modified `index.html` or `tools/rebuild14.mjs` on initial installation rather than overwrite user's work. It also rejects unknown build markers and a mismatched explicit Git remote, when a remote is configured. Existing authored modules remain untouched.

## Local verification record

- `node --check src/elsewhere-omni20.js`: PASS in this preparation environment.
- `node --check tools/install_omni20.mjs`: PASS in this preparation environment.
- `node --test tests/omni20.test.mjs`: 7/7 PASS, including idempotent install and refusal on wrong source anchors (isolated fixture).
- `python3 tests/browser_omni20.py`: 84 assertions PASS using headless Chromium 144 on deliberately synthetic DOM fixtures. View switching, preservation of unsaved textarea text, command invocation, project-switch refusal, Library grouping, Atlas grouping, Vault access, inspection, persistence error feedback and 320/375/390/440/844 widths tested.
- The generated screenshots in `tests/browser-shots/` are **fixtures**, not real website or physical-device captures.

**Not executed:** original repository's full test suite, actual baseline's `index.html`, GitHub Actions on a changed branch, real legacy/v14 interactions, encrypted browser restore, two-tab stale-write isolation, actual iPhone Safari, VoiceOver, Android PWA, deployment. No source-level parity certification is claimed for these absent checks.

## End-to-end release acceptance

Before publishing or merging, test all original features and exactly the affected flows:

- Unlock, changed-password reload, relock, and focus/Zen exit.
- Each existing prompt path, pack, Greyson EN/ES counters, no-repeat progress, kept/history, Drift, Omni, Workbench, contextual tools, and all original shortcuts.
- Explore → Write about this → typed draft → project switch refused on storage failure → recover/copy → persistence across reload.
- Save as artifact, branch alternative, make possible fact, leave canon pending, rationale+confirmation required before establishing, preserve original source and relationships.
- Library sort/search/page, compare without merge, inspect full content, continue linked writing, cross-project search opt-in.
- Atlas graph pan/zoom/pinch/list/history paging, layout arrange undo/reset, camera-only fit, keyboard and touch activation.
- Vault passphrase backup and HTTPS restore roundtrip, pre-restore encrypted checkpoint, rollback and failed-write stop.
- Two-tab conflict, offline reopen with browser storage retained, iOS keyboard/dock, screen-reader navigation, reduced motion and extra-large text.
- PR #2 arrival fallback and PR #3 Infinite Door branch compatibility in dependency order, after those branches are separately accepted.

Reject or revert the implementation in the target checkout if the full app's nested workspace, projection of authoring context, any old entrypoint, or a recovery operation regresses. Work only on a reversible isolated worktree until verification is complete. No automatic release is justified by the synthetic results.
