# CLAUDE.md

## Git Push Policy

**DO NOT `git push` automatically.** `git commit` is OK. Push only when explicitly requested.

## Overview

Markdown → AST → pptxgenjs → PPTX 変換の Claude Code skill。HTML プレビューモードも備え、共通のレイアウトエンジンで座標を計算し PPTX/HTML 両方に出力する。

## Commands

```bash
cd assets
npm test                                          # 全テスト
npx tsx src/cli.ts input.md output.pptx           # PPTX 生成
npx tsx src/cli.ts input.md output.html --html    # HTML 生成
npx tsx src/cli.ts input.md out.html --html --verify  # 検証
```

## Code Reading Order

コードを読む順序。パイプラインの流れに沿って上流から下流へ。

### 1. Entry Points → Pipeline

```
src/index.ts        md2pptx(), md2html() — 公開 API
src/cli.ts          CLI ラッパー (--html, --verify)
src/pipeline.ts     3段パイプラインの組み立て: parse → validate → render
```

### 2. Parsing: Markdown → AST

```
src/parser/
├── index.ts            barrel export (parseMarkdown)
├── tokenizer.ts        行ベースのトークン化 (matchers 配列 → Option パターン)
├── ast-builder.ts      トークン列 → 未検証 AST (handlers 配列 → Option パターン)
├── builder-types.ts    ビルダーの型定義
├── builder-state.ts    ビルダーの状態管理
├── slide-converter.ts  RawSlide → Slide 変換
├── block-formatter.ts  body → Paragraph[] 変換 (箇条書き・番号付きリストの解釈)
├── inline-formatter.ts インライン装飾 (**bold**, *italic*, `code`) → InlineTextRun[]
└── handlers/           トークンハンドラ (structural, layout-directives, inline, body-text)
```

### 3. Validation: AST → Validated Presentation

```
src/schema/
├── index.ts            barrel export
├── presentation.ts     Plain class 型 (TitleSlide, ContentSlide, コアレイアウト各種)
├── theme.ts            Theme 型 + DEFAULT_THEME
└── validation.ts       文字数制限バリデーション (既定 1000文字・プラグインごとに上書き)
```

### 4. Rendering: Validated AST → Output

共通のレイアウトエンジンが座標を計算し、PPTX/HTML 両レンダラが同じ座標を消費する。

```
src/renderer/
├── index.ts            barrel (renderPresentation, renderToHtml)
│
├── layout/             ★ 共有レイアウトエンジン (PPTX・HTML 両方が使う)
│   ├── index.ts        layoutSlide() ディスパッチャ + barrel re-export
│   ├── types.ts        TextBox, BorderBox, IconBox, CodeBox, ShapeBox, Paragraph, LayoutResult
│   ├── helpers.ts      buildSectionBoxes, estimateTextHeight, 座標計算ユーティリティ
│   ├── basic.ts        Default, LeftRight, TopBottom, Grid, TitleSlide
│   └── special.ts      CodeDisplay
│   ※ IconColumns / IconCards / Steps / NumberedList 等の座標計算は
│      各プラグインの layout.ts に移動済み (layoutSlide が registry 経由で dispatch)
│
├── pptx/               PPTX レンダラ
│   ├── index.ts        renderPresentation() — PptxGenJS で書き出し
│   └── slide-builder.ts  layoutSlide() → pptx.addText/addShape API
│
├── html/               HTML レンダラ
│   ├── index.ts        renderToHtml() — inline style HTML 生成
│   ├── slide-renderers.ts  layoutSlide() → HTML div 生成
│   ├── element-renderers.ts  TextBox → CSS 変換
│   └── template.ts     HTML ドキュメントテンプレート
│
├── syntax-highlighter.ts  コードハイライト (PPTX/HTML 共用)
├── icon-resolver.ts       アイコン → emoji/SVG 解決
└── icon-mapping.ts        Material Icon → Unicode マッピング
```

