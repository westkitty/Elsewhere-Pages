# Encrypted Google Drive archive — integration contract (October 21, 2026)

This implementation is **not** an encrypted live journal database. Elsewhere's existing v12/v13 browser storage and session recovery continue to contain plaintext, and the Dexter UI lock is not authentication. The new optional feature encrypts independent archive copies locally before storage or upload. Do not describe the whole app as encrypted at rest.

## Requirements and developer registration

- Operates only after the existing Dexter access gate. No Google credentials, refresh token, secret, or journal plaintext is committed to source.
- Create a Google Cloud project; enable Google Drive API; configure Google Auth Platform with appropriate branding, privacy notice, publishing audience, verified homepage and authorized JavaScript origins.
- Create an OAuth **Web application client**. Use the public client ID only; never embed a client secret.
- Register the exact production HTTPS origin and localhost testing origin. A project path on westkitty.github.io is not an isolated origin; a dedicated hostname is recommended before handling sensitive material.
- Set the public client ID in `<meta name="elsewhere-google-oauth-client" content="...">` in the authored `index.html`. Never paste private credentials. The standalone file remains functional offline without a configured client ID.
- Request `https://www.googleapis.com/auth/drive.file`, not broad Drive scope; the authorization is explicitly opted into by each user. Google Identity Services is fetched only when Connect is pressed.
- Users choose their Google account. Elsewhere creates `Elsewhere/Encrypted Archives` within app-accessible Drive and uploads only authenticated encrypted JSON.
- Google OAuth tokens are short-lived and held in memory only. No automatic unattended reauthorization is promised. Reconnection is required when the token expires or permissions change.
- Google Cloud OAuth verification and site/domain ownership are external user/developer tasks, not implemented by repository code alone.

## Data flow

1. User chooses a unique 14+ character archive passphrase.
2. WebCrypto derives a PBKDF2-SHA256 wrapping key (310,000 iterations), encrypts a random AES-256 data key, and stores only the wrapped descriptor in IndexedDB. The unwrapped CryptoKey remains in tab memory.
3. Confirmed v13 source writes request an authenticated encrypted universe snapshot. Only ciphertext and non-sensitive archive status are stored in the separate IndexedDB queue.
4. If authorized, Drive receives each version as a **new file**; Elsewhere downloads and hashes its bytes before marking the local record verified.
5. If offline or unauthorized, encrypted local queue entries remain pending; browser storage can be evicted. Automatic uploads occur only while the app is active, unlocked, and authorized.
6. The incoming Drive archive must be decrypted locally and validated. A pre-restore encrypted checkpoint and explicit confirmation precede replacement using the existing v14 read-back/rollback transaction.
7. Restore is replacement only, not cross-device sync or canon merger. Returning users can connect Drive before creating a local vault to inspect available app-created archives.

## Explicit privacy limits

- The existing journal, progress, session drafts, optional Arrival history and other site data are not encrypted by this feature. Migrating the entire live storage adapter to encrypted persistence requires a separate, extensively tested asynchronous state architecture.
- Unsaved edits are not included in backups until a successful application save.
- A locked archive does not automatically capture changes. Unlocking is explicitly required per session; a closed PWA has no guaranteed scheduler.
- Another app under the same browser origin may read plaintext v13 storage. Move to a dedicated HTTPS origin before making live-journal security claims.
- A malicious page script could read plaintext while the current Elsewhere session is active. Encryption before cloud egress does not prevent this.
- No automatic remote deletion or quota eviction is implemented. Verified encrypted local snapshots retain the newest twelve copies; pending versions are retained without pruning.
- Password loss or loss of the encrypted descriptor/key record can make archives unrecoverable. Each archive embeds its key descriptor so the archive + passphrase suffices for recovery.
- Changing encryption passwords, multiple-writer synchronization, remote deletion and local data-at-rest migration are deliberately out of scope.

## Acceptance and unresolved production gates

- Node source tests, `tools/rebuild14.mjs --check` and `tools/guard_reset14.mjs --check` must all pass.
- Real Google consent, Drive upload/download, folder discovery, expired-token and revoked-permission paths require a registered OAuth client on a dedicated HTTPS origin.
- Real browser secure-origin IndexedDB persistence, multi-tab behavior, mobile Safari/Android Chrome, iOS offline PWA reopen, and fresh-device recovery require end-to-end runs.
- The module is not production-ready until these tests and external registration have been completed. Do not merge or deploy to the existing public journal origin as though encryption-at-rest were solved.
