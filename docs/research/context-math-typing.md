# Context-sensitive typing contract and evidence

The behavior specified here is the earlier implemented slice. Product requirements are superseded by [the approved progressive typing contract](progressive-math-typing.md). That feature is stopped at its structural feasibility gate; this delayed-conversion implementation remains the current runtime.

Date: 2026-11-10. Approved plan implemented; owner acceptance pending.

## Interaction contract

Write `The answer is 1/2 because...` continuously. The Space after `1/2` replaces only that expression with a native editable fraction, inserts a normal prose space, and leaves the caret after it. Enter similarly commits eligible input and starts the next paragraph. Neither action enters the math field.

| Input followed by Space/Enter | Behavior |
| --- | --- |
| `1/2`, `x/2`, `a/b`, `1.5/2.25` | Stacked editable fraction |
| `x^2`, `2^3`, `2x^2`, `x^(2^3)` | Editable powers |
| `(x+1)/2`, `x^2/3`, `a/(b/c)`, `(a/b)/c` | Grouped structured expressions |
| `x+1`, `2x+1`, `x=1/2` | One structured algebraic expression |
| `1/2,` | Fraction; comma stays prose |
| `and/or`, `km/h`, `file/name`, `n/a` | Literal prose |
| `1/2/2026`, `2026/11`, `11/2026`, URLs and recognizable paths | Literal prose |
| `a/b/c`, `1/2x`, `2x/3`, `x^2^3` | Literal; group explicitly |
| `x + 1`, `x`, `23`, `1+2`, `2026-11-10`, incomplete/unsupported input | Literal |

Recognize the entire token, not a suffix inside a word or path. Trailing sentence punctuation (`.,;:!?`) stays prose. Periods within decimal numbers remain part of the number. Punctuation by itself, navigation, blur, saving, and elapsed time never commit a candidate. Parentheses are structural input rather than removable sentence punctuation.

An isolated `1/2` intentionally converts even if the writer intended a date. A single-letter pair such as `a/b` can also be a path. One immediate Undo restores the exact literal expression, punctuation, boundary, and caret. Redo restores conversion. Subsequent prose typing is a separate history event. Deleting/retyping a boundary or sentence punctuation after Undo does not re-enable conversion; editing the expression does.

Only directly typed/edited expression text with a collapsed prose selection qualifies. Paste, import, selected replacement (even with identical text), and composition do not qualify by themselves. A subsequent direct edit within the expression can enable recognition. This provenance is transient, absent from backups, and reset on reopen. Paste/selection replacement/composition conservatively clear pending eligibility.

Click or arrow into math to edit. Numerator/denominator and nested navigation remain structural; letters stay in their branch. **Space inside math inserts a thin mathematical space in that branch**, overriding MathLive's default move-after-parent behavior. Arrows and explicit exit commands navigate; Escape returns to prose. Matrix Tab/Shift+Tab behavior and provisional whole-equation selection are retained. No autocomplete, Greek guessing, evaluation, or variable definitions are introduced.

## Bounded grammar and integration

- Decimal numbers require digits before the decimal point; variables are single ASCII letters. Numeric coefficients such as `2x` are supported inside expressions. Multi-letter identifiers, functions, roots, matrices, and general LaTeX entry are outside automatic recognition; existing explicit entry remains available.
- Operators are `+`, `-`, `*`, `/`, `^`, and at most one top-level `=`. Powers bind before unary signs, then multiplication/division, addition/subtraction, and equality. `-x^2` differs from `(-x)^2`.
- A second ungrouped division in a multiplicative term, chained power, or implicit multiplication combined with division is rejected. Group explicitly: `(a/b)/c`, `a/(b/c)`, `1/(2x)`, `(2x)/3`, `(1/2)*x`, `x^(2^3)`.
- Numeric expressions containing only addition/subtraction, year/month pairs with a four-digit year, and `n/a` remain literal. Whole tokens are limited to 256 characters and parentheses to 16 levels. Incomplete, oversized, unsupported, or invalid input remains intact.
- A pure recognizer emits a bounded expression description and explicit LaTeX. The existing MathLive parser validates it; the existing capture/recovery adapter validates reopening before document replacement. Failure leaves the boundary and source literal.
- Public ProseMirror hooks insert the boundary, then replace the expression in an isolated history transaction. Selection mapping preserves the prose caret. Public MathLive APIs continue to own internal editing. No private atom access, dependency upgrades, document-schema changes, or backup migrations were needed.

## Owner trial and remaining gates

1. Type the exact example sentence at normal lecture speed. Confirm no toolbar use, focus interruption, or lost keys.
2. Type compound and nested examples above; compare the visible grouping with your intent. Undo a fraction intended as a date, retype its boundary, then edit the expression and retry.
3. Click/arrow into a fraction, edit both branches, type Space and letters in the denominator, then explicitly exit. Edit a nested fraction and exponent. Exercise selection, deletion, Undo, and Redo.
4. Paste prose containing slash expressions, download/reopen, and confirm it stays literal until directly edited. Check converted math remains editable after reopen and mixed-content clipboard operations.
5. Perform a **real IME composition trial**, including composition commit/cancel and the next Space/Enter. Synthetic composition tests are only integration guards and do not establish actual IME correctness.

Owner lecture-note acceptance, real IME, screen readers, touch, non-US/AltGr layouts, real Safari, long-document performance, and browser-native undo menus remain unverified. The existing MathML placeholder/empty-branch fidelity failure remains unresolved; version-0 backups are not an approved canonical native format.

## Verification

- Typecheck, lint, **88 unit tests**, and production build passed. Build retains the large-chunk warning (~1.385 MB JavaScript / 404 KB gzip).
- **85 browser tests passed, two explicitly skipped**, across Chromium, Firefox, and WebKit on Windows, without automatic retries. Fourteen new typing scenarios run in every engine. The Chromium real system clipboard test uses an automatically converted fraction; the two other engines retain their explicit system-clipboard skips.
- Built-app Chromium smoke passed with continuous prose/fraction typing, editable matrix, local assets, no page exceptions, and a visually inspected screenshot.
- Coverage includes grammar/precedence, whole-token exclusions and bounds, isolated history/caret mapping, fast typing, provenance, numerator/denominator and nested/power editing, selection/deletion, backup/reopen, reflow, and clipboard fidelity.
- Synthetic composition tests passed; actual IME and owner lecture-note acceptance remain unverified. See [STATUS](../../STATUS.md) for the verification log and existing fidelity limitations.
