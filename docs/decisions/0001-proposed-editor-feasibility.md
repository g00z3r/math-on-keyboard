# ADR 0001: proposed editor feasibility prototype

Date: 2026-11-09

Status: Limited feasibility experiment approved by the product owner on 2026-11-09 and implemented. Permanent editor architecture and file format remain unapproved.

## Approval conditions and outcome

The owner accepted whole-equation selection provisionally, clarified that boundary dragging changes matrix row/column counts, and authorized investigation of the presentation tree without approving it as a permanent format. Integrated history, navigation, and persistence were the priorities; computation, broad menus, cloud features, and visual polish were excluded.

The [results report](../research/milestone-0-results.md) records the observed passing editing checks and the failed independent-serialization gate. [ADR 0002](0002-experimental-math-bridge.md) describes the implemented experiment. The approval did not settle the permanent selection policy or authorize weakening lossless native persistence.

## Context

The product requires continuous prose with directly editable mathematical structures, coherent keyboard interaction and history, and a versioned native document independent of rendering libraries. The repository currently contains specifications only. The owner explicitly requested research and approval before implementation.

## Proposal

Evaluate TypeScript, React, Vite, Tiptap's open-source ProseMirror-based editor, and MathLive in one small prototype. Use custom inline/display node views, a single authoritative document history, and an application-owned native document adapter. Keep computation, cloud services, and broad UI work out of this experiment.

At document scope, propose whole-formula selection; inside a formula, preserve structured selection and navigation. Promoting an internal selection across a formula boundary would include the entire formula. This interaction choice requires owner approval and does not satisfy arbitrary partial cross-boundary selection.

Investigate a limited presentation-math tree with explicit empty slots. Do not freeze the native schema or treat LaTeX-only node attributes, a semantic computation tree, or MathLive private internals as proof of independent lossless persistence.

## Alternatives

- Direct ProseMirror offers more explicit setup and removes the Tiptap wrapper; retain it as a candidate if the wrapper obstructs the spike.
- Lexical and Slate support custom embedded content but do not inherently eliminate the nested-editor integration risks.
- MathQuill has useful keyboard boundary hooks; its complete matrix and persistence fit would need separate validation.
- Tiptap's KaTeX math rendering alone does not provide the required direct structural editing.

## Consequences and acceptance

The application must own focus handoff, boundary selection, clipboard serialization, and history coordination. Library documentation makes this plausible, not verified. MathLive's public round-trip interface for a presentation tree is an unresolved risk.

Adoption requires observed passing results for mixed prose/math editing, nested fractions and matrix cells, chronological undo/redo with selection restoration, keyboard/mouse boundary behavior, clipboard fidelity, and native save/reopen of supported unfinished notation. Failures requiring private APIs, a custom parser/editor, or changed product behavior return to the owner for a consequential decision.

Approval authorizes the feasibility experiment, not permanent library selection or a production file format. A later decision must record the prototype's actual results.

## Evidence

The [feasibility report](../research/milestone-0-editor-feasibility.md) contains the primary-source comparison, proposed interaction contract, format risks, and acceptance procedure. No runtime behavior has been verified.
