# Progressive mathematical typing: contract and feasibility gate

Date: 2026-11-10

Status: Product behavior approved. Structural experiment completed; the complete gate did not pass. Immediate typing, phantom cues, and regrouping controls are not implemented in the application. The running prototype retains the earlier delayed-conversion slice.

Follow-up: the owner approved the bounded version-1 origin-marker experiment. It was executed in Chromium, Firefox, and WebKit and **also did not pass the complete structural gate**. See [the new evidence and limitations](origin-group-experiment.md) and [ADR 0005](../decisions/0005-origin-marker-experiment-results.md). The original unannotated experiment below remains historical evidence; it is not the version-1 gate.

## Approved interaction contract

Helpful automatic transformations take priority over avoiding every ambiguous guess. Reversibility must preserve typed content.

- In mathematical context, `/` immediately creates a native fraction and enters its denominator. The default numerator is the whole eligible left expression in the current branch, stopping at prose, equality, or a structural boundary.
- `^` immediately creates a power over the nearest complete operand and enters its exponent. Both digits of `23` remain there; automatic first-digit departure must be disabled.
- `/` stays inside the current exponent or denominator. `x ^ 2 ^ 3` means nested powers; `a / b / c` means `a/(b/c)`; `a / b Right / c` means `(a/b)/c`. Spaces between keys in these descriptions are separators, not typed spaces.
- Right at a branch end exits one structure. Space inside a branch inserts mathematical spacing; Space at the outer end of inline math enters prose and inserts a prose space. Escape exits to prose; Enter exits and starts a paragraph, preserving empty branches.
- Promote eligible surrounding math into one inline node. Do not recognize a word suffix: `this/that`, `and/or`, paths, URLs, and `this^that` stay prose. `n/a`, `A/B`, and dates can be mistaken for math; immediate Undo is the correction path. Paste/import/composition/history replay do not trigger promotion by themselves.
- Retain completed-expression Space/Enter recognition where no immediate trigger occurred, such as `x+1`.

Phantom marks surround the actual numerator or power base during creation/active editing. They follow structure edits, disappear when inactive, and return upon re-entry. They are excluded from copied/exported notation. Necessary visible mathematical grouping must remain when inactive: an expanded base must read `(a+b)^2`, not `a+b^2`. Explicit fences remain intact and distinct from temporary cues.

Alt+Up expands the active numerator/base; Alt+Down contracts it, preserving the denominator/exponent and its internal caret. Alternatives follow complete signed operands, products, additive expressions, and enclosing structures. They cannot split identifiers/numbers, absorb prose, cross equality, or consume later material. Scope changes are actual math edits, separately undoable and available after reopen.

The exact ambiguous input `1-(1+i)^-n/` initially creates division inside the exponent with numerator `-n`. Alt+Up lifts it to `(1+i)^(-n)` with `1-` outside; another Alt+Up includes `1-`. Contraction reverses these choices. With an explicit Right before `/`, the default numerator is already the whole left expression.

Trigger insertion and automatic rewrite are separate history events. Immediate Ctrl+Z after `1/` restores literal `1/` and its caret; after `x^`, literal `x^`. Existing surrounding structures are preserved. Redo restores the transformation and internal selection. Undo and subsequent continuation/boundary retyping must not cause a conversion loop; a direct operand edit re-enables eligibility. Later typing and every regrouping operation are separate events in ProseMirror's shared history.

## Reproducible experiment

Start `npm run dev` at localhost:5173, then run `npm run probe:progressive`. Use the README's local Node/browser environment settings when needed. The script uses only public MathLive APIs on scratch fields in isolated Chromium, Firefox, and WebKit pages. It changes neither editor documents nor import policy.

The script deliberately returns a nonzero result because the complete product gate has not passed. Direct Node execution sets exit code 2 for that outcome; unexpected failures throw. Diagnostics are written to ignored `.tools/progressive-math-report.json` and `.tools/progressive-scope-fixtures.png`. The screenshot was visually inspected.

