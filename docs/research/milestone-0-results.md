# Milestone 0 feasibility results

Date: 2026-11-09. Prototype implemented; permanent architecture adoption remains pending.

Follow-up, 2026-11-10: the owner identified continuous prose/math typing as a high-priority acceptance requirement. The approved Space/Enter recognition layer is implemented; see [the typing contract and subsequent evidence](context-math-typing.md). The results below describe the original prototype; the lossless-format failure remains unresolved and Milestone 0 is not accepted.

## Result

React + TypeScript + Vite + Tiptap/ProseMirror + MathLive can demonstrate the approved minimal editing slice with coordinated history and focus. The attempted library-independent presentation-tree persistence route does **not** meet the lossless requirement. Do not proceed as though a permanent native format has been validated.

The owner-approved provisional selection policy is implemented. Matrix resizing changes row/column counts through a pointer handle at the matrix boundary, with a preview and safeguards; it does not change cell widths or heights.

## Verification performed

Environment: Windows, Node 22.23.4, Tiptap/ProseMirror packages 3.33.0, MathLive 0.111.4, Vite 6.4.6, Vitest 5.1.0, Playwright 1.65.0. Exact transitive dependencies are in `package-lock.json`.

| Check | Observed result |
| --- | --- |
| TypeScript | Passed, no diagnostics. |
| ESLint | Passed. |
| Unit tests | 12 passed in two files: native admission/round-trip, bounded tree serialization, and math history bookmarks. |
| Browser acceptance | 43 passed, two explicitly skipped, across Chromium, Firefox, and WebKit on Windows. No retry setting hides failures. |
| Production build | Passed. Vite reports a large JavaScript chunk, approximately 1.38 MB before gzip / 402 KB gzip. No performance target was established. |
| Built-app browser smoke | Passed in Chromium: real prose/fraction/matrix typing, local assets/fonts, no remote HTTP requests and no page exceptions. Screenshot visually inspected. |
| Production dependency audit | Zero reported vulnerabilities with `npm audit --omit=dev`. Development-tool audit still reported ten moderate advisories at installation; the initially reported critical test-tool advisories were resolved by selecting Vitest 5.1.0. |

The native system copy/paste/cut test is skipped in Firefox/WebKit because their permission/clipboard setup differs. Event-injected paste validation runs in all engines and is identified as such in the tests. Windows WebKit automation does not establish macOS/iOS Safari support. Browser automation is evidence for the specific workflows, not a substitute for owner/human testing.

## Demonstrated behavior

- Continuous prose → inline fraction → prose, display equations, and matrices in document flow. Narrowing the viewport reflows prose and moves following display content without changing document data.
- Fractions remain editable inside matrix cells. Tab/Shift+Tab traverse cells, and a tested vertical-arrow workflow reaches the next row.
- Arrow entry/exit, internal Shift selection and replacement, full-equation promotion at a prose boundary, and deletion/undo of an equation.
- A real pointer drag from inside inline math into surrounding prose selects the whole equation; deletion and undo preserve its content.
- One chronological history across prose/math editing, keyboard and toolbar undo/redo, selection restoration, whole-node deletion/restoration, matrix resizing, and clipboard insertion/removal.
- Immediate undo flushes MathLive's delayed input instead of undoing preceding prose. Fast typing after insertion is routed during its delayed focus handoff.
- Boundary dragging changes matrix dimensions in one undoable action. Shrinking nonempty cells confirms, cancel preserves the grid, and undo restores removed entries. Public-API mutation is verified; no private MathLive model is used.
- Download → page reload → reopen retains and re-edits an unfinished fraction and matrix with empty cells through the experimental pinned recovery adapter.
- Eight public-adapter fixtures retain their source and presentation projection when reopened through that adapter: a complete fraction, empty denominator, placeholder denominator, empty matrix cells, nested incomplete fraction, root/power, Greek symbol with `x`, and fenced power.
- Same-app mixed-content system copy/paste/cut works in Chromium, with fresh equation identities on paste. Ordinary multiline paste stays prose. Supported LaTeX paste is editable; malformed math paste and unknown native versions leave current work intact.

## Failed hypothesis: independent mathematical serialization

The experiment captures MathML as an application-owned JSON projection and contains a bounded structural serializer back to MathLive input. Diagnostics execute that restoration and compare the regenerated presentation tree.

Observed failures include:

1. `\frac{1}{\placeholder{}}` exports as `<mfrac><mn>1</mn>?</mfrac>`. It cannot distinguish an editable placeholder from a literal question mark. Two placeholder branches can collapse to text `??` without two structural children.
2. Empty fraction branches export `&nbsp;` in a token. The entity is decoded for XML admission, but this does not establish round-trip equivalence of an editable empty slot and a token containing space.
3. Matrix cells are present in MathML, including empty cells, but the current bounded tree serializer does not preserve the complete matrix presentation/attributes. It refuses that conversion rather than flattening it. Row addition also creates explicit editable placeholders that suffer the first failure.

A simple complete fraction passes the tree-only comparison. That success does not generalize to unfinished notation, empty slots, or all mathematical styling.

Backups therefore use format `math-on-keyboard-experiment`, version `0`, adapter `mathlive-0.111.4`, and retain LaTeX recovery. They are an investigation/review artifact. They must not be presented as the final library-independent, lossless native notebook format. No private atom serialization, general handwritten LaTeX parser, or computation AST was substituted.

## Limits and unverified behavior

- Real IME composition and non-US/AltGr layouts, screen readers, touch, and human lecture-note workflows have not been verified. The input bridge deliberately leaves composition to the library/browser; that is not proof of correct integration.
- Wrapped-line vertical caret affinity, every cross-block pointer selection, discontinuous internal selections, every browser-native undo UI, and native external-app clipboard fidelity are not exhaustively tested.
- Boundary handles apply to one standalone matrix where public cell offsets match the exported rectangular dimensions. Nested matrices remain editable but do not have boundary resizing handles in this spike. Maximum dimension is 8 by 8.
- Unknown format versions, fields, unsupported blocks, duplicate IDs, and oversized input are refused before replacement, rather than migrated or silently dropped. The prototype's admission limits are not a full hostile-input security audit.
- Generic mathematical HTML/MathML paste, arbitrary LaTeX macros, and export conversions are not implemented. Ordinary prose remains prose; unsupported mathematical conversions are disclosed.
- No autosave, crash recovery, permanent storage guarantees, computation, PDF/DOCX export, cloud, or elaborate menus were added. Those are outside the authorized slice.
- Long-document performance is unverified; diagnostics serialize the current small document for inspection. Bundle size and broad accessibility remain later work.
- A MathLive no-op command can attempt to create an `AudioContext` even when sounds are disabled. Boundary Home/End and vertical handoff handling avoid the observed browser-test triggers through public integration behavior. Other no-op/accessibility announcement paths have not been exhaustively audited; no dependency internals were patched.

## Recommendation and next gate

Keep the editing prototype for product-owner trials. Retain whole-equation boundary selection as provisional. Do not adopt the version-0 backup shape as the native format or mark Milestone 0 fully accepted.

The next investigation should resolve public, lossless presentation serialization before expanding into Milestone 1. Prefer an upstream/public serialization facility or a maintained alternative tested against the same corpus. Return for an owner decision before private API dependence, a parser/editor fork, or any compromise to the native fidelity requirement.

Launch and manual test instructions are in [README.md](../../README.md). The approved experiment and implementation choices are recorded in [ADR 0001](../decisions/0001-proposed-editor-feasibility.md) and [ADR 0002](../decisions/0002-experimental-math-bridge.md).
