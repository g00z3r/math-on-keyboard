# ROADMAP.md — Provisional Implementation Plan

Milestones are hypotheses, not commitments to particular libraries. Validate the editor foundation before investing in broad UI.

## 0. Repository and editor feasibility
- **Central acceptance gate:** progressive prose/math typing with immediate `/` and `^`, branch-aware caret entry, reversible phantom grouping corrections, and fidelity after reopen. The public-API experiment did not pass the complete representation gate; implementation stops there under the approved plan. Decide on [ADR 0004's bounded versioned experiment](docs/decisions/0004-progressive-typing-gate.md) before progressive editor integration. See [contract and evidence](docs/research/progressive-math-typing.md).
- The earlier Space/Enter recognizer and shared-history integration remain the running prototype. Their tests do not establish acceptance of the new progressive requirement.
- Current evidence: the approved limited prototype is implemented, with automated editing checks passing. The independent mathematical presentation-tree hypothesis failed the placeholder/notation fidelity probes; permanent architecture and format adoption remain pending. See [feasibility results](docs/research/milestone-0-results.md). Milestone 0 is not marked complete.
- Initialize TypeScript web application with repeatable dev/build/test commands.
- Compare suitable structured document and math input libraries with a small spike.
- Demonstrate prose → inline fraction → prose, display math, and a 2×2 editable matrix within the same flowing document.
- Verify cursor navigation, selection, undo/redo, and realistic typing behaviour. Stop and seek product-owner approval if the selected foundation cannot support the experience.
- Trial `The answer is 1/2 because...`, compact compound expressions, literal exclusions, Undo/Redo, and explicit navigation inside converted fractions. Preserve the independent native-format fidelity gate; typing feasibility does not resolve it.

## 1. Usable editing foundation
- Stable paragraphs, inline/display math, matrix insertion and cell navigation, basic menus and keyboard access.
- Implement coherent editing commands, tests, and accessible focus behaviour.
- Prefer a plain functional interface over premature polish.

## 2. Durable notebooks
- Versioned native notebook format, IndexedDB persistence, autosave, reopening, export/import of native format, and round-trip tests.
- Provide recovery/error handling and avoid false claims of permanent browser-storage guarantees; downloadable backup matters.

## 3. Useful matrix operations
- Determinant, transpose, row operations, RREF, and contextual previews; editable insertion of results; exact arithmetic when feasible.
- Keep computations decoupled from editor internals and test numerical correctness.

## 4. Interoperability and refinement
- PDF export; evaluate DOCX export with editable math and clearly documented fidelity limitations.
- Refine paste/import, menu discoverability, graph-paper styling, and real lecture-note workflows.

## Milestone acceptance
The product owner can perform a realistic linear-algebra note-taking session without fighting the editor, save and reopen it intact, and export a readable document. Do not mark a milestone complete without testing its actual user workflow.
