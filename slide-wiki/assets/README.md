# slide-wiki

Builds a link-navigable slide wiki from Markdown decks, and renders the same decks to PowerPoint / HTML. Effect-TS and pptxgenjs.

## Overview

`slide-wiki` links several Markdown decks into one self-contained wiki site you can read by
following links, hovering to peek, and walking backlinks home. The same decks also render
directly to PPTX using a custom AST, bypassing the heavyweight Markdown → HTML → Playwright →
PPTX pipeline used in `md2html2pptx`.

A shared layout engine computes every coordinate once, and all three renderers consume the same
`LayoutResult` — so the wiki, the HTML preview and the PPTX file place elements identically.

**Pipeline:**
```
Markdown → AST (parser/) → validated Presentation (schema/) → LayoutResult (renderer/layout/)
                                                            ├→ .pptx  (renderer/pptx/)
                                                            ├→ .html  (renderer/html/)
                                                            └→ .html  (renderer/wiki/ — many decks, one linked site)
```

## Backlog

See [../BACKLOG.md](../BACKLOG.md) for the feature backlog (prioritized, with acceptance criteria).

## Features

- Effect-TS functional pipeline with typed errors (`ParseError`, `ValidationError`, `RenderError`)
- Direct pptxgenjs API calls — no browser dependency
- Three outputs from one source: `.pptx`, a self-contained `.html` deck (arrow-key navigation), and a linked wiki site (`--wiki`)
- Wiki mode: several decks in one page, `[label](deck.md#slide)` navigation, hover previews of the target slide, backlinks, hash routing with browser back/forward
- 3-way verification (`--verify`): AST vs HTML vs PPTX coordinate/text comparison, exits non-zero on any mismatch
- Per-slide character validation and structural lint, both declared in `../ontology.yaml`
- Bullet and numbered lists rendered as native PPTX bullets / CSS pseudo-elements
- Inline formatting (`**bold**`, `*italic*`, `` `code` ``) and syntax-highlighted code blocks
- Links: one syntax, `[label](target)`. A relative `deck.md#slide-id` is an internal link (resolving to a slide jump in PPTX too); anything else is external. This is the Open Knowledge Format (OKF) v0.2 shape, in its relative form — so the same link also works when the raw md is opened on github.com
- Stable slide ids via `<!--id:foo-->`, or auto-derived from the slide title
- Material Icons (SVG) and emoji icons
- YAML themes (`--theme`)
- 16 layout types:
  - Core: `TitleSlide`, `Default`, `LeftRight`, `TopBottom`, `Grid`, `CodeDisplay`
  - Plugins: `IconColumns`, `IconCards`, `Steps`, `NumberedList`, `TextOnly`, `Table`,
    `Quote`, `Agenda`, `LeanCanvas`, `CustomerJourney`, `WikiPattern`

See [../SKILL.md](../SKILL.md) for the full Markdown syntax table with directives and examples.

## Installation

```bash
npm install
```

## Usage

### CLI

```bash
npx tsx src/cli.ts input.md output.pptx                  # PPTX
npx tsx src/cli.ts input.md output.html --html           # HTML deck
npx tsx src/cli.ts input.md out.html --html --verify     # both + 3-way inventory diff
npx tsx src/cli.ts --wiki doc/wiki _site/index.html      # linked wiki site from a directory of decks
npx tsx src/cli.ts input.md output.pptx --theme doc/theme.yaml
npx tsx src/cli.ts input.md output.pptx --compress
```

| Option | Description |
|--------|-------------|
| `--html` | Generate HTML instead of PPTX |
| `--verify` | Generate PPTX + HTML, then compare both against the AST inventory. Exits non-zero if the three disagree |
| `--wiki` | Build one linked wiki site from one or more decks (file, files, or a directory). A directory's deck order comes from its `order.yaml` (`groups:` — a list of `{title, decks}`, deck names being file names without the extension); without it, decks are ordered by file name. Group titles become the headings of the generated `index.md`. Renaming a deck to reorder it would break `deck.md#slide` links, so declare the order instead. `index.md` and `log.md` are OKF reserved names and are not read as decks |
| `--site-title <text>` | Title of the wiki site (with `--wiki`) |
| `--theme <path>`, `-t <path>` | YAML theme file (falls back to `DEFAULT_THEME`) |
| `--compress`, `-c` | Enable ZIP compression in pptxgenjs (default: off) |

**Note:** `--compress` reduces file size only marginally for small presentations.

### Programmatic

```typescript
import { md2pptx, md2html } from "./src/index.js"
import { Effect } from "effect"
import { writeFileSync } from "fs"

const markdown = `# Title
Subtitle text

