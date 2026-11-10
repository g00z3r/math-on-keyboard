import { test, expect, type Page } from '@playwright/test';
import type { MathfieldElement } from 'mathlive';
import type { Notebook } from '../src/document/model';

const prose = (page: Page) => page.getByRole('textbox', { name: 'Notebook document' });
const book = async (page: Page): Promise<Notebook> => JSON.parse(await page.getByTestId('document-json').textContent() ?? 'null');
const selection = async (page: Page) => JSON.parse(await page.getByTestId('selection-json').textContent() ?? 'null');
async function fraction(page: Page, index = 0) {
  return page.locator('math-field').nth(index).evaluate(el => {
    const xml = new DOMParser().parseFromString(`<math>${(el as MathfieldElement).getValue('math-ml')}</math>`, 'application/xml');
    return [...(xml.querySelector('mfrac')?.children ?? [])].map(child => child.textContent);
  });
}
async function paste(page: Page, source: string) {
  await prose(page).evaluate((el, text) => {
    const data = new DataTransfer(); data.setData('text/plain', text);
    const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: data }); el.dispatchEvent(event);
  }, source);
}

test.beforeEach(async ({ page }) => {
  page.on('pageerror', error => { throw error; });
  await page.goto('/'); await prose(page).click();
});

test('continuous sentence converts without math focus and keeps subsequent prose in its own history group', async ({ page }) => {
  await page.keyboard.type('The answer is 1/2 because...');
  await expect(page.locator('math-field')).toHaveCount(1);
  expect(await fraction(page)).toEqual(['1', '2']);
  const sentence = await book(page);
  expect(sentence.blocks[0]).toMatchObject({ type: 'paragraph', content: [
    { type: 'text', text: 'The answer is ' }, { type: 'math' }, { type: 'text', text: ' because...' },
  ] });
  await expect(prose(page)).toBeFocused();
  await page.keyboard.press('Control+z');
  expect((await book(page)).blocks[0]).toMatchObject({ content: [{ type: 'text', text: 'The answer is ' }, { type: 'math' }, { type: 'text', text: ' ' }] });
  await page.keyboard.press('Control+z');
  await expect(prose(page)).toHaveText('The answer is 1/2 ');
  expect(await selection(page)).toEqual({ type: 'text', anchor: 19, head: 19 });
  await page.keyboard.press('Control+Shift+z'); await page.keyboard.press('Control+Shift+z');
  expect(await book(page)).toEqual(sentence);
  await expect(prose(page)).toBeFocused();
});

test('Enter conversion retains paragraph break and restores the exact prose caret through toolbar undo/redo', async ({ page }) => {
  await page.keyboard.type('Answer: x/2'); await page.keyboard.press('Enter');
  const converted = await book(page), caret = await selection(page);
  expect(converted.blocks).toHaveLength(2); expect(await fraction(page)).toEqual(['x', '2']);
  expect(caret).toEqual({ type: 'text', anchor: 12, head: 12 });
  await page.getByRole('button', { name: 'Undo', exact: true }).click();
  expect((await book(page)).blocks).toEqual([{ type: 'paragraph', content: [{ type: 'text', text: 'Answer: x/2' }] }, { type: 'paragraph', content: [] }]);
  expect(await selection(page)).toEqual({ type: 'text', anchor: 14, head: 14 });
  await page.getByRole('button', { name: 'Redo', exact: true }).click();
  expect(await book(page)).toEqual(converted); expect(await selection(page)).toEqual(caret);
  await prose(page).focus(); await page.keyboard.type('Next sentence');
  expect((await book(page)).blocks[1]).toEqual({ type: 'paragraph', content: [{ type: 'text', text: 'Next sentence' }] });
});

test('punctuation waits for a boundary and stays prose outside decimal fractions', async ({ page }) => {
  await page.keyboard.type('1.5/2.25,');
  await expect(page.locator('math-field')).toHaveCount(0);
  await page.keyboard.press('Space'); await page.keyboard.type('next');
  expect(await fraction(page)).toEqual(['1.5', '2.25']);
  expect((await book(page)).blocks[0]).toMatchObject({ content: [{ type: 'math' }, { type: 'text', text: ', next' }] });
});

