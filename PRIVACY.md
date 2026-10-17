# Elsewhere: Privacy Boundaries and Recovery

## What is protected

The existing UI lock initially uses `Dexter` as a default password, and a changed password is stored with a random salt and PBKDF2-SHA-256 verifier. **It is only an access convenience**, not a security boundary. Anyone who can execute JavaScript on the site's origin, access the browser profile, or inspect and edit the public page source can bypass the UI lock and access plaintext localStorage data.

Encrypted **backup exports** use AES-256-GCM authenticated encryption and a separate passphrase of at least 12 characters. These backups can be stored elsewhere without exposing plaintext to someone who lacks the passphrase. They do not retroactively encrypt browser data and should not reuse `Dexter`.

## GitHub Pages origin issue

GitHub Pages project sites under `https://westkitty.github.io/` share a browser origin (scheme + host + port) even when they have different paths. JavaScript on another project page at that origin could read localStorage values for Elsewhere.

For meaningful origin isolation, assign Elsewhere a dedicated hostname that is used by no other apps with code execution, such as a **subdomain you own and control**. Configure the GitHub Pages custom-domain setting and DNS according to GitHub's current official instructions, then confirm HTTPS before moving private work. Do not presume existing data automatically moves between origins. Explicitly export from the old origin, verify a backup, and import on the new origin after testing.

**No DNS records, GitHub Pages custom-domain settings, or live user storage have been changed by this implementation.** A hostname cannot be invented or registered automatically.

## Data-loss controls

1. Before migration, download a full universe snapshot and test importing a copy in an isolated browser profile.
2. Use the Vault tab to produce an encrypted backup; retain its passphrase separately.
3. Close other Elsewhere tabs before importing. If an external change is detected, reload the stale tab instead of allowing concurrent overwrites.
4. A failed localStorage write makes the interface warn that changes are session-only. Export while the tab remains open.
5. The storage migration preserves v12 main and Greyson pack counters, language preference, and saved prompts. An automated test verifies this contract.
6. Never clear site data, change domains, or replace a production backup without a verified restore.

## What remains unresolved

- Persistent at-rest encryption would require a separate, testable storage adapter that unlocks only after passphrase-derived key setup, and migration plus recovery design.
- True server-side authentication requires an authentication-aware host, not static public GitHub Pages.
- Cross-device collaboration, conflict-free merges, encrypted sync, and credential recovery need explicit architectural approval and security testing.
- Multi-tab conflict detection is a guard against accidental local edits, not a distributed database transaction system.
