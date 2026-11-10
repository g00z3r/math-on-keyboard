import { validatePresentation, type Presentation } from '../math/presentation';

export interface MathSnapshot {
  latex: string;
  presentation: Presentation | null;
  issue: string | null;
}
export type Inline = { type: 'text'; text: string } | { type: 'math'; id: string; math: MathSnapshot };
export type Block = { type: 'paragraph'; content: Inline[] } | { type: 'displayMath'; id: string; math: MathSnapshot };
export interface Notebook {
  format: 'math-on-keyboard-experiment';
  version: 0;
  adapter: 'mathlive-0.111.4';
  blocks: Block[];
}
export const emptyNotebook = (): Notebook => ({ format: 'math-on-keyboard-experiment', version: 0, adapter: 'mathlive-0.111.4', blocks: [{ type: 'paragraph', content: [] }] });

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a document object.');
  return value as Record<string, unknown>;
}
function keys(value: Record<string, unknown>, expected: string[]) {
  if (Object.keys(value).some(key => !expected.includes(key)) || expected.some(key => !(key in value))) throw new Error('Unknown or missing document fields; file was not opened.');
}
export function parseNotebook(source: string): Notebook {
  if (source.length > 2_000_000) throw new Error('This prototype limits notebook files to 2 MB.');
  const data = record(JSON.parse(source));
  keys(data, ['format', 'version', 'adapter', 'blocks']);
  if (data.format !== 'math-on-keyboard-experiment' || data.version !== 0 || data.adapter !== 'mathlive-0.111.4') throw new Error('Unsupported notebook format, version, or math adapter. Original file was not changed.');
  if (!Array.isArray(data.blocks) || !data.blocks.length || data.blocks.length > 1000) throw new Error('Invalid notebook blocks.');
  const ids = new Set<string>();
  function math(value: Record<string, unknown>) {
    if (typeof value.id !== 'string' || !/^[\w-]{1,100}$/.test(value.id) || ids.has(value.id)) throw new Error('Invalid or duplicate equation identity.');
    ids.add(value.id);
    const snapshot = record(value.math);
    keys(snapshot, ['latex', 'presentation', 'issue']);
    if (typeof snapshot.latex !== 'string' || snapshot.latex.length > 100_000 || (snapshot.issue !== null && typeof snapshot.issue !== 'string')) throw new Error('Invalid math recovery payload.');
    if (snapshot.presentation !== null) validatePresentation(snapshot.presentation);
    if (/\\(?:href|htmlData|htmlStyle|class|cssId|includegraphics|url)\b/i.test(snapshot.latex)) throw new Error('Active or external mathematical content is unsupported.');
  }
  let inlineCount = 0;
  for (const value of data.blocks) {
    const block = record(value);
    if (block.type === 'displayMath') { keys(block, ['type', 'id', 'math']); math(block); }
    else if (block.type === 'paragraph' && Array.isArray(block.content)) {
      keys(block, ['type', 'content']);
      for (const item of block.content) {
        if (++inlineCount > 10_000) throw new Error('Notebook content limit exceeded.');
        const inline = record(item);
        if (inline.type === 'text' && typeof inline.text === 'string') keys(inline, ['type', 'text']);
        else if (inline.type === 'math') { keys(inline, ['type', 'id', 'math']); math(inline); }
        else throw new Error('Unsupported paragraph content; file was not opened.');
      }
    } else throw new Error('Unsupported block; file was not opened.');
  }
  return data as unknown as Notebook;
}

export function encodeNotebook(notebook: Notebook): string {
  const result = JSON.stringify(notebook, null, 2);
  parseNotebook(result);
  return result;
}
