# STATUS.md — Implementation State

Status: The owner-approved bounded version-1 origin-marker experiment did not pass the complete structural gate. Nested ownership and bounded recovery work, but fence-boundary edits violate admission and default clipboard output exposes metadata. Immediate slash/power promotion, phantom cues, and scope-correction controls are not implemented. The previous Space/Enter conversion prototype remains the running application, with unchanged version-0 admission/writing. Independent lossless native serialization remains unresolved; Milestone 0 is not accepted.

## Working and demonstrated

- React/TypeScript/Vite app with Tiptap/ProseMirror prose and MathLive inline/display math.
- Type `The answer is 1/2 because...` continuously: Space converts the fraction without entering math; Enter converts eligible input and starts the next paragraph. Compact fractions, powers, grouped/nested algebra, and one top-level equality are supported. Whole-token recognition protects the recorded English/date/path fixtures and rejects ambiguous ungrouped expressions.
- Conversion is isolated in the shared history. Immediate Undo restores exact literal text, punctuation, boundary, and prose caret; Redo restores conversion. Boundary retyping does not reconvert until a direct expression edit. Paste/import/composition/selection replacement do not independently enable recognition.
- MathLive's public space option overrides its default structural exit: Space inserts a thin math space in the current branch. Automated tests verify letters/spaces remain in the denominator and converted nested fractions/powers remain editable.
- Flowing prose with editable fractions and matrices, including a fraction within a matrix cell, with reflow verified after viewport narrowing.
- Keyboard entry/exit, internal selection/replacement, provisional whole-equation selection across prose boundaries, and a tested mouse-drag selection workflow.
- Shared chronological undo/redo with internal math bookmarks, delayed-input flushing, equation deletion/restoration, matrix resize, and clipboard operations.
- Matrix boundary dragging changes row/column counts using supported MathLive commands. Dimensions preview before release; removal of nonempty cells confirms and is undoable. Keyboard resizing is also available on the handle.
- Experimental downloadable JSON backup and reopen preserve the pinned adapter's source/projection for the tested unfinished fractions, empty matrix cells, roots, powers, Greek symbols, and fences. Reopened math remains editable.
- Ordinary prose paste, supported LaTeX paste inside math, malformed input rejection, and current-document preservation on invalid file import.
- Actual mixed-content system copy/paste/cut verified in Chromium. Math identities are regenerated on paste.
- Dependency lockfile and dev/build/test/typecheck/lint commands; local math fonts and production bundle browser smoke.

## Failed or partial

- **Progressive typing gate not passed.** Public descriptors recover the tested empty branches, and fixture-specific annuity range rewrites work. But invisible power-base grouping omits necessary visible parentheses; native fenced grouping does not distinguish inferred from explicit fences after reopening. A controlled public origin marker survives the tested edit/reopen but is rejected by current notebook admission. See [gate evidence](docs/research/progressive-math-typing.md) and [the proposed versioned experiment](docs/decisions/0004-progressive-typing-gate.md). This is a limitation of the tested strategy, not proof that every public adapter is impossible.

- **Authorized marker follow-up also failed its complete gate.** An isolated exact-marker version-1 reader/writer admits tested intact parenthesized owners without relaxing version 0. Boundary deletion leaves a one-sided tagged fence that it rejects. Default external clipboard channels expose the marker, and raw marked MathML omits operands. Nested provenance, controlled scope rewrites, shared structural history, actual file save/reopen, and editability pass their bounded checks. See [the evidence and limits](docs/research/origin-group-experiment.md) and [ADR 0005](docs/decisions/0005-origin-marker-experiment-results.md). No automatic repair or production version-1 integration was added.

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

## Verification log — 2026-11-10

- Node 22.23.4 from ignored project-local `.tools`; pinned dependencies unchanged.
- Typecheck and ESLint: passed. Production build: passed, with the existing large-chunk warning (~1.385 MB JavaScript / 404 KB gzip).
- Unit tests: **88 passed**, four files. Includes the bounded input grammar, precedence/grouping, false positives and bounds, history/caret mapping, provenance and identical-text replacement, and validation-failure preservation.
- Browser suite: **85 passed, two explicitly skipped**, Chromium/Firefox/WebKit on Windows, no automatic retries. Both skips remain the operating-system clipboard test outside Chromium. Fourteen new typing scenarios run in each engine; the Chromium real system clipboard test now uses an automatically converted fraction.
- Built-app Chromium smoke: passed with continuous prose/fraction typing and matrix editing; all observed HTTP assets stayed on localhost; no page exceptions. Screenshot visually inspected at `.tools/production-smoke.png` (ignored artifact).
- Synthetic composition guard tests passed; **no real IME trial or owner lecture-note trial was performed**. WebKit automation is not a real Safari trial. Independent lossless native-format fidelity remains unresolved.
- During development, a reflow assertion initially measured the editor's fixed minimum height rather than paragraph wrapping; the test now measures paragraph height. A history fixture initially read diagnostics before MathLive's delayed commit; it now waits for the committed value. A stronger structural test exposed MathLive's Space-as-exit default, which was corrected through public configuration. Production smoke now verifies fraction structure rather than an equivalent LaTeX spelling.
- Final review reduced boundary lookahead to one character, keeping token inspection bounded even in long paragraphs; the 88 unit tests and the three affected browser cases passed again after that adjustment, and the production bundle was rebuilt.

## Changes this session — 2026-11-10

