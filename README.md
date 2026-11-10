# math-on-keyboard
A mathematics-first word processor built for students, making it easier to write, edit, and solve mathematics without switching between note-taking apps, calculators, and equation editors.

## Milestone 0 feasibility prototype

This prototype uses React, TypeScript, Vite, Tiptap/ProseMirror, and MathLive. Type prose and compact expressions such as `1/2`, `x^2`, and `(x+1)/2`; Space or Enter converts eligible input to native editable math while writing continues in prose. It also exercises inline/display math, nested fractions, matrix cell navigation, integrated history, and local downloadable backups.

The independent mathematical presentation format has **not** passed feasibility. Backups are explicitly experimental and retain MathLive LaTeX recovery data. See [STATUS.md](STATUS.md) and the [results report](docs/research/milestone-0-results.md) before relying on this for notes.

## Setup and launch

Use Node **22.12 or later** (tested with Node 22.23.4) and npm. From the repository directory:

```powershell
npm ci
npm run dev
```

Open the local URL printed by Vite, normally **http://127.0.0.1:5173**. Stop the server with Ctrl+C. All editor assets and math fonts are bundled locally; editing requires no account or remote service. This is a web application served over localhost, not a file to open by double-clicking `index.html`.

On the development machine used for this spike, system Node was 19. A project-local Node 22 runtime was installed in the ignored `.tools` directory. To use that existing runtime in a new PowerShell session:

```powershell
$env:Path = "$PWD\.tools\node_modules\node\bin;$env:Path"
node --version
npm run dev
```

That local runtime is not committed or required on machines with a supported Node installation.

## Try the editing workflow

1. Click the document and type `The answer is 1/2 because...`. Space after `1/2` creates an editable stacked fraction and keeps the caret in prose. No insertion button is needed.
2. Try `x/2 `, `x^2 `, `(x+1)/2 `, and `a/(b/c) `. Undo once immediately after conversion restores the literal expression and its Space or paragraph break; Redo restores math. Enter a fraction with the mouse or arrows to edit its branches. Space inside math inserts a thin space in the current branch; use arrows or Escape to leave it. Explicit **Fraction** insertion remains available for unfinished structures.
3. Insert **Display math** and type an expression such as `x^2`. Home/End move to math-field boundaries; arrows enter and leave math. Ctrl+Home / Ctrl+End move to document boundaries from prose.
4. Insert a **2 × 2 matrix**. Type into cells with Tab / Shift+Tab and arrows. Fractions can be inserted inside a cell using **Fraction** or Ctrl+Alt+F.
5. Drag the small bottom-right matrix boundary handle: approximately 40 pixels horizontally changes one column and 32 pixels vertically changes one row. Dimensions preview before release. The prototype supports 1–8 rows and columns for a standalone matrix. Shrinking nonempty cells requires confirmation. Focus the handle and use arrows for keyboard resizing.
6. Use Ctrl+Z / Ctrl+Shift+Z (also Ctrl+Y), or the Undo/Redo buttons, across prose, math, and resizing. Internal selection is editable; crossing into prose provisionally selects the whole equation.
7. **Download backup**, reload, and **Open backup**. Edit the restored structures. There is no autosave yet; keep the downloaded file. Opening a different document clears history to prevent undo crossing file boundaries.

Ctrl+Alt+M inserts inline math, Ctrl+Alt+F a fraction, Ctrl+Alt+D display math, and Ctrl+Alt+X a matrix. Buttons are available when keyboard layout or browser shortcuts conflict. Greek symbols can be deliberately entered through LaTeX, for example pasting `\alpha` inside math. Ordinary `x` stays `x`; there is no evaluation or implicit variable binding.

Paste supported LaTeX inside a math field. Paste in prose stays prose. Same-app document copy/paste preserves mixed math and text through a native fragment carried alongside HTML/plain-text fallbacks. External mathematical HTML/MathML import is not implemented; unsupported conversions are reported. Native file import validates before replacing the current document.

Recognition is deliberately conservative: `and/or`, `km/h`, `file/name`, `n/a`, recognizable dates/paths, incomplete expressions, and spaced `x + 1` stay literal. Use parentheses for ambiguous `a/b/c`, `1/2x`, and `x^2^3`. An isolated `1/2` is treated as a fraction even if you intended a date: Undo restores literal input, and deleting/retyping its boundary does not reconvert until the expression changes. Pasted, imported, composition-produced, or selection-replaced text needs a subsequent direct expression edit before recognition. See the complete [typing contract and trial checklist](docs/research/context-math-typing.md).

Open **Feasibility diagnostics** to inspect the experimental document and run the actual presentation-tree restoration probe. A successful recovery backup does not imply that tree-only restoration passed.

## Verification commands

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npx playwright install chromium firefox webkit
npm run test:e2e
```

On this development machine the browser binaries were installed under `.tools/browsers`; reuse them with:

```powershell
$env:PLAYWRIGHT_BROWSERS_PATH = "$PWD\.tools\browsers"
npm run test:e2e
```

The browser suite starts the dev server if needed. It runs real keyboard/pointer interactions in Chromium, Firefox, and WebKit. The actual system clipboard test runs only in Chromium; other clipboard tests inject events and do not establish operating-system clipboard behavior. WebKit automation on Windows is not a real Safari test.

For a production bundle check, run `npm run build`, start `npm run preview -- --port 4173` in one terminal, then `npm run test:production` in another. The production check uses installed Chromium and writes an ignored screenshot to `.tools/production-smoke.png`.

`npm run probe:math` requires the dev server and installed Microsoft Edge. It prints the pinned MathLive public API's LaTeX, MathML, and offset information for the persistence fixtures.

## Scope and limits

The current format is `math-on-keyboard-experiment`, version `0`, with the pinned `mathlive-0.111.4` recovery adapter. It is not the permanent notebook format. Unknown versions/fields are rejected rather than silently discarded. Files are limited to 2 MB in this spike.

Real IME composition, screen-reader workflows, touch, large documents, arbitrary LaTeX fidelity, and native clipboard behavior in Firefox/Safari remain unverified. Nested matrices remain MathLive-editable, but boundary resizing is offered only for a standalone matrix with publicly identifiable cell offsets. Persistent autosave/recovery, computation, PDF/DOCX export, and full menus belong to later milestones.
