import { test, expect, type Page } from '@playwright/test';
import type { MathfieldElement } from 'mathlive';
import type { Notebook } from '../src/document/model';

async function book(page: Page): Promise<Notebook> {
  return JSON.parse(await page.getByTestId('document-json').textContent() ?? 'null') as Notebook;
}
async function latex(page: Page, index = 0) { return page.locator('math-field').nth(index).evaluate(el => (el as MathfieldElement).value); }
async function dimensions(page: Page) {
  return page.locator('math-field').first().evaluate(el => {
    const doc = new DOMParser().parseFromString(`<math>${(el as MathfieldElement).getValue('math-ml')}</math>`, 'application/xml');
    const rows = [...doc.querySelectorAll('mtable > mtr')];
    return rows.map(row => [...row.children].map(cell => cell.textContent));
  });
}
test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('/');
  await expect(page.getByRole('textbox', { name: 'Notebook document' })).toBeVisible();
});

test('arrow handoff, internal selection replacement, and whole-equation deletion restore through history', async ({ page }) => {
  const prose = page.getByRole('textbox', { name: 'Notebook document' });
  await prose.click(); await page.keyboard.type('A ');
  await page.keyboard.press('Control+Alt+m'); await page.keyboard.type('x+1');
  await expect.poll(() => latex(page)).toBe('x+1');
  await page.keyboard.press('Escape'); await page.keyboard.type(' B');
  await page.keyboard.press('Control+Home'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.locator('math-field').evaluate(el => document.activeElement === el)).toBe(true);
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Shift+ArrowRight');
  const selected = await page.locator('math-field').evaluate(el => (el as MathfieldElement).selection);
  expect(selected.ranges[0][0]).not.toBe(selected.ranges[0][1]);
  await page.keyboard.type('-');
  await expect.poll(() => latex(page)).toBe('x-1');
  await page.keyboard.press('Control+z');
  await expect.poll(() => latex(page)).toBe('x+1');
  await expect.poll(() => page.locator('math-field').evaluate(el => (el as MathfieldElement).selection.ranges)).toEqual(selected.ranges);
  await page.keyboard.press('End'); await page.keyboard.press('ArrowRight');
  await expect.poll(() => page.locator('.tiptap').evaluate(el => document.activeElement === el)).toBe(true);
  await page.keyboard.press('Shift+ArrowLeft'); await page.keyboard.press('Delete');
  await expect(page.locator('math-field')).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect(page.locator('math-field')).toHaveCount(1);
  await expect.poll(() => latex(page)).toBe('x+1');
});

test('display equations have prose destinations on both sides, including at document edges', async ({ page }) => {
  await page.getByRole('button', { name: 'Display math', exact: true }).click();
  await page.keyboard.type('x^2');
  await page.keyboard.press('End'); await page.keyboard.press('ArrowRight');
  await page.keyboard.type('After');
  const doc = page.getByRole('textbox', { name: 'Notebook document' });
  await expect(doc).toContainText('After');
  await expect(page.locator('math-field')).toHaveCount(1);
  await page.keyboard.press('Home'); await page.keyboard.press('ArrowLeft');
  await expect.poll(() => page.locator('math-field').evaluate(el => document.activeElement === el)).toBe(true);
  await page.keyboard.press('Home'); await page.keyboard.press('ArrowLeft'); await page.keyboard.type('Before');
  await expect(doc).toContainText('Before');
  await expect.poll(() => latex(page)).toBe('x^2');
});

test('matrix shrinking confirms removed content, preserves on cancel, and can be undone', async ({ page }) => {
  await page.getByRole('button', { name: '2 × 2 matrix', exact: true }).click();
  await page.keyboard.type('1'); await page.keyboard.press('Tab'); await page.keyboard.type('2');
  await page.keyboard.press('Tab'); await page.keyboard.type('3'); await page.keyboard.press('Tab'); await page.keyboard.type('4');
  const handle = page.getByRole('button', { name: 'Resize matrix boundary' });
  await handle.focus();
  page.once('dialog', dialog => dialog.dismiss());
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => dimensions(page)).toEqual([['1', '2'], ['3', '4']]);
  // History remains the document's history while the boundary control has focus.
  await page.keyboard.press('Control+z');
  await expect.poll(() => dimensions(page)).toEqual([['1', '2'], ['3', '']]);
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(() => dimensions(page)).toEqual([['1', '2'], ['3', '4']]);
  await handle.focus();
  page.once('dialog', dialog => dialog.accept());
  await page.keyboard.press('ArrowUp');
  await expect.poll(() => dimensions(page)).toEqual([['1', '2']]);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => dimensions(page)).toEqual([['1', '2'], ['3', '4']]);
});

