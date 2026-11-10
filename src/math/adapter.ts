import { MathfieldElement } from 'mathlive';
import type { MathSnapshot } from '../document/model';
import { readMathML, presentationToLatex } from './presentation';

// Vite includes these assets in production; no CDN or remote font dependency.
import 'mathlive/fonts.css';
MathfieldElement.fontsDirectory = null;
MathfieldElement.soundsDirectory = null;
MathfieldElement.keypressSound = null;
MathfieldElement.plonkSound = null;

export function configureMathfield(mf: MathfieldElement, inline = false) {
  mf.defaultMode = inline ? 'inline-math' : 'math';
  mf.mathVirtualKeyboardPolicy = 'manual';
  mf.popoverPolicy = 'off';
  mf.smartFence = false;
  mf.removeExtraneousParentheses = false;
  const mountedOptions = () => { mf.inlineShortcuts = {}; mf.menuItems = []; };
  if (mf.isConnected) mountedOptions();
  else mf.addEventListener('mount', mountedOptions, { once: true });
  mf.setAttribute('aria-label', inline ? 'Inline mathematics' : 'Display mathematics');
}

export function captureMath(mf: MathfieldElement): MathSnapshot {
  let presentation = null;
  let issue: string | null = null;
  try { presentation = readMathML(mf.getValue('math-ml').replaceAll('&nbsp;', '&#160;')); }
  catch (error) { issue = (error as Error).message; }
  if (mf.value.includes('\\placeholder')) issue = 'MathML exports placeholders as literal question marks; tree-only round-trip failed.';
  return { latex: mf.value, presentation, issue };
}

export function withProbe<T>(action: (mf: MathfieldElement) => T): T {
  const probe = new MathfieldElement();
  configureMathfield(probe);
  probe.style.cssText = 'position:fixed;left:-10000px;top:0;visibility:hidden';
  probe.setAttribute('aria-hidden', 'true');
  probe.tabIndex = -1;
  document.body.append(probe);
  try { return action(probe); } finally { probe.remove(); }
}

export function validateRecovery(snapshot: MathSnapshot): void {
  withProbe(mf => {
    mf.setValue(snapshot.latex, { silenceNotifications: true });
    const restored = captureMath(mf);
    if (restored.latex !== snapshot.latex || JSON.stringify(restored.presentation) !== JSON.stringify(snapshot.presentation)) {
      throw new Error('The pinned math adapter cannot reopen this equation without changing its representation. Current document was kept.');
    }
  });
}

export function testTreeRestoration(snapshot: MathSnapshot): { passed: boolean; detail: string } {
  if (!snapshot.presentation) return { passed: false, detail: snapshot.issue ?? 'No presentation tree.' };
  try {
    const latex = presentationToLatex(snapshot.presentation);
    return withProbe(mf => {
      mf.value = latex;
      const restored = captureMath(mf);
      const passed = JSON.stringify(restored.presentation) === JSON.stringify(snapshot.presentation) && !snapshot.issue;
      return { passed, detail: passed ? 'Presentation equality passed for this fixture; general fidelity remains unproven.' : 'Tree-only restoration changed notation or lost an editable slot.' };
    });
  } catch (error) { return { passed: false, detail: (error as Error).message }; }
}

export interface MatrixInfo { rows: number; columns: number; starts: number[]; cells: string[] }
export function matrixInfo(mf: MathfieldElement): MatrixInfo | null {
  // Restrict handles to a field containing one top-level matrix. Nested matrices remain editable.
  const xml = mf.getValue('math-ml').replaceAll('&nbsp;', '&#160;');
  const doc = new DOMParser().parseFromString(`<math>${xml}</math>`, 'application/xml');
  const tables = [...doc.querySelectorAll('mtable')];
  if (tables.length !== 1 || !/^\\begin\{(?:bmatrix|pmatrix|matrix)\}/.test(mf.value)) return null;
  const rows = [...tables[0].children].filter(el => el.localName === 'mtr');
  const columns = rows[0]?.children.length ?? 0;
  if (!columns || rows.some(row => row.children.length !== columns)) return null;
  const starts: number[] = [];
  for (let pos = 1; pos <= mf.lastOffset; pos++) {
    const info = mf.getElementInfo(pos);
    if (info?.depth === 1 && info.latex === '') starts.push(pos);
  }
  if (starts.length !== rows.length * columns) return null;
  return { rows: rows.length, columns, starts, cells: rows.flatMap(row => [...row.children].map(cell => cell.textContent ?? '')) };
}

export function resizeMatrix(mf: MathfieldElement, rows: number, columns: number): void {
  let info = matrixInfo(mf);
  if (!info || rows < 1 || rows > 8 || columns < 1 || columns > 8) throw new Error('Matrix boundary resizing supports a single 1–8 by 1–8 matrix in this prototype.');
  let attempts = 0;
  while (info.rows !== rows || info.columns !== columns) {
    if (++attempts > 32) throw new Error('Matrix resize did not converge.');
    mf.position = info.starts[info.starts.length - 1];
    if (info.rows !== rows) mf.executeCommand(info.rows < rows ? 'addRowAfter' : 'removeRow');
    else mf.executeCommand(info.columns < columns ? 'addColumnAfter' : 'removeColumn');
    const next = matrixInfo(mf);
    if (!next || next.rows === info.rows && next.columns === info.columns) throw new Error('MathLive did not apply the matrix resize command.');
    info = next;
  }
}
