# Bounded group-origin experiment

Date: 2026-11-10

**Outcome: complete structural gate NOT PASSED.** The owner authorized ADR 0004's bounded experiment. The exact marker resolves origin ownership for the tested intact groups, but ordinary boundary deletion leaves tagged groups outside the admissible representation. Default clipboard output also exposes metadata. This is evidence against shipping the tested adapter, not proof that MathLive/Tiptap can never support progressive typing.

## Reproduce and inspect

Start `npm run dev` on localhost:5173, then run `npm run probe:origin-groups`. Use the README's project-local Node 22 and Playwright browser environment settings. No dependency changes are required. The command sets exit code 2 when any required check fails (the Windows command wrapper reported exit 1); unexpected harness errors throw. It records each check independently instead of treating a known failure as a pass.

Ignored evidence:

- `.tools/origin-group-report.json`: complete per-engine results, owning ranges, source, projections, clipboard contents, and errors.
- `.tools/origin-group-fixtures.png`: Chromium native rendering, visually inspected. Parentheses render correctly around expanded bases. Empty branches are retained structurally even when their inactive rendering offers no visible slot.
- `.tools/origin-{chromium,firefox,webkit}.json`: actual browser-downloaded fixture bundles, subsequently reopened through a File input after page reload.

## Representation and admission boundary

`src/document/origin-experiment.ts` is opt-in and is imported only by the experiment harness. Version 1 uses format `math-on-keyboard-experiment` and adapter `mathlive-0.111.4+group-origin-1`. No application menu, ordinary save, file reader, or clipboard handler enables it. Version-0 admission and writing remain unchanged; tagged content is rejected by the old reader. Existing files are not migrated. This is not the canonical native format.

The lexical envelope reader admits only exact `\htmlData{mok-group=inferred}{...}` syntax, with source/depth/marker bounds. It removes wrappers on a validation-only copy and reuses all version-0 shape, identity, presentation, size, and active-content checks. It additionally rejects alternate HTML ID/class/style aliases, comments, and alternate character encoding in this narrow experiment. It is not a general mathematical parser.

Admission then uses the pinned public MathLive recovery check, syntax errors, depth descriptors, and whole-range fragments. Every marker must own exactly one native `\left(...\right)` fence. The wrapper has one branch sentinel and one fence at the next depth. Its exact public range must reproduce the wrapper source. Inherited `getElementInfo().data` on interior explicit fences does not establish ownership. Duplicate sibling and nested inferred groups have separate owners. Reopening must retain every source marker and descriptor. Scope membership comes from the current field, never saved offsets.

`stripGroupOrigins()` produces metadata-free LaTeX while retaining native fences. Use it only on admitted content for interchange. Raw MathLive MathML **drops marked operands**: the marked `(a+b)^2` projects as `<msup><mn>2</mn></msup>`. Reloading the stripped source into a scratch field produces the ordinary fenced MathML. Empty exponents remain omitted by that projection. No production exporter was implemented, and raw MathML cannot be trusted as a lossless source.

## Executed results

No automatic retries; no page exceptions in any engine.

| Engine on Windows | Passed | Failed | Clipboard coverage |
| --- | ---: | ---: | --- |
| Chromium | 36 / 39 | 3 | Injected MathLive copy/cut/paste, experimental payload, actual system copy/paste |
| Firefox | 35 / 38 | 3 | Injected MathLive copy/cut/paste and experimental payload |
| WebKit | 35 / 38 | 3 | Injected MathLive copy/cut/paste and experimental payload |

The three failed checks are the same in each engine. The system clipboard check confirms recovery-source preservation, while the separate metadata-exclusion check fails. Synthetic clipboard events target the rendered keyboard sink; Firefox requires explicitly defining `clipboardData` on the event. These tests exercise the real library handlers but do not establish operating-system clipboard behavior in Firefox/WebKit. WebKit automation is not real Safari.

