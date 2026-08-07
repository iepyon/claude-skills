# md2pptx

Lightweight Markdown to PowerPoint converter using Effect-TS and pptxgenjs.

## Overview

`md2pptx` converts Markdown files directly to PPTX using a custom AST, bypassing the heavyweight Markdown → HTML → Playwright → PPTX pipeline used in `md2html2pptx`.

**Pipeline:**
```
Markdown → AST → pptxgenjs → PPTX
```

## TODO
- リーンキャンバス
- コード表示
- 表
- カスタマージャーニー
- グラフ表示
- Good/Bad/Hat
- Mermaid
- GoogleマテリアルアイコンでMermaidみたいな図解


## Features

- Effect-TS functional pipeline with typed errors
- Direct pptxgenjs API calls (no browser dependency)
- 240-character validation per slide (excludes MD syntax)
- Multiple layout types:
  - **TitleSlide**: Dark background with centered title/subtitle
  - **DefaultLayout**: Vertical sections
  - **LeftRightLayout**: Horizontal split with custom ratios
  - **GridLayout**: M×N grid layout

## Installation

```bash
npm install
```

## Usage

### CLI

```bash
# Basic usage (uncompressed)
npx tsx src/cli.ts input.md output.pptx

# With compression option
npx tsx src/cli.ts --compress input.md output.pptx
# or
npx tsx src/cli.ts -c input.md output.pptx
```

**Note:** The `--compress` flag enables ZIP compression in pptxgenjs, though actual file size reduction may be minimal for small presentations.

### Programmatic

```typescript
import { md2pptx } from "./src/index.js"
import { Effect } from "effect"
import { writeFileSync } from "fs"

const markdown = `# Title
Subtitle text

## Content Slide
### Section 1
Body text here
`

// Without compression (default)
const program = Effect.gen(function* () {
  const buffer = yield* md2pptx(markdown)
  writeFileSync("output.pptx", buffer)
})

// With compression option
const programCompressed = Effect.gen(function* () {
  const buffer = yield* md2pptx(markdown, { compression: true })
  writeFileSync("output.pptx", buffer)
})

Effect.runPromise(program)
```

## Markdown Syntax

### Title Slide

```markdown
# Main Title
Subtitle or description
```

### Content Slide (Default Layout)

```markdown
## Slide Title
### Section Heading
Section body text

### Another Section
More body text
```

### Left-Right Layout

```markdown
## Slide Title
<!--left:2-->
### Left Heading
Left content (2/3 width)

<!--right:1-->
### Right Heading
Right content (1/3 width)
```
### Top-Bottom Layout

```markdown
## Slide Title
<!--top:4-->
### Top Heading
Top content (upper half)

<!--bottom:4-->
### Bottom Heading
Bottom content (lower half)
```

### Grid Layout

```markdown
## Slide Title
<!--grid:2x3-->
### Cell 1
Content 1

### Cell 2
Content 2

...6 cells total for 2×3 grid
```

## Note: Icons in PPTX

Material Icon（`<!--icon:mi:home-->`）は SVG 画像として PPTX に埋め込まれます。PowerPoint 2019 以降および Microsoft 365 で正常に表示されますが、**それより古いバージョンでは SVG がサポートされていないため表示されない場合があります**。古い PowerPoint を使用する場合は、絵文字アイコン（`<!--icon:🏠-->`）を使用してください。

## Validation

Each slide is limited to 240 characters (excluding Markdown syntax like `#`, `##`, `###`, `<!--...-->`).

Exceeding this limit will throw a `ValidationError`:

```
Slide 2 exceeds 240 characters (found 186)
```

## Architecture

```
src/
  errors.ts           # Tagged errors (ParseError, ValidationError, RenderError)
  constants.ts        # Layout constants (margins, fonts, colors)
  pipeline.ts         # Main md2pptx pipeline
  parser/
    tokenizer.ts      # Line-based tokenizer
    ast-builder.ts    # Token stream → Presentation AST
    index.ts          # parseMarkdown function
  schema/
    presentation.ts   # Effect Schema types (TitleSlide, ContentSlide, etc.)
    validation.ts     # 240-char validation logic
  renderer/
    layout-engine.ts  # Coordinate calculation (inches)
    slide-builder.ts  # AST → pptxgenjs API calls
    index.ts          # renderPresentation function
```

## Testing

```bash
npm test
```

## Example

Input (`Spec.md`):
```markdown
# タイトルスライド
追加の解説

## スライトタイトル
### 見出しA
ここには本文Aです

### 見出しB
ここには本文Bです

## グリッド左右の例
<!--left:2-->
### 左
こちらのエリアの方が広いです

<!--right:1-->
### 見出し１行目中央
こちらの本文は

## グリッドの例
<!--grid:2x3-->
### 見出し1行目左
ここには本文Aです

### 見出し１行目中央
ここには本文Aです

### 見出し１行目右
ここには本文Aです

### 見出し2行目左
ここには本文Aです

### 見出し2行目中央
ここには本文Aです

### 見出し2行目右
ここには本文Aです
```

Output:
- 4 slides in PPTX format
- Slide 1: Title slide with dark background
- Slide 2: Default layout with 2 sections
- Slide 3: Left-right split (2:1 ratio)
- Slide 4: 2×3 grid

## License

MIT
