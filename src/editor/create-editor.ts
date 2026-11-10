import { Editor, Extension, Node } from '@tiptap/core';
import { Fragment, Slice, type Node as PMNode } from '@tiptap/pm/model';
import { AllSelection, EditorState, NodeSelection, Plugin, Selection, TextSelection } from '@tiptap/pm/state';
import { baseKeymap } from '@tiptap/pm/commands';
import { keymap } from '@tiptap/pm/keymap';
import { closeHistory, history, redo, undo } from '@tiptap/pm/history';
import { emptyNotebook, parseNotebook, type MathSnapshot, type Notebook } from '../document/model';
import { captureMath, validateRecovery, withProbe } from '../math/adapter';
import { MathSelection } from './math-selection';
import { fromNotebook, toNotebook } from './document-adapter';
import { MathNodeView, type MathBridge } from './math-node-view';
import { mathTypingPlugin } from './math-typing';

const clipboardType = 'application/x-math-on-keyboard';
const Document = Node.create({ name: 'doc', topNode: true, content: 'block+' });
const Paragraph = Node.create({ name: 'paragraph', group: 'block', content: 'inline*', parseHTML: () => [{ tag: 'p' }], renderHTML: () => ['p', 0] });
const Text = Node.create({ name: 'text', group: 'inline' });

