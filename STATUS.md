# STATUS.md — Implementation State

Status: Approved Milestone 0 prototype implemented and tested. Editing feasibility demonstrated for the recorded workflows; independent lossless math serialization failed important probes. Milestone 0 is not fully accepted and the permanent architecture/format remain undecided.

## Working and demonstrated

- React/TypeScript/Vite app with Tiptap/ProseMirror prose and MathLive inline/display math.
- Flowing prose with editable fractions and matrices, including a fraction within a matrix cell, with reflow verified after viewport narrowing.
- Keyboard entry/exit, internal selection/replacement, provisional whole-equation selection across prose boundaries, and a tested mouse-drag selection workflow.
- Shared chronological undo/redo with internal math bookmarks, delayed-input flushing, equation deletion/restoration, matrix resize, and clipboard operations.
- Matrix boundary dragging changes row/column counts using supported MathLive commands. Dimensions preview before release; removal of nonempty cells confirms and is undoable. Keyboard resizing is also available on the handle.
- Experimental downloadable JSON backup and reopen preserve the pinned adapter's source/projection for the tested unfinished fractions, empty matrix cells, roots, powers, Greek symbols, and fences. Reopened math remains editable.
- Ordinary prose paste, supported LaTeX paste inside math, malformed input rejection, and current-document preservation on invalid file import.
- Actual mixed-content system copy/paste/cut verified in Chromium. Math identities are regenerated on paste.
- Dependency lockfile and dev/build/test/typecheck/lint commands; local math fonts and production bundle browser smoke.

## Failed or partial

- **Independent mathematical presentation serialization failed.** MathLive MathML exports editable placeholders as literal question marks, losing identity/branch structure. Empty branches and complete matrix presentation also do not pass the current tree-only round-trip probe.
- Version-0 files explicitly retain MathLive LaTeX recovery data. They are experimental backups, not the approved canonical notebook format. No fidelity requirement has been relaxed.
- Whole-equation boundary selection remains provisional, as approved by the owner for this experiment.
- Matrix handles support one standalone matrix with publicly identifiable cell boundaries, 1–8 rows and columns. Nested matrices remain editable; boundary resizing within a larger/nested formula is not demonstrated.
- Native operating-system clipboard tests were skipped in Firefox and WebKit; injected clipboard-event admission tests passed there.
- No autosave/crash recovery or production interoperability exports are included in this slice.

## Unverified

- Real IME composition, screen readers, touch, non-US/AltGr layouts, and an actual owner lecture-note session.
- Real Safari, exhaustive wrapped-line vertical caret affinity, all cross-block pointer selections, discontinuous math selections, and browser-native undo menu paths.
- Arbitrary mathematical notation/macros, long-document performance, and broad hostile-input/security coverage.
- MathLive's remaining no-op/announcement paths: a library AudioContext issue was encountered during testing; public integration routing avoids observed triggers, without patching internals.

## Verification log — 2026-11-09

- Node 22.23.4 used from ignored project-local `.tools`; system Node 19 was not used for the verification toolchain.
- Type checking: passed.
- Lint: passed.
- Unit tests: **12 passed**, two files.
- Browser tests: **43 passed, two explicitly skipped**, Chromium/Firefox/WebKit on Windows, no automatic retries. The skips are the actual system clipboard test outside Chromium.
- Production build: passed, with Vite's large-chunk warning (~1.38 MB JavaScript / 402 KB gzip).
- Built-app Chromium smoke: passed; all observed HTTP assets stayed on localhost; no page exceptions; screenshot visually inspected.
- Production dependency audit: zero reported vulnerabilities. Development tooling still had ten moderate advisories at installation; initial critical test-tool advisories were addressed.
- Full evidence, fixture failures, and limitations: [Milestone 0 results](docs/research/milestone-0-results.md).

## Changes this session

- Implemented the approved limited prototype, regression coverage, and reproducible setup with a lockfile.
- Clarified PRODUCT.md to preserve the owner's exact matrix-boundary row/column-count requirement.
- Recorded approval conditions in ADR 0001 and experimental integration choices in [ADR 0002](docs/decisions/0002-experimental-math-bridge.md).
- Updated README with launch, keyboard/mouse test, backup, and verification instructions. Updated ROADMAP's Milestone 0 evidence without marking it complete.

## Recommended next step and decision gate

Run the owner trial described in [README.md](README.md), then investigate public lossless presentation serialization before broadening into Milestone 1. Keep the editor/format adoption decision open. A private-API fork, new parser/editor, or compromise to fidelity requires another product-owner decision; none was adopted during this experiment.
