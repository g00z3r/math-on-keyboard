import type { Node as PMNode } from '@tiptap/pm/model';
import { NodeSelection, Selection, TextSelection } from '@tiptap/pm/state';
import { closeHistory } from '@tiptap/pm/history';
import type { EditorView, NodeView } from '@tiptap/pm/view';
import { MathfieldElement, type Selector } from 'mathlive';
import type { MathSnapshot } from '../document/model';
import { captureMath, configureMathfield, matrixInfo, resizeMatrix, withProbe } from '../math/adapter';
import { copyRange, MathSelection, type MathRange } from './math-selection';

export interface MathBridge {
  fields: Map<string, MathNodeView>;
  report: (message: string) => void;
  history: (redo: boolean) => void;
}

export class MathNodeView implements NodeView {
  dom: HTMLElement;
  mf: MathfieldElement;
  private node: PMNode;
  private busy = false;
  private pendingEdit = false;
  private disposed = false;
  private shift = false;
  private handle: HTMLButtonElement;
  private dimensions: HTMLOutputElement;
  private pointerStart: { x: number; y: number; pointerId: number } | null = null;
  private drag: { x: number; y: number; rows: number; columns: number; nextRows: number; nextColumns: number } | null = null;

  constructor(node: PMNode, private view: EditorView, private getPos: () => number | undefined, private bridge: MathBridge) {
    this.node = node;
    this.dom = document.createElement(node.isInline ? 'span' : 'div');
    this.dom.className = `math-node ${node.isInline ? 'inline-math' : 'display-math'}`;
    this.dom.contentEditable = 'false';
    this.dom.dataset.mathId = node.attrs.id;
    this.mf = new MathfieldElement();
    configureMathfield(this.mf, node.isInline);
    this.handle = document.createElement('button');
    this.handle.type = 'button';
    this.handle.className = 'matrix-resize';
    this.handle.textContent = '↘';
    this.handle.setAttribute('aria-label', 'Resize matrix boundary');
    this.handle.title = 'Drag to change rows and columns. Arrow keys also resize.';
    this.dimensions = document.createElement('output');
    this.dimensions.className = 'matrix-dimensions';
    this.dom.append(this.mf, this.handle, this.dimensions);
    this.bridge.fields.set(node.attrs.id, this);
    this.mf.value = (node.attrs.math as MathSnapshot).latex;
    this.mf.addEventListener('focus', this.onFocus);
    this.mf.addEventListener('selection-change', this.onSelection);
    this.mf.addEventListener('beforeinput', this.onBeforeInput);
    this.mf.addEventListener('input', this.onInput);
    this.mf.addEventListener('keydown', this.onKey, true);
    this.mf.addEventListener('move-out', this.onMoveOut);
    this.mf.addEventListener('paste', this.onPaste, true);
    this.mf.addEventListener('pointerdown', this.onPointerDown, true);
    document.addEventListener('pointermove', this.onPointerMove);
    document.addEventListener('pointerup', this.onPointerUp);
    this.handle.addEventListener('pointerdown', this.onResizeStart);
    this.handle.addEventListener('pointermove', this.onResizeMove);
    this.handle.addEventListener('pointerup', this.onResizeEnd);
    this.handle.addEventListener('pointercancel', this.onResizeCancel);
    this.handle.addEventListener('keydown', this.onResizeKey);
    queueMicrotask(() => { if (!this.disposed) { this.refreshDimensions(); this.restoreSelection(); } });
  }

  private position() { return this.getPos(); }
  private focused() { return document.activeElement === this.mf; }
  private onFocus = () => { this.syncSelection(); };
  private onSelection = () => { if (this.focused() && !this.pendingEdit) this.syncSelection(); };
  private syncSelection() {
    if (this.busy || this.disposed) return;
    const pos = this.position();
    if (pos === undefined) return;
    const selection = new MathSelection(this.view.state.doc.resolve(pos), this.node.attrs.id, this.mf.selection);
    if (!selection.eq(this.view.state.selection)) this.view.dispatch(closeHistory(this.view.state.tr).setSelection(selection).setMeta('addToHistory', false));
  }
  private onBeforeInput = (event: Event) => {
    const type = (event as InputEvent).inputType;
    if (type === 'historyUndo' || type === 'historyRedo') {
      event.preventDefault(); event.stopImmediatePropagation(); this.bridge.history(type === 'historyRedo');
    } else if (!this.pendingEdit) { this.syncSelection(); this.pendingEdit = true; }
  };
  private onInput = () => { this.pendingEdit = false; if (!this.busy) this.commit(false); };

