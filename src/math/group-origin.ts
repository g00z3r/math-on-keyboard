// Bounded experimental metadata reader, not a LaTeX parser. MathLive validates
// syntax and the public descriptor reader below validates actual ownership.
import type { MathfieldElement } from 'mathlive';

export const originPrefix = '\\htmlData{mok-group=inferred}{';
export function stripGroupOrigins(source: string): string {
  if (source.length > 100_000 || /%|\^\^/.test(source)) throw new Error('Unsupported experimental source encoding.');
  if (/\\(?:htmlId|htmlClass|style)\b/i.test(source)) throw new Error('Unsupported experimental attributes.');
  let markers = 0;
  function scan(from: number, nested: number): { text: string; end: number } {
    if (nested > 64) throw new Error('Experimental grouping depth exceeded.');
    let text = '';
    for (let i = from; i < source.length;) {
      if (source[i] === '}') return { text, end: i + 1 };
      if (source.startsWith('\\htmlData', i)) {
        if (!source.startsWith(originPrefix, i) || ++markers > 128) throw new Error('Unsupported group origin marker.');
        const body = scan(i + originPrefix.length, nested + 1);
        text += body.text; i = body.end;
      } else if (source[i] === '{') {
        const body = scan(i + 1, nested + 1); text += `{${body.text}}`; i = body.end;
      } else if (source[i] === '\\') {
        const token = /^\\(?:[a-zA-Z]+|[^a-zA-Z])/.exec(source.slice(i))?.[0];
        if (!token) throw new Error('Incomplete experimental command.');
        text += token; i += token.length;
      } else { text += source[i]; i++; }
    }
    if (nested) throw new Error('Unclosed experimental group.');
    return { text, end: source.length };
  }
  const result = scan(0, 0);
  if (result.end !== source.length) throw new Error('Unexpected experimental group end.');
  // A top-level closing brace is never admissible, even at end of source.
  let balance = 0;
  for (const token of source.match(/\\[a-zA-Z]+|\\[^a-zA-Z]|[{}]/g) ?? []) {
    if (token === '{') balance++;
    if (token === '}' && --balance < 0) throw new Error('Unexpected experimental group end.');
  }
  if (balance) throw new Error('Unbalanced experimental groups.');
  return result.text;
}

export interface OriginOwner { from: number; to: number; fence: number; bodyFrom: number; bodyTo: number }
export function groupOriginOwners(mf: MathfieldElement): OriginOwner[] {
  stripGroupOrigins(mf.value);
  const rows = Array.from({ length: mf.lastOffset + 1 }, (_, position) => ({ position, info: mf.getElementInfo(position) }));
  const owners: OriginOwner[] = [];
  for (const { position, info } of rows) {
    if (!info?.latex?.startsWith(originPrefix)) continue;
    const depth = info.depth;
    if (depth === undefined) throw new Error('Missing public group depth.');
    let from = position - 1;
    while (from >= 0 && (rows[from].info?.depth ?? -1) > depth) from--;
    const children = rows.slice(from + 1, position).filter(row => row.info?.depth === depth + 1);
    const fence = children[1];
    if (children.length !== 2 || children[0].info?.latex !== '' || !fence?.info?.latex?.startsWith('\\left(') || !fence.info.latex.endsWith('\\right)') ||
        info.latex !== `${originPrefix}${fence.info.latex}}` || mf.getValue(from, position, 'latex') !== info.latex || info.data?.['mok-group'] !== 'inferred') {
      throw new Error('Origin marker must own exactly one parenthesized fence.');
    }
    const bodyFrom = children[0].position + 1;
    if (rows[bodyFrom].info?.latex !== '' || rows[bodyFrom].info?.depth !== depth + 2) throw new Error('Unresolved group body.');
    owners.push({ from, to: position, fence: fence.position, bodyFrom, bodyTo: fence.position - 1 });
  }
  if (owners.length !== mf.value.split(originPrefix).length - 1) throw new Error('Unresolved marker ownership.');
  return owners;
}
