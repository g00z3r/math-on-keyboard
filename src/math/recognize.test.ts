import { describe, expect, it } from 'vitest';
import { recognizeMath } from './recognize';

describe('bounded mathematical typing grammar', () => {
  it.each([
    ['1/2', '\\frac{1}{2}'], ['x/2', '\\frac{x}{2}'], ['a/b', '\\frac{a}{b}'],
    ['x^2', '{x}^{2}'], ['2^3', '{2}^{3}'], ['x+1', 'x+1'], ['2x+1', '2x+1'],
    ['1.5/2.25', '\\frac{1.5}{2.25}'], ['x^2/3', '\\frac{{x}^{2}}{3}'],
    ['(x+1)/2', '\\frac{\\left(x+1\\right)}{2}'], ['a/(b/c)', '\\frac{a}{\\left(\\frac{b}{c}\\right)}'],
    ['(a/b)/c', '\\frac{\\left(\\frac{a}{b}\\right)}{c}'], ['1/(2x)', '\\frac{1}{\\left(2x\\right)}'],
    ['(1/2)*x', '\\left(\\frac{1}{2}\\right)\\cdot x'], ['x^(2^3)', '{x}^{\\left({2}^{3}\\right)}'],
    ['-x^2', '-{x}^{2}'], ['(-x)^2', '{\\left(-x\\right)}^{2}'],
    ['x=1/2', 'x=\\frac{1}{2}'], ['x/2+1/3', '\\frac{x}{2}+\\frac{1}{3}'],
    ['1/0', '\\frac{1}{0}'], ['2*3', '2\\cdot 3'],
    ['x*2y', 'x\\cdot 2y'],
    ['-2x+1', '-2x+1'], ['2x^2', '2{x}^{2}'],
  ])('recognizes %s without evaluation', (source, latex) => {
    expect(recognizeMath(source)?.latex).toBe(latex);
  });

  it.each([
    '', 'x', '23', '2x', '(x)', '1+2', '2026-11-10', '1-2', 'x + 1',
    'and/or', 'km/h', 'file/name', 'https://example.com/1/2', 'C:/1/2', './1/2',
    'n/a', 'N/A', '1/2/2026', '2026/11', '11/2026',
    'a/b/c', '1/2x', '2x/3', 'x^2^3', 'xy+1', 'speed/time', 'sin(x)',
    '1/', 'x^', 'x+', '(x+1', 'x+1)', 'x==2', 'x=(y=2)', 'a//b', '.5/2',
    'x_2', '\\frac{1}{2}', 'x+<b>', 'x\n+1', 'x\ufffc/2',
  ])('preserves literal %s', source => { expect(recognizeMath(source)).toBeNull(); });

  it('retains trailing punctuation outside the expression', () => {
    const result = recognizeMath('1.5/2.25,!?');
    expect(result?.source).toBe('1.5/2.25');
    expect(result?.punctuation).toBe(',!?');
  });

  it('bounds the complete token and parentheses', () => {
    expect(recognizeMath('1/'.padEnd(257, '2'))).toBeNull();
    expect(recognizeMath('('.repeat(16) + 'x+1' + ')'.repeat(16))).not.toBeNull();
    expect(recognizeMath('('.repeat(17) + 'x+1' + ')'.repeat(17))).toBeNull();
  });
});
