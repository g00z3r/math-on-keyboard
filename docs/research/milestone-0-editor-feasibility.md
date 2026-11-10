# Milestone 0: editor architecture and feasibility

Date: 2026-11-09. Status: research and proposal only; no application or prototype implemented.

AGENTS.md, PRODUCT.md, ROADMAP.md, and STATUS.md were read in full. The repository contains specifications and a README, with no application, package manifest, or test harness. The owner's instruction to present tradeoffs before implementation takes precedence over immediately scaffolding the application in roadmap milestone 0.

## Recommendation

Approve a small, disposable feasibility prototype using TypeScript, React, Vite, Tiptap's open-source core over ProseMirror, and MathLive. Keep React responsible for the application shell; give the editor adapters ownership of editable DOM and selection. Use custom inline-math and display-math node views. Bundle dependencies and math fonts locally; require no account, remote conversion service, or computation engine.

This is a recommendation to investigate a foundation, not a claim that its integration already meets the product contract. Permanent adoption depends on passing the interaction and document-fidelity gates below.

## Technology comparison

| Candidate | Evidence and strengths | Tradeoff and judgment |
| --- | --- | --- |
| Tiptap over ProseMirror | Schema, transactions, commands, and extension organization; direct access to ProseMirror through `@tiptap/pm`. | Recommended starting point. Its convenience layer does not solve nested math editing. Keep the extensions small and use underlying ProseMirror APIs for history and selection. |
| Direct ProseMirror | Explicit control of document state, node views, selection, and transactions; an official embedded-editor example. | Strong alternative with less wrapper code but more application setup. Prefer it if the prototype shows Tiptap obstructs the integration; that switch still requires an architecture decision. |
| Lexical | Custom nodes and decorators support embedding interactive views. | Credible alternative, but an embedded MathLive field still needs focus, history, and selection coordination. No evidence from this investigation that switching solves the difficult boundary. |
| Slate | Flexible React-oriented document model; inline and void elements can host custom content. | Also viable, but its void-element selection conventions do not supply a shared mathematical selection model. No demonstrated advantage for this particular risk. |