test('supported LaTeX paste is editable; malformed math paste leaves the selection intact', async ({ page }) => {
  await page.getByRole('button', { name: 'Inline math', exact: true }).click();
  await page.locator('math-field').evaluate(el => {
    const data = new DataTransfer(); data.setData('text/plain', '\\frac{1}{2}');
    const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: data });
    el.dispatchEvent(event);
  });
  await expect.poll(() => latex(page)).toBe('\\frac{1}{2}');
  await page.keyboard.press('Control+a');
  const selected = await page.locator('math-field').evaluate(el => (el as MathfieldElement).selection.ranges[0]);
  expect(selected[0]).not.toBe(selected[1]);
  const previous = await latex(page);
  await page.locator('math-field').evaluate(el => {
    const data = new DataTransfer(); data.setData('text/plain', '\\unknowncommand{1}');
    const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: data });
    el.dispatchEvent(event);
  });
  await expect(page.locator('.status')).toContainText('Paste rejected');
  expect(await latex(page)).toBe(previous);
  await page.keyboard.press('Control+z');
  await expect.poll(() => latex(page)).toBe('');
});

test('ordinary multi-line paste stays prose and is one undoable operation', async ({ page }) => {
  const prose = page.getByRole('textbox', { name: 'Notebook document' });
  await prose.click(); await page.keyboard.type('Notes: ');
  await prose.evaluate(el => {
    const data = new DataTransfer(); data.setData('text/plain', 'Price $5\nx + y');
    const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: data });
    el.dispatchEvent(event);
  });
  await expect(prose).toContainText('Price $5');
  await expect(prose).toContainText('x + y');
  await expect(page.locator('math-field')).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect(prose).toHaveText('Notes: ');
});

test('native system clipboard preserves mixed content and regenerates equation identities', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'System clipboard permissions differ; event-level clipboard tests run on all engines.');
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.evaluate(() => navigator.clipboard.writeText(''));
  const prose = page.getByRole('textbox', { name: 'Notebook document' });
  await prose.click(); await page.keyboard.type('A ');
  await page.getByRole('button', { name: 'Fraction', exact: true }).click();
  await page.keyboard.type('1'); await page.keyboard.press('ArrowDown'); await page.keyboard.type('2');
  await page.keyboard.press('Escape'); await page.keyboard.type(' B');
  await page.keyboard.press('Control+a'); await page.keyboard.press('Control+c');
  await expect.poll(() => page.evaluate(() => navigator.clipboard.readText())).toContain('\\frac');
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('Control+v');
  await expect(page.locator('math-field')).toHaveCount(2);
  const ids = await page.locator('[data-math-id]').evaluateAll(elements => elements.map(el => el.getAttribute('data-math-id')));
  expect(new Set(ids).size).toBe(2);
  await page.keyboard.press('Control+z');
  await expect(page.locator('math-field')).toHaveCount(1);
  await page.keyboard.press('Control+a'); await page.keyboard.press('Control+x');
  await expect(page.locator('math-field')).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect(page.locator('math-field')).toHaveCount(1);
});

