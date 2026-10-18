# Elsewhere Project Bible

## 2026-10-17 - Elsewhere 14 implementation scope

**Baseline:** GitHub repository `westkitty/Elsewhere-Pages` contains `index.html` and `.nojekyll` at `61afd80`. Single self-contained HTML, v12 prompts, v13 domain/state, local UI access lock default `Dexter`.

**Purpose:** Prompt exploration, private creative writing, user-controlled project artifacts and canon, continuity and local-first storage. Preserve Greyson EN/ES packs, deterministic prompt engine, no-repeat state, existing project data, opt-in creative paths, access lock and recovery.

**Change groups:** (1) v12/v13 data preservation and safe storage, (2) written responses + Living Atlas visualization/authoring, (3) installable shell, tests, privacy documentation.

**Validated before integration:** Node tests for graph and encrypted vault; isolated Chromium Playwright smoke on synthetic DOM for writing, project artifacts, alternative facts, graph rendering, time filter, drafts, responsive viewport. Those are **component tests**, not end-to-end production proof.

**Known limitations:** Browser localStorage remains plaintext; default password is public; dedicated private origin and server authentication require separate domain/host; virtual graph is SVG not true 3D; encrypted backups use a separate passphrase; no autonomous syncing or collaboration. A large rewrite and hard dependency additions were intentionally avoided.

**Next acceptance gate:** Run combined standalone page in a clean mobile/desktop browser, change password, verify unlock, test v12/v13 migration fixtures, reload, persist new artifacts, export/import both plain and encrypted snapshots, force storage quota failure, test multi-tab conflict, inspect keyboard focus, verify PWA offline and measured performance. Merge only after those are passing.

## 2026-10-17 — Recovery and Atlas quality uplift (local patch)

### Repository state and authority
- Repository: `westkitty/Elsewhere-Pages`; target branch: `feature/elsewhere-14-living-atlas`.
- Original feature-branch head confirmed `e9d98de54c9726787a90225dd5395d582ac4b054`; draft PR #1 has passing Actions CI at baseline.
- This work unit is a local modification and patch handoff, **not** a GitHub push or production release. The user requested uplift, not commit/push/merge.
- The reproducible local baseline was reconstructed from the exact SHA-matching source bundle. The complete canonical `index.html` cannot be downloaded into the local container because container DNS access to GitHub is blocked; the `guard_reset14.mjs` and `rebuild14.mjs` handoff must run against an actual checkout.

### Frozen changes
1. Protect encrypted vault restore from plaintext passphrase entry, plaintext pre-restore export, partial writes, unsafe old-data pruning, and falsely successful restores.
2. Preserve unsaved response writing in limited per-tab session storage with explicit recovery and visible session-only failure states.
3. Bound the Atlas's rendering work and make every visible edge point to a visible node; expose filter, page navigation, and an accessible list.

### Validation evidence
- Node test suite includes crypto roundtrips, invalid references, 275-node graph bounds, idempotent reset patch, and fault-injected restore commit/rollback scenarios.
- Synthetic Chromium fixture exercises writer, 255-node Atlas paging/filtering, masked password dialog cancel, and mock tab-recovery flow.
- Genuine navigation and cross-tab tests remain blocked by the container's browser/network policy; `page.set_content` is a synthetic fixture, not a production-site replay.
- Entire original site's v12/v13 integration, full reset path, and PWA installation remain **unverified**, not passed.

### Constraints and open work
- The client-side Dexter lock remains a UI convenience, not authentication or at-rest encryption.
- The original single-file build must continue to embed updated v14 sources in marked slots.
- `guard_reset14.mjs --apply` must run on a canonical checkout before `rebuild14.mjs`, and the resulting full diff must be reviewed before release.
- Do not push/merge/deploy without explicit authorization; PR #1 remains the unmodified baseline.

## 2026-10-17 — Five-pass durability and interaction uplift (local patch)

- **Base authority:** GitHub PR #1 at `e9d98de54c9726787a90225dd5395d582ac4b054`, branch `feature/elsewhere-14-living-atlas`. GitHub remote remains unchanged.
- **Protected invariants:** v12/v13 source and saved progress; Greyson pack counters and ES preference; Dexter local lock and any changed password; offline single-file entry; explicit possible/established canon boundary. No side-effects outside Elsewhere.
- **Pass 1:** Vault restore reads back content and selected legacy settings, not just project IDs; rejects unsafe namespaced IDs, oversized/unreferenced records and orphaned active-project pointers; rolls back even if importer mutates and then throws.
- **Pass 2:** Pending saves reuse their in-memory artifact or fact ID after a failed write; draft remains in textarea and session recovery; user can explicitly download plaintext writing.
- **Pass 3:** Nodes support opt-in direct spatial placement, keyboard step controls, last-placement undo and complete visual reset; all kept as project-local presentation data.
- **Pass 4:** Library renders 24 entries per page, with sort/search navigation, bounded DOM updates and independent artifact comparisons.
- **Pass 5:** Node and synthetic Chromium regressions, source checks, fail-closed apply script and cumulative patch packaging.
- **Evidence:** `node --test tests/atlas.test.mjs tests/reset_guard.test.mjs tests/uplift.test.mjs tests/x5.test.mjs`, synthetic browser tests; only full canonical index remains unavailable inside sandbox. Do not treat synthetic fixture as proof of deployed site.
- **Known limitations:** no true login or browser data-at-rest encryption; no user-device tests; no remote commits/pushes; confirm download of encrypted recovery file before import.
- **Next gate:** apply full cumulative patch to exact clean PR base; run reset guard, rebuild, GitHub CI, real unlock/restore/device/offline acceptance before merging.

