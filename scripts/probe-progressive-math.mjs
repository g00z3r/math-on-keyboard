import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { chromium, firefox, webkit } from '@playwright/test';

// Start `npm run dev` first. This is a feasibility experiment, not application behavior.
// Exit 2 means the required feature gate did not pass; unexpected probe errors exit 1.
await mkdir('.tools', { recursive: true });
const reports = [];
for (const [engine, browserType] of Object.entries({ chromium, firefox, webkit })) {
  const browser = await browserType.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 1000 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:5173');
    await page.waitForSelector('.tiptap');
    const report = await page.evaluate(async () => {
      const { configureMathfield, captureMath, validateRecovery } = await import('/src/math/adapter.ts');
      const { emptyNotebook, parseNotebook } = await import('/src/document/model.ts');
      const Mf = window.customElements.get('math-field');
      const panel = document.createElement('section');
      panel.id = 'progressive-structure-probe';
      panel.style.cssText = 'background:white;padding:24px;margin:24px;font:16px system-ui';
      document.body.append(panel);
      function field(source, label) {
        const row = document.createElement('div'); row.style.cssText = 'padding:16px;border-bottom:1px solid #ccc';
        const heading = document.createElement('p'); heading.textContent = label;
        const mf = new Mf(); configureMathfield(mf, true); mf.smartSuperscript = false;
        mf.style.cssText = 'font-size:28px;display:inline-block';
        row.append(heading, mf); panel.append(row); mf.setValue(source, { silenceNotifications: true });
        return mf;
      }
      const atoms = mf => Array.from({ length: mf.lastOffset + 1 }, (_, position) => {
        const info = mf.getElementInfo(position);
        return { position, depth: info?.depth, latex: info?.latex };
      });
      // Candidate mapping from public postfix descriptors, with branch-boundary checks.
      // It does not read private atoms or parse arbitrary LaTeX.
      function containers(mf) {
        const rows = atoms(mf);
        return rows.flatMap(row => {
          const kind = /^\\(?:frac|dfrac|tfrac)/.test(row.latex ?? '') ? 'fraction'
            : /^\^/.test(row.latex ?? '') ? 'power' : null;
          if (!kind) return [];
          let first = row.position - 1;
          while (first >= 0 && rows[first].depth > row.depth) first--;
          const boundaries = rows.slice(first + 1, row.position).filter(child => child.depth === row.depth + 1 && child.latex === '');
          const expected = kind === 'fraction' ? 2 : 1;
          if (boundaries.length !== expected) throw new Error(`Unresolved ${kind} branch boundaries`);
          const branches = boundaries.map((boundary, index) => {
            const to = (boundaries[index + 1]?.position ?? row.position) - 1;
            return { from: boundary.position, to, source: mf.getValue(boundary.position, to, 'latex') };
          });
          return [{ kind, end: row.position, branches }];
        });
      }
      function recover(mf) {
        const snapshot = captureMath(mf), before = atoms(mf);
        validateRecovery(snapshot);
        const reopened = field(snapshot.latex, 'Scratch reopened fixture');
        const same = reopened.value === snapshot.latex && JSON.stringify(atoms(reopened)) === JSON.stringify(before);
        reopened.parentElement.remove();
        return same;
      }
      const fixtures = [
        ['empty fraction', '\\frac{}{}'],
        ['empty numerator', '\\frac{}{i}'],
        ['empty denominator', '\\frac{1}{}'],
        ['empty exponent', 'x^{}'],
        ['nested empty exponent', 'x^{y^{}}'],
        ['nested fractions', '\\frac{a}{\\frac{b}{c}}'],
        ['present-value factor', '\\frac{1-\\left(1+i\\right)^{-n}}{i}'],
        ['capital-recovery factor', '\\frac{i}{1-\\left(1+i\\right)^{-n}}'],
        ['accumulated annuity factor', '\\frac{\\left(1+i\\right)^n-1}{i}'],
        ['exponent-local slash', '1-\\left(1+i\\right)^{\\frac{-n}{}}'],
        ['first lifted scope', '1-\\frac{\\left(1+i\\right)^{-n}}{}'],
        ['second lifted scope', '\\frac{1-\\left(1+i\\right)^{-n}}{}'],
        ['explicit placeholder', '\\frac{1}{\\placeholder{}}'],
      ].map(([name, source]) => {
        const mf = field(source, name), structure = containers(mf);
        const result = { name, source, structure, recovery: recover(mf), mathml: mf.getValue('math-ml') };
        mf.parentElement.remove(); return result;
      });

      // Reconstruct both numerator ranges from current public data, including after reopen.
      // A fixture-specific rewrite is evidence for range manipulation, not a generic scope reader.
      const annuity = field('\\frac{1-\\left(1+i\\right)^{-n}}{i}', 'Annuity range experiment');
      const original = annuity.value;
      const outer = containers(annuity).find(item => item.kind === 'fraction');
      annuity.position = outer.branches[1].to;
      const relativeCaret = annuity.position - outer.branches[1].from;
      const numerator = outer.branches[0], denominator = outer.branches[1];
      const descriptors = atoms(annuity);
      const lastPower = descriptors.findLast(row => row.depth === 1 && /^\^/.test(row.latex ?? ''));
      let groupEnd = lastPower.position - 1;
      while (descriptors[groupEnd].depth > 1) groupEnd--;
      let groupStart = groupEnd - 1;
      while (descriptors[groupStart].depth > 1) groupStart--;
      const prefix = annuity.getValue(numerator.from, groupStart, 'latex');
      const term = annuity.getValue(groupStart, lastPower.position, 'latex');
      annuity.setValue(`${prefix}\\frac{${term}}{${denominator.source}}`, { silenceNotifications: true });
      const contracted = annuity.value, contractedFraction = containers(annuity).find(item => item.kind === 'fraction');
      annuity.position = contractedFraction.branches[1].from + relativeCaret;
      const caretMapped = annuity.position === contractedFraction.branches[1].to;
      const contractedRecovery = recover(annuity);
      const all = atoms(annuity);
      const fractionEnd = contractedFraction.end;
      let fractionStart = fractionEnd - 1;
      while (all[fractionStart].depth > 0) fractionStart--;
      const outerPrefix = annuity.getValue(0, fractionStart, 'latex');
      annuity.setValue(`\\frac{${outerPrefix}${contractedFraction.branches[0].source}}{${contractedFraction.branches[1].source}}`, { silenceNotifications: true });
      const expandedRecovery = recover(annuity);
      const roundTripGrouping = annuity.value === original;
      await new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
      const numeratorScope = containers(annuity).find(item => item.kind === 'fraction').branches[0];
      const scopeBounds = Array.from({ length: numeratorScope.to - numeratorScope.from }, (_, index) => annuity.getElementInfo(numeratorScope.from + index + 1)?.bounds)
        .filter(rect => rect && rect.width > 0 && rect.height > 0);
      const geometryAvailable = scopeBounds.length > 0 && scopeBounds.every(rect => [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite));
      annuity.parentElement.remove();

      const literals = ['/', '^'].map(trigger => {
        const mf = field('x', 'Literal trigger experiment'); mf.position = mf.lastOffset;
        mf.insert(trigger, { mode: 'text', format: 'latex', selectionMode: 'after', silenceNotifications: true });
        const result = { trigger, source: mf.value, mathml: mf.getValue('math-ml'), recovery: recover(mf) };
        mf.parentElement.remove(); return result;
      });

      const invisible = field('{a+b}^{2}', 'Invisible structural group: native rendering omits required parentheses');
      const inferred = field('\\left(a+b\\right)^2', 'Candidate inferred-base representation using a native fence');
      const explicit = field('\\left(a+b\\right)^2', 'Explicit parentheses: same persisted native representation');
      const invisibleML = invisible.getValue('math-ml');
      const invisibleHasOperandGroup = /<msup><mrow>/.test(invisibleML);
      const invisibleRendersRequiredFences = /<mo>\(<\/mo>/.test(invisibleML) && /<mo>\)<\/mo>/.test(invisibleML);
      const sameSnapshot = JSON.stringify(captureMath(inferred)) === JSON.stringify(captureMath(explicit));
      const samePublicDescriptors = JSON.stringify(atoms(inferred)) === JSON.stringify(atoms(explicit));
      // Evaluate an alternative without admitting it into the application's format.
      const marked = field('\\htmlData{mok-group=inferred}{\\left(a+b\\right)}^2', 'Origin marker alternative');
      const plus = atoms(marked).find(row => row.latex === '+');
      marked.position = plus.position;
      marked.insert('c', { format: 'latex', selectionMode: 'after', silenceNotifications: true });
      const markerSurvivesEdit = atoms(marked).some(row => marked.getElementInfo(row.position)?.data?.['mok-group'] === 'inferred');
      const markerSnapshot = captureMath(marked);
      const markerRecovery = recover(marked);
      const reopenedMarker = field(markerSnapshot.latex, 'Origin marker reopened');
      const markerSurvivesReopen = atoms(reopenedMarker).some(row => reopenedMarker.getElementInfo(row.position)?.data?.['mok-group'] === 'inferred');
      const notebook = emptyNotebook();
      notebook.blocks[0].content.push({ type: 'math', id: 'origin-marker-probe', math: markerSnapshot });
      let admissionError = null;
      try { parseNotebook(JSON.stringify(notebook)); } catch (error) { admissionError = error.message; }
      const originMarkerExperiment = { source: markerSnapshot.latex, markerSurvivesEdit, markerRecovery, markerSurvivesReopen, admittedByCurrentNotebook: admissionError === null, admissionError };
      marked.parentElement.remove(); reopenedMarker.parentElement.remove();
      const emptyPower = fixtures.find(item => item.name === 'empty exponent');
      await new Promise(resolve => window.requestAnimationFrame(() => window.requestAnimationFrame(resolve)));
      return {
        fixtures,
        demonstrated: {
          branchMappingAndRecovery: fixtures.every(item => item.recovery),
          fixtureNumeratorContractionAndExpansion: roundTripGrouping,
          denominatorCaretMapping: caretMapped,
          recoveryAfterRegrouping: contractedRecovery && expandedRecovery,
          numeratorGeometry: geometryAvailable,
          literalTriggerRecovery: literals.every(item => item.recovery),
        },
        regrouping: { original, contracted, expanded: annuity.value },
        literals,
        originMarkerExperiment,
        representationGate: {
          invisibleHasOperandGroup,
          invisibleRendersRequiredFences,
          nativeFenceSnapshotsIdentical: sameSnapshot,
          nativeFencePublicDescriptorsIdentical: samePublicDescriptors,
          inferredAndExplicitOriginRecoverableFromCandidate: !(sameSnapshot && samePublicDescriptors),
          emptyExponentPresentInMathML: /<msup>/.test(emptyPower.mathml),
        },
        conclusion: 'The unannotated candidate does not pass the complete gate: invisible base grouping lacks required native notation; native fences do not distinguish inferred from explicit grouping after reopening. A controlled public origin marker survives the tested edit/reopen, but the current notebook rejects it. A versioned admission/representation experiment is a next option, not an adopted workaround. This is not proof that every possible public-API adapter is impossible.',
      };
    });
    assert.deepEqual(errors, [], `${engine}: page errors`);
    for (const [name, passed] of Object.entries(report.demonstrated)) assert.equal(passed, true, `${engine}: ${name}`);
    assert.equal(report.representationGate.invisibleHasOperandGroup, true);
    assert.equal(report.representationGate.invisibleRendersRequiredFences, false);
    assert.equal(report.representationGate.nativeFenceSnapshotsIdentical, true);
    assert.equal(report.representationGate.nativeFencePublicDescriptorsIdentical, true);
    assert.equal(report.representationGate.emptyExponentPresentInMathML, false);
    assert.equal(report.originMarkerExperiment.markerSurvivesEdit, true);
    assert.equal(report.originMarkerExperiment.markerRecovery, true);
    assert.equal(report.originMarkerExperiment.markerSurvivesReopen, true);
    assert.equal(report.originMarkerExperiment.admittedByCurrentNotebook, false);
    if (engine === 'chromium') await page.locator('#progressive-structure-probe').screenshot({ path: '.tools/progressive-scope-fixtures.png' });
    reports.push({ engine, ...report });
    console.log(`${engine}: ${report.fixtures.length} recovery fixtures and six capability checks passed; representation gate NOT PASSED.`);
  } finally { await browser.close(); }
}
await writeFile('.tools/progressive-math-report.json', JSON.stringify(reports, null, 2) + '\n');
console.log('Evidence: .tools/progressive-math-report.json and .tools/progressive-scope-fixtures.png');
console.log('Stopped at the approved structural feasibility gate. Progressive input and phantom grouping are not implemented.');
process.exitCode = 2;
