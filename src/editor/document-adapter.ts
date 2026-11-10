import type { Node, Schema } from '@tiptap/pm/model';
import type { Block, Inline, MathSnapshot, Notebook } from '../document/model';
import { emptyNotebook } from '../document/model';

export function toNotebook(doc: Node): Notebook {
  const blocks: Block[] = [];
  doc.forEach(node => {
    if (node.type.name === 'paragraph') {
      const content: Inline[] = [];
      node.forEach(child => {
        if (child.isText) content.push({ type: 'text', text: child.text! });
        else if (child.type.name === 'inlineMath') content.push({ type: 'math', id: child.attrs.id, math: child.attrs.math as MathSnapshot });
        else throw new Error(`Unsupported inline content: ${child.type.name}`);
      });
      blocks.push({ type: 'paragraph', content });
    } else if (node.type.name === 'displayMath') blocks.push({ type: 'displayMath', id: node.attrs.id, math: node.attrs.math as MathSnapshot });
    else throw new Error(`Unsupported block: ${node.type.name}`);
  });
  return { ...emptyNotebook(), blocks };
}

export function fromNotebook(book: Notebook, schema: Schema, freshIds = false): Node {
  const mathNode = (name: string, value: { id: string; math: MathSnapshot }) => schema.nodes[name].create({ id: freshIds ? crypto.randomUUID() : value.id, math: value.math });
  return schema.nodes.doc.create(null, book.blocks.map(block => block.type === 'displayMath' ? mathNode('displayMath', block) : schema.nodes.paragraph.create(null, block.content.map(inline => inline.type === 'text' ? (inline.text ? schema.text(inline.text) : null) : mathNode('inlineMath', inline)).filter((node): node is Node => node !== null))));
}
