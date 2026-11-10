# STATUS.md — Implementation State

Status: Milestone 0 research prepared; architecture proposal awaiting approval. No application implemented or verified.

## Working
- None verified.

## In progress
- Editor foundation selection: documentation/source research completed on 2026-11-09; runtime feasibility remains unverified.
- Proposed stack: TypeScript, React, Vite, Tiptap/ProseMirror, and MathLive. This is a candidate for an experiment, not an accepted architecture.

## Partial or blocked
- Milestone 0 is not complete: no scaffold, prototype, dependency installation, or interaction testing has occurred.
- Implementation awaits product-owner approval, as explicitly requested.
- Shared undo/redo, cross-boundary selection, matrix direct manipulation, and library-independent math round-tripping remain feasibility risks.

## Planned next step
- Obtain approval for the limited prototype and proposed selection policy in [ADR 0001](docs/decisions/0001-proposed-editor-feasibility.md).
- If approved, execute the risk-first probes in the [Milestone 0 feasibility report](docs/research/milestone-0-editor-feasibility.md), then review evidence before adopting the architecture.

## Decisions requiring approval
- Tiptap/ProseMirror plus MathLive as the prototype foundation.
- Whole-formula selection at document scope, with fine-grained selection inside math; arbitrary partial formula-to-prose ranges are not covered by that proposal.
- Investigation of an application-owned presentation-tree format; exact production schema remains undecided.

## Changes this session
- Read AGENTS.md, PRODUCT.md, ROADMAP.md, and STATUS.md in full and inspected the repository.
- Added a sourced technology comparison, integration-risk analysis, and minimal proof-of-concept acceptance plan.
- Added a proposed ADR. Product requirements and roadmap milestones are unchanged.

## Verification log
- Research checked current primary documentation and selected public API source on 2026-11-09; API availability is not evidence of successful integration.
- No application builds, type checks, lint checks, automated tests, or browser interaction tests have been run. No package manifest or executable application exists yet.
