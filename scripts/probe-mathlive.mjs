import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  page.on('pageerror', error => console.error(error.message));
  await page.goto('http://127.0.0.1:5173');
  await page.waitForSelector('.tiptap');
  console.log(JSON.stringify(await page.evaluate(() => {
    const mf = new (window.customElements.get('math-field'))();
    document.body.append(mf);
    const results = ['\\frac{1}{\\placeholder{}}', '\\frac{1}{}', '\\begin{bmatrix}1&\\\\&4\\end{bmatrix}', '\\left(x+1\\right)^2', '\\frac{1}{\\frac{}{2}}', '\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}'].map(latex => {
      mf.value = latex;
      return { input: latex, latex: mf.value, mathml: mf.getValue('math-ml'), offsets: Array.from({ length: mf.lastOffset + 1 }, (_, pos) => ({ pos, info: mf.getElementInfo(pos) })) };
    });
    mf.remove();
    return results;
  }), null, 2));
} finally { await browser.close(); }
