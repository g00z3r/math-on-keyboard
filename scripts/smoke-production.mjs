import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { URL } from 'node:url';
import { chromium } from '@playwright/test';

// Run `npm run build` and `npm run preview -- --port 4173` first.
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errors = [];
  const remote = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (/^https?:/.test(request.url()) && new URL(request.url()).origin !== 'http://127.0.0.1:4173') remote.push(request.url()); });
  await page.goto('http://127.0.0.1:4173');
  const prose = page.getByRole('textbox', { name: 'Notebook document' });
  await prose.click(); await page.keyboard.type('The answer is 1/2 because it is an editable fraction.');
  assert.equal(await prose.evaluate(el => document.activeElement === el), true);
  await page.getByRole('button', { name: '2 × 2 matrix', exact: true }).click();
  await page.keyboard.type('1'); await page.keyboard.press('Tab'); await page.keyboard.type('x');
  await page.keyboard.press('Tab'); await page.keyboard.type('3'); await page.keyboard.press('Tab'); await page.keyboard.type('4');
  await page.evaluate(() => document.fonts.ready);
  assert.equal(await page.locator('math-field').count(), 2);
  assert.deepEqual(await page.locator('math-field').first().evaluate(el => {
    const xml = new window.DOMParser().parseFromString(`<math>${el.getValue('math-ml')}</math>`, 'application/xml');
    return [...xml.querySelector('mfrac').children].map(child => child.textContent);
  }), ['1', '2']);
  assert.match(await page.locator('math-field').last().evaluate(el => el.value), /bmatrix/);
  assert.deepEqual(errors, []);
  assert.deepEqual(remote, []);
  await mkdir('.tools', { recursive: true });
  await page.screenshot({ path: '.tools/production-smoke.png', fullPage: true });
  console.log('Production smoke passed: prose, editable fraction and matrix; local assets; no page exceptions.');
} finally { await browser.close(); }
