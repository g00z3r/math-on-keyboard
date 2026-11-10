import { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createEditor, type NotebookEditor } from './editor/create-editor';
import { encodeNotebook, parseNotebook } from './document/model';
import { testTreeRestoration } from './math/adapter';
import './style.css';

const fraction = '\\frac{\\placeholder{}}{\\placeholder{}}';
const matrix = '\\begin{bmatrix}&\\\\&\\end{bmatrix}';

function App() {
  const host = useRef<HTMLDivElement>(null);
  const controller = useRef<NotebookEditor | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('Ready. Type prose and expressions such as 1/2 or x^2; Space or Enter formats eligible math.');
  const [revision, setRevision] = useState(0);
  const [checks, setChecks] = useState<string[]>([]);
  const changed = useRef(false);

  useEffect(() => {
    const instance = createEditor(host.current!, setMessage, (dirty = true) => { if (dirty) changed.current = true; setRevision(value => value + 1); });
    controller.current = instance;
    setRevision(value => value + 1);
    const shortcuts = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      if ((event.ctrlKey || event.metaKey) && !event.altKey && target?.closest('button') && (key === 'z' || key === 'y')) {
        event.preventDefault(); event.stopImmediatePropagation();
        instance.bridge.history(key === 'y' || event.shiftKey); return;
      }
      if (!event.ctrlKey || !event.altKey || event.isComposing) return;
      if (!['m', 'f', 'd', 'x'].includes(key)) return;
      event.preventDefault(); event.stopImmediatePropagation();
      instance.insert(key === 'm' || key === 'f', key === 'f' ? fraction : key === 'x' ? matrix : '');
    };
    const beforeUnload = (event: BeforeUnloadEvent) => { if (changed.current) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('keydown', shortcuts, true);
    window.addEventListener('beforeunload', beforeUnload);
    return () => { window.removeEventListener('keydown', shortcuts, true); window.removeEventListener('beforeunload', beforeUnload); instance.destroy(); };
  }, []);

  function save() {
    try {
      controller.current!.flush();
      const source = encodeNotebook(controller.current!.snapshot());
      const url = URL.createObjectURL(new Blob([source], { type: 'application/json' }));
      const link = document.createElement('a');
      link.href = url; link.download = 'math-on-keyboard.mok.json'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      changed.current = false;
      setMessage('Experimental backup downloaded. Keep this file; browser autosave is not part of this prototype.');
    } catch (error) { setMessage((error as Error).message); }
  }
  async function open(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 2_000_000) throw new Error('Notebook exceeds the 2 MB prototype limit.');
      const book = parseNotebook(await file.text());
      if (changed.current && !window.confirm('Replace the current document? Download a backup first if you want to keep it.')) return;
      controller.current!.open(book);
      changed.current = false;
      setChecks([]);
      setMessage('Experimental backup reopened. Math remains editable using the pinned MathLive recovery adapter.');
    } catch (error) { setMessage((error as Error).message); }
    finally { if (fileInput.current) fileInput.current.value = ''; }
  }
  function checkFormat() {
    const book = controller.current!.snapshot();
    const math = book.blocks.flatMap(block => block.type === 'displayMath' ? [block.math] : block.content.flatMap(child => child.type === 'math' ? [child.math] : []));
    setChecks(math.map((snapshot, index) => { const result = testTreeRestoration(snapshot); return `Equation ${index + 1}: ${result.passed ? 'PASS' : 'FAIL'} — ${result.detail}`; }));
    if (!math.length) setChecks(['Insert mathematics to test the presentation-tree hypothesis.']);
  }
  const instance = controller.current;
  const snapshot = instance?.snapshot();
  return <main>
    <h1>Math on Keyboard <small>Milestone 0 prototype</small></h1>
    <div className="toolbar" role="toolbar" aria-label="Notebook commands" onMouseDown={event => { if ((event.target as HTMLElement).closest('button')) event.preventDefault(); }}>
      <button onClick={() => instance?.insert(true, '')} title="Ctrl+Alt+M">Inline math</button>
      <button onClick={() => instance?.insert(true, fraction)} title="Ctrl+Alt+F">Fraction</button>
      <button onClick={() => instance?.insert(false, '')} title="Ctrl+Alt+D">Display math</button>
      <button onClick={() => instance?.insert(false, matrix)} title="Ctrl+Alt+X">2 × 2 matrix</button>
      <button onClick={() => instance?.bridge.history(false)}>Undo</button>
      <button onClick={() => instance?.bridge.history(true)}>Redo</button>
      <button onClick={save}>Download backup</button>
      <button onClick={() => fileInput.current?.click()}>Open backup</button>
      <input ref={fileInput} hidden type="file" accept=".json" onChange={event => void open(event.target.files?.[0])} aria-label="Open notebook file" />
    </div>
    <p className="instructions">Type expressions such as 1/2, x^2, or (x+1)/2, then Space or Enter to format them and continue prose. Undo restores literal typing. Arrows move through math and back to prose; Escape leaves math. Tab / Shift+Tab move between matrix cells. Drag the matrix’s bottom-right boundary handle to change its rows and columns.</p>
    <div ref={host} className="document" />
    <p role="status" className="status">{message}</p>
    <aside>Experimental backups retain MathLive source. Independent mathematical serialization has failed the placeholder probe and is still under investigation. Download a backup before closing.</aside>
    <details>
      <summary>Feasibility diagnostics</summary>
      <button onClick={checkFormat}>Check presentation-tree restoration</button>
      <ul>{checks.map((check, index) => <li key={index}>{check}</li>)}</ul>
      <p>Document revision: {revision}. Internal selections use provisional whole-equation promotion at prose boundaries.</p>
      <pre data-testid="document-json">{JSON.stringify(snapshot ?? null, null, 2)}</pre>
      <pre data-testid="selection-json">{JSON.stringify(instance?.editor.state.selection.toJSON() ?? null)}</pre>
    </details>
  </main>;
}

createRoot(document.getElementById('root')!).render(<App />);