These judgments are engineering inferences from the documented extension mechanisms, not benchmark results. Sources: [Tiptap concepts](https://tiptap.dev/docs/editor/core-concepts/introduction), [Tiptap ProseMirror access](https://tiptap.dev/docs/editor/core-concepts/prosemirror), [ProseMirror guide](https://prosemirror.net/docs/guide/), [Lexical decorators](https://lexicaljs.com/docs/concepts/decorators), and [Slate elements](https://docs.slatejs.org/api/nodes/element).

| Mathematical input candidate | Evaluation |
| --- | --- |
| MathLive | Preferred for the spike. Its public surface includes structured math editing, selection access, boundary events, and matrix row/column commands. These are useful integration hooks, not proof of a seamless document editor. |
| MathQuill | Serious alternative for keyboard entry. Its API exposes LaTeX read/write and explicit movement, deletion, and selection boundary handlers. The reviewed public docs do not establish the complete matrix-resizing and independent-persistence workflow needed here; evaluate those before choosing it. Do not assume a particular Desmos experience is supplied by every MathQuill distribution. |
| Tiptap Mathematics / KaTeX | The built-in extension renders LaTeX and exposes editing callbacks. That alone does not provide direct numerator, denominator, and matrix-cell editing. Do not use it as the native math-input foundation. |
| Presentation MathML | Useful standard vocabulary for notation structure and interchange. It is not a turnkey interactive math editor. |

Sources: [MathLive public commands](https://raw.githubusercontent.com/arnog/mathlive/master/src/public/commands.ts), [MathQuill API](https://docs.mathquill.com/en/latest/Api_Methods/), [MathQuill boundary handlers](https://docs.mathquill.com/en/latest/Config/), [Tiptap Mathematics](https://tiptap.dev/docs/editor/extensions/nodes/mathematics), and [MathML presentation markup](https://www.w3.org/TR/MathML/chapter3-d.html).

Tiptap's open-source editor and MathLive use MIT licensing; MathQuill identifies its license as MPL-2.0. Paid Tiptap services are separate from the proposed core. Record exact package versions and licenses when installing the approved spike; research against moving documentation is not a reproducible dependency specification. Sources: [Tiptap overview](https://tiptap.dev/docs/editor/getting-started/overview), [MathLive package metadata](https://raw.githubusercontent.com/arnog/mathlive/master/package.json), and [MathQuill license](https://github.com/mathquill/mathquill/blob/master/LICENSE).

## One flowing document, two editing systems

Propose a paragraph with ordinary text runs and inline-math nodes, plus display-math blocks between paragraphs. A fraction is a structure inside a math node. A matrix is a structure inside one MathLive field, including expressions and fractions in its cells; it is not a separate rich-text editor for every cell.

Both math node types participate in document flow. Inline math changes line height and can wrap as a whole to the next line; display math pushes following paragraphs down. Keep a caret position available on both sides, including adjacent equations and document edges. Do not add persistent spacer characters to simulate those positions. Wide formulas need visible overflow handling; breaking a single formula internally across lines is a separate typesetting problem and is not promised by this spike.

Configure suggestion popovers off and audit automatic shortcuts and notation rewrites. Test that ordinary `x` stays `x`, Greek symbols require deliberate entry, and merely typing or reopening content never evaluates it or creates variable bindings. The proposed integration must preserve notation even when library defaults prefer a normalized form. MathLive exposes configurable shortcut definitions and popover policy, but the desired typing behavior still needs real-input tests. Source: [MathLive public options](https://raw.githubusercontent.com/arnog/mathlive/master/src/public/options.ts).

The proposed node view owns its MathLive subtree, explicitly controls which events reach ProseMirror, and survives normal document updates without remounting the field. Forward math changes to document transactions as they occur, with composition-aware grouping; do not wait for blur. Guard programmatic updates against echo events and stale node positions. MathLive offsets and ProseMirror positions are different coordinate systems.

ProseMirror's [embedded CodeMirror example](https://prosemirror.net/examples/codemirror/) demonstrates forwarding edits and routing undo to an outer editor. It is a useful pattern, not a drop-in solution: its text offsets map much more directly than fraction branches and matrix cells do.

### Proposed interaction contract, requiring approval

| Interaction | Prototype target |
| --- | --- |
| Insert math | Explicit inline/display/matrix commands with keyboard access. Matrix insertion creates a 2 by 2 grid without typed separators. Avoid implicit prose-to-math conversion. |
| Horizontal arrows | Enter a neighboring formula at its near edge; traverse its internal structure; leave at its outer edge into adjacent prose. Never require a mouse to escape. |
| Vertical arrows | Navigate numerator/denominator and matrix rows where an internal destination exists. At an outer edge, return to a sensible document line, testing horizontal caret affinity. |
| Tab / Shift+Tab | Within a matrix, move between cells in row order; reverse symmetrically. At its first/last cell, leave predictably. Outside math, preserve conventional focus navigation. Nested structures must not steal matrix-cell Tab unexpectedly. |
| Mouse and focus | Click within math to place its caret. Preserve the editing location while using insertion controls, then restore focus. Drag across prose and equations without trapping the pointer selection in a field. |
| Selection | Fine-grained selection inside one formula. At document scope, equations are whole selectable units. Extending a selection out of a formula promotes it to include that whole formula and adjacent prose. |
| Deletion | A boundary Backspace/Delete selects a nonempty adjacent equation before deleting it; deletion of an explicit selection is one undoable action. Test empty fields separately. |
| Undo / redo | One chronological document history, including text, formula edits, matrix dimensions, paste, and deletion. Restore the relevant math caret/selection as well as its value. |

**Selection limitation:** a range from part of a numerator into part of a prose word is not represented by ordinary atomic math nodes. The whole-formula promotion policy is a proposed product choice, not an already satisfied requirement. If arbitrary partial cross-boundary selection is essential, do not approve this atomic-node architecture without a separate feasibility investigation. It could require a much deeper shared selection/document model.

### History integration is a release gate

Propose ProseMirror as the sole authoritative undo history. Route keyboard, menu, and applicable browser undo/redo input through the same commands; preventing only Ctrl+Z is insufficient. Mirror math edits immediately, group normal typing sensibly, and make insertion, paste, and matrix resizing explicit history boundaries. A math edit followed by prose must undo in reverse chronological order regardless of current focus.

Store math selection bookmarks with history integration, keyed to stable node identity and the corresponding content revision. An offset alone is not durable across formula changes. Prototype a ProseMirror selection/bookmark adapter, including deletion and restoration of its host node; arbitrary transaction metadata is not automatically restored by the history plugin. Avoid persisting session caret state as mathematical content.

MathLive exposes input/selection events and undo-stack methods, but those APIs do not establish shared history. Verify that all local undo entry points can be redirected or reset safely through public APIs. If reliable integration requires a long-lived private-API fork or a second independent history, stop and present alternatives. Source: [MathLive element API implementation](https://raw.githubusercontent.com/arnog/mathlive/master/src/public/mathfield-element.ts).

### Clipboard

Propose an application-native, versioned clipboard fragment for same-app fidelity, accompanied by sanitized HTML and readable plain text/LaTeX fallbacks. Test whether the selected browsers preserve the custom representation; do not depend on custom MIME support alone. Never use the live MathLive shadow DOM as the serialized document.

Within a formula, copy/cut the selected mathematical structure. At document scope, copy mixed prose and whole math nodes. Cut must remove exactly what was successfully copied, as one history action. Paste native fragments structurally; allow supported LaTeX inside a math field or through an explicit Paste Math command. Ordinary prose paste stays prose, including currency and incidental dollar signs. Reject or preserve unsupported mathematical input visibly; never silently drop its commands or partially replace the selection. Treat all pasted/imported payloads as untrusted, with size/depth limits and validation.

## Independent native format: the other critical gate

Recommend an application-owned JSON envelope with a format identifier, schema version, ordered document blocks, text marks, and inline/display math nodes. Tiptap JSON is an adapter representation, not the public file-format contract. Keep one authoritative editing state and explicit import/export adapters, rather than two competing mutable document stores.

For math, propose a presentation tree based on a limited MathML vocabulary: token, row, fraction, scripts, root, fences, matrix rows/cells, and explicit empty slots. Preserve notation such as literal digits, parentheses, styles, incomplete expressions, and matrix dimensions. It must represent what the student wrote, without requiring a mathematically valid or evaluable expression. This vocabulary can be represented as typed JSON; the exact schema remains provisional.

Do not substitute a computation AST for the student's notation. Canonicalization can reorder operands or remove grouping. Even a noncanonical semantic tree does not prove preservation of every presentation detail or empty slot. Sources: [Compute Engine canonical forms](https://mathlive.io/compute-engine/reference/core/) and [MathML presentation structures](https://www.w3.org/TR/MathML/chapter3-d.html).

There is a real integration gap: MathLive's reviewed public output types include LaTeX and MathML, but not a documented stable round-trip serialization of its entire editable atom tree. The 0.111.0 changelog removes `getValue('math-json')` and the `expression` property; old examples must not be used as the persistence design. Sources: [MathLive output types](https://raw.githubusercontent.com/arnog/mathlive/master/src/public/core-types.ts) and [MathLive changelog](https://mathlive.io/mathlive/changelog/).

The smallest candidate adapter to investigate is public MathML export, parsed as inert XML using browser facilities, mapped to the limited presentation tree, then serialized into supported MathLive input on restoration. Test placeholders and incomplete structures first. This is a proposed experiment, not a verified lossless pipeline. It must not grow into a general handwritten LaTeX parser. Publicly supported input/output and small typed structural mappings are preferred; any need for a new parser, private atom serialization, or maintained fork triggers another architecture decision.

During the experiment, retain exact imported source and adapter/version metadata as recovery material. That source is not a second independently editable authority. If supported structure cannot be extracted, preserve the content visibly as unsupported and do not claim it passed the editable round-trip gate. Storing only a LaTeX string inside a JSON envelope would not demonstrate the stronger library-independent math requirement.

For the eventual native contract, lossless means preservation of all supported content, presentation structure, and intentional empty slots; it need not mean identical JSON whitespace or persistence of undo history. Test this definition explicitly. Unknown schema versions must be rejected without overwriting the original; unknown extension content must be preserved or opening refused safely. Migrations must be explicit and tested. Keep unsupported source intact rather than rendering it and saving the normalized result over it.

## Serious risks and decisions

| Priority | Risk | Evidence required to proceed |
| --- | --- | --- |
| Critical | Divergent text/math histories or lost content on focus changes | Interleaved edits undo/redo in order; formula caret restoration; no duplicate or missing transactions. |
| Critical | Normalization loses student notation or unfinished structures | Native encode/decode plus editor rehydration preserve a fixture corpus, including empty cells and fractions. |
| High | Atomic math conflicts with expected selection | Owner accepts the stated selection policy; keyboard and pointer range tests pass. |
| High | Matrix navigation and direct resizing need inaccessible internals | Public-API cell movement and a small dimension-control experiment; shrinking nonempty content requires explicit confirmation and is undoable. |
| High | Shadow DOM, composition, and browser differences disrupt typing | Real keyboard/mouse checks, IME composition checks, and browser regression tests. |
| Medium | Many fields create focus/performance problems | Exercise a repeated-content fixture before investing in UI; avoid premature virtualization that breaks selection. |

MathLive supplies row/column operations, not evidence of the exact direct-manipulation UI in PRODUCT.md. For the spike, interpret resizing as changing row/column counts; test a minimal adjacent control and a pointer-driven dimension change. Physical column-width/row-height dragging, if intended, is a separate unresolved requirement. Do not silently replace the product's eventual direct-manipulation requirement with command-only resizing.

The specifications are achievable goals, but a claim that off-the-shelf components automatically provide seamless selection, unified history, and arbitrary lossless notation would be unrealistic. Full arbitrary LaTeX fidelity is also outside a small spike; define a supported notation subset and preserve unsupported input explicitly.

The roadmap's final acceptance paragraph includes saving and export, which are scheduled later. Interpret it as cumulative product acceptance. Milestone 0 should demonstrate basic round-trip feasibility without absorbing autosave/recovery or production PDF/DOCX work. The roadmap itself remains unchanged pending approval.

## Smallest useful proof of concept

One page, one flowing document, three insertion commands, undo/redo controls, and experimental JSON download/reopen. No calculation engine, notebook library, formatting toolbar suite, autosave service, pagination, or production export pipeline.

Run the highest-risk probes first rather than building an attractive demo around unproven assumptions:

1. **Fidelity probe:** an editable fraction with an empty denominator, a nested fraction, a power/root, and a 2 by 2 matrix containing an empty cell and a fraction. Test the proposed public-API structural adapter and reload. Stop if this needs private APIs or cannot preserve supported notation.
2. **One editing slice:** type `Let`, insert an inline fraction, continue prose, add a display equation and a 2 by 2 matrix, then another paragraph. Reflow the viewport and edit cell contents using actual keyboard and mouse events. Verify literal `x`, deliberate Greek entry, and absence of unsolicited suggestions or evaluation.
3. **Boundary and history probe:** enter/exit from both sides; test document start/end, adjacent formulas, Shift+arrows, pointer drag, select-all, boundary deletion, composition, and prose/math/prose undo followed by redo. Include deletion/restoration of an entire equation and redo invalidation after a new edit.
4. **Matrix and clipboard probe:** navigate every cell both ways, grow and shrink dimensions with safeguards, copy/cut/paste mixed content, and paste supported and malformed LaTeX. Undo all these operations.
5. **Reopen and owner trial:** download experimental native JSON, reload the page, reopen, and edit every structure. Compare model content and visible notation. The owner performs a short linear-algebra note-taking exercise before adoption is recommended.

After approval, add reproducible `dev`, `build`, `test`, `typecheck`, and `lint` commands and a lockfile. Use Vitest for adapter/serialization and transaction tests, and Playwright for real browser interactions. Begin manual checks in Windows Edge/Chrome; run automated Chromium, Firefox, and WebKit checks where available, recording unavailable environments. WebKit automation is not a substitute for later real Safari testing. Include a keyboard-only/accessibility smoke check and an IME check; do not claim comprehensive accessibility from them.

Each probe needs a recorded pass/fail result and regression coverage for its critical behavior. All critical gates must pass, or their product consequences must be explicitly approved. If a gate fails, report the reproducer and alternatives before changing libraries, weakening fidelity, or introducing a custom editor/parser. A rendering-only demo does not complete milestone 0.

## Approval requested

Approve this limited prototype with Tiptap/ProseMirror and MathLive, the proposed whole-formula selection behavior at document boundaries, and investigation of the independent presentation-tree format. This does not freeze a production schema or establish that the libraries meet the contract. Permanent adoption needs a second review of observed feasibility results.

No application code, packages, builds, or browser interaction tests were produced during this research phase.
