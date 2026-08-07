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
└── handlers/           トークンハンドラ (structural, layout-directives, etc.)
```

### 3. Validation: AST → Validated Presentation

```
src/schema/
├── index.ts            barrel export
├── presentation.ts     Plain class 型 (TitleSlide, ContentSlide, コアレイアウト各種)
├── theme.ts            Theme 型 + DEFAULT_THEME
└── validation.ts       240文字制限バリデーション
```

### 4. Rendering: Validated AST → Output

共通のレイアウトエンジンが座標を計算し、PPTX/HTML 両レンダラが同じ座標を消費する。

```
src/renderer/
├── index.ts            barrel (renderPresentation, renderToHtml)
│
├── layout/             ★ 共有レイアウトエンジン (PPTX・HTML 両方が使う)
│   ├── index.ts        layoutSlide() ディスパッチャ + barrel re-export
│   ├── types.ts        TextBox, BorderBox, IconBox, CodeBox, ShapeBox, LayoutResult
│   ├── helpers.ts      buildSectionBoxes, 座標計算ユーティリティ
│   ├── basic.ts        Default, LeftRight, TopBottom, Grid, TitleSlide
│   ├── visual.ts       IconColumns, IconCards, Steps, NumberedList
│   └── special.ts      CodeDisplay
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
- 240文字制限 (Markdown 構文を除く本文+見出し)
- レイアウト指定: `<!--left:N-->`, `<!--right:M-->`, `<!--grid:RxC-->`, `<!--top:N-->`, `<!--bottom:M-->` 等
- 新レイアウト追加時: `plugins/` にプラグインフォルダを作成 + `plugins/index.ts` に import 追加

## Plugin System

自己登録パターンによるレイアウトプラグイン。各プラグインが `registerPlugin()` を import 時に呼び出す。

```
src/plugins/
├── types.ts              LayoutPlugin インターフェース + TokenMatcher/TokenHandler/LayoutHandler 型
├── registry.ts           registerPlugin() + 派生ルックアップ (getConverters, getLayoutHandlers 等)
├── index.ts              side-effect imports でプラグインをロード
├── lean-canvas/          Tier 1 プラグイン (sectionRoute ベース)
│   ├── index.ts          自己登録
│   ├── schema.ts         LeanCanvasLayout
│   ├── handler.ts        ディレクティブハンドラ
│   ├── converter.ts      RawSlide → LeanCanvasLayout
│   ├── layout.ts         座標計算
│   └── constants.ts      LEAN_CANVAS_* 定数
└── customer-journey/     Tier 2 プラグイン (modeHandlers ベース)
    ├── index.ts          自己登録
    ├── schema.ts         CustomerJourneyLayout, CustomerJourneyRow, CustomerJourneyCell
    ├── handler.ts        ディレクティブ + H3/H4/BodyText モードハンドラ
    ├── converter.ts      RawSlide → CustomerJourneyLayout (ページネーション含む)
    └── layout.ts         座標計算
```

**新プラグイン追加**: `plugins/index.ts` に `import "./my-layout/index.js"` を 1 行追加のみ。

## Theme System

`schema/theme.ts` に `Theme` 型と `DEFAULT_THEME` を定義。CLI の `--theme <path>` で YAML テーマファイルを指定可能。テーマは色・フォントサイズ・マージン等をカスタマイズする。未指定時は DEFAULT_THEME がフォールバック。

## Test → Module 対応表

| テストファイル | 対象モジュール |
|---|---|
| `e2e.test.ts` | 全パイプライン (markdown → .pptx buffer) |
| `parser.test.ts` | parser/ (AST 構築) |
| `validation.test.ts` | schema/validation.ts (240文字制限) |
| `layout-engine.test.ts` | renderer/layout/ (座標計算・スナップショット) |
| `html-renderer.test.ts` | renderer/html/ (HTML 生成・data 属性) |
| `theme.test.ts` | schema/theme.ts (YAML テーマ読み込み) |
| `snapshot-comparison.test.ts` | tools/ (インベントリ比較) |
| `cli.test.ts` | cli.ts (CLI 引数・ファイル出力) |
| `customer-journey.test.ts` | CustomerJourney レイアウト |
| `pptx-inspector.test.ts` | tools/pptx-inspector.ts |
| `icon-resolver.test.ts` | renderer/icon-resolver.ts |
| `syntax-highlighter.test.ts` | renderer/syntax-highlighter.ts |
| `html-inspector.test.ts` | tools/html-inspector.ts |

## Development Notes

- `cd assets` してから npm コマンド実行
- `.pptx`, `.html` は gitignore 済み
- `npx tsx` で直接実行 (ビルド不要)
- PPTX/HTML 両レンダラは同一の `LayoutResult` を消費 → 座標ドリフト防止
