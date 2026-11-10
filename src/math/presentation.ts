// Experimental, application-owned presentation representation. No MathLive atom types.
export type Presentation =
  | { kind: 'text'; value: string }
  | { kind: 'element'; name: string; attributes: Record<string, string>; children: Presentation[] };

const elements = new Set(['math', 'mrow', 'mi', 'mn', 'mo', 'mtext', 'mfrac', 'msqrt', 'mroot',
  'msup', 'msub', 'msubsup', 'mtable', 'mtr', 'mtd', 'mstyle', 'mspace', 'mover', 'munder',
  'munderover', 'menclose', 'mpadded', 'mphantom', 'merror', 'semantics', 'annotation']);
const attributes = new Set(['display', 'displaystyle', 'scriptlevel', 'mathvariant', 'mathsize',
  'mathcolor', 'mathbackground', 'fence', 'separator', 'stretchy', 'symmetric', 'largeop',
  'movablelimits', 'accent', 'accentunder', 'linethickness', 'columnalign', 'rowalign',
  'columnspacing', 'rowspacing', 'width', 'height', 'depth', 'lspace', 'rspace', 'notation',
  'encoding', 'xmlns']);

export function readMathML(source: string): Presentation {
  if (source.length > 100_000 || /<!DOCTYPE|<!ENTITY/i.test(source)) throw new Error('Unsupported or oversized MathML.');
  const doc = new DOMParser().parseFromString(`<math xmlns="http://www.w3.org/1998/Math/MathML">${source}</math>`, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('MathML export could not be parsed.');
  let count = 0;
  function visit(node: globalThis.Node, depth: number): Presentation {
    if (++count > 10_000 || depth > 64) throw new Error('MathML nesting limit exceeded.');
    if (node.nodeType === 3) return { kind: 'text', value: node.textContent ?? '' };
    if (node.nodeType !== 1) throw new Error('Unsupported MathML node.');
    const el = node as Element;
    if (!elements.has(el.localName)) throw new Error(`Unsupported MathML element: ${el.localName}`);
    const attrs: Record<string, string> = {};
    for (const attr of [...el.attributes]) {
      if (!attributes.has(attr.name)) throw new Error(`Unsupported MathML attribute: ${attr.name}`);
      attrs[attr.name] = attr.value;
    }
    return { kind: 'element', name: el.localName, attributes: attrs, children: [...el.childNodes].map(child => visit(child, depth + 1)) };
  }
  return visit(doc.documentElement, 0);
}

const symbols: Record<string, string> = {
  '−': '-', '×': '\\times ', '⋅': '\\cdot ', '÷': '\\div ', '≤': '\\le ', '≥': '\\ge ',
  '≠': '\\ne ', '∞': '\\infty ', 'α': '\\alpha ', 'β': '\\beta ', 'γ': '\\gamma ',
  'δ': '\\delta ', 'θ': '\\theta ', 'λ': '\\lambda ', 'π': '\\pi ', 'Σ': '\\Sigma ',
  'σ': '\\sigma ', 'χ': '\\chi ', 'ω': '\\omega ', '∑': '\\sum ', '∫': '\\int ',
  '{': '\\{', '}': '\\}', '%': '\\%', '#': '\\#', '&': '\\&', '$': '\\$',
};

// Deliberately bounded structural serializer, not a general LaTeX parser.
// Unsupported presentation is reported, never flattened into a guessed expression.
export function presentationToLatex(node: Presentation): string {
  if (node.kind === 'text') return [...node.value].map(char => symbols[char] ?? char).join('');
  const parts = node.children.map(presentationToLatex);
  const group = (index: number) => `{${parts[index] ?? ''}}`;
  const joined = parts.join('');
  const styled = Object.keys(node.attributes).filter(key => !['xmlns', 'display', 'displaystyle', 'fence', 'stretchy', 'symmetric'].includes(key));
  if (styled.length) throw new Error(`Tree-only restoration does not support ${styled.join(', ')}.`);
  switch (node.name) {
    case 'math': case 'mrow': case 'mi': case 'mn': case 'mo': case 'mtd': return joined;
    case 'mtext': return `\\text{${joined}}`;
    case 'mfrac': return `\\frac${group(0)}${group(1)}`;
    case 'msqrt': return `\\sqrt{${joined}}`;
    case 'mroot': return `\\sqrt[${parts[1] ?? ''}]${group(0)}`;
    case 'msup': return `${group(0)}^${group(1)}`;
    case 'msub': return `${group(0)}_${group(1)}`;
    case 'msubsup': return `${group(0)}_${group(1)}^${group(2)}`;
    case 'mtable': return `\\begin{matrix}${parts.join('\\\\')}\\end{matrix}`;
    case 'mtr': return parts.join('&');
    default: throw new Error(`Tree-only restoration does not support ${node.name}.`);
  }
}

export function validatePresentation(value: unknown, depth = 0, budget = { count: 0 }): asserts value is Presentation {
  if (++budget.count > 10_000 || depth > 64 || !value || typeof value !== 'object') throw new Error('Invalid presentation tree.');
  const node = value as Record<string, unknown>;
  if (node.kind === 'text' && typeof node.value === 'string' && node.value.length <= 100_000 && Object.keys(node).length === 2) return;
  if (node.kind !== 'element' || typeof node.name !== 'string' || !elements.has(node.name) || !Array.isArray(node.children) || !node.attributes || typeof node.attributes !== 'object' || Object.keys(node).length !== 4) throw new Error('Invalid presentation element.');
  for (const [key, val] of Object.entries(node.attributes)) {
    if (!attributes.has(key) || typeof val !== 'string' || val.length > 1000) throw new Error('Invalid presentation attribute.');
  }
  for (const child of node.children) validatePresentation(child, depth + 1, budget);
}