test('invalid native file is rejected without replacing current work', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Notebook document' }).fill('Keep these notes');
  await page.getByLabel('Open notebook file').setInputFiles({ name: 'future.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ format: 'math-on-keyboard-experiment', version: 999, adapter: 'mathlive-0.111.4', blocks: [] })) });
  await expect(page.locator('.status')).toContainText('Unsupported notebook');
  await expect(page.getByRole('textbox', { name: 'Notebook document' })).toContainText('Keep these notes');
});

test('public adapter fixture corpus records recovery success separately from tree-only failures', async ({ page }) => {
  const results = await page.evaluate(async () => {
    const path = '/src/math/adapter.ts';
    const { withProbe, captureMath, validateRecovery, testTreeRestoration } = await import(path);
    const fixtures = ['\\frac{1}{2}', '\\frac{1}{}', '\\frac{1}{\\placeholder{}}', '\\begin{bmatrix}1&\\\\&4\\end{bmatrix}', '\\frac{1}{\\frac{}{2}}', '\\sqrt{x^2+1}', '\\alpha+x', '\\left(x+1\\right)^2'];
    return fixtures.map(input => {
      const snapshot = withProbe((mf: MathfieldElement) => { mf.value = input; return captureMath(mf); });
      validateRecovery(snapshot);
      return { input, tree: testTreeRestoration(snapshot) };
    });
  });
  expect(results).toHaveLength(8);
  expect(results[0].tree.passed).toBe(true);
  expect(results[2].tree.passed).toBe(false);
  expect(results[3].tree.passed).toBe(false);
});

test('flowing prose, editable fraction, and chronological keyboard undo/redo', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const prose = page.getByRole('textbox', { name: 'Notebook document' });
  await prose.click();
  await page.keyboard.type('Let ');
  await page.keyboard.press('Control+Alt+f');
  await expect(page.locator('math-field')).toHaveCount(1);
  await page.keyboard.type('1');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.type('2');
  await expect.poll(() => latex(page)).toBe('\\frac12');
  await page.keyboard.press('Escape');
  await page.keyboard.type(' follows.');
  await expect(prose).toContainText('follows.');
  const complete = await book(page);
  await page.keyboard.press('Control+z');
  await expect(prose).not.toContainText('follows.');
  await page.keyboard.press('Control+z');
  await expect.poll(() => latex(page)).not.toBe('\\frac12');
  await expect.poll(() => page.locator('math-field').evaluate(el => document.activeElement === el)).toBe(true);
  await page.keyboard.press('Control+Shift+z');
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(() => book(page)).toEqual(complete);
  expect(errors).toEqual([]);
});

test('matrix cell Tab navigation and boundary drag are one undoable resize', async ({ page }) => {
  await page.getByRole('button', { name: '2 × 2 matrix', exact: true }).click();
  await page.keyboard.type('1'); await page.keyboard.press('Tab');
  await page.keyboard.type('2'); await page.keyboard.press('Tab');
  await page.keyboard.type('3'); await page.keyboard.press('Tab');
  await page.keyboard.type('4');
  await expect.poll(() => dimensions(page)).toEqual([['1', '2'], ['3', '4']]);
  const handle = page.getByRole('button', { name: 'Resize matrix boundary' });
  await expect(handle).toBeVisible();
  const bounds = (await handle.boundingBox())!;
  await page.mouse.move(bounds.x + 10, bounds.y + 10);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 50, bounds.y + 42, { steps: 8 });
  await page.mouse.up();
  // MathLive's supported addRowAfter command creates editable placeholder slots.
  await expect.poll(() => dimensions(page)).toEqual([['1', '2', ''], ['3', '4', ''], ['?', '?', '']]);
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  await expect.poll(() => dimensions(page)).toEqual([['1', '2'], ['3', '4']]);
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  await expect.poll(() => dimensions(page)).toHaveLength(3);
});

test('download/reload/reopen retains editable unfinished fractions and empty matrix cells', async ({ page }, testInfo) => {
  await page.getByRole('button', { name: 'Fraction', exact: true }).click();
  await page.keyboard.type('x');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '2 × 2 matrix', exact: true }).click();
  await page.keyboard.type('1');
  await expect.poll(async () => JSON.stringify(await book(page))).toContain('bmatrix}1');
  const original = await book(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup' }).click();
  const download = await downloadPromise;
  const path = testInfo.outputPath('roundtrip.mok.json');
  await download.saveAs(path);
  await page.reload();
  await page.getByLabel('Open notebook file').setInputFiles(path);
  await expect(page.locator('.status')).toContainText('reopened');
  await expect.poll(() => book(page)).toEqual(original);
  await expect(page.locator('math-field')).toHaveCount(2);
  await page.locator('math-field').first().click();
  await page.keyboard.press('End');
  await page.keyboard.type('+1');
  await expect.poll(() => latex(page)).toContain('+1');
});

