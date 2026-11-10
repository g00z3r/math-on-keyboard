# ADR 0004: progressive typing gate and proposed origin-marker experiment

Date: 2026-11-10

Status: Gate investigated; not passed. Proposed versioned experiment awaits owner approval. Application behavior and admission policy are unchanged.

## Evidence and consequence

The owner approved immediate fraction/power entry, structural exits, persistent semantic grouping, reversible scope correction, and a mandatory public-API feasibility gate. The tested unannotated mapping can recover empty branches and manipulate known annuity ranges, but does not satisfy power-base rendering together with inferred/explicit fence preservation after reopen.

An invisible native group has the correct base structure but lacks required visible parentheses. A native fenced base renders correctly but does not encode whether those fences were inferred or explicitly supplied. MathML also omits empty exponents. See [the reproducible experiment and limits](../research/progressive-math-typing.md).

Stop before application integration as the approved plan requires. Do not ship a cosmetic phantom layer or claim progressive input is implemented.

## Recommended next decision: bounded origin-marker experiment

Authorize an experimental version-1 backup/admission representation, retaining the current pinned MathLive adapter and ProseMirror document/history foundation. This is not adoption of a canonical native format or permission to loosen arbitrary active-content admission.

Proposed scope:

- Represent an inferred rendered group on the actual MathLive fence using the exact public marker `\htmlData{mok-group=inferred}{...}`. Explicit groups are unmarked. Scope membership always comes from the live group structure; do not persist offset-based grouping guesses.
- Add a strictly bounded allowlist for this one application marker attached to an admissible group. Reject arbitrary keys, values, attributes, active/external commands, and malformed ownership/nesting. Do not merely remove `htmlData` from the rejection regex.
- Keep version-0 reads and their original validation. Write tagged content only as format `math-on-keyboard-experiment`, version `1`, adapter `mathlive-0.111.4+group-origin-1`. Old readers must reject the unknown version rather than strip grouping information. Do not rewrite existing files automatically.
- Validate marker ownership against public wrapper/range structure, not inherited `getElementInfo().data` alone. Stop the experiment if tags cannot be reliably related to the owning group through public APIs.
- Export interoperable math with ordinary required fences and no application metadata. Native recovery retains provenance. Any unsupported conversion must preserve current work and report its fidelity limit.
- First verify explicit groups nested within inferred groups and the reverse, deletion/replacement/copy/paste, populated and empty powers, marker removal, scope lifting/contraction, exact bookmark mapping, integrated history, and reopening. Then repeat the full structural gate before implementing progressive input.

A scratch marker survived one interior edit and pinned recovery/reopen in Chromium, Firefox, and WebKit. This is evidence to justify an experiment, not evidence that the above requirements are already met.

## Alternatives

- Request a public MathLive structural interface: typed node/branch ownership including empty branches; public group metadata with lossless restoration; selection mappings for structural rewrites; and renderer-supported grouping fences without pretending they were literal input. A local request can be drafted; upstream cooperation/timeline is unknown.
- Evaluate another maintained math editor against the same acceptance corpus. Do not change the editor foundation without a separate decision.
- Approve a broader versioned structural model experiment. It must reuse maintained parsing/editing facilities and demonstrate lossless presentation/unfinished-state fidelity; a new handwritten rich-text engine or general LaTeX parser is outside this proposal.

The origin-marker experiment is recommended because it has a concrete public-API proof point and a smaller change surface than replacing the editor. It still needs explicit approval under the plan's versioned-model gate and repository architecture rules.