## 2026-10-17 — Omni continuity, canon and camera work (uncommitted source package)

### Authority and protected behavior
- Target remains `westkitty/Elsewhere-Pages` PR #1 at branch `feature/elsewhere-14-living-atlas`, base `e9d98de54c9726787a90225dd5395d582ac4b054`.
- The initial Dexter UI entrance, any user-changed password, Greyson progress/Spanish choice, deterministic prompts, X5 backup/rollback, user-authored assets and single-file offline architecture must remain intact.
- Work is a **local source change**, not a GitHub commit, merge or live deploy.

### Five delivered passes
1. **Safer imports:** Legacy imports require an encrypted recovery checkpoint before mutation. Explicit plain snapshots display a plaintext warning. On an opaque-origin browser without WebCrypto, imports fail closed instead of continuing without a checkpoint.
2. **Interruption resilience:** Draft text flushes on document hiding and all pagehide events; restore also recovers the selected source artifact when valid.
3. **Creative provenance:** An explicit Continue writing action from Library/Atlas links new authored work to its source artifact without changing that source or promoting any fact.
4. **Canon accountability:** Project-local, 10-item review pages for ideas/possible facts require an explanatory rationale and confirmation before establishing; the existing domain revision path preserves the reason. Failed durability freezes the tab rather than claiming confirmation.
5. **Atlas and mobile utility:** Fit visible and Center selected are camera-only actions, limited zoom supports widely separated nodes, and the cross-project opt-in aligns with its label. Source-trace links remain navigable.

### Evidence and release status
- `node --test` with the five local focused suites: **26/26 passed**.
- Five synthetic Chromium Playwright scripts passed: original smoke, prior uplift, Atlas X5, writer X5, Omni. 390px and 1280px viewport inspections: no document-wide horizontal overflow.
- Web authorship scan for `src/`: PASS with one minor inherited style-density signal.
- These tests **do not prove** authenticated full-page lock, independent `Dexter` password changes, cross-tab recovery, successful encrypted checkpoint on HTTPS, migration of a real browser's saved state, or installed PWA behavior.
- This container cannot fetch the canonical ~655 KB index directly. The PR checkout owns `index.html`; apply the package there, run the scoped reset guard, rebuild the standalone page, then perform release acceptance.

### Next safe operation
Apply the cumulative X5 base and Omni source overlay only in a verified matching checkout. Run rebuild and every Node test, then exercise the live browser routes. No resetting, cleaning, forced branches, credential changes, or automatic publication.


## 2026-10-17 — iPhone-first five-pass interface implementation (uncommitted)

### Project identity and authority
- Target remains `westkitty/Elsewhere-Pages`, draft `feature/elsewhere-14-living-atlas` at `e9d98de54c9726787a90225dd5395d582ac4b054`; no commit/push/merge permission inferred from the request to uplift.
- Preserve the Dexter default and user-changed local gate, Greyson EN/ES migration, source provenance, established/possible canon separation, existing single-file build and all recorded data.

### Implemented five passes
1. Safe-area-aware, thumb-reachable single view tablist with robust view switching and no duplicated tabs.
2. iPhone writing workspace with 16px+ text, persistent tab drafts, clear primary saves, a unified Done editing keyboard exit and adjacent persistence feedback.
3. Bounded eight-item Library navigation and large, clear Continue writing targets.
4. Accessible Atlas list plus camera-only pinch zoom, opt-in map arrangement and enlarged node tap targets.
5. Lower-clutter Vault/disclosures, motion/focus/touch-target safeguards, 320-440px plus landscape regression coverage.

### Observed evidence
- 11 focused Node cases PASS; `tests/browser_omni.py` PASS; `tests/iphone_browser.py` five configurations PASS; `tests/iphone_pinch.py` Chromium CDP multi-touch PASS.
- `web-authorship-gate` PASS (one minor pre-existing radius-density observation); fixture screenshots inspected.
- No canonical combined-file build was run in this container, no real Safari/iPhone device tested, no HTTPS-origin encryption success test. A localhost navigation attempt was blocked by environment administrator policy, not counted as passing.

### Release protection
- Installer compares exact OMNI source snapshots before writing, backs up files in the target worktree, restores on failure, rebuilds standalone HTML and runs all available Node and integrity gates.
- Keep the draft PR and published Pages unchanged until real-device and real-origin acceptance.