  commit(separate: boolean) {
    const pos = this.position();
    if (pos === undefined || this.disposed) return;
    const math = captureMath(this.mf);
    if (JSON.stringify(math) === JSON.stringify(this.node.attrs.math)) return;
    let tr = this.view.state.tr;
    if (separate) tr = closeHistory(tr);
    tr.setNodeMarkup(pos, undefined, { ...this.node.attrs, math });
    const selection = this.view.state.selection;
    if (this.focused() || selection instanceof MathSelection && selection.id === this.node.attrs.id) {
      tr.setSelection(new MathSelection(tr.doc.resolve(pos), this.node.attrs.id, this.mf.selection));
    }
    this.view.dispatch(tr);
    this.mf.resetUndo();
    this.refreshDimensions();
    if (separate) this.view.dispatch(closeHistory(this.view.state.tr).setMeta('addToHistory', false));
  }
  flush() { this.pendingEdit = false; if (!this.busy) this.commit(false); }

  enter(direction: -1 | 1) {
    this.busy = true;
    this.focusField();
    this.mf.position = direction === 1 ? 0 : this.mf.lastOffset;
    this.busy = false;
    this.syncSelection();
  }
  private focusField() {
    // MathLive 0.111.4 delays focus to its keyboard sink. Immediately focus the
    // host through the standard DOM API so fast keys cannot replace an outer atom.
    HTMLElement.prototype.focus.call(this.mf);
    this.mf.focus();
  }
  enterPlaceholder() {
    this.enter(1);
    const info = matrixInfo(this.mf);
    if (info) this.mf.position = info.starts[0];
    else if (this.mf.value.includes('\\placeholder')) this.mf.executeCommand('moveToNextPlaceholder');
    this.syncSelection();
  }
  insert(latex: string) {
    this.syncSelection();
    this.busy = true;
    try { this.mf.insert(latex, { selectionMode: 'placeholder', focus: true }); }
    finally { this.busy = false; }
    this.commit(true);
  }
  private restoreSelection() {
    const sel = this.view.state.selection;
    if (!(sel instanceof MathSelection) || sel.id !== this.node.attrs.id) return;
    this.busy = true;
    this.focusField();
    this.mf.selection = copyRange(sel.inner);
    this.busy = false;
  }
  private leave(direction: -1 | 1, extend = false, paragraph = false) {
    this.flush();
    const pos = this.position();
    if (pos === undefined) return;
    const tr = this.view.state.tr;
    const target = pos + (direction === 1 ? this.node.nodeSize : 0);
    if (paragraph && !this.node.isInline && (target === tr.doc.content.size || tr.doc.nodeAt(target)?.type.name !== 'paragraph')) {
      tr.insert(target, this.view.state.schema.nodes.paragraph.create());
    }
    if (extend && this.node.isInline) {
      const anchor = direction === 1 ? pos : pos + this.node.nodeSize;
      tr.setSelection(TextSelection.create(tr.doc, anchor, target));
    } else if (extend) tr.setSelection(NodeSelection.create(tr.doc, pos));
    else tr.setSelection(Selection.near(tr.doc.resolve(target), direction));
    this.view.dispatch(closeHistory(tr).scrollIntoView());
    this.view.focus();
  }
  private onMoveOut = (event: Event) => {
    const direction = (event as CustomEvent<{ direction: string }>).detail.direction;
    // MathLive's vertical dead-end handler interprets cancellation differently
    // from horizontal movement and otherwise announces a spurious error sound.
    if (direction !== 'upward' && direction !== 'downward') event.preventDefault();
    this.leave(direction === 'backward' || direction === 'upward' ? -1 : 1, this.shift);
  };
  private onKey = (event: KeyboardEvent) => {
    this.shift = event.shiftKey;
    const mod = event.ctrlKey || event.metaKey;
    if (mod && !event.altKey && (event.key.toLowerCase() === 'z' || event.key.toLowerCase() === 'y')) {
      event.preventDefault(); event.stopImmediatePropagation();
      this.bridge.history(event.key.toLowerCase() === 'y' || event.shiftKey);
      return;
    }
    if (event.isComposing) return;
    if (['Tab', 'Home', 'End', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) || mod && event.key.toLowerCase() === 'a') this.flush();
    if (mod && !event.altKey && event.key.toLowerCase() === 'a') {
      event.preventDefault(); event.stopImmediatePropagation();
      this.mf.select(); this.syncSelection(); return;
    }
    if (!mod && !event.altKey && (event.key === 'Home' || event.key === 'End')) {
      event.preventDefault(); event.stopImmediatePropagation();
      const target = event.key === 'Home' ? 0 : this.mf.lastOffset;
      if (event.shiftKey) {
        const selection = this.mf.selection;
        const anchor = selection.direction === 'backward' ? selection.ranges[0][1] : selection.ranges[0][0];
        this.mf.selection = { ranges: [[Math.min(anchor, target), Math.max(anchor, target)]], direction: target < anchor ? 'backward' : 'forward' };
      } else this.mf.position = target;
      this.syncSelection(); return;
    }
    if (event.key === 'Tab') {
      const info = matrixInfo(this.mf);
      if (info) {
        event.preventDefault(); event.stopImmediatePropagation();
        let current = 0;
        info.starts.forEach((start, index) => { if (start <= this.mf.position) current = index; });
        const next = current + (event.shiftKey ? -1 : 1);
        if (next >= 0 && next < info.starts.length) { this.mf.position = info.starts[next]; this.syncSelection(); }
        else this.leave(event.shiftKey ? -1 : 1);
        return;
      }
    }
    if ((event.key === 'Enter' && !mod && !event.altKey) || event.key === 'Escape') {
      event.preventDefault(); event.stopImmediatePropagation(); this.leave(1, false, event.key === 'Enter'); return;
    }
    const range = this.mf.selection.ranges[0];
    if (range[0] === range[1] && ((event.key === 'Backspace' && this.mf.position === 0) || (event.key === 'Delete' && this.mf.position === this.mf.lastOffset))) {
      event.preventDefault(); event.stopImmediatePropagation();
      const pos = this.position();
      if (pos !== undefined) { this.view.dispatch(this.view.state.tr.setSelection(NodeSelection.create(this.view.state.doc, pos))); this.view.focus(); }
      return;
    }
    // Before the delayed inner keyboard focus arrives, use public commands.
    // Once events originate inside the shadow root, MathLive owns them normally.
    if (!mod && !event.altKey && (event.key.length === 1 || event.key === 'Backspace' || event.key === 'Delete')) {
      this.syncSelection();
      this.pendingEdit = true;
    }
    if (event.composedPath()[0] === this.mf) this.forwardKey(event);
  };

