import { describe, expect, it } from 'vitest';
import { Schema } from '@tiptap/pm/model';
import { EditorState, TextSelection } from '@tiptap/pm/state';
import { history, redo, undo } from '@tiptap/pm/history';
import type { EditorView } from '@tiptap/pm/view';
import { mathTypingPlugin } from './math-typing';

const schema = new Schema({ nodes: {
  doc: { content: 'paragraph+' }, paragraph: { content: 'inline*', group: 'block' }, text: { group: 'inline' },
  inlineMath: { inline: true, group: 'inline', atom: true, attrs: { id: {}, math: {} } },
} });

function harness(initial = '', reject = false) {
  const plugin = mathTypingPlugin(latex => {
    if (reject) throw new Error('Unrepresentable input');
    return { latex, presentation: null, issue: null };
  }, () => 'test-equation');
  let state = EditorState.create({ schema, doc: schema.node('doc', null, [schema.node('paragraph', null, initial ? schema.text(initial) : undefined)]), plugins: [history(), plugin] });
  state = state.apply(state.tr.setSelection(TextSelection.create(state.doc, initial.length + 1)));
  const view = { get state() { return state; }, composing: false, dispatch(tr) { state = state.apply(tr); } } as EditorView;
  const input = (text: string) => {
    const { from, to } = state.selection;
    if (!plugin.props.handleTextInput!.call(plugin, view, from, to, text, () => state.tr.insertText(text, from, to))) view.dispatch(state.tr.insertText(text, from, to));
  };
  const key = (key: string) => plugin.props.handleKeyDown!.call(plugin, view, { key } as KeyboardEvent);
  return { view, input, key, type(text: string) { for (const char of text) input(char); },
    undo() { undo(state, view.dispatch); }, redo() { redo(state, view.dispatch); },
    get doc() { return state.doc.toJSON(); }, get caret() { return state.selection.toJSON(); },
  };
}

describe('context mathematical input transactions', () => {
  it.each(['Space', 'Enter'])('%s conversion has isolated history and mapped prose caret', boundary => {
    const h = harness();
    h.type('The answer is 1/2');
    if (boundary === 'Space') h.input(' '); else expect(h.key('Enter')).toBe(true);
    const converted = h.doc, caret = h.caret;
    expect(h.view.state.doc.firstChild?.child(1).type.name).toBe('inlineMath');
    expect(h.view.state.selection instanceof TextSelection).toBe(true);
    h.undo();
    expect(h.view.state.doc.firstChild?.textContent).toBe('The answer is 1/2' + (boundary === 'Space' ? ' ' : ''));
    expect(h.view.state.doc.childCount).toBe(boundary === 'Space' ? 1 : 2);
    h.redo(); expect(h.doc).toEqual(converted); expect(h.caret).toEqual(caret);
  });

  it('separates subsequent prose from conversion history', () => {
    const h = harness(); h.type('1/2 ');
    const converted = h.doc;
    h.type('because'); h.undo(); expect(h.doc).toEqual(converted);
    h.undo(); expect(h.view.state.doc.textContent).toBe('1/2 ');
  });

  it('does not re-arm reverted input by deleting/retyping the boundary or punctuation', () => {
    const h = harness(); h.type('1/2 '); h.undo();
    h.view.dispatch(h.view.state.tr.delete(4, 5));
    h.type(', ');
    expect(h.view.state.doc.textContent).toBe('1/2, ');
    expect(h.view.state.doc.firstChild?.childCount).toBe(1);
    h.view.dispatch(h.view.state.tr.setSelection(TextSelection.create(h.view.state.doc, 4)));
    expect(h.key('Backspace')).toBe(true); h.input('3');
    h.view.dispatch(h.view.state.tr.setSelection(TextSelection.create(h.view.state.doc, 5)));
    h.input(' ');
    expect(h.view.state.doc.firstChild?.firstChild?.type.name).toBe('inlineMath');
  });

  it('requires a direct edit to pre-existing or pasted text', () => {
    const h = harness('1/2'); h.input(' ');
    expect(h.view.state.doc.textContent).toBe('1/2 ');
    h.view.dispatch(h.view.state.tr.delete(4, 5));
    h.input('3'); h.input(' ');
    expect(h.view.state.doc.firstChild?.firstChild?.type.name).toBe('inlineMath');
  });

  it('never takes a suffix from a larger token or converts at a mid-token caret', () => {
    const h = harness(); h.type('file/1/2 '); expect(h.view.state.doc.textContent).toBe('file/1/2 ');
    const mid = harness(); mid.type('1/23');
    mid.view.dispatch(mid.view.state.tr.setSelection(TextSelection.create(mid.view.state.doc, 4)));
    mid.input(' '); expect(mid.view.state.doc.textContent).toBe('1/2 3');
  });

  it('keeps unrepresentable input and its boundary', () => {
    const h = harness('', true); h.type('1/2 ');
    expect(h.view.state.doc.textContent).toBe('1/2 ');
    expect(h.key('Enter')).toBe(false);
  });

  it('does not turn selection replacement into eligible direct typing', () => {
    const h = harness(); h.type('1/2');
    h.view.dispatch(h.view.state.tr.setSelection(TextSelection.create(h.view.state.doc, 3, 4)));
    h.input('3'); h.input(' ');
    expect(h.view.state.doc.textContent).toBe('1/3 ');
  });

  it('clears eligibility even when selection replacement or paste leaves identical text', () => {
    const h = harness(); h.type('1/2');
    h.view.dispatch(h.view.state.tr.setSelection(TextSelection.create(h.view.state.doc, 3, 4)));
    h.input('2'); h.input(' ');
    expect(h.view.state.doc.textContent).toBe('1/2 ');
    const pasted = harness(); pasted.type('1/2');
    pasted.view.dispatch(pasted.view.state.tr.insertText('2', 3, 4).setMeta('uiEvent', 'paste'));
    pasted.input(' '); expect(pasted.view.state.doc.textContent).toBe('1/2 ');
  });
});