**データフロー:**
```
Markdown
  → parser/    → RawPresentation (AST)
  → schema/    → Presentation (validated)
  → layout/    → LayoutResult { textBoxes[], borderBoxes[], iconBoxes[], ... }
  → pptx/      → Buffer (.pptx)
  → html/      → string (.html)
```

### 5. Tools: 検証ユーティリティ

```
src/tools/
├── inventory.ts       layoutSlide() → JSON スナップショット
├── html-inspector.ts  HTML data-* 属性 → JSON 抽出
├── pptx-inspector.ts  PPTX XML → JSON 抽出
└── inventory-diff.ts  3者比較 (AST vs HTML vs PPTX)
```

### 6. Batch: 複数 Markdown の一括 HTML 化

```
src/batch-html.ts   drafts/*.md → htmls/*.html + index.html 目次ページ生成
                    (pattern-language ブロックからメタ情報を抽出して目次を作る)
```

### Shared: Constants & Errors

```
src/constants.ts    スライド寸法・マージン・GAP 等のレイアウト定数を集約
src/errors.ts       ParseError, ValidationError, RenderError (Tagged errors)
```

`constants.ts` は layout/ 内の全ファイルが参照する。座標調整や新レイアウト追加時に必ず確認。

## Key Patterns

**Option-based handler dispatch** — tokenizer, ast-builder, layout/index で共通:
```typescript
const handlers: ReadonlyArray<(input) => O.Option<Output>> = [...]
pipe(handlers.map(h => h(input)), A.findFirst(O.isSome), O.flatten, O.getOrElse(...))
```

**Effect-TS** — `Effect.gen` + `yield*` で制御フロー。`.pipe()` チェーンは最小限に。

**Tagged errors** — `ParseError`, `ValidationError`, `RenderError` (src/errors.ts)

## Key Constraints

- スライド区切り: `---`。`#` = タイトルスライド、`##` = コンテンツスライド、`###` = セクション
- 箇条書き: `- ` / `* ` / `+ ` (バレット)、`1. ` (番号付き)。`block-formatter.ts` が Paragraph[] に変換し、PPTX はネイティブバレット・HTML は CSS 疑似要素で記号を描く (リテラルの `•` は書かない — 二重表示になる)
- 文字数制限: 1スライド 1000文字 (`MAX_CHARS_PER_SLIDE`、Markdown 構文を除く本文+見出し)。超過で ValidationError。プラグインは `maxChars` で上書き可 (現状 PatternLanguageOverview のみ 1024)。読みやすさの目安は 240文字程度
- レイアウト指定: `<!--left:N-->`, `<!--right:M-->`, `<!--grid:RxC-->`, `<!--top:N-->`, `<!--bottom:M-->` 等
- 新レイアウト追加時: `plugins/` にプラグインフォルダを作成 + `plugins/index.ts` に import 追加

## Plugin System

自己登録パターンによるレイアウトプラグイン。各プラグインが `registerPlugin()` を import 時に呼び出す。

```
src/plugins/
├── types.ts              LayoutPlugin インターフェース + TokenMatcher/TokenHandler/LayoutHandler 型
├── registry.ts           registerPlugin() + 派生ルックアップ (getConverters, getLayoutHandlers 等)
├── index.ts              side-effect imports でプラグインをロード
│
├── lean-canvas/          `<!--lean-canvas-->` — 各プラグインの標準ファイル構成:
│   ├── index.ts          自己登録 (registerPlugin 呼び出し)
│   ├── schema.ts         LeanCanvasLayout (SlideLayout 実装)
│   ├── handler.ts        ディレクティブハンドラ
│   ├── converter.ts      RawSlide → LeanCanvasLayout
│   ├── layout.ts         座標計算 (LayoutResult を返す)
│   └── constants.ts      LEAN_CANVAS_* 定数
│
├── customer-journey/     `<!--カスタマージャーニー:-->` (converter がページネーション)
├── steps/                `<!--steps-->`
├── numbered-list/        `<!--numbered-list:circle-->` / `<!--numbered-list:bar-->`
├── icon-layout/          `<!--icon-cols-->` と `<!--icon-cards-->` の**2プラグインを登録**
├── text-only/            `<!--text-only-->`
├── table/                `<!--table-->` (shape + text の自力描画)
├── quote/                `<!--quote-->`
├── agenda/               `<!--agenda-->`
└── pattern-language/     `<!--pattern-language-a-->` (1ブロック → Overview + Detail の2スライド)
```

