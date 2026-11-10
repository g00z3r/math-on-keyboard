# ADR 0003: context-sensitive mathematical typing

Date: 2026-11-10

Status: Implemented under the owner's approved typing plan. Owner workflow acceptance and permanent architecture adoption remain pending.

Subsequent decision: progressive immediate-entry requirements supersede the delayed-conversion product policy. The existing implementation is retained while [ADR 0004's structural gate](0004-progressive-typing-gate.md) is unresolved. This ADR records the earlier experiment rather than the current intended experience.

## Context

Requiring explicit Insert Math for each expression conflicts with continuous student note-taking. The owner approved recognition on Space/Enter, including compact compound algebra, with conservative ambiguity handling and explicit structural navigation. The existing independent lossless serialization failure remains a separate gate.

## Decision

- Keep Tiptap/ProseMirror document nodes, MathLive node views, existing snapshots, and the single ProseMirror history. Add no format fields or dependencies.
- Separate a pure, bounded input grammar from editor transactions and MathLive parsing. Admit only complete supported compact expressions; emit explicit LaTeX commands into the maintained MathLive parser. Never use evaluation or semantic canonicalization.
- Do not use MathLive's ASCII converter as the intent detector. Read-only probes found that it leaves `x/2` unstacked and partially converts `1/2/2026`.
- Insert the typed Space or paragraph break normally, then convert in an isolated history transaction. Map the prose selection through the replacement without entering or focusing the math field. Validate snapshot recovery before replacing text; failure leaves literal input intact.
- Store directly edited token ranges in transient ProseMirror plugin state. Conversion invalidates the range, so Undo restores literal content without eligibility. Direct expression edits re-enable it; boundary or sentence-punctuation edits do not. Paste, selection replacement, and composition clear eligibility, including replacement with identical text. Opening a document creates fresh plugin state.
- MathLive's default Space moves after the current parent structure. Configure public `mathModeSpace` to `\,` and `smartMode` to false: Space inserts a thin mathematical space within the branch; structural exits remain explicit. This applies to automatically converted and explicitly inserted math.
- Keep existing cross-boundary selection and history bookmarks. Recognition operates only in prose with a collapsed text selection and never scans math nodes or imports for opportunities to convert.

## Alternatives and consequences

Immediate slash conversion was rejected by the owner in favor of complete-token recognition. Spaced expressions, multi-letter identifiers, and ambiguous ungrouped divisions/powers remain literal in this slice. A bare numeric pair and single-letter slash expression can still be ambiguous; immediate Undo is the correction path. There is no claim of perfect intent inference.

The bounded grammar is an input recognizer, not a general LaTeX parser, new rich-text engine, or CAS. The backup format remains explicitly experimental. Passing typing tests does not establish independent lossless serialization or owner acceptance.

Behavior, verification, and the remaining trial gates are recorded in [the typing research report](../research/context-math-typing.md).