test('navigation, blur and backup do not convert an unfinished typing candidate', async ({ page }) => {
  await page.keyboard.type('1/2'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowRight');
  await page.getByRole('heading', { name: /Math on Keyboard/ }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup', exact: true }).click(); await download;
  await expect(page.locator('math-field')).toHaveCount(0);
  await expect(prose(page)).toHaveText('1/2');
  await prose(page).focus(); await page.keyboard.press('Control+End'); await page.keyboard.press('Space');
  expect(await fraction(page)).toEqual(['1', '2']);
});

test('compact compound expressions use structured fractions and powers without consuming prose', async ({ page }) => {
  const sources = ['x^2', '2^3', '(x+1)/2', 'x^2/3', 'x+1', '2x+1', 'a/(b/c)', '(a/b)/c', '1/(2x)', '(1/2)*x', 'x^(2^3)', '-x^2', '(-x)^2', 'x=1/2'];
  await page.keyboard.type(sources.join(' ') + ' done');
  await expect(page.locator('math-field')).toHaveCount(sources.length);
  const shapes = await page.locator('math-field').evaluateAll(elements => elements.map(el => {
    const xml = new DOMParser().parseFromString(`<math>${(el as MathfieldElement).getValue('math-ml')}</math>`, 'application/xml');
    return { fractions: xml.querySelectorAll('mfrac').length, powers: xml.querySelectorAll('msup').length, text: xml.documentElement.textContent };
  }));
  expect(shapes[0].powers).toBe(1); expect(shapes[2].fractions).toBe(1);
  expect(shapes[3]).toMatchObject({ fractions: 1, powers: 1 });
  expect(shapes[6].fractions).toBe(2); expect(shapes[10].powers).toBe(2);
  await expect(prose(page)).toBeFocused(); await expect(prose(page)).toContainText(' done');
});

test('English, paths, dates, ambiguous grouping, incomplete and oversized tokens stay literal', async ({ page }) => {
  const source = 'and/or km/h file/name n/a N/A 1/2/2026 2026/11 11/2026 https://site.test/1/2 C:/1/2 ./1/2 a/b/c 1/2x 2x/3 x^2^3 x^ (x+1 xy+1 x==2 x + 1 2026-11-10 1-2 ' + '1/' + '2'.repeat(255) + ' ' + '('.repeat(17) + 'x+1' + ')'.repeat(17) + ' ';
  await page.keyboard.type(source);
  await expect(page.locator('math-field')).toHaveCount(0); await expect(prose(page)).toHaveText(source);
});

test('undo suppression survives boundary and punctuation edits until the expression changes', async ({ page }) => {
  await page.keyboard.type('1/2 '); await page.keyboard.press('Control+z');
  await page.keyboard.press('Backspace'); await page.keyboard.type(', ');
  await expect(page.locator('math-field')).toHaveCount(0);
  await expect(prose(page)).toHaveText('1/2, ');
  await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace');
  await page.keyboard.press('Backspace'); await page.keyboard.type('3 ');
  expect(await fraction(page)).toEqual(['1', '3']);
  await page.keyboard.press('Control+z');
  await page.keyboard.press('Backspace'); await page.keyboard.press('Backspace'); await page.keyboard.press('Space');
  await expect(page.locator('math-field')).toHaveCount(0); // Incomplete 1/ stays literal.
});

test('plain paste and selected replacement require a subsequent direct expression edit', async ({ page }) => {
  await paste(page, '1/2'); await page.keyboard.press('Space');
  await expect(page.locator('math-field')).toHaveCount(0);
  await page.keyboard.press('Backspace'); await page.keyboard.type('3 ');
  expect(await fraction(page)).toEqual(['1', '23']);
  await page.keyboard.type('x/2');
  await page.keyboard.press('Shift+ArrowLeft'); await page.keyboard.type('3 ');
  await expect(page.locator('math-field')).toHaveCount(1); await expect(prose(page)).toContainText(' x/3 ');
});

test('synthetic composition clears typing eligibility; later direct editing can enable conversion', async ({ page }) => {
  await page.keyboard.type('1/2');
  await prose(page).evaluate(el => {
    el.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    el.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '2' }));
  });
  await page.keyboard.press('Space'); await expect(page.locator('math-field')).toHaveCount(0);
  await page.keyboard.press('Backspace'); await page.keyboard.type('3 ');
  expect(await fraction(page)).toEqual(['1', '23']);
});

test('conversion within existing prose preserves following text and never takes a mid-token prefix', async ({ page }) => {
  await page.keyboard.type('Before 1/2after');
  for (let index = 0; index < 5; index++) await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('Space'); await expect(page.locator('math-field')).toHaveCount(0);
  await page.keyboard.press('ArrowLeft'); await page.keyboard.type('3 ');
  expect(await fraction(page)).toEqual(['1', '23']);
  await expect(prose(page)).toContainText('Before'); await expect(prose(page)).toContainText(' after');
});

