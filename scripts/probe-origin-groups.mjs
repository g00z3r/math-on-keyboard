import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { chromium, firefox, webkit } from '@playwright/test';

await mkdir('.tools', { recursive: true });
const reports = [];
for (const [engine, type] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await type.launch();
  try {
    const page = await browser.newPage();
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5173'); await page.waitForSelector('.tiptap');
    const report = await page.evaluate(async () => {
      const { configureMathfield, captureMath } = await import('/src/math/adapter.ts');
      const { originPrefix: prefix, groupOriginOwners: owners, stripGroupOrigins: strip } = await import('/src/math/group-origin.ts');
      const { parseOriginNotebook, encodeOriginNotebook } = await import('/src/document/origin-experiment.ts');
      const { parseNotebook } = await import('/src/document/model.ts');
      const { createEditor } = await import('/src/editor/create-editor.ts');
      const { MathSelection } = await import('/src/editor/math-selection.ts');
      const { closeHistory } = await import('/node_modules/.vite/deps/@tiptap_pm_history.js');
      const checks = [];
      async function check(name, action) {
        try { const detail = await action(); checks.push({ name, passed: true, detail }); }
        catch (error) { checks.push({ name, passed: false, error: error.message }); }
      }
      function require(value, message) { if (!value) throw new Error(message); }
      const mf = document.createElement('math-field'); configureMathfield(mf, true); mf.smartSuperscript = false; document.body.append(mf);
      const group = body => `${prefix}\\left(${body}\\right)}`;
      const rows = () => Array.from({length: mf.lastOffset + 1}, (_, pos) => ({pos, ...mf.getElementInfo(pos)}));
      const book = () => ({ format: 'math-on-keyboard-experiment', version: 1, adapter: 'mathlive-0.111.4+group-origin-1', blocks: [{type: 'paragraph', content: [{type: 'text', text: 'Before '}, {type: 'math', id: 'probe', math: captureMath(mf)}, {type: 'text', text: ' after'}]}] });
      function recover() {
        const before = mf.value, descriptors = JSON.stringify(rows().map(({pos,depth,latex,data}) => ({pos,depth,latex,data})));
        const saved = encodeOriginNotebook(book()), reopened = parseOriginNotebook(saved);
        mf.value = reopened.blocks[0].content[1].math.latex;
        require(before === mf.value && descriptors === JSON.stringify(rows().map(({pos,depth,latex,data}) => ({pos,depth,latex,data}))), 'Recovery changed structure/origin');
        return owners(mf);
      }
      const fixtures = [
        ['populated power', `${group('a+b')}^2`, 1], ['empty power', `${group('a+b')}^{}`, 1],
        ['empty group', `${group('')}^{}`, 1], ['empty fraction', '\\frac{}{}', 0],
        ['nested empty branches', `\\frac{${group('x^{y^{}}')}}{}`, 1],
        ['explicit inside inferred', `${group('a+\\left(b+c\\right)')}^2`, 1],
        ['inferred inside explicit', `\\left(a+${group('b+c')}\\right)^2`, 1],
        ['nested inferred', `${group(`${group('a+b')}+c`)}^2`, 2],
        ['duplicate sibling groups', `${group('a+b')}+${group('a+b')}`, 2],
      ];
      for (const [name, source, count] of fixtures) await check(`ownership/reopen: ${name}`, async () => {
        mf.value = source; const found = recover(); require(found.length === count, 'Wrong owner count');
        require(!strip(mf.value).includes('htmlData'), 'Interchange metadata leaked');
        const nativeProjection = mf.getValue('math-ml'), saved = mf.value;
        mf.value = strip(saved);
        const interchangeProjection = mf.getValue('math-ml');
        const xml = new window.DOMParser().parseFromString(`<math>${interchangeProjection.replaceAll('&nbsp;', '&#160;')}</math>`, 'application/xml');
        require(count === 0 || [...xml.querySelectorAll('mo')].some(node => node.textContent === '('), 'Required interchange parentheses missing');
        mf.value = saved;
        await new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
        require(count === 0 || mf.shadowRoot.textContent.includes('('), 'Native rendered parentheses missing');
        return {source: mf.value, owners: found, nativeProjection, interchangeProjection};
      });
      for (const source of [ `${prefix}a+b}`, `${prefix}\\left(a\\right)+b}`, `${prefix}${group('a')} }`, '\\htmlData{mok-group=wrong}{x}', '\\htmlData{mok-group=inferred,evil=yes}{\\left(x\\right)}', `${group('x')}\\href{bad}{x}`, `${group('x')}\\htmlStyle{color:red}{x}`, `${group('x')}\\class{bad}{x}`, `${group('x')}\\cssId{bad}{x}`, `${group('x')}\\url{bad}`, `${group('x')}\\includegraphics{bad}`, `${group('x')}\\htmlId{bad}{x}`, `${group('x')}\\htmlClass{bad}{x}`, `${group('x')}\\style{color:red}{x}` ]) await check(`reject: ${source}`, () => {
        mf.value = 'x'; const valid = book(); valid.blocks[0].content[1].math.latex = source;
        let rejected = false; try { parseOriginNotebook(JSON.stringify(valid)); } catch { rejected = true; }
        require(rejected, 'Malformed/active source admitted'); require(mf.value === 'x', 'Admission mutated current work');
      });
      await check('version isolation and no migration', () => {
        mf.value = `${group('a+b')}^2`; const source = JSON.stringify(book());
        let rejected = false; try { parseNotebook(source); } catch { rejected = true; } require(rejected, 'Version-0 reader accepted version 1');
        const legacy = book(); legacy.version = 0; legacy.adapter = 'mathlive-0.111.4';
        rejected = false; try { parseNotebook(JSON.stringify(legacy)); } catch { rejected = true; } require(rejected, 'Legacy marker policy relaxed');
        mf.value = 'x'; legacy.blocks[0].content[1].math = captureMath(mf);
        require(parseNotebook(JSON.stringify(legacy)).version === 0, 'Legacy changed');
      });
      for (const command of ['deleteBackward', 'deleteForward']) await check(`fence boundary edit: ${command}`, () => {
        mf.value = `${group('a+b')}^2`; const owner = owners(mf)[0];
        mf.position = command === 'deleteBackward' ? owner.bodyFrom : owner.bodyTo;
        mf.executeCommand(command);
        const edited = mf.value;
        try { const result = recover(); return {source: mf.value, owners: result}; }
        catch (error) { throw new Error(`${error.message} Edited source: ${edited}`, {cause: error}); }
      });
      await check('whole owner deletion/replacement', () => {
        mf.value = `p+${group('a+b')}+q`; let owner = owners(mf)[0];
        mf.selection = {ranges:[[owner.from,owner.to]]}; mf.executeCommand('deleteBackward');
        require(recover().length === 0 && !mf.value.includes('a'), 'Whole owner deletion left metadata');
        mf.value = `p+${group('a+b')}+q`; owner = owners(mf)[0];
        mf.selection = {ranges:[[owner.from,owner.to]]}; mf.insert('z', {format:'latex', selectionMode:'after'});
        require(recover().length === 0 && mf.value.includes('z'), 'Whole owner replacement left metadata');
      });
      await check('intentional marker removal retains explicit fences', () => {
        mf.value = `${group('a+\\left(b+c\\right)')}^2`; const unmarked = strip(mf.value);
        mf.value = unmarked; require(recover().length === 0, 'Marker removal failed');
        require(mf.value === '\\left(a+\\left(b+c\\right)\\right)^2', 'Explicit nested fences changed');
      });
      await check('interior insertion/replacement/deletion', () => {
        mf.value = `${group('a+\\left(b+c\\right)')}^2`;
        const b = rows().find(row => row.latex === 'b');
        mf.selection = {ranges: [[b.pos - 1, b.pos]]}; mf.insert('z', {format:'latex',selectionMode:'after'});
        require(recover().length === 1 && mf.value.includes('z'), 'Interior replacement lost origin');
        mf.executeCommand('deleteBackward'); require(recover().length === 1, 'Interior deletion lost ownership');
      });
      // These are fixture-specific structural rewrites, not a general candidate reader.
      for (const exponent of ['2', '']) await check(`scope expand/contract and bookmark: exponent ${exponent || 'empty'}`, () => {
        mf.value = `a+${group('b+c')}^{${exponent}}`;
        const before = mf.value;
        mf.position = mf.lastOffset - 1; const relative = exponent.length;
        mf.value = `${group('a+b+c')}^{${exponent}}`; mf.position = mf.lastOffset - 1;
        require((mf.getElementInfo(mf.position)?.latex ?? '') === (relative ? exponent : ''), 'Exponent caret changed'); recover();
        mf.value = `a+${group('b+c')}^{${exponent}}`; mf.position = mf.lastOffset - 1;
        require(mf.value === before, 'Scope contraction changed content'); recover();
      });
      await check('annuity slash scope lifts/contractions', () => {
        const scopes = ['1-\\left(1+i\\right)^{\\frac{-n}{d+e}}', '1-\\frac{\\left(1+i\\right)^{-n}}{d+e}', '\\frac{1-\\left(1+i\\right)^{-n}}{d+e}'];
        for (const source of [...scopes, ...scopes.toReversed()]) {
          mf.value = source;
          const descriptors = rows(); const fraction = descriptors.find(row => /^\\frac/.test(row.latex ?? ''));
          let from = fraction.pos - 1; while (descriptors[from].depth > fraction.depth) from--;
          const branches = descriptors.slice(from + 1, fraction.pos).filter(row => row.depth === fraction.depth + 1 && row.latex === '');
          require(branches.length === 2, 'Unresolved fraction branches');
          mf.position = branches[1].pos + 1;
          require(mf.getElementInfo(mf.position)?.latex === 'd', 'Denominator caret mapping changed');
          const caret = mf.position; recover(); mf.position = caret;
          require(mf.getValue(branches[1].pos, fraction.pos - 1, 'latex') === 'd+e', 'Denominator lost');
        }
      });
      const host = document.createElement('div'); document.body.append(host);
      const messages = []; const app = createEditor(host, message => messages.push(message), () => {});
      await check('integrated shared history and inner bookmarks', async () => {
        mf.value = `${group('b+c')}^2`;
        const source = parseOriginNotebook(encodeOriginNotebook(book())); app.open(source);
        const field = app.bridge.fields.get('probe'); field.enter(1);
        await new Promise(resolve => window.setTimeout(resolve, 50));
        const inner = field.mf.lastOffset - 1; field.mf.position = inner;
        app.editor.view.dispatch(closeHistory(app.editor.state.tr).setSelection(new MathSelection(app.editor.state.doc.resolve(8), 'probe', {ranges:[[inner,inner]]})).setMeta('addToHistory', false));
        const before = field.mf.value;
        mf.value = `${group('a+b+c')}^2`; const caret = mf.lastOffset - 1;
        const math = captureMath(mf);
        const tr = closeHistory(app.editor.state.tr).setNodeMarkup(8, undefined, {id:'probe', math});
        tr.setSelection(new MathSelection(tr.doc.resolve(8), 'probe', {ranges:[[caret,caret]]}));
        app.editor.view.dispatch(tr);
        app.editor.view.dispatch(closeHistory(app.editor.state.tr).setMeta('addToHistory',false));
        const after = mf.value;
        app.bridge.history(false); await new Promise(resolve => window.setTimeout(resolve, 30));
        require(field.mf.value === before && field.mf.position === inner, `Undo source/caret mismatch: ${JSON.stringify({before, actual:field.mf.value, expectedCaret:inner,actualCaret:field.mf.position})}`);
        app.bridge.history(true); await new Promise(resolve => window.setTimeout(resolve, 30));
        require(field.mf.value === after && field.mf.position === caret, 'Redo source/caret mismatch');
        require(owners(field.mf).length === 1, 'History lost origin');
      });
      await check('legacy clipboard guard and experimental native payload', () => {
        // Existing application clipboard must reject tagged v0 rather than strip it.
        const source = app.snapshot(); require(source.version === 0, 'Default writer migrated');
        let rejected = false; try { parseNotebook(JSON.stringify(source)); } catch { rejected = true; }
        require(rejected, 'Tagged content silently written as legacy');
        mf.value = app.bridge.fields.get('probe').mf.value;
        const payload = new window.DataTransfer(); payload.setData('application/x-mok-origin-experiment', encodeOriginNotebook(book()));
        const decoded = parseOriginNotebook(payload.getData('application/x-mok-origin-experiment'));
        require(decoded.blocks[0].content[1].math.latex === mf.value, 'Experimental clipboard changed origin');
        return 'Experimental payload round-trip only; production clipboard still rejects tagged version-0 content.';
      });
      for (const part of ['whole owner', 'interior explicit fence']) await check(`MathLive copy/cut/paste: ${part}`, async () => {
        mf.value = `${group('a+\\left(b+c\\right)')}^2`; const owner = owners(mf)[0];
        mf.focus(); await new Promise(resolve => window.setTimeout(resolve, 100));
        const target = rows().find(row => row.latex === '\\left(b+c\\right)');
        mf.selection = {ranges: [part === 'whole owner' ? [owner.from, owner.to] : [target.pos - 4, target.pos]]};
        const sink = mf.shadowRoot.querySelector('[contenteditable]'); require(sink, 'No keyboard sink found');
        const event = (type, data) => {
          const ev = new window.ClipboardEvent(type, {bubbles:true,cancelable:true,composed:true});
          // Firefox ignores constructor clipboardData for untrusted events.
          Object.defineProperty(ev, 'clipboardData', {value:data}); return ev;
        };
        const data = new window.DataTransfer(); sink.dispatchEvent(event('copy', data));
        const plain = data.getData('text/plain'); require(plain.length > 0, `MathLive copy produced no text: ${sink.outerHTML}`);
        const latex = data.getData('application/x-latex') || plain.replace(/^\$\$?|\$\$?$/g, '');
        sink.dispatchEvent(event('cut', new window.DataTransfer()));
        recover(); require(!mf.value.includes(part === 'whole owner' ? 'htmlData' : 'b+c'), 'Cut did not remove selected structure');
        mf.value = ''; sink.dispatchEvent(event('paste', data));
        const pasted = recover();
        require(part !== 'whole owner' || pasted.length === 1, `Whole-owner clipboard lost origin: ${latex}`);
        require(part !== 'interior explicit fence' || pasted.length === 0, 'Inherited metadata incorrectly became owner');
        return {plain, latex, pasted: mf.value};
      });
      await check('default external copy excludes application metadata', () => {
        const copied = checks.find(check => check.name === 'MathLive copy/cut/paste: whole owner');
        require(copied?.passed, 'Whole-owner clipboard trial unavailable');
        require(!copied.detail.plain.includes('htmlData') && !copied.detail.latex.includes('htmlData'), 'Default MathLive text/plain and application/x-latex expose the application origin marker.');
      });
      const savedFixtures = fixtures.map(([name,source]) => { mf.value = source; return {name, source: encodeOriginNotebook(book()), descriptors: rows().map(({pos,depth,latex,data}) => ({pos,depth,latex,data}))}; });
      app.destroy(); host.remove(); mf.remove();
      const panel = document.createElement('section'); panel.id = 'origin-group-probe'; panel.style.cssText = 'background:white;padding:24px;font:16px system-ui';
      for (const [name, source] of fixtures) {
        const label = document.createElement('p'); label.textContent = name;
        const item = document.createElement('math-field'); configureMathfield(item, true); item.style.fontSize = '28px';
        panel.append(label,item); document.body.append(panel); item.value = source;
      }
      return {checks, messages, savedFixtures};
    });
    if (engine === 'chromium') await page.locator('#origin-group-probe').screenshot({path:'.tools/origin-group-fixtures.png'});
    if (engine === 'chromium') {
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);
      await page.locator('#origin-group-probe math-field').first().evaluate(mf => {mf.focus(); mf.select();});
      await page.waitForTimeout(100); await page.keyboard.press('Control+c');
      const copied = await page.evaluate(() => window.navigator.clipboard.readText());
      await page.evaluate(async () => {
        const {configureMathfield} = await import('/src/math/adapter.ts');
        const target = document.createElement('math-field'); configureMathfield(target,true); target.id = 'origin-system-paste'; document.body.append(target); target.focus();
      });
      await page.waitForTimeout(100); await page.keyboard.press('Control+v'); await page.waitForTimeout(100);
      const source = await page.locator('#origin-system-paste').evaluate(mf => mf.value);
      report.checks.push({name:'Chromium system clipboard copy/paste', passed:copied.includes('mok-group=inferred') && source.includes('mok-group=inferred'), detail:{copied,source}});
    }
    // Exercise an actual browser download, reload, and File input, rather than
    // calling a JSON round trip a disk save/reopen test.
    await page.evaluate(fixtures => {
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(new window.Blob([JSON.stringify(fixtures)], {type:'application/json'}));
      link.download = 'origin-fixtures.json'; link.textContent = 'Download experiment fixtures'; document.body.append(link); link.id = 'origin-download';
    }, report.savedFixtures);
    const pendingDownload = page.waitForEvent('download'); await page.locator('#origin-download').click();
    const download = await pendingDownload, path = `.tools/origin-${engine}.json`; await download.saveAs(path);
    await page.reload(); await page.waitForSelector('.tiptap');
    await page.evaluate(() => { const input = document.createElement('input'); input.type = 'file'; input.id = 'origin-reopen'; document.body.append(input); });
    await page.locator('#origin-reopen').setInputFiles(path);
    const disk = await page.evaluate(async () => {
      const {parseOriginNotebook} = await import('/src/document/origin-experiment.ts');
      const {configureMathfield} = await import('/src/math/adapter.ts');
      const {groupOriginOwners} = await import('/src/math/group-origin.ts');
      const fixtures = JSON.parse(await document.querySelector('#origin-reopen').files[0].text());
      const mf = document.createElement('math-field'); configureMathfield(mf,true); document.body.append(mf);
      try {
        for (const fixture of fixtures) {
          const book = parseOriginNotebook(fixture.source); mf.value = book.blocks[0].content[1].math.latex;
          const descriptors = Array.from({length:mf.lastOffset+1}, (_,pos) => {const {depth,latex,data} = mf.getElementInfo(pos); return {pos,depth,latex,data};});
          if (JSON.stringify(descriptors) !== JSON.stringify(fixture.descriptors)) throw new Error(`${fixture.name}: disk reopen changed structure`);
          groupOriginOwners(mf); mf.position = mf.lastOffset; mf.insert('+z', {format:'latex',selectionMode:'after'});
          if (!mf.value.endsWith('+z')) throw new Error(`${fixture.name}: reopened content not editable`);
          groupOriginOwners(mf);
        }
        return {name:'browser download/reload/file reopen/edit',passed:true,detail:`${fixtures.length} fixtures`};
      } catch (error) { return {name:'browser download/reload/file reopen/edit',passed:false,error:error.message}; }
      finally {mf.remove();}
    });
    report.checks.push(disk); delete report.savedFixtures;
    reports.push({engine, ...report, errors});
    console.log(`${engine}: ${report.checks.filter(check => check.passed).length}/${report.checks.length} checks passed; ${errors.length} page errors`);
    for (const check of report.checks.filter(check => !check.passed)) console.log(`  ${check.name}: ${check.error}`);
  } finally { await browser.close(); }
}
await writeFile('.tools/origin-group-report.json', JSON.stringify(reports, null, 2) + '\n');
const passed = reports.every(report => report.errors.length === 0 && report.checks.every(check => check.passed));
console.log(`Complete structural gate: ${passed ? 'PASSED' : 'NOT PASSED'}. Evidence: .tools/origin-group-report.json`);
process.exitCode = passed ? 0 : 2;