10ディレクトリ・**11プラグイン登録** (icon-layout のみ2つ)。パーサ側の受け取り方は2つの仕組みがあり、**排他ではなく併用可**:

- `sectionRoute`: `###` セクションを `pluginData` の指定フィールドに集めるだけの標準ルート — lean-canvas, numbered-list, steps, icon-layout, agenda
- `modeHandlers`: H3/H4/BodyText の解釈を自前で持つ — customer-journey, pattern-language, quote, table, text-only, steps, icon-layout, agenda

(steps / icon-layout / agenda は両方を持ち、標準ルートに加えて独自トークン解釈を挟んでいる)

ディレクティブは `docDirective` に1度だけ宣言する。`registerPlugin()` がそこから完全一致の
`tokenMatcher` を導出するので、**通常 `tokenMatcher` は書かない**。手書きするのは認識が
リテラル1本で表せない場合のみ (numbered-list の `circle|bar` 正規表現が唯一の例)。

**新プラグイン追加**: `plugins/index.ts` に `import "./my-layout/index.js"` を 1 行追加のみ。

## Theme System

`schema/theme.ts` に `Theme` 型と `DEFAULT_THEME` を定義。CLI の `--theme <path>` で YAML テーマファイルを指定可能。テーマは色・フォントサイズ・マージン等をカスタマイズする。未指定時は DEFAULT_THEME がフォールバック。

## Test → Module 対応表

| テストファイル | 対象モジュール |
|---|---|
| `e2e.test.ts` | 全パイプライン (markdown → .pptx buffer) |
| `parser.test.ts` | parser/ (AST 構築) |
| `block-formatter.test.ts` | parser/block-formatter.ts (リスト → Paragraph 変換) |
| `inline-formatting.test.ts` | parser/inline-formatter.ts (**bold** / *italic* / `code`) |
| `validation.test.ts` | schema/validation.ts (文字数制限) |
| `layout-engine.test.ts` | renderer/layout/ (座標計算・スナップショット) |
| `html-renderer.test.ts` | renderer/html/ (HTML 生成・data 属性) |
| `theme.test.ts` | schema/theme.ts (YAML テーマ読み込み) |
| `snapshot-comparison.test.ts` | tools/ (インベントリ比較) |
| `cli.test.ts` | cli.ts (CLI 引数・ファイル出力) |
| `customer-journey.test.ts` | CustomerJourney レイアウト |
| `table.test.ts` | Table レイアウト (パイプ区切り表のパース + 座標) |
| `pattern-language.test.ts` | PatternLanguage レイアウト (Overview + Detail) |
| `docs-consistency.test.ts` | SKILL.md / CLAUDE.md / assets/README.md と実装の乖離検出 |
| `pptx-inspector.test.ts` | tools/pptx-inspector.ts |
| `icon-resolver.test.ts` | renderer/icon-resolver.ts |
| `syntax-highlighter.test.ts` | renderer/syntax-highlighter.ts |
| `html-inspector.test.ts` | tools/html-inspector.ts |

## Development Notes

- `cd assets` してから npm コマンド実行
- `.pptx`, `.html` は gitignore 済み
- `npx tsx` で直接実行 (ビルド不要)
- PPTX/HTML 両レンダラは同一の `LayoutResult` を消費 → 座標ドリフト防止
