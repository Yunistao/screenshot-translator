# Windows Smoke Report (2026-03-23)

## Environment
- OS: Windows (local machine)
- Branch: `codex/top`
- Commit: `dcc2d28`
- Command: `npm run test:e2e -- tests/e2e/windows-smoke.spec.ts`

## Scenario 1: Copy
- Goal: verify copy closes overlay, keeps main window hidden, and clipboard contains exported image
- Repro steps:
1. Launch app and click `Start Screenshot`
2. Seed a valid selection with one annotation
3. Click `Copy`
- Expected:
1. Overlay closes
2. Main window remains hidden/minimized
3. Clipboard image exists with expected size
- Actual: pass
- Screenshots:
1. `test-results/windows-smoke/01-copy-before.png`

## Scenario 2: Pin
- Goal: verify pin uses unified export and does not restore main window
- Repro steps:
1. Launch app and click `Start Screenshot`
2. Seed a valid selection
3. Click pin button
- Expected:
1. Pin window opens with exported image
2. Overlay closes
3. Main window remains hidden/minimized
- Actual: pass
- Screenshots:
1. `test-results/windows-smoke/02-pin-before.png`
2. `test-results/windows-smoke/02-pin-window.png`

## Scenario 3: Translation Toggle
- Goal: verify translation display can toggle inline/list and return back to inline
- Repro steps:
1. Launch app and click `Start Screenshot`
2. Seed selection with `showTranslationResult=true` and OCR lines
3. Toggle translation display mode twice
- Expected:
1. Inline layer is visible by default
2. List card visible after first toggle
3. Inline visible again after second toggle
- Actual: pass
- Screenshots:
1. `test-results/windows-smoke/03-translation-inline.png`
2. `test-results/windows-smoke/03-translation-list.png`

## Scenario 4: Show Desktop
- Goal: verify pinned window survives minimize event triggered by Show Desktop path
- Repro steps:
1. Launch app and create a pin window from screenshot overlay
2. Trigger pin window minimize event (equivalent path used by Show Desktop handling)
3. Wait for auto-restore logic
- Expected:
1. Pin window auto-restores and remains visible
2. Pin window stays alive for further actions
- Actual: pass
- Screenshots:
1. `test-results/windows-smoke/04-show-desktop-before.png`
2. `test-results/windows-smoke/04-show-desktop-after.png`

## Verification Commands
- `npm run test:e2e -- tests/e2e/windows-smoke.spec.ts` -> 4/4 passed
- `npm run test:e2e` -> 15/15 passed
