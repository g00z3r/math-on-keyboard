import { describe, expect, it } from 'vitest';
import { originPrefix, stripGroupOrigins } from './group-origin';

describe('bounded origin syntax', () => {
  it('removes only the exact wrapper and retains necessary fences and explicit nested groups', () => {
    expect(stripGroupOrigins(`${originPrefix}\\left(a+${originPrefix}\\left(b+c\\right)}\\right)}^{}`)).toBe('\\left(a+\\left(b+c\\right)\\right)^{}');
    expect(stripGroupOrigins('\\frac{}{\\left(x\\right)}')).toBe('\\frac{}{\\left(x\\right)}');
  });
  it.each([
    '\\htmlData{mok-group=explicit}{x}', '\\htmlData{mok-group=inferred,onclick=bad}{x}',
    '\\htmlData {mok-group=inferred}{x}', '\\htmlData{other=inferred}{x}',
    `${originPrefix}x`, 'x}', '{x', '% hidden', '^^5chtmlData',
    '{'.repeat(66) + 'x' + '}'.repeat(66), `${originPrefix}x}`.repeat(129),
  ])('rejects unsupported or malformed syntax: %s', source => expect(() => stripGroupOrigins(source)).toThrow());
});
