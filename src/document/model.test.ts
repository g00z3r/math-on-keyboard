import { describe, expect, it } from 'vitest';
import { emptyNotebook, encodeNotebook, parseNotebook, type Notebook } from './model';
import { presentationToLatex, validatePresentation, type Presentation } from '../math/presentation';

const fixture = (): Notebook => ({ ...emptyNotebook(), blocks: [
  { type: 'paragraph', content: [{ type: 'text', text: 'Let x be ' }, { type: 'math', id: 'fraction', math: { latex: '\\frac{x}{\\placeholder{}}', presentation: null, issue: 'Placeholder probe failed.' } }] },
  { type: 'displayMath', id: 'matrix', math: { latex: '\\begin{bmatrix}1&\\\\&4\\end{bmatrix}', presentation: null, issue: 'Experimental recovery.' } },
] });

describe('experimental notebook preservation and admission', () => {
  it('preserves mixed blocks, literal notation, empty cells, unfinished slots, and recovery warnings', () => {
    const book = fixture();
    expect(parseNotebook(encodeNotebook(book))).toEqual(book);
  });
  it('rejects unknown versions and adapters without guessing a migration', () => {
    expect(() => parseNotebook(JSON.stringify({ ...fixture(), version: 1 }))).toThrow('Unsupported notebook');
    expect(() => parseNotebook(JSON.stringify({ ...fixture(), adapter: 'future' }))).toThrow('Unsupported notebook');
  });
  it('rejects unknown fields instead of dropping future content on re-save', () => {
    expect(() => parseNotebook(JSON.stringify({ ...fixture(), newFeature: true }))).toThrow('Unknown or missing');
    const book = fixture();
    Object.assign(book.blocks[0], { annotation: 'keep me' });
    expect(() => encodeNotebook(book)).toThrow('Unknown or missing');
  });
  it('rejects unsupported blocks and duplicate identities', () => {
    const book = fixture();
    book.blocks.push(book.blocks[1]);
    expect(() => encodeNotebook(book)).toThrow('duplicate');
    expect(() => parseNotebook(JSON.stringify({ ...fixture(), blocks: [{ type: 'futureMath' }] }))).toThrow('Unsupported block');
  });
  it('rejects active math payloads and excessive input', () => {
    const book = fixture();
    if (book.blocks[1].type === 'displayMath') book.blocks[1].math.latex = '\\href{https://example.com}{x}';
    expect(() => encodeNotebook(book)).toThrow('Active or external');
    expect(() => parseNotebook(' '.repeat(2_000_001))).toThrow('2 MB');
    expect(() => parseNotebook('{')).toThrow();
  });
});

const token = (name: string, value: string): Presentation => ({ kind: 'element', name, attributes: {}, children: [{ kind: 'text', value }] });
describe('bounded presentation-tree hypothesis', () => {
  it('serializes a supported nested fraction without doing computation', () => {
    const tree: Presentation = { kind: 'element', name: 'mfrac', attributes: {}, children: [token('mi', 'x'), { kind: 'element', name: 'mfrac', attributes: {}, children: [token('mn', '1'), token('mn', '2')] }] };
    expect(presentationToLatex(tree)).toBe('\\frac{x}{\\frac{1}{2}}');
  });
  it('refuses unsupported styles and structures instead of flattening them', () => {
    expect(() => presentationToLatex({ kind: 'element', name: 'mstyle', attributes: { mathvariant: 'bold' }, children: [] })).toThrow('does not support');
    expect(() => validatePresentation({ kind: 'element', name: 'script', attributes: {}, children: [] })).toThrow('Invalid presentation');
  });
  it('bounds tree depth and rejects executable attributes', () => {
    let tree: Presentation = token('mi', 'x');
    for (let i = 0; i < 66; i++) tree = { kind: 'element', name: 'mrow', attributes: {}, children: [tree] };
    expect(() => validatePresentation(tree)).toThrow('Invalid presentation');
    expect(() => validatePresentation({ kind: 'element', name: 'mi', attributes: { onclick: 'alert(1)' }, children: [] })).toThrow('Invalid presentation attribute');
  });
});
