import { NodeSelection, Selection, type SelectionBookmark } from '@tiptap/pm/state';
import type { Node, ResolvedPos } from '@tiptap/pm/model';
import type { Mappable } from '@tiptap/pm/transform';

export interface MathRange { ranges: [number, number][]; direction?: 'forward' | 'backward' | 'none' }
export const copyRange = (value: MathRange): MathRange => ({ ranges: value.ranges.map(([a, b]) => [a, b]), direction: value.direction });

// A whole equation in the outer document, with an internal selection bookmark for history.
export class MathSelection extends NodeSelection {
  readonly id: string;
  readonly inner: MathRange;
  constructor(pos: ResolvedPos, id: string, inner: MathRange) {
    super(pos);
    this.id = id;
    this.inner = copyRange(inner);
    this.visible = false;
  }
  eq(other: Selection): boolean {
    return other instanceof MathSelection && other.from === this.from && other.id === this.id && JSON.stringify(other.inner) === JSON.stringify(this.inner);
  }
  map(doc: Node, mapping: Mappable): Selection { return this.getBookmark().map(mapping).resolve(doc); }
  getBookmark() { return new MathBookmark(this.from, this.id, this.inner); }
  toJSON() { return { type: 'math-inner', anchor: this.from, id: this.id, inner: this.inner }; }
  static fromJSON(doc: Node, value: { anchor: number; id: string; inner: MathRange }) {
    return new MathSelection(doc.resolve(value.anchor), value.id, value.inner);
  }
}
class MathBookmark implements SelectionBookmark {
  constructor(readonly anchor: number, readonly id: string, readonly inner: MathRange) {}
  map(mapping: Mappable) { return new MathBookmark(mapping.map(this.anchor, 1), this.id, this.inner); }
  resolve(doc: Node): Selection {
    let pos = Math.min(this.anchor, doc.content.size);
    if (doc.nodeAt(pos)?.attrs.id !== this.id) {
      // Attribute replacements of leaf nodes map their old start to their end.
      // Stable identity also handles replacement/deletion restoration in history.
      doc.descendants((node, candidate) => { if (node.attrs.id === this.id) pos = candidate; });
    }
    const resolved = doc.resolve(pos);
    return resolved.nodeAfter?.attrs.id === this.id ? new MathSelection(resolved, this.id, this.inner) : Selection.near(resolved);
  }
}
Selection.jsonID('math-inner', MathSelection);