test('a fraction within a matrix cell keeps cell-level Tab, Shift+Tab, and vertical arrows', async ({ page }) => {
  await page.getByRole('button', { name: '2 × 2 matrix', exact: true }).click();
  await page.keyboard.press('Control+Alt+f');
  await page.keyboard.type('1'); await page.keyboard.press('ArrowDown'); await page.keyboard.type('2');
  await page.keyboard.press('Tab'); await page.keyboard.type('x');
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('ArrowDown'); await page.keyboard.type('y');
  await expect.poll(() => dimensions(page)).toEqual([['12', 'x'], ['y', '']]);
  await expect.poll(() => latex(page)).toContain('\\frac12');
});

test('pointer drag from math into prose promotes the complete equation and undo restores it', async ({ page }) => {
  const prose = page.getByRole('textbox', { name: 'Notebook document' });
  await prose.click(); await page.keyboard.type('A ');
  await page.getByRole('button', { name: 'Inline math', exact: true }).click(); await page.keyboard.type('x+1');
  await page.keyboard.press('Escape'); await page.keyboard.type(' trailing prose');
  const bounds = (await page.locator('math-field').boundingBox())!;
  const target = await prose.evaluate(el => {
    const text = el.querySelector('p')!.lastChild!;
    const range = document.createRange(); range.selectNodeContents(text);
    const rect = range.getBoundingClientRect(); return { x: rect.right - 1, y: rect.top + rect.height / 2 };
  });
  await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
  await page.mouse.down(); await page.mouse.move(target.x, target.y, { steps: 12 }); await page.mouse.up();
  await page.keyboard.press('Backspace');
  await expect(page.locator('math-field')).toHaveCount(0);
  await page.keyboard.press('Control+z');
  await expect(page.locator('math-field')).toHaveCount(1);
  await expect.poll(() => latex(page)).toBe('x+1');
});

test('prose reflows around inline math and pushes display content when the viewport narrows', async ({ page }, testInfo) => {
  const prose = page.getByRole('textbox', { name: 'Notebook document' });
  await prose.click(); await page.keyboard.type('A sentence with ');
  await page.getByRole('button', { name: 'Fraction', exact: true }).click();
  await page.keyboard.type('1'); await page.keyboard.press('ArrowDown'); await page.keyboard.type('2');
  await page.keyboard.press('Escape'); await page.keyboard.type(' and more flowing prose.'.repeat(8));
  await page.getByRole('button', { name: '2 × 2 matrix', exact: true }).click();
  const before = await page.locator('.tiptap > p').first().boundingBox();
  const original = await book(page);
  await page.setViewportSize({ width: 480, height: 900 });
  const after = await page.locator('.tiptap > p').first().boundingBox();
  const display = await page.locator('.display-math').boundingBox();
  expect(after!.height).toBeGreaterThan(before!.height);
  expect(display!.y).toBeGreaterThanOrEqual(after!.y + after!.height);
  expect(await book(page)).toEqual(original);
  await page.screenshot({ path: testInfo.outputPath('flowing-document.png'), fullPage: true });
});

test('immediate undo flushes delayed MathLive input instead of undoing preceding prose', async ({ page }) => {
  await page.getByRole('textbox', { name: 'Notebook document' }).click(); await page.keyboard.type('Keep ');
  await page.getByRole('button', { name: 'Inline math', exact: true }).click();
  await page.keyboard.type('x');
  await page.keyboard.press('Control+z');
  await expect.poll(() => latex(page)).toBe('');
  await expect(page.getByRole('textbox', { name: 'Notebook document' })).toContainText('Keep');
  await page.keyboard.press('Control+Shift+z');
  await expect.poll(() => latex(page)).toBe('x');
});
