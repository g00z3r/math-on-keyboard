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
- **Progressive prose/math typing is a central foundation requirement.** In mathematical context, `/` immediately creates an editable fraction and enters its denominator; `^` creates a power and enters its exponent. Favor helpful guesses with immediate, content-preserving Undo over excessively conservative recognition. Ordinary words and URLs remain prose. See [the approved progressive contract and feasibility gate](docs/research/progressive-math-typing.md). The current application's delayed conversion is an earlier prototype, not acceptance of this requirement.
- Show phantom cues for actual numerator/base scope during editing. Alt+Up/Down changes the structured grouping, preserving denominator/exponent content and caret. Meaning and necessary visible notation must survive editing and reopen; cues are not literal document characters. Explicitly typed fences must remain intact.
- Once inside math, structural navigation is explicit: slash stays in the current branch, Right at a branch end exits one structure, and Space inside a branch inserts math spacing. At the outer end of inline math, Space returns to prose. The progressive behavior is gated on structural feasibility; the current prototype retains its earlier exits.
- Desmos-like mathematical input for fractions, powers, roots, Greek symbols, and matrices; nested cursor navigation is deliberate and predictable.
- A matrix is a native editable grid: each cell supports mathematical expressions; Tab/Shift+Tab and arrows navigate; the number of rows and columns can be changed by directly manipulating the matrix boundary, with safeguards against silent loss. Resizing refers to row/column counts, not visual cell widths or heights.
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
The product owner chooses to take actual mathematics notes in this app instead of Goodnotes. An early demonstration must let a student continuously type prose and native mathematical expressions without repeated insertion actions, edit fractions and matrices, navigate between structures, save and reopen without loss, and export readable mathematics.

## Explicit non-goals for the first prototype
Cloud accounts/sync, collaboration, advanced CAS, 3D visualizations, elaborate notebook templates, full editable PDF import, and a mobile-first interface.
