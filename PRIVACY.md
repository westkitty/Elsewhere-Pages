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

### Recovery safeguards

- Unsaved editor recovery is optional to use but cached temporarily in plaintext `sessionStorage` in the current browser tab. It is not encrypted, not backed up across devices, and not a replacement for Save draft.
- Vault restoration requires a password-style masked field; the passphrase is held in memory only for the current operation and never stored.
- Before importing, Elsewhere exports an AES-GCM-encrypted checkpoint and requires an explicit user confirmation that the file was saved. The app cannot verify the operating system's actual download completion.
- A staged import checks persistence and reads data back before removing obsolete project keys. If verification fails, it attempts a rollback. If rollback cannot be verified, the tab is marked stale and further project edits are blocked. An externally saved checkpoint remains the recovery route.
- Resetting creative work must not reset a custom access-lock password to the insecure initial default, nor erase unrelated applications' browser storage.

## Five-pass restore/recovery clarification

Verified restore now checks project *content* and selected Greyson progress/preferences after browser read-back, not merely whether the same project IDs exist. It also blocks hazardous project identifiers, orphaned active-project pointers and imports beyond configured size limits. A backup restore that changes storage and subsequently fails attempts an evidence-checked rollback; if rollback proof fails, the app must stop writing and tell the user to recover from the independently saved vault.

Retries after a browser storage failure reuse pending in-memory record IDs while the tab remains open. This prevents double-writing, but does **not** upgrade sessionStorage to durable encrypted storage. The explicit text-copy download is plaintext and should be handled accordingly. Atlas drag coordinates, sorting and search remain local presentation choices, not canonical facts.

This addition does not alter the central security boundary: a public GitHub Pages source cannot provide true server authentication or an encrypted private origin just by displaying the Dexter lock.

## Arrival, daily check-in, and figure matching

The optional arrival sentence is processed in the open page to choose a prompt direction. It is **not retained** by the arrival feature; when the user explicitly chooses **Just let me write**, their sentence can be placed into the ordinary journal editor and then follows the pre-existing session-draft and save rules.

Quiet Echoes uses a separate browser-local `elsewhere:arrival:v1` record that contains settings, selected theme labels, and observation dates. It does not store the check-in sentence, raw journal text, inferred diagnoses, or demographic profiles. The initial experience enables theme matching from chosen directions and allows users to turn it off. Reading **newly saved** journal responses is separately **off by default** and must be enabled within Settings. No previously stored journal entry is scanned retrospectively. Theme extraction is simple deterministic word matching, not a medical or personality evaluation. The interface explicitly frames figure comparisons as playful analogies based on selected themes.

The record is **plaintext localStorage**; code from other repositories on the shared `westkitty.github.io` origin could access it. It does not automatically synchronize across devices, and existing encrypted Vault export/import excludes this separate preference and matching history. Use **Settings → Arrival & quiet echoes → Erase matching history** to remove observations without deleting journal entries, or disable matching and set check-in to Never. Dismissing a suggestion does not delete the underlying observation record. Browser site-data clearing can also erase this feature's record but risks clearing unrelated Elsewhere data and must not be used as the recommended reset.

No answer text or theme observations are sent to an external model or server by the arrival module. The normal browser/network and shared-origin risks documented above still apply.

## Optional encrypted Google Drive archive

The Drive Archive feature, when configured and explicitly enabled by a user, seals a full saved-universe snapshot in AES-256-GCM before storing ciphertext in a separate IndexedDB queue or uploading it to Google Drive using the `drive.file` scope. The random data key is wrapped under a passphrase-derived key. Neither the passphrase nor the plaintext archive is sent to Google. The user authorizes a Google account directly; OAuth access tokens remain in session memory. Offline pending archives can remain in browser storage; Google uploads happen only while the app is open, unlocked and authorized. An expired token requires reauthorization.

**Remaining plaintext exposure:** existing journal/project localStorage and session draft storage remain unencrypted, including on the shared `westkitty.github.io` origin. This feature only protects archive copies. Do not infer that this is an encrypted journal-at-rest migration. Drive access metadata, archive timestamps, upload status and file sizes may be visible to Google and to the authorized account. Users can revoke access through their Google account. See [docs/encrypted-drive-archive.md](docs/encrypted-drive-archive.md).
