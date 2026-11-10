/** A deliberately bounded typing grammar. MathLive still parses the generated LaTeX. */
export type TypedExpression =
  | { kind: 'number'; value: string }
  | { kind: 'letter'; value: string }
  | { kind: 'group'; body: TypedExpression }
  | { kind: 'unary'; sign: '+' | '-'; body: TypedExpression }
  | { kind: 'binary'; op: '+' | '-' | '*' | '/' | '^' | '='; left: TypedExpression; right: TypedExpression; implicit?: boolean };

export interface RecognizedMath { source: string; punctuation: string; expression: TypedExpression; latex: string }

export function expressionSource(token: string): string { return token.replace(/[.,;:!?]+$/, ''); }

export function recognizeMath(token: string): RecognizedMath | null {
  if (!token || token.length > 256) return null;
  const source = expressionSource(token);
  if (!source || /[^0-9a-zA-Z.+\-*/^=()]/.test(source) || /^n\/a$/i.test(source)
    || /^\d{4}\/\d+$|^\d+\/\d{4}$/.test(source)) return null;
  let cursor = 0, depth = 0;
  const peek = () => source[cursor] ?? '';
  const fail = (): never => { throw new Error('Not an eligible expression'); };
  function primary(): TypedExpression {
    if (peek() === '(') {
      if (++depth > 16) fail();
      cursor++;
      const body = sum();
      if (peek() !== ')') fail();
      cursor++; depth--;
      return { kind: 'group', body };
    }
    const number = /^\d+(?:\.\d+)?/.exec(source.slice(cursor));
    if (number) { cursor += number[0].length; return { kind: 'number', value: number[0] }; }
    if (/[a-zA-Z]/.test(peek()) && peek()) return { kind: 'letter', value: source[cursor++] };
    return fail();
  }
  function power(): TypedExpression {
    const left = primary();
    if (peek() !== '^') return left;
    cursor++;
    // A second power at this level is deliberately not consumed.
    let sign: '+' | '-' | undefined;
    if (peek() === '+' || peek() === '-') sign = source[cursor++] as '+' | '-';
    let right = primary();
    if (sign) right = { kind: 'unary', sign, body: right };
    return { kind: 'binary', op: '^', left, right };
  }
  function unary(): TypedExpression {
    if (peek() === '+' || peek() === '-') {
      const sign = source[cursor++] as '+' | '-';
      return { kind: 'unary', sign, body: power() };
    }
    return power();
  }
  function factor(): TypedExpression {
    let left = unary();
    // Only a numeric coefficient followed by a single letter is implicit.
    const coefficient = left.kind === 'number' || left.kind === 'unary' && left.body.kind === 'number';
    if (coefficient && /[a-zA-Z]/.test(peek()) && peek()) {
      left = { kind: 'binary', op: '*', left, right: power(), implicit: true };
    }
    return left;
  }
  function product(): TypedExpression {
    let left = factor(), divisions = 0;
    let implicit = left.kind === 'binary' && left.implicit === true;
    while (peek() === '*' || peek() === '/') {
      const op = source[cursor++] as '*' | '/';
      if (op === '/' && (++divisions > 1 || implicit)) fail();
      const right = factor();
      implicit ||= right.kind === 'binary' && right.implicit === true;
      if (divisions && implicit) fail();
      left = { kind: 'binary', op, left, right };
    }
    return left;
  }
  function sum(): TypedExpression {
    let left = product();
    while (peek() === '+' || peek() === '-') {
      const op = source[cursor++] as '+' | '-';
      left = { kind: 'binary', op, left, right: product() };
    }
    return left;
  }
  try {
    let expression = sum();
    if (peek() === '=') {
      cursor++;
      expression = { kind: 'binary', op: '=', left: expression, right: sum() };
    }
    if (cursor !== source.length || !/[*/^=]|[a-zA-Z].*[+-]|[+-].*[a-zA-Z]/.test(source)) return null;
    return { source, punctuation: token.slice(source.length), expression, latex: typingLatex(expression) };
  } catch { return null; }
}

function typingLatex(expression: TypedExpression): string {
  if (expression.kind === 'number' || expression.kind === 'letter') return expression.value;
  if (expression.kind === 'group') return `\\left(${typingLatex(expression.body)}\\right)`;
  if (expression.kind === 'unary') return expression.sign + typingLatex(expression.body);
  const left = typingLatex(expression.left), right = typingLatex(expression.right);
  if (expression.op === '/') return `\\frac{${left}}{${right}}`;
  if (expression.op === '^') return `{${left}}^{${right}}`;
  if (expression.op === '*') return left + (expression.implicit ? '' : '\\cdot ') + right;
  return left + expression.op + right;
}