## 2026-10-17 — iPhone continuity and reading comfort (source overlay, uncommitted)

### Objective and preservation
- Five additional iPhone experience gains on the earlier iPhone-OMNI source, not a rewrite. Keep the existing four tabs, Dexter lock, Greyson EN/ES, Atlas pan/zoom, session drafts, provenance and data schema.
- Do not treat a browser fixture as installed Safari or GitHub Pages release proof.

### Implemented
1. Accessible project selector in the mobile header; refuses to discard unsaved writing when browser recovery is unavailable; keyboard/dock focus recovery.
2. Visible Continue saved draft shortcut alongside the existing advanced Resume draft tool.
3. Per-browser three-level reading size for prompt, writer and Library with guarded local preference storage.
4. Explicit Copy writing and Share writing (unencrypted), with no automatic egress and cancellation feedback.
5. Per-tab return-to-position navigation across Write, Atlas, Library and Vault; tapping the active view scrolls to the top.
- Corrected textarea intrinsic width to prevent iPhone card overflow.

### Evidence and remaining gates
- Baseline: 11 Node tests and five Chromium device configurations passed before editing.
- After: 16 Node tests and direct Chromium mobile journeys with storage failure/cancel tests passed. Screenshots and local source SHA-256 recorded in the package.
- Not verified: real iPhone Safari, HTTPS encryption/decryption/download, native VoiceOver, full canonical page bootstrap, and deployed GitHub Pages.
- No remote repository mutation, commit, push, merge, or deployment authorized or performed.

## 2026-10-17 — consolidated release candidate and publication authorization

- The user explicitly authorized staging, committing, pushing, and merging Elsewhere into `main`. This supersedes earlier publication holds without removing data or security protections.
- Source baseline: feature branch `feature/elsewhere-14-living-atlas` at `e9d98de54c9726787a90225dd5395d582ac4b054` before local changes; all cumulative X5, OMNI, iPhone, and Continuity patches were applied in order.
- The final isolated repair to `src/elsewhere14.js` is byte-verified at SHA-256 `256c58d0faa559b3f7ef503bfebe29213c3e23236db76d82039c50bb7beda374`; `index.html` was rebuilt from it.
- Local verification: `node --test tests/*.test.mjs` 39/39; reset-scope guard, standalone-source consistency and source verification PASS; real rebuilt-page Brave smoke 12/12 at 393px including password gate, actual project creation, saving and persisted reload.
- No automatic claim of a tested physical iPhone, Safari VoiceOver, changed-password recovery on the physical device or real HTTPS installed-PWA restart. These remain post-release verification limits, not fabricated PASS results.
- Git remote SHA, workflow CI and Pages publication must be read back after operations before completion is claimed.

### Git implementation receipt — 2026-10-17

- Verified implementation commit: `e466f2ad25b17b3c0fcce443233406ceab389272` — `feat: integrate Elsewhere OMNI iPhone experience and recovery safeguards`.
- Scope: 33 intended Elsewhere application, documentation, regression and release-guard files; untracked Python bytecode was not staged.
- The commit was created on `feature/elsewhere-14-living-atlas` after source and full-browser validation. Pushing, merging and deployment require independent GitHub receipts.


## 2026-10-17 — Arrival-first journaling and quiet figure parallels

**Work branch:** `feature/arrival-conversation-quiet-echoes`. The user requested an actual conversational check-in before prompts; controllable routes for talk, shadow work, play, learning, quiet, surprise, or a blank page; and optional, slowly earned comparisons with real/fictional/mythological figures. Do not convert Elsewhere into a diagnosing or coercive profiling app.

**Implementation contract:** v12 engine remains the generator, v13 projects remain authoritative, v14 writing/atlas remains authoritative. The new standalone source pair is `src/elsewhere-arrival.js` and `src/elsewhere-arrival.css`, embedded in `index.html` by `tools/rebuild14.mjs` and deferred behind the existing Dexter lock. The startup engine must defer generating its first prompt until arrival decides. A blank-page session must not attribute writing to an old prompt. Quiet Echoes stores only theme/date metadata locally and must never rewrite canon or inferred project facts.

**Privacy/defaults:** check-in once daily and skippable; quiet parallels from selected paths, optional and dismissible; newly saved response analysis separately opt-in; no retroactive scans or network inference; settings control frequency, categories, matching, optional writing input and deletion. No more than weekly unsolicited figure matches, with repeated-day evidence thresholds; comparisons are analogies, not diagnoses, identity labels, endorsements, or biographical equivalencies. Matching data is plaintext, lives separately from the vault, and does not sync. Security warning for shared GitHub Pages origin remains mandatory.

**Protected compatibility:** existing 19-script deferred startup contract, older Greyson EN/ES packs, no-repeat prompt progress, password replacement, standalone HTML, PWA public shell, drafts and encrypted backup/restore. Tests must prove these, not infer them from polished visuals. Runtime Safari/mobile/full PWA interaction remains to be independently verified before claiming a completed deployment.
