# Elsewhere Project Bible

## 2026-10-17 - Elsewhere 14 implementation scope

**Baseline:** GitHub repository `westkitty/Elsewhere-Pages` contains `index.html` and `.nojekyll` at `61afd80`. Single self-contained HTML, v12 prompts, v13 domain/state, local UI access lock default `Dexter`.

**Purpose:** Prompt exploration, private creative writing, user-controlled project artifacts and canon, continuity and local-first storage. Preserve Greyson EN/ES packs, deterministic prompt engine, no-repeat state, existing project data, opt-in creative paths, access lock and recovery.

**Change groups:** (1) v12/v13 data preservation and safe storage, (2) written responses + Living Atlas visualization/authoring, (3) installable shell, tests, privacy documentation.

**Validated before integration:** Node tests for graph and encrypted vault; isolated Chromium Playwright smoke on synthetic DOM for writing, project artifacts, alternative facts, graph rendering, time filter, drafts, responsive viewport. Those are **component tests**, not end-to-end production proof.

**Known limitations:** Browser localStorage remains plaintext; default password is public; dedicated private origin and server authentication require separate domain/host; virtual graph is SVG not true 3D; encrypted backups use a separate passphrase; no autonomous syncing or collaboration. A large rewrite and hard dependency additions were intentionally avoided.

**Next acceptance gate:** Run combined standalone page in a clean mobile/desktop browser, change password, verify unlock, test v12/v13 migration fixtures, reload, persist new artifacts, export/import both plain and encrypted snapshots, force storage quota failure, test multi-tab conflict, inspect keyboard focus, verify PWA offline and measured performance. Merge only after those are passing.
