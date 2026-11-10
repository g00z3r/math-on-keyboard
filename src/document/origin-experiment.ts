// Deliberately opt-in: no application import/save/paste path uses version 1.
import { parseNotebook, type Block, type Notebook } from './model';
import { stripGroupOrigins, groupOriginOwners } from '../math/group-origin';
import { validateRecovery, withProbe } from '../math/adapter';

export interface OriginNotebook {
  format: 'math-on-keyboard-experiment';
  version: 1;
  adapter: 'mathlive-0.111.4+group-origin-1';
  blocks: Block[];
}
export function parseOriginNotebook(source: string): OriginNotebook {
  if (source.length > 2_000_000) throw new Error('Experimental notebook size exceeded.');
  const data = JSON.parse(source);
  if (data?.format !== 'math-on-keyboard-experiment' || data.version !== 1 || data.adapter !== 'mathlive-0.111.4+group-origin-1') throw new Error('Unsupported origin experiment version.');
  // Reuse all version-0 validation on a validation-only copy. Never replace the
  // returned recovery source with the metadata-free interchange representation.
  const validation = structuredClone(data);
  validation.version = 0; validation.adapter = 'mathlive-0.111.4';
  function snapshots(book: Notebook | OriginNotebook) {
    return book.blocks.flatMap(block => block.type === 'displayMath' ? [block.math] : block.content.flatMap(item => item.type === 'math' ? [item.math] : []));
  }
  // Validate shape before traversal, using a JSON reviver on the copy only.
  const sanitized = JSON.parse(JSON.stringify(validation), (key, value) => key === 'latex' && typeof value === 'string' ? stripGroupOrigins(value) : value);
  parseNotebook(JSON.stringify(sanitized));
  for (const snapshot of snapshots(data)) {
    validateRecovery(snapshot);
    withProbe(mf => {
      mf.value = snapshot.latex;
      if (mf.errors.length) throw new Error('Malformed experimental mathematics.');
      groupOriginOwners(mf);
    });
  }
  return data;
}
export function encodeOriginNotebook(book: OriginNotebook): string {
  const source = JSON.stringify(book, null, 2);
  parseOriginNotebook(source);
  return source;
}