test('converted fraction supports mouse and explicit structural navigation, selection and history', async ({ page }) => {
  await page.keyboard.type('A 1/2 B');
  await page.locator('math-field').click();
  await page.keyboard.press('Home'); await page.keyboard.press('ArrowRight');
  await page.keyboard.type('3');
  expect(await fraction(page)).toEqual(['31', '2']);
  await page.keyboard.press('ArrowDown'); await page.keyboard.type('4 z');
  const branches = await fraction(page);
  expect(branches[0]).toBe('31'); expect(branches[1]).toContain('z');
  await expect(page.locator('math-field')).toBeFocused();
  // MathLive input notifications are asynchronous. Await the committed value before taking a history fixture.
  const value = await page.locator('math-field').evaluate(el => (el as MathfieldElement).value);
  await expect.poll(async () => JSON.stringify(await book(page))).toContain(JSON.stringify(value));
  const edited = await book(page);
  await page.keyboard.press('Control+z'); expect(await book(page)).not.toEqual(edited);
  await page.keyboard.press('Control+Shift+z'); expect(await book(page)).toEqual(edited);
  await page.keyboard.press('Escape'); await expect(prose(page)).toBeFocused();
  await page.keyboard.press('Shift+ArrowLeft'); await page.keyboard.press('Delete');
  await expect(page.locator('math-field')).toHaveCount(0);
  await page.keyboard.press('Control+z'); await expect(page.locator('math-field')).toHaveCount(1);
  expect(await book(page)).toEqual(edited);
});

test('converted structures and ordinary pasted input survive backup/reopen and remain editable', async ({ page }, testInfo) => {
  await page.keyboard.type('The answer is 1/2 because (x+1)/2 works. ');
  await paste(page, 'x^2');
  const original = await book(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup', exact: true }).click();
  const download = await downloadPromise, path = testInfo.outputPath('typed.mok.json');
  await download.saveAs(path); await page.reload();
  await page.getByLabel('Open notebook file').setInputFiles(path);
  await expect(page.locator('.status')).toContainText('reopened'); expect(await book(page)).toEqual(original);
  await prose(page).focus(); await page.keyboard.press('Control+End'); await page.keyboard.press('Space');
  await expect(page.locator('math-field')).toHaveCount(2);
  await page.locator('math-field').first().click(); await page.keyboard.press('End'); await page.keyboard.type('+1');
  await expect.poll(() => page.locator('math-field').first().evaluate(el => (el as MathfieldElement).value)).toContain('+1');
});

test('converted nested fractions and powers remain structurally editable', async ({ page }) => {
  await page.keyboard.type('a/(b/c) x^2 ');
  const nested = page.locator('math-field').first();
  await nested.click();
  await nested.evaluate(el => {
    const mf = el as MathfieldElement;
    const offset = Array.from({ length: mf.lastOffset + 1 }, (_, index) => index).find(index => mf.getElementInfo(index)?.latex === 'b');
    if (offset === undefined) throw new Error('Public inner-numerator position unavailable');
    mf.position = offset;
  });
  await page.keyboard.type('z'); await page.keyboard.press('ArrowDown'); await page.keyboard.type('w');
  await expect.poll(() => nested.evaluate(el => (el as MathfieldElement).getValue('math-ml'))).toContain('w');
  const branches = await nested.evaluate(el => {
    const xml = new DOMParser().parseFromString(`<math>${(el as MathfieldElement).getValue('math-ml')}</math>`, 'application/xml');
    return [...xml.querySelectorAll('mfrac')[1].children].map(child => child.textContent);
  });
  expect(branches[0]).toContain('z'); expect(branches[1]).toContain('w');
  const power = page.locator('math-field').last();
  await power.click(); await page.keyboard.press('End'); await page.keyboard.press('ArrowLeft'); await page.keyboard.type('3');
  await expect.poll(() => power.evaluate(el => {
    const xml = new DOMParser().parseFromString(`<math>${(el as MathfieldElement).getValue('math-ml')}</math>`, 'application/xml');
    return [...xml.querySelector('msup')!.children].map(child => child.textContent);
  })).toEqual(['x', '23']);
});

test('converted mixed content reflows and retains native clipboard fidelity', async ({ page }) => {
  await page.keyboard.type('A sentence with 1/2 followed by enough prose to wrap across a narrow document width.');
  const original = await book(page);
  const height = await page.locator('.tiptap > p').evaluate(el => el.getBoundingClientRect().height);
  await page.setViewportSize({ width: 400, height: 900 });
  expect(await page.locator('.tiptap > p').evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThan(height);
  expect(await book(page)).toEqual(original);
  await page.keyboard.press('Control+a');
  const data = await prose(page).evaluate(el => {
    const clipboard = new DataTransfer(), event = new ClipboardEvent('copy', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: clipboard }); el.dispatchEvent(event);
    return clipboard.getData('application/x-math-on-keyboard');
  });
  expect(JSON.parse(data).notebook).toEqual(original);
  await page.keyboard.press('ArrowRight');
  await prose(page).evaluate((el, payload) => {
    const clipboard = new DataTransfer(); clipboard.setData('application/x-math-on-keyboard', payload);
    const event = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
    Object.defineProperty(event, 'clipboardData', { value: clipboard }); el.dispatchEvent(event);
  }, data);
  await expect(page.locator('math-field')).toHaveCount(2);
  const ids = await page.locator('[data-math-id]').evaluateAll(elements => elements.map(el => el.getAttribute('data-math-id')));
  expect(new Set(ids).size).toBe(2);
  await page.keyboard.press('Control+z'); expect(await book(page)).toEqual(original);
});