export function createEditor(element: HTMLElement, report: (message: string) => void, changed: (dirty?: boolean) => void) {
  const bridge: MathBridge = { fields: new Map(), report, history: (isRedo: boolean) => {
    // MathLive dispatches input on a timer. Flush before history so a fast Undo
    // cannot act on the preceding prose edit while the latest math edit is pending.
    for (const field of bridge.fields.values()) field.flush();
    const { state, view } = editor;
    (isRedo ? redo : undo)(state, view.dispatch);
  } };
  const math = (inline: boolean) => Node.create({
    name: inline ? 'inlineMath' : 'displayMath', group: inline ? 'inline' : 'block', inline, atom: true, selectable: true,
    addAttributes: () => ({ id: { default: null }, math: { default: null } }),
    // External HTML cannot create unchecked equations; native clipboard is handled below.
    renderHTML: ({ node }) => [inline ? 'span' : 'div', { 'data-equation': 'true' }, `$${(node.attrs.math as MathSnapshot).latex}$`],
    addNodeView: () => ({ node, view, getPos }) => new MathNodeView(node, view, getPos, bridge),
  });

  function copy(event: ClipboardEvent, cut: boolean): boolean {
    for (const field of bridge.fields.values()) field.flush();
    if (editor.state.selection instanceof MathSelection || editor.state.selection.empty || !event.clipboardData) return false;
    const slice = editor.state.selection.content();
    const nodes: PMNode[] = [];
    slice.content.forEach(node => nodes.push(node));
    const blocks = nodes[0]?.isInline ? [editor.schema.nodes.paragraph.create(null, nodes)] : nodes;
    const notebook = toNotebook(editor.schema.nodes.doc.create(null, blocks));
    const wrappedInline = nodes[0]?.isInline;
    const payload = JSON.stringify({ notebook, openStart: wrappedInline ? 1 : slice.openStart, openEnd: wrappedInline ? 1 : slice.openEnd });
    const text = notebook.blocks.map(block => block.type === 'displayMath' ? `$$${block.math.latex}$$` : block.content.map(child => child.type === 'text' ? child.text : `$${child.math.latex}$`).join('')).join('\n');
    const html = document.createElement('div');
    html.dataset.mokClipboard = payload; html.textContent = text;
    event.clipboardData.setData(clipboardType, payload);
    event.clipboardData.setData('text/html', html.outerHTML);
    event.clipboardData.setData('text/plain', text);
    event.preventDefault();
    if (cut) editor.view.dispatch(closeHistory(editor.state.tr.deleteSelection()).scrollIntoView());
    return true;
  }

  function paste(event: ClipboardEvent): boolean {
    let payload = event.clipboardData?.getData(clipboardType) ?? '';
    const html = event.clipboardData?.getData('text/html') ?? '';
    if (!payload && html.length < 2_000_000 && html.includes('data-mok-clipboard')) {
      const parsed = new DOMParser().parseFromString(html, 'text/html');
      payload = parsed.querySelector('[data-mok-clipboard]')?.getAttribute('data-mok-clipboard') ?? '';
    }
    event.preventDefault();
    try {
      if (payload) {
        if (payload.length > 2_000_000) throw new Error('Clipboard fragment exceeds the prototype limit.');
        const value = JSON.parse(payload) as { notebook: unknown; openStart: number; openEnd: number };
        const notebook = parseNotebook(JSON.stringify(value.notebook)); validateBook(notebook);
        if (![value.openStart, value.openEnd].every(depth => Number.isInteger(depth) && depth >= 0 && depth <= 1)) throw new Error('Invalid clipboard boundary.');
        const doc = fromNotebook(notebook, editor.schema, true);
        editor.view.dispatch(closeHistory(editor.state.tr.replaceSelection(new Slice(doc.content, value.openStart, value.openEnd))).setMeta('uiEvent', 'paste').scrollIntoView());
      } else {
        if (/<math\b|data-equation/i.test(html)) throw new Error('External mathematical HTML is not supported yet. Paste LaTeX inside a math field.');
        const text = event.clipboardData?.getData('text/plain') ?? '';
        if (text.length > 100_000) throw new Error('Paste exceeds the prototype limit.');
        if (!text) return true;
        const paragraphs = text.replaceAll('\r\n', '\n').split('\n').map(line => editor.schema.nodes.paragraph.create(null, line ? editor.schema.text(line) : null));
        editor.view.dispatch(closeHistory(editor.state.tr.replaceSelection(new Slice(Fragment.fromArray(paragraphs), 1, 1))).setMeta('uiEvent', 'paste').scrollIntoView());
      }
      editor.view.dispatch(closeHistory(editor.state.tr).setMeta('addToHistory', false));
    } catch (error) { report((error as Error).message); }
    return true;
  }

  const integration = Extension.create({
    name: 'mathIntegration',
    addProseMirrorPlugins() {
      return [
        history({ newGroupDelay: 500 }),
        keymap({
          'Mod-z': () => { bridge.history(false); return true; },
          'Mod-Shift-z': () => { bridge.history(true); return true; },
          'Mod-y': () => { bridge.history(true); return true; },
          'Mod-a': (state, dispatch) => { dispatch?.(state.tr.setSelection(new AllSelection(state.doc))); return true; },
          'Mod-Home': (state, dispatch) => { dispatch?.(state.tr.setSelection(Selection.atStart(state.doc))); return true; },
          'Mod-End': (state, dispatch) => { dispatch?.(state.tr.setSelection(Selection.atEnd(state.doc))); return true; },
        }),
        new Plugin({ props: {
          handleKeyDown(view, event) {
            // Native Home/End and mouse selection can precede selectionchange.
            // Read a collapsed DOM caret before routing the next key across math.
            const domSelection = window.getSelection();
            if (view.state.selection.empty && !(view.state.selection instanceof MathSelection) && !event.ctrlKey && !event.metaKey && !event.altKey && view.hasFocus() && domSelection?.isCollapsed && domSelection.anchorNode && view.dom.contains(domSelection.anchorNode)) {
              const caret = view.posAtDOM(domSelection.anchorNode, domSelection.anchorOffset);
              if (caret !== view.state.selection.from || !view.state.selection.empty) {
                view.dispatch(view.state.tr.setSelection(Selection.near(view.state.doc.resolve(caret))).setMeta('addToHistory', false));
              }
            }
            const direction = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : 0;
            if (!direction || event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) return false;
            const sel = view.state.selection;
            if (sel instanceof NodeSelection && !(sel instanceof MathSelection) && sel.node.attrs.id) { bridge.fields.get(sel.node.attrs.id)?.enter(direction as -1 | 1); return true; }
            if (!sel.empty && !(sel instanceof MathSelection)) {
              view.dispatch(view.state.tr.setSelection(Selection.near(view.state.doc.resolve(direction < 0 ? sel.from : sel.to), direction)));
              return true;
            }
            if (!sel.empty || !(sel instanceof TextSelection)) return false;
            const near = direction < 0 ? sel.$from.nodeBefore : sel.$from.nodeAfter;
            if (near?.attrs.id) { bridge.fields.get(near.attrs.id)?.enter(direction as -1 | 1); return true; }
            if ((direction < 0 && sel.$from.parentOffset === 0) || (direction > 0 && sel.$from.parentOffset === sel.$from.parent.content.size)) {
              const boundary = direction < 0 ? sel.$from.before() : sel.$from.after();
              const resolved = view.state.doc.resolve(boundary);
              const node = direction < 0 ? resolved.nodeBefore : resolved.nodeAfter;
              if (node?.attrs.id) { bridge.fields.get(node.attrs.id)?.enter(direction as -1 | 1); return true; }
            }
            return false;
          },
          handleDOMEvents: {
            copy: (_view, event) => copy(event, false), cut: (_view, event) => copy(event, true), paste: (_view, event) => paste(event),
            beforeinput: (_view, event) => { if (event.inputType !== 'historyUndo' && event.inputType !== 'historyRedo') return false; event.preventDefault(); bridge.history(event.inputType === 'historyRedo'); return true; },
          },
        } }),
        mathTypingPlugin(latex => {
          const math = withProbe(mf => {
            mf.setValue(latex, { silenceNotifications: true });
            if (mf.errors.length) throw new Error('Unsupported typed mathematics');
            return captureMath(mf);
          });
          validateRecovery(math);
          return math;
        }),
        keymap(baseKeymap),
      ];
    },
  });
  const editor = new Editor({
    element, extensions: [Document, Paragraph, Text, math(true), math(false), integration],
    content: { type: 'doc', content: [{ type: 'paragraph' }] },
    editorProps: { attributes: { 'aria-label': 'Notebook document', role: 'textbox', 'aria-multiline': 'true', spellcheck: 'false' } },
    onUpdate: () => changed(true),
    onSelectionUpdate: () => changed(false),
  });

  function validateBook(book: Notebook) {
    for (const block of book.blocks) {
      if (block.type === 'displayMath') validateRecovery(block.math);
      else for (const child of block.content) if (child.type === 'math') validateRecovery(child.math);
    }
  }
  return {
    editor, bridge, snapshot: () => toNotebook(editor.state.doc),
    flush() { for (const field of bridge.fields.values()) field.flush(); },
    insert(inline: boolean, latex: string) {
      if (inline && editor.state.selection instanceof MathSelection) { bridge.fields.get(editor.state.selection.id)?.insert(latex); return; }
      if (editor.state.selection instanceof MathSelection) {
        const end = editor.state.selection.to;
        const tr = editor.state.tr;
        if (end === tr.doc.content.size) tr.insert(end, editor.schema.nodes.paragraph.create());
        tr.setSelection(Selection.near(tr.doc.resolve(end), 1)); editor.view.dispatch(closeHistory(tr));
      }
      const id = crypto.randomUUID();
      const snapshot = withProbe(mf => { mf.value = latex; return captureMath(mf); });
      editor.view.dispatch(closeHistory(editor.state.tr).setMeta('addToHistory', false));
      editor.chain().insertContent({ type: inline ? 'inlineMath' : 'displayMath', attrs: { id, math: snapshot } }).command(({ tr }) => {
        // Keep ordinary caret destinations at both document edges around display math.
        // These are real paragraphs in the same insertion transaction, not spacer glyphs.
        if (tr.doc.firstChild?.type.name === 'displayMath') tr.insert(0, editor.schema.nodes.paragraph.create());
        if (tr.doc.lastChild?.type.name === 'displayMath') tr.insert(tr.doc.content.size, editor.schema.nodes.paragraph.create());
        tr.doc.descendants((node, pos) => { if (node.attrs.id === id) tr.setSelection(new MathSelection(tr.doc.resolve(pos), id, { ranges: [[0, 0]] })); }); return true;
      }).run();
      editor.view.dispatch(closeHistory(editor.state.tr).setMeta('addToHistory', false));
      queueMicrotask(() => bridge.fields.get(id)?.enterPlaceholder());
    },
    open(book: Notebook) {
      validateBook(book);
      const content = fromNotebook(book, editor.schema);
      // A new state prevents undo from crossing into an unrelated file.
      editor.view.updateState(EditorState.create({ schema: editor.schema, doc: content, plugins: editor.state.plugins }));
      editor.view.focus(); changed();
    },
    reset() { this.open(emptyNotebook()); },
    destroy() { editor.destroy(); },
  };
}
export type NotebookEditor = ReturnType<typeof createEditor>;
