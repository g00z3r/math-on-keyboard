# AGENTS.md — Development Instructions

## Role and authority
You are the implementation agent for a mathematics-first word processor/notebook. Read PRODUCT.md, ROADMAP.md, and STATUS.md (if present) before starting substantial work. Treat PRODUCT.md as the durable product contract and ROADMAP.md as the current sequence of work. The human product owner has final authority over product direction.

## Balanced autonomy
- Independently implement agreed features, routine refactors, tests, and low-risk technical decisions.
- Request approval **before** major architecture changes; changing the editor framework or canonical document format; adding a mandatory server, account, or cloud dependency; changing established editing behaviour; removing supported features; destructive migrations; or substantially expanding scope.
- If a request conflicts with product principles or appears technically unsound, explain the conflict, offer alternatives and a recommendation, and await direction when the decision is consequential.
- Do not block progress on minor details. Make a reasonable reversible choice, document it, and continue.
- Never claim to have tested or completed work that was not actually verified.

## Product invariants
- This is a **word processor first**, with native structured mathematics. It is not a calculator UI, freeform whiteboard, or collection of floating textboxes.
- Content follows normal document flow. Inline and display mathematics coexist with prose; insertion reflows surrounding content.
- Fractions, exponents, matrices, and other math are editable structures, not static images.
- Keyboard-first mathematical entry should be predictable and navigable. Avoid intrusive suggestions and implicit variable bindings.
- Math operations are optional and non-destructive by default; computed results can be inserted as editable document content.
- Local-first, no mandatory account or server. Desktop-oriented initial experience, without needlessly coupling the core to desktop-only input.
- The canonical native notebook format must be versioned and support lossless round-tripping. PDF/DOCX/LaTeX are interoperability formats, not the internal source of truth.

## Architecture
- Prefer TypeScript/TSX, CSS, React + Vite as an initial candidate; validate the structured text/math editor foundation through a focused prototype before committing deeply.
- Reuse maintained editor, math-input, and calculation libraries. Do not build a new rich-text engine, LaTeX parser, or computer algebra system without a compelling reason and approval.
- Keep document model, editing commands, math computation, persistence/import/export, and UI presentation separated by clear interfaces. No duplicated calculation logic in UI components.
- Preserve coherent cursor/selection, undo/redo, and keyboard interaction across all editable structures.
- Avoid speculative abstractions and premature backend services. Prefer small cohesive modules and explicit types.

## Delivery process
1. Inspect the repository and existing implementation before modifying files.
2. State a short implementation plan for nontrivial work. Proceed without approval when within agreed scope.
3. Implement one testable vertical slice at a time. Prioritize editing quality over breadth of mathematical operations or visual polish.
4. Run relevant tests, type checks, lint checks, and production builds. Report actual results and limitations.
5. Update STATUS.md with what works, what is partial, what is blocked, and what changed. Update ROADMAP.md when milestones genuinely change.
6. Record significant technical decisions and alternatives in docs/decisions/ (brief ADRs). Ask for approval before consequential changes.
7. Provide a concise handoff: files changed, user-visible behaviour, verification, known issues, and recommended next step.

## Definition of done
A feature is not done merely because it renders. Verify, where applicable: keyboard and mouse behaviour; selection and cursor navigation; undo/redo; adjacent prose/math reflow; save/reopen fidelity; invalid input handling; and automated regression coverage. Mark unverified or partial functionality honestly.

## Repository hygiene and safety
- Keep README setup instructions accurate and maintain reproducible dependency installation with a lockfile.
- Maintain working equivalents of `npm run dev`, `npm run build`, `npm run test`, and preferably `npm run typecheck` and `npm run lint`.
- Do not commit secrets, credentials, `.env` values, generated build outputs, or dependency directories.
- Make meaningful, reviewable changes and commits. Do not force-push, delete user work, rewrite history, or perform destructive operations without explicit approval.
- Avoid dependency sprawl and unreviewed upgrades. Treat imported notebook content as untrusted input.
- Never silently discard unsupported mathematical content during import/export; communicate fidelity limits.

## Priorities when tradeoffs arise
1. Reliability and preservation of student work.
2. Fast, intuitive editing of prose and mathematics.
3. Consistent interaction and maintainable architecture.
4. Compatibility and export quality.
5. Computation breadth, cosmetic polish, and speculative features.
