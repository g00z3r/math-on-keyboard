# ADR 0002: experimental math editing and recovery bridge

Date: 2026-11-09

Status: Implemented within the approved Milestone 0 experiment. Not approval of the permanent editor or native format.

## Context

MathLive 0.111.4 is nested in Tiptap/ProseMirror node views. Its keyboard focus transfer is delayed by approximately 60 ms, and its `input` notification is dispatched on a timer. Independent text/math histories and blur-only synchronization can therefore lose or misorder fast edits.

The public MathML export also fails to encode editable placeholders faithfully: `\placeholder{}` becomes literal `?`, and a two-placeholder fraction exports a single text node `??` in its MathML fraction. Empty branches can contain `&nbsp;`. Standard XML entity handling fixes parsing, but cannot recover lost editing structure.

## Experimental decisions

- ProseMirror holds the document and sole authoritative history. Live fields mirror snapshots into transactions. Pending field values are flushed before undo/redo, leaving math, saving, copying, and resizing. A delayed notification from an inactive field does not replace the current outer selection.
- A custom selection/bookmark records equation identity and MathLive's internal selection. Identity resolves leaf-node replacement mappings during undo/redo. Selection changes caused by a pending physical edit cannot overwrite the pre-edit bookmark.
- Standard DOM focus puts input on the math host immediately. During MathLive's delayed inner focus, physical keys route through supported MathLive commands. Once events originate inside MathLive, its own input handling resumes. Real IME behavior still requires testing.
- Inline/display math are document nodes. Internal math selection remains supported; crossing a prose boundary provisionally promotes the whole equation. Actual paragraphs provide caret destinations around inserted display math.
- Matrix boundary dragging previews row/column counts, then batches supported `addRowAfter`, `addColumnAfter`, `removeRow`, and `removeColumn` commands into one transaction. Cell boundaries come from public `getElementInfo()` offsets, cross-checked against exported MathML dimensions. No private atom access or LaTeX parsing is used. Ambiguous/nested matrix handles are not offered.
- A version-0 experimental file contains application-owned blocks, a MathML-derived presentation projection, exact MathLive LaTeX recovery, and fidelity issues. Restoration validates the pinned adapter's output before replacing the open document. This file deliberately advertises its dependency; it does not satisfy the independent native-format requirement.

## Alternatives and consequences

Keeping two undo stacks or committing only on blur was rejected because chronological history would depend on focus. Saving only a semantic expression tree would risk changing student notation. Accessing private MathLive atoms or building a general LaTeX parser was not undertaken.

The editing bridge passes the recorded automated checks. The presentation-tree hypothesis fails important fixtures; widening the serializer is not sufficient to reconstruct placeholder identity already lost by export. Before adopting a permanent format, investigate a public presentation serialization extension/upstream change or another maintained input system against the same fixtures. A private-API fork, new parser/editor, or relaxed fidelity promise requires a new owner decision.
