# ROADMAP.md — Provisional Implementation Plan

Milestones are hypotheses, not commitments to particular libraries. Validate the editor foundation before investing in broad UI.

## 0. Repository and editor feasibility
- Initialize TypeScript web application with repeatable dev/build/test commands.
- Compare suitable structured document and math input libraries with a small spike.
- Demonstrate prose → inline fraction → prose, display math, and a 2×2 editable matrix within the same flowing document.
- Verify cursor navigation, selection, undo/redo, and realistic typing behaviour. Stop and seek product-owner approval if the selected foundation cannot support the experience.

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