### Demonstrated in all three engines

Thirteen fixtures reopen with identical public offset descriptors and pinned source recovery: empty fraction, empty numerator/denominator, empty exponent, nested empty exponent, nested fraction, the three annuity factors, exponent-local slash, both lifted scopes, and explicit placeholder.

Six capability checks pass:

1. Public depth/fragment descriptors identify branch boundaries for the fixture corpus, including empty branches omitted from MathML.
2. A fixture-specific annuity rewrite contracts and expands the numerator using current range fragments.
3. The denominator caret maps by its relative branch offset.
4. Both rewritten states pass pinned recovery.
5. Rendered numerator atoms provide finite geometry for a potential overlay.
6. Literal slash and caret characters can be retained through public text insertion and recovery.

These are limited capability checks. The annuity rewrite uses the known fixture's structural pattern; it is not a general scope/candidate reader. The experiment does not establish integrated transformation history, arbitrary edit stability, live phantom geometry after reflow, or production input behavior.

### Gate not passed: power-base representation

| Candidate | Observed behavior | Requirement not demonstrated |
| --- | --- | --- |
| `{a+b}^{2}` | MathML has a grouped power base; native rendering reads `a+b²` without parentheses | Required notation must remain visibly correct when cues are inactive |
| `\left(a+b\right)^2` for inferred grouping | Correct native visible parentheses | Same snapshot and public descriptors as explicit native parentheses; inferred-only contraction cannot recover origin after reopening |
| Existing MathML projection | `x^{}` exports as just `x` | Cannot reconstruct unfinished structural scopes from that projection alone |

These results reject the tested unannotated representation strategy. They do **not** prove that every public-API strategy is impossible. Using cosmetic overlays over ambiguous notation, removing explicit fences indiscriminately, or relying on stale source offsets would not pass the approved gate.

### Concrete follow-up option: public origin marker

The controlled scratch source `\htmlData{mok-group=inferred}{\left(a+b\right)}^2` exposes origin on the real group through public `getElementInfo().data`. The marker survives the tested interior edit and pinned recovery/reopen in all three engines. It is attached to actual structure, not a sidecar operand range.

However, the current notebook validator rejects that source with `Active or external mathematical content is unsupported.` Adopting it would change admission and the experimental persistence representation. No such policy or format change was made. A single successful edit/reopen does not establish marker survival under arbitrary edits, clipboard, history, or nesting; inherited `data` must not be mistaken for ownership by every descendant.

Recommend the bounded, versioned origin-marker experiment in [ADR 0004](../decisions/0004-progressive-typing-gate.md), requiring a separate owner decision. It reuses maintained MathLive editing and avoids inventing a general LaTeX parser. A public upstream branch/group API remains an alternative.

## Acceptance corpus for subsequent implementation

- Present-value factor: `1-(1+i)`, `^`, `-n`, Right, `/`, `i`, Right, Space → `(1-(1+i)^(-n))/i`, followed by prose.
- Capital-recovery factor: `i`, `/`, `1-(1+i)`, `^`, `-n`, Right, Right, Space → `i/(1-(1+i)^(-n))`, followed by prose.
- Accumulated annuity factor: `(1+i)`, `^`, `n`, Right, `-1`, `/`, `i`, Right, Space → `((1+i)^n-1)/i`.
- Exponent-local ambiguous slash: both lifts and contractions, with an unchanged populated denominator/exponent and caret.
- Power-base expansion/contraction: filled and empty exponent, inactive appearance, explicit/inferred distinction, edits and reopen.
- English, URLs, mistaken `n/` followed by Undo and `a`, literal triggers, no conversion loops, maximum-speed Undo/Redo, internal selections, and deletion/restoration.
- Clipboard/recovery for every scope, cue alignment after zoom/wrapping/resizing, and exclusion of cue characters from saved/copied content.
- Real IME and owner lecture-note trials in addition to automated browser regressions.

Independent canonical native-format fidelity is still unresolved. A successful versioned experiment would not approve the permanent notebook format.
