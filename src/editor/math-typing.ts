import type { Node } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection, type Transaction } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { splitBlock } from '@tiptap/pm/commands';
import { closeHistory } from '@tiptap/pm/history';
import type { MathSnapshot } from '../document/model';
import { expressionSource, recognizeMath } from '../math/recognize';

interface Token { from: number; to: number; text: string }
interface TypingMeta { editAt?: number; clear?: boolean }
const typingKey = new PluginKey<Token[]>('contextMathTyping');

// Offsets are document positions, never DOM offsets or MathLive offsets.
function tokenAt(doc: Node, pos: number): Token | null {
  const $pos = doc.resolve(pos);
  if (!$pos.parent.isTextblock) return null;
  const offset = $pos.parentOffset;
  const start = Math.max(0, offset - 257), end = Math.min($pos.parent.content.size, offset + 257);
  const text = $pos.parent.textBetween(start, end, '', '\ufffc');
  const local = offset - start;
  const before = /[^\s\ufffc]*$/.exec(text.slice(0, local))![0];
  const after = /^[^\s\ufffc]*/.exec(text.slice(local))![0];
  const raw = before + after;
  if (!raw || raw.length > 256) return null;
  const source = expressionSource(raw);
  const from = $pos.start() + offset - before.length;
  return { from, to: from + source.length, text: source };
}

/** Public ProseMirror hooks only; provenance is session state, never notebook data. */
export function mathTypingPlugin(snapshot: (latex: string) => MathSnapshot, makeId: () => string = () => crypto.randomUUID()) {
  let composition = false;
  let compositionTimer: ReturnType<typeof setTimeout> | undefined;

  function commit(view: EditorView, boundary: ' ' | 'Enter'): boolean {
    if (composition || view.composing || !(view.state.selection instanceof TextSelection) || !view.state.selection.empty) return false;
    const { from, $from } = view.state.selection;
    const token = tokenAt(view.state.doc, from);
    if (!token) return false;
    // The caret must follow the complete token, including trailing punctuation.
    const offset = $from.parentOffset;
    const suffix = $from.parent.textBetween(offset, Math.min(offset + 1, $from.parent.content.size), '', '\ufffc');
    if (suffix && !/^[\s\ufffc]/.test(suffix)) return false;
    const raw = view.state.doc.textBetween(token.from, from, '', '\ufffc');
    const match = recognizeMath(raw);
    if (!match || !(typingKey.getState(view.state) ?? []).some(item => item.from === token.from && item.to === token.to && item.text === token.text)) return false;
    let math: MathSnapshot;
    try { math = snapshot(match.latex); } catch { return false; }

    let boundaryTransaction: Transaction | undefined;
    if (boundary === ' ') boundaryTransaction = view.state.tr.insertText(' ');
    else splitBlock(view.state, tr => { boundaryTransaction = tr; });
    if (!boundaryTransaction) return false;
    const sourceFrom = boundaryTransaction.mapping.map(token.from, 1);
    const sourceTo = boundaryTransaction.mapping.map(token.to, -1);
    view.dispatch(boundaryTransaction);
    const node = view.state.schema.nodes.inlineMath.create({ id: makeId(), math });
    view.dispatch(closeHistory(view.state.tr).replaceWith(sourceFrom, sourceTo, node).scrollIntoView());
    view.dispatch(closeHistory(view.state.tr).setMeta('addToHistory', false));
    return true;
  }

  return new Plugin<Token[]>({
    key: typingKey,
    state: {
      init: () => [],
      apply(tr, previous) {
        const meta = tr.getMeta(typingKey) as TypingMeta | undefined;
        if (meta?.clear || tr.getMeta('uiEvent') === 'paste') return [];
        const tokens = previous.flatMap(token => {
          const from = tr.mapping.mapResult(token.from, 1), to = tr.mapping.mapResult(token.to, -1);
          if (from.deleted || to.deleted || from.pos >= to.pos || tr.doc.textBetween(from.pos, to.pos, '', '\ufffc') !== token.text) return [];
          return [{ ...token, from: from.pos, to: to.pos }];
        });
        if (meta?.editAt !== undefined) {
          const token = tokenAt(tr.doc, meta.editAt);
          if (token && token.text && meta.editAt >= token.from && meta.editAt <= token.to) {
            return [...tokens.filter(item => item.to < token.from || item.from > token.to), token];
          }
        }
        return tokens;
      },
    },
    props: {
      handleTextInput(view, from, to, text, deflt) {
        if (composition || view.composing || !(view.state.selection instanceof TextSelection)) return false;
        if (from !== to || !view.state.selection.empty) {
          view.dispatch(deflt().setMeta(typingKey, { clear: true } satisfies TypingMeta));
          return true;
        }
        if (text === ' ' && commit(view, ' ')) return true;
        if (!text || /\s/.test(text)) return false;
        const tr = deflt();
        // Sentence punctuation does not re-arm a conversion reverted by Undo.
        const editAt = from + text.length;
        const token = tokenAt(tr.doc, editAt);
        if (token && editAt <= token.to) tr.setMeta(typingKey, { editAt } satisfies TypingMeta);
        view.dispatch(tr);
        return true;
      },
      handleKeyDown(view, event) {
        if (event.isComposing || event.key === 'Process' || event.key === 'Dead') return false;
        composition = false;
        if (event.ctrlKey || event.metaKey || event.altKey || event.shiftKey || view.composing) return false;
        if (event.key === 'Enter') return commit(view, 'Enter');
        // Preserve ordinary ASCII deletion while recording a direct expression edit.
        // Other deletion (selections, Unicode, word deletion, math) stays with the editor.
        const sel = view.state.selection;
        if (!(sel instanceof TextSelection) || !sel.empty || !['Backspace', 'Delete'].includes(event.key)) return false;
        const offset = event.key === 'Backspace' ? -1 : 0;
        const at = sel.$from.parentOffset + offset;
        if (at < 0 || at >= sel.$from.parent.content.size) return false;
        const char = sel.$from.parent.textBetween(at, at + 1, '', '\ufffc');
        if (!/^[a-zA-Z0-9.+\-*/^=()]$/.test(char)) return false;
        const start = sel.from + offset;
        if (char === '.' && start >= (tokenAt(view.state.doc, start)?.to ?? start)) return false;
        view.dispatch(view.state.tr.delete(start, start + 1).setMeta(typingKey, { editAt: start } satisfies TypingMeta));
        return true;
      },
      handleDOMEvents: {
        compositionstart(view) {
          composition = true;
          view.dispatch(view.state.tr.setMeta(typingKey, { clear: true } satisfies TypingMeta).setMeta('addToHistory', false));
          return false;
        },
        compositionend() {
          // Ignore a final composition commit as well as the active composition.
          clearTimeout(compositionTimer);
          compositionTimer = setTimeout(() => { composition = false; }, 0);
          return false;
        },
      },
    },
    view: () => ({ destroy() { clearTimeout(compositionTimer); } }),
  });
}
