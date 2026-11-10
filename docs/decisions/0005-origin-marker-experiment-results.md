# ADR 0005: bounded origin-marker experiment results

Date: 2026-11-10

Status: Experiment completed with a failed structural gate. Retain the existing application foundation provisionally; do not implement progressive typing from this result. No permanent format decision made.

## Authorization and implementation

The owner approved ADR 0004's exact `mok-group=inferred` allowlist and experimental version-1 representation strictly to investigate grouping fidelity. Implemented an isolated reader/writer, bounded lexical envelope checks, public wrapper/range ownership validation, and a reproducible three-engine gate. The running application retains version 0 and its existing admission and clipboard behavior. No migration, dependency, private library access, or full progressive-input feature was introduced.

## Evidence

[The research report](../research/origin-group-experiment.md) records reproducible commands, actual source counterexamples, counts, and limitations. Chromium passed 36/39 checks; Firefox and WebKit passed 35/38 each. All three engines failed both boundary fence deletion checks and default clipboard metadata exclusion. No page exceptions were observed. Nested owner distinction, empty structures, fixture-specific scope corrections, integrated shared history/bookmarks, actual disk reopen, and continued editing passed their bounded checks.

Deleting either inferred fence boundary leaves the marker on a one-sided fence that the strict reader rejects. Default library copy exports origin metadata into external LaTeX/plain text. Raw MathML also omits marked operands, although metadata-free fenced interchange can be generated in a scratch field. Recovery source preserves the tested editable structure; this does not establish an independent native representation.

## Consequence and recommendation

Keep the application integration gate closed. Do not relax ownership, strip source automatically, or infer success from the passing fixture count. Request a public library contract for incomplete fence mutations, origin ownership, unfinished structures, and selection mappings as the preferred next investigation. Alternatively, explicitly design and test a bounded adapter repair policy and separate native/external clipboard channels, then rerun the complete gate including generalized scope discovery. A change to established fence-editing behavior needs owner direction.

If that investigation fails, compare another maintained math editor against the same corpus, or seek approval for a broader structural-model experiment. Framework replacement, private forks, new general parsers, and permanent native-format adoption remain separate decisions. A successful future structural gate must precede any proposed progressive-input implementation sequence.
