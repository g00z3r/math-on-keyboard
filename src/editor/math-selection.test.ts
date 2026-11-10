import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { EditorState, Selection, TextSelection } from '@tiptap/pm/state';
import { closeHistory, history, redo, undo } from '@tiptap/pm/history';
import { MathSelection } from './math-selection';

const schema = new Schema({ nodes: {
  doc: { content: 'paragraph+' }, paragraph: { content: 'inline*' },
  text: { group: 'inline' }, math: { inline: true, group: 'inline', atom: true, attrs: { id: {}, value: {} } },
} });
function initial() {
  const doc = schema.node('doc', null, [schema.node('paragraph', null, [schema.text('a'), schema.node('math', { id: 'm', value: 'x' }), schema.text('b')])]);
  return EditorState.create({ doc, plugins: [history()], selection: new MathSelection(doc.resolve(2), 'm', { ranges: [[1, 2]], direction: 'backward' }) });
}
describe('internal math selection bookmarks', () => {
  it('restores caret and content together when a leaf attribute replacement is undone', () => {
    let state = initial();
    const tr = state.tr.setNodeMarkup(2, undefined, { id: 'm', value: 'xy' });
    tr.setSelection(new MathSelection(tr.doc.resolve(2), 'm', { ranges: [[3, 3]] }));
    state = state.apply(tr);
    expect(undo(state, transaction => { state = state.apply(transaction); })).toBe(true);
    expect(state.doc.nodeAt(2)?.attrs.value).toBe('x');
    expect(state.selection).toBeInstanceOf(MathSelection);
    expect((state.selection as MathSelection).inner).toEqual({ ranges: [[1, 2]], direction: 'backward' });
    expect(redo(state, transaction => { state = state.apply(transaction); })).toBe(true);
    expect((state.selection as MathSelection).inner.ranges).toEqual([[3, 3]]);
  });
  it('resolves by identity when text inserted before math moves its position', () => {
    const state = initial();
    const tr = state.tr.insertText('before', 1);
    const mapped = state.selection.map(tr.doc, tr.mapping);
    expect(mapped.from).toBe(8);
    expect(mapped).toBeInstanceOf(MathSelection);
  });
  it('survives deleting and undoing an equation without selecting unrelated content', () => {
    let state = initial();
    state = state.apply(closeHistory(state.tr.deleteSelection()));
    expect(state.selection).not.toBeInstanceOf(MathSelection);
    undo(state, tr => { state = state.apply(tr); });
    expect(state.selection).toBeInstanceOf(MathSelection);
    expect(state.doc.nodeAt(state.selection.from)?.attrs.id).toBe('m');
  });
  it('serializes the custom selection and falls back safely when its equation is gone', () => {
    const state = initial();
    expect(Selection.fromJSON(state.doc, state.selection.toJSON()).eq(state.selection)).toBe(true);
    const tr = state.tr.delete(2, 3);
    expect(state.selection.getBookmark().map(tr.mapping).resolve(tr.doc)).toBeInstanceOf(TextSelection);
  });
});