- Added a pure bounded recognizer and a ProseMirror typing plugin, keeping parsing/admission, editor history, and math rendering separated. No dependencies or native-format fields changed.
- Added unit and cross-browser typing tests, strengthened real clipboard and production smoke coverage, and updated the app's typing guidance and README.
- Updated PRODUCT and ROADMAP with continuous typing as a high-priority Milestone 0 acceptance requirement. Recorded [ADR 0003](docs/decisions/0003-context-math-typing.md) and the [typing contract, evidence, and trial checklist](docs/research/context-math-typing.md).

## Progressive typing gate — 2026-11-10

- Added reproducible `npm run probe:progressive`. Chromium, Firefox, and WebKit each passed 13 fixture recovery checks and six public-API capability checks: branch mapping/recovery, fixture numerator contraction/expansion, denominator caret mapping, regrouped recovery, numerator geometry, and literal trigger recovery.
- The required representation gate **did not pass**, so the command intentionally returns nonzero. No progressive input or phantom UI was added; the application code, dependencies, version-0 format, and admission policy are unchanged.
- Empty exponent MathML loss, incorrect native display for invisible grouped bases, and identical unannotated explicit/inferred fence representations were reproduced in all three engines. A public `htmlData` origin marker survives the tested interior edit and source recovery/reopen, but version-0 admission rejects it. Arbitrary edits, integrated transformation history, nested marker ownership, clipboard, live cue alignment/reflow, real IME, and owner trials are not established by this experiment.
- Evidence is in ignored `.tools/progressive-math-report.json` and `.tools/progressive-scope-fixtures.png`; the screenshot was visually inspected. The annuity rewrite is fixture-specific and does not establish a general structural adapter.
- Updated PRODUCT, ROADMAP, README, and historical-policy notices. Recorded [the progressive contract and evidence](docs/research/progressive-math-typing.md) and [ADR 0004's next-step proposal](docs/decisions/0004-progressive-typing-gate.md).
- Verification after these changes: typecheck, lint, all **88 existing unit tests**, production build, and whitespace checks passed. Build retains the existing large-chunk warning (~1.385 MB JavaScript / 404 KB gzip). The complete application browser suite and production smoke were not repeated because application code did not change; the new structural experiment ran in all three engines. The experiment is not a substitute for the deferred progressive-input acceptance suite.

## Previous prototype changes — 2026-11-09

- Implemented the approved limited prototype, regression coverage, and reproducible setup with a lockfile.
- Clarified PRODUCT.md to preserve the owner's exact matrix-boundary row/column-count requirement.
- Recorded approval conditions in ADR 0001 and experimental integration choices in [ADR 0002](docs/decisions/0002-experimental-math-bridge.md).
- Updated README with launch, keyboard/mouse test, backup, and verification instructions. Updated ROADMAP's Milestone 0 evidence without marking it complete.

## Recommended next step and decision gate

Seek a public MathLive contract for incomplete fence mutations, group provenance, unfinished structures, and structural selection mappings. Alternatively, define and investigate a bounded adapter repair policy plus separate native/external clipboard channels, then rerun the structural gate with generalized scope discovery. Keep progressive integration stopped; the experiment does not establish a reliable general adapter. If this path remains blocked, compare another maintained editor against the same corpus before any architecture change. Continue the independent native-format investigation and retain owner/real-IME/real-Safari trials. Consequential fence-editing changes, a private fork, editor replacement, new general parser, or fidelity compromise require a separate decision.

## Authorized origin-marker experiment — 2026-11-10

- Implemented isolated `src/math/group-origin.ts` and `src/document/origin-experiment.ts`, with exact marker syntax, bounds, inherited-data versus owner distinction, public range/fence validation, strict version-1 adapter identity, pinned recovery, and reuse of version-0 admission on a validation-only copy. No application entry point enables version 1; no existing files are migrated. Dependencies and permanent format status are unchanged.
- Added `npm run probe:origin-groups` and 12 unit cases. The probe tests nested explicit/inferred groups, duplicate owners, active/malformed payload rejection, structural edits, marker removal, controlled scope expansion/contraction, denominator/exponent bookmarks, atomic shared-history rewrite/Undo/Redo, clipboard copy/cut/paste, empty structures, and actual browser download/reload/File-input reopening with further editing.
- Structural result: **Chromium 36/39; Firefox 35/38; WebKit 35/38 checks passed**. Each engine has the same three failed checks: deletion of either inferred fence boundary and exclusion of markers from default external clipboard output. No page exceptions. Native system copy/paste also ran in Chromium; Firefox/WebKit used injected real-library clipboard handlers. No real Safari or IME trial was performed.
- Raw marked MathML drops entire operands; a metadata-free scratch projection retains the tested required fences but still loses unfinished exponent structure. Scope rewrites are fixture-specific, not a generic candidate reader; cue alignment/lifecycle and full progressive input remain unimplemented and unverified.
- Evidence: ignored `.tools/origin-group-report.json`, `.tools/origin-group-fixtures.png` (visually inspected), and downloaded/reopened `.tools/origin-{engine}.json` bundles. Durable summary and counterexamples: [experiment report](docs/research/origin-group-experiment.md). Updated ADR 0004, added ADR 0005, and updated ROADMAP/README.
- Verification: Node 22.23.4; **100 unit tests passed**, typecheck and ESLint passed; production build passed with the existing large-chunk warning (~1.385 MB JavaScript / 404 KB gzip). Existing application browser suite: **85 passed, two explicitly skipped**, no retries; skips are operating-system clipboard outside Chromium. Production smoke was not repeated; application imports and generated JavaScript bundle hash are unchanged. Structural probe intentionally returns nonzero for its failed gate.
