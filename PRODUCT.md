# PRODUCT.md — Mathematics-First Notebook

## Purpose
Build a mathematics-first word processor for students who currently switch between note-taking apps, equation editors, calculators, and document tools. The application should make writing, editing, and optionally computing mathematics as natural as writing prose.

## Product philosophy
- Word processor first: continuous document flow, not a freeform canvas or a calculator with notes attached.
- Mathematical notation is native, structured, selectable, and editable, whether inline or displayed.
- The best feature is one that makes everyday student note-taking faster, not one that inflates the feature list.
- Optional computation supports learning and writing; it never automatically rewrites or evaluates a student's work.
- Discoverable but unobtrusive UI: conventional File/Edit/Insert/Math menus, contextual cascading right-click menus, and optional explicit command search.
- Non-destructive by default; predictable undo/redo and no silent data loss.

## Core interaction requirements
- Normal prose, inline math, and display math coexist in a flowing document with ordinary reflow.
- Desmos-like mathematical input for fractions, powers, roots, Greek symbols, and matrices; nested cursor navigation is deliberate and predictable.
- A matrix is a native editable grid: each cell supports mathematical expressions; Tab/Shift+Tab and arrows navigate; rows/columns can be resized with direct manipulation, with safeguards against silent loss.
- A contextual matrix menu can offer transpose, determinant, row operations, RREF, inverse, and later eigen-related tools. Computed results appear as previews and can be inserted as editable content.
- Do not require typed comma/semicolon matrix syntax as the primary creation workflow.
- No unsolicited variable definitions or overactive autocomplete. Ordinary `x` must not become Greek chi.
- Paste recognizable LaTeX and other mathematical representations into editable math where feasible; ordinary prose paste remains ordinary.

## Documents and compatibility
- Local-first notebook creation, autosave, reopening, and lossless native import/export.
- Use a structured, versioned canonical document representation; LaTeX is valuable for math interchange but not the sole editor/document model.
- High-quality PDF export and DOCX export with editable equations where supported. Clearly disclose unsupported conversions; do not claim image equations are editable.
- DOCX import and editable PDF reconstruction are not required for the first prototype.
- Browser-based desktop-first release, designed so a future desktop wrapper and touch-oriented UI remain feasible.

## Initial success criterion
The product owner chooses to take actual mathematics notes in this app instead of Goodnotes. An early demonstration should let a student type prose, insert/edit fractions and matrices, navigate between structures, save and reopen without loss, and export readable mathematics.

## Explicit non-goals for the first prototype
Cloud accounts/sync, collaboration, advanced CAS, 3D visualizations, elaborate notebook templates, full editable PDF import, and a mobile-first interface.
