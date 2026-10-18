# Elsewhere — iPhone workspace acceptance

Target: mobile source overlay for `westkitty/Elsewhere-Pages` / `feature/elsewhere-14-living-atlas`, based on prior iPhone OMNI package. This document describes the **review gate**, not proof of a deployed or installed iPhone application.

## Five independent user journeys

1. **Switch projects without losing work.** Write in Project A, change to Project B, return to A, recover the per-tab writing. Disable session storage and repeat: the switch must be refused, leaving the original text and project intact. The keyboard must close and the bottom dock must reappear after project selection.
2. **Continue saved draft.** Save a project draft and confirm that *Continue saved draft* appears without expanding advanced tools. It must restore the right project's scratchpad, ask before replacing new unsaved text, and preserve the existing Resume draft control.
3. **Comfortable reading.** Choose Comfortable, Large, and Extra large. Verify text physically changes size in the prompt, writer and Library cards and the preference survives a normal reload on the same browser. Text fields must not cause Safari's focus zoom or spill outside their cards at narrow widths.
4. **Explicit copy and share.** With text in the editor, activate Copy writing. It should populate the clipboard only on the click; with Share writing (unencrypted), an iOS share sheet should appear only on the click. Canceling or rejecting share must leave the text untouched. Neither action silently syncs content elsewhere.
5. **Return to reading position.** Scroll down the Library, switch to Write, and back. The Library scroll offset should return near the previous reading position; tapping the already-selected tab should return to the top of that view. Draft data and selected project must remain unchanged.

## Regression and release requirements

- Protected: user-modified access password, initial Dexter access behavior, Greyson EN/ES counters, all v12/v13 projects and history, possible/established canon boundaries, indexed storage and encrypted backup/restore rollback behavior, Atlas two-finger camera navigation and persistent arrangement, four-tab navigation and accessibility.
- Existing Node and synthetic browser scripts must pass without being weakened.
- Full canonical HTML must be rebuilt from source in the intended Git checkout and checked with `node tools/rebuild14.mjs --check`.
- Physical iPhone Safari remains necessary for focus transitions, Dynamic Type or Larger Text settings, VoiceOver, Home Screen launch, offline reopening, local-storage quota failure, HTTPS WebCrypto and encrypted download/restore. These checks are **not satisfied by Chromium device emulation**.
- The default Dexter password remains a *client-side presentation lock*, not server authorization or encryption of browser data. Use an actual private origin and authentication infrastructure for sensitive data.

## Local evidence

- Original `tests/iphone_browser.py` passes on 320, 375, 393, 440 px and landscape emulations.
- New `tests/iphone_round2.py` directly exercises all five journeys and catches the switch-picker keyboard trap.
- New `tests/iphone_round2_failure.py` verifies refusal on session-storage failure and safe share cancellation.
- `tests/iphone_round2.test.mjs` covers pure helpers, deliberate sharing, and retained old capabilities.
- Screenshots in the release package are **component fixtures**, not live-site or physical iPhone captures.

## Git delivery fence

No branch changes, commits, pushes, merges, or deployments are performed by the installer. Inspect the actual source diff and complete release checks before updating the GitHub pull request.
