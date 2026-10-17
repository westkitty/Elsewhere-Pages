# Elsewhere - The Living Atlas

Elsewhere is a local-first prompt and project exploration application. The distribution at `index.html` remains a standalone HTML document containing all application JavaScript and CSS. The v14 creative atlas extends, rather than replaces, the existing v12 prompt engine and v13 project/continuity engine.

## Run

Open `index.html` directly for the self-contained edition (without service-worker installation), or serve the directory over localhost/HTTPS for the PWA edition. On a secure served origin the application can cache its public app shell for offline reopening.

The initial access-lock password is `Dexter`. **Change it after first unlock.** This is a local UI lock, not server-side authentication or encrypted browser storage.

## Development

Node.js 20+ (no runtime npm dependencies) is required for source-to-standalone consistency checks.

```bash
node --test tests/*.test.mjs
node tools/rebuild14.mjs --check
node tools/rebuild14.mjs
```

`src/elsewhere14.js` and `src/elsewhere14.css` are authored source modules. `tools/rebuild14.mjs` updates their marked inline copies in `index.html`. **Do not edit both copies independently.** Existing v12/v13 modules remain preserved inline; v14 fixes to their state bridge are deliberate compatibility patches.

Optional browser test, when Playwright + Chromium are installed:

```bash
python3 tests/browser_smoke.py
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