  forwardKey(event: KeyboardEvent): boolean {
    if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey) return false;
    const commands: Record<string, Selector> = {
      ArrowLeft: event.shiftKey ? 'extendSelectionBackward' : 'moveToPreviousChar',
      ArrowRight: event.shiftKey ? 'extendSelectionForward' : 'moveToNextChar',
      ArrowUp: event.shiftKey ? 'extendSelectionUpward' : 'moveUp', ArrowDown: event.shiftKey ? 'extendSelectionDownward' : 'moveDown',
      Home: event.shiftKey ? 'extendToMathFieldStart' : 'moveToMathfieldStart', End: event.shiftKey ? 'extendToMathFieldEnd' : 'moveToMathfieldEnd',
      Backspace: 'deleteBackward', Delete: 'deleteForward',
    };
    if (event.key.length === 1) {
      event.preventDefault(); event.stopImmediatePropagation();
      this.mf.executeCommand(['typedText', event.key, { simulateKeystroke: true }]);
      return true;
    }
    if (commands[event.key]) {
      event.preventDefault(); event.stopImmediatePropagation();
      this.mf.executeCommand(commands[event.key]); return true;
    }
    return false;
  }

  private onPaste = (event: ClipboardEvent) => {
    event.preventDefault(); event.stopImmediatePropagation();
    this.flush();
    const latex = event.clipboardData?.getData('text/plain') ?? '';
    if (!latex || latex.length > 100_000 || /\\(?:href|htmlData|htmlStyle|class|cssId|includegraphics|url)\b/i.test(latex)) {
      this.bridge.report('Paste rejected: empty, oversized, or active mathematical content.'); return;
    }
    const source = latex.replace(/^\$\$([\s\S]*)\$\$$/, '$1').replace(/^\$([\s\S]*)\$$/, '$1');
    const errors = withProbe(mf => { mf.value = source; return mf.errors; });
    if (errors.length) { this.bridge.report('Paste rejected: unsupported or malformed LaTeX. Existing content was kept.'); return; }
    this.syncSelection();
    this.busy = true;
    try { this.mf.insert(source, { format: 'latex', selectionMode: 'after', focus: true }); }
    finally { this.busy = false; }
    this.commit(true);
  };

  private onPointerDown = (event: PointerEvent) => {
    if (event.button === 0) {
      this.pointerStart = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
      this.focusField();
    }
  };
  private onPointerMove = (event: PointerEvent) => {
    if (!this.pointerStart || !event.buttons) return;
    const rect = this.mf.getBoundingClientRect();
    if (event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom) return;
    if (Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y) < 6) return;
    const pos = this.position();
    const hit = this.view.posAtCoords({ left: event.clientX, top: event.clientY });
    if (pos === undefined || !hit || !this.node.isInline) return;
    const anchor = hit.pos > pos ? pos : pos + this.node.nodeSize;
    this.view.dispatch(this.view.state.tr.setSelection(TextSelection.create(this.view.state.doc, anchor, hit.pos)));
    this.view.focus();
    event.preventDefault();
  };
  private onPointerUp = () => { this.pointerStart = null; };

  private refreshDimensions() {
    const info = matrixInfo(this.mf);
    this.handle.hidden = !info;
    this.dimensions.hidden = !info;
    this.dimensions.value = info ? `${info.rows} × ${info.columns}` : '';
  }
  private onResizeStart = (event: PointerEvent) => {
    const info = matrixInfo(this.mf);
    if (!info || event.button !== 0) return;
    event.preventDefault(); event.stopPropagation();
    this.handle.setPointerCapture(event.pointerId);
    this.drag = { x: event.clientX, y: event.clientY, rows: info.rows, columns: info.columns, nextRows: info.rows, nextColumns: info.columns };
  };
  private onResizeMove = (event: PointerEvent) => {
    if (!this.drag) return;
    this.drag.nextRows = Math.max(1, Math.min(8, this.drag.rows + Math.round((event.clientY - this.drag.y) / 32)));
    this.drag.nextColumns = Math.max(1, Math.min(8, this.drag.columns + Math.round((event.clientX - this.drag.x) / 40)));
    this.dimensions.value = `${this.drag.nextRows} × ${this.drag.nextColumns} (release to apply)`;
  };
  private onResizeEnd = (event: PointerEvent) => {
    const drag = this.drag;
    this.drag = null;
    if (this.handle.hasPointerCapture(event.pointerId)) this.handle.releasePointerCapture(event.pointerId);
    if (drag) this.applyResize(drag.nextRows, drag.nextColumns);
  };
  private onResizeCancel = () => { this.drag = null; this.refreshDimensions(); };
  private onResizeKey = (event: KeyboardEvent) => {
    const info = matrixInfo(this.mf);
    if (!info || !['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault(); event.stopPropagation();
    const rows = info.rows + (event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0);
    const columns = info.columns + (event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0);
    this.applyResize(Math.max(1, Math.min(8, rows)), Math.max(1, Math.min(8, columns)));
  };
  private applyResize(rows: number, columns: number) {
    this.flush();
    const info = matrixInfo(this.mf);
    if (!info || info.rows === rows && info.columns === columns) { this.refreshDimensions(); return; }
    const removesContent = info.cells.some((value, index) => (Math.floor(index / info.columns) >= rows || index % info.columns >= columns) && value.trim() !== '');
    if (removesContent && !window.confirm('Shrinking this matrix removes nonempty cells. Remove them? You can undo this change.')) { this.refreshDimensions(); return; }
    const previous = this.mf.value;
    const selection: MathRange = copyRange(this.mf.selection);
    this.syncSelection();
    this.busy = true;
    try { resizeMatrix(this.mf, rows, columns); }
    catch (error) { this.mf.setValue(previous, { silenceNotifications: true }); this.mf.selection = selection; this.bridge.report((error as Error).message); }
    finally { this.busy = false; }
    this.commit(true);
    this.restoreSelection();
    this.refreshDimensions();
  }

  update(node: PMNode) {
    if (node.type !== this.node.type || node.attrs.id !== this.node.attrs.id) return false;
    const changed = (node.attrs.math as MathSnapshot).latex !== this.mf.value;
    this.node = node;
    if (changed) {
      this.busy = true;
      this.mf.setValue((node.attrs.math as MathSnapshot).latex, { silenceNotifications: true });
      this.mf.resetUndo();
      this.busy = false;
      this.refreshDimensions();
      queueMicrotask(() => { if (!this.disposed) this.restoreSelection(); });
    }
    return true;
  }
  selectNode() { this.dom.classList.toggle('selected-equation', !(this.view.state.selection instanceof MathSelection)); }
  deselectNode() { this.dom.classList.remove('selected-equation'); }
  stopEvent(event: Event) { return this.dom.contains(event.target as globalThis.Node); }
  ignoreMutation() { return true; }
  destroy() {
    this.disposed = true;
    if (this.bridge.fields.get(this.node.attrs.id) === this) this.bridge.fields.delete(this.node.attrs.id);
    document.removeEventListener('pointermove', this.onPointerMove);
    document.removeEventListener('pointerup', this.onPointerUp);
  }
}