Passing coverage:

- Nine ownership/reopen fixtures: populated and empty powers, empty marked group, empty fraction, nested empty exponents within a fraction, explicit inside inferred, inferred inside explicit, nested inferred, identical sibling groups.
- Fourteen rejected malformed/active payloads: non-fence ownership, extra siblings/double wrapper, wrong or extra marker attributes, external/active commands, and HTML attribute aliases. Admission does not modify the current scratch field.
- Version isolation and unchanged version-0 marker rejection.
- Whole-owner deletion and replacement, intentional marker removal with both explicit fences retained, and insertion/replacement/deletion inside a nested explicit group.
- Filled and empty exponent expansion/contraction fixtures; both annuity scope lifts and reverse contractions. Current public branch boundaries map the populated denominator's relative caret through each annuity state.
- One integrated Tiptap/ProseMirror structural rewrite, separate history event, exact source and exponent bookmark restoration through Undo/Redo. The new snapshot and bookmark are dispatched atomically; mutating the live field before dispatch lets selection notifications overwrite the previous bookmark and is unsuitable for this experiment.
- Native experimental payload round-trip and legacy clipboard rejection. Whole-owner library copy/cut/paste preserves its origin; copying the inner explicit fence does not create an inferred owner. Cuts actually remove the selected structure.
- Actual download/reload/File-input reopening of all nine fixtures per browser, descriptor equality, and continued editable insertion after reopen.

The scope tests are controlled fixture rewrites, not a general operand/candidate reader or keyboard implementation. Bookmarks use current structure and are regenerated for each state. The experiment does not establish general selection mapping, arbitrary edit stability, immediate `/`/`^` promotion, cue lifecycle/alignment under reflow, or the complete progressive-input acceptance corpus.

## Reproduced blockers

1. **Ordinary fence deletion violates ownership and save admission.** Starting with `\htmlData{mok-group=inferred}{\left(a+b\right)}^2`, Backspace at the body start produces `\htmlData{mok-group=inferred}{\left.a+b\right)}^2`. Delete at the body end produces `\htmlData{mok-group=inferred}{\left(a+b\right.}^2`. The wrapper survives, but its fence becomes one-sided. Strict ownership rejects both states. Blindly allowing them would not establish required visible semantic grouping. Removing the marker blindly would lose provenance. No automatic repair, stripped save, or edit rollback was added.
2. **Default external clipboard channels expose the application marker.** Both `text/plain` and `application/x-latex` contain `htmlData` when copying a whole owner. Native/internal recovery and external interchange need distinct, validated serialization. The existing app clipboard writes version 0 and must continue rejecting this tagged content. The isolated version-1 payload proves serialization only; production clipboard integration remains deferred.
3. **Raw marked MathML omits operands.** The existing independent-format blocker worsens with tags. A checked, metadata-free interchange projection works for tested populated notation, but remains insufficient for unfinished structure recovery.

## Recommendation

Keep progressive integration gated. First seek a public MathLive contract for group ownership/provenance, incomplete fence mutation, lossless unfinished-state recovery, and structural selection mappings. A minimal upstream reproduction can use the two boundary sources above plus the marked MathML and clipboard examples; no upstream message was sent.

A further bounded adapter investigation could instead define reversible origin handling for incomplete/deleted fences, implement separate native and metadata-free clipboard channels, and rerun this corpus with generalized scope discovery and history mapping. Do not claim the present three failures are fundamental impossibilities; the experiment has not demonstrated a reliable repair policy. Any consequential change to established fence-editing semantics requires owner direction.

If the public interface cannot preserve those invariants, evaluate another maintained math editor with the same corpus before changing architecture. A broader versioned structural-model experiment is another option requiring a separate decision. A private fork, handwritten general parser, weaker fidelity target, or permanent format adoption is not authorized by this experiment. Real IME, owner lecture-note, and real Safari trials remain outstanding.