## Content Slide
### Section 1
- Body bullet
- Another bullet
`

const program = Effect.gen(function* () {
  writeFileSync("output.pptx", yield* md2pptx(markdown))          // { compression, theme }
  writeFileSync("output.html", yield* md2html(markdown), "utf-8") // { theme }
})

Effect.runPromise(program)
```

## Markdown Syntax

Full reference: [../SKILL.md](../SKILL.md). The basics:

```markdown
# Main Title            ← title slide
Subtitle or description

---                     ← slide separator

## Slide Title          ← content slide
### Section Heading
Section body text
- bullet item
1. numbered item
```

Layouts are selected with HTML-comment directives, e.g.:

```markdown
## Slide Title
<!--left:2-->
### Left Heading
Left content (2/3 width)

<!--right:1-->
### Right Heading
Right content (1/3 width)
```

```markdown
## Slide Title
<!--grid:2x3-->
### Cell 1
Content 1
...6 cells total for a 2×3 grid
```

Append `<!--takeaway-->` at the end of any layout to add a summary/source line.

## Note: Icons in PPTX

Material Icon（`<!--icon:mi:home-->`）は SVG 画像として PPTX に埋め込まれます。PowerPoint 2019 以降および Microsoft 365 で正常に表示されますが、**それより古いバージョンでは SVG がサポートされていないため表示されない場合があります**。古い PowerPoint を使用する場合は、絵文字アイコン（`<!--icon:🏠-->`）を使用してください。

## Validation

Two layers, both driven by [`../ontology.yaml`](../ontology.yaml) — the single source of
truth for the structure of the Markdown this tool reads. The numbers and vocabularies are
not repeated here; see the generated [`../ontology.md`](../ontology.md).

**Character limits** (`schema/validation.ts`) read `limits.max-chars-per-slide` and each
layout's `max-chars` override. Exceeding one throws a `ValidationError`:

```
Slide 2 exceeds 1000 characters (found 1183)
```

**Structural lint** (`ontology/lint.ts`) checks what the declaration says about each
layout: how many `###` a layout expects, which heading names it accepts, which annotations
take effect, and whether a `<!--…-->` matches any declaration at all. These catch the failures that are otherwise silent — an out-of-vocabulary
lean-canvas heading simply vanishes, and a misspelled directive renders as body text.

```bash
npx tsx src/cli.ts --lint doc/Spec.md doc/wiki   # warnings, exit 0
npx tsx src/cli.ts --lint --strict doc/wiki      # warnings become failures
npx tsx src/ontology/selfcheck.ts                # check the declaration itself
```

## Architecture

```
src/
  index.ts            Public API (md2pptx, md2html)
  cli.ts              CLI wrapper (--html, --verify, --wiki, --theme, --compress)
  pipeline.ts         parse → validate → render
  constants.ts        Slide dimensions, margins, gaps
  deck-order.ts       Deck order for a directory of decks (doc/wiki/order.yaml)
  errors.ts           Tagged errors (ParseError, ValidationError, RenderError)
  parser/             Markdown → AST (tokenizer, ast-builder, handlers/,
                      block-formatter, inline-formatter, slide-converter)
  schema/             Validated types (presentation.ts, theme.ts, validation.ts)
  ontology/           Loader for ../ontology.yaml + selfcheck + structural lint
  renderer/
    layout/           Shared layout engine — the single source of coordinates
    pptx/             LayoutResult → pptxgenjs API calls
    html/             LayoutResult → inline-styled HTML (slide-css.ts is shared with wiki/)
    wiki/             Many Presentations → one linked site (reuses html/renderSlide)
    syntax-highlighter.ts, icon-resolver.ts, icon-mapping.ts
  plugins/            Self-registering layout plugins (11 registrations)
  tools/              inventory, html-inspector, pptx-inspector, inventory-diff,
                      gen-ontology-doc (ontology.yaml → ontology.md + SKILL.md regions)
```

See [../CLAUDE.md](../CLAUDE.md) for the annotated reading order and the plugin/theme mechanics.

## Testing

```bash
npm test           # vitest run
npm run test:watch
```

`__tests__/markdown-spec/*.md` holds golden inputs exercised end to end by `e2e.test.ts`.

## Example

`doc/Spec.md` contains a sample deck covering every layout:

```bash
npx tsx src/cli.ts doc/Spec.md doc/Spec.html --html && open doc/Spec.html

# Linked wiki demo: a cross-referenced pattern deck plus a feature guide
npx tsx src/cli.ts --wiki --site-title "Slide Wiki" doc/wiki _site/index.html && open _site/index.html
```

## License

MIT
