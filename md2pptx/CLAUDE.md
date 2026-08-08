# CLAUDE.md

## Git Push Policy

**DO NOT `git push` automatically.** `git commit` is OK. Push only when explicitly requested.

## Overview

Markdown → AST → pptxgenjs → PPTX 変換の Claude Code skill。HTML プレビューモードと、複数デッキをリンクで辿れる Wiki モードも備え、共通のレイアウトエンジンで座標を計算して3系統に出力する。

## オントロジー（md の構造の正本）

**このファイルには、ここにしか無い規約だけを書く。** md の構造 — 骨格要素・注釈ディレクティブ・
16レイアウトとその `###` / `####` の意味・見出しの語彙・`key: value` メタ・文字数制限 — の正本は
[ontology.yaml](ontology.yaml)（人間可読な生成物は [ontology.md](ontology.md)）。
**そちらにある内容をここへ写さない**（写した瞬間、四重管理とドリフトが始まる）。

- 実装は `assets/src/ontology/` 経由で宣言を読む。`registry.ts` はプラグインのディレクティブを、
  `schema/validation.ts` は文字数上限をそこから導出する。**コードに語彙や数値を再定義しない。**
- `ontology.md` と SKILL.md の生成領域（`<!-- BEGIN GENERATED: … -->`）は
  `npx tsx src/tools/gen-ontology-doc.ts` で生成する。手編集禁止。
- 宣言に照らした md の検査は `npx tsx src/cli.ts --lint <deck.md>`。既定は警告、`--strict` でエラー。
- 宣言そのものの点検は `npx tsx src/ontology/selfcheck.ts`。

## Commands

```bash
cd assets
npm test                                          # 全テスト
npx tsx src/cli.ts input.md output.pptx           # PPTX 生成
npx tsx src/cli.ts input.md output.html --html    # HTML 生成
npx tsx src/cli.ts input.md out.html --html --verify  # 検証
npx tsx src/cli.ts --wiki doc/wiki _site/index.html    # Wiki サイト生成
npx tsx src/cli.ts --lint [--strict] doc/Spec.md doc/wiki  # 宣言に照らして検査
npx tsx src/ontology/selfcheck.ts                 # 宣言の自己点検
npx tsx src/tools/gen-ontology-doc.ts [--check]   # ontology.md / SKILL.md 生成領域
```

## Code Reading Order

コードを読む順序。パイプラインの流れに沿って上流から下流へ。

### 1. Entry Points → Pipeline

```
src/index.ts        md2pptx(), md2html(), md2wiki() — 公開 API
src/cli.ts          CLI ラッパー (--html, --verify, --wiki, --lint, --strict)
src/pipeline.ts     パイプラインの組み立て: lint → parse → validate → render
```

### 1.5 Ontology: 宣言の読み取りと検査

```
src/ontology/
├── types.ts        ontology.yaml の宣言に対応する型（YAML のキーは kebab-case のまま）
├── index.ts        ローダ + 導出ルックアップ（registry / validation / lint / 生成器の唯一の入口）
├── selfcheck.ts    宣言そのものの点検（宣言 ⇔ 実装の両方向を突き合わせる）
└── lint.ts         書かれた md を宣言に照らして検査（トークン層で見る）
```

`lint.ts` がトークン層を見るのは、語彙外の `###` や未宣言のメタキーが **AST に変換される時点で
もう失われている**ため（消えたブロックは AST に痕跡を残さない）。

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
├── inline-formatter.ts インライン装飾 (**bold**, *italic*, `code`, [[link]], [x](url)) → InlineTextRun[]
├── slide-ids.ts        slug 生成 + スライド ID の一括採番 (ast-builder から呼ぶ)
└── handlers/           トークンハンドラ (structural, layout-directives, inline, body-text)
```

### 3. Validation: AST → Validated Presentation

```
src/schema/
├── index.ts            barrel export
├── presentation.ts     Plain class 型 (TitleSlide, ContentSlide, コアレイアウト各種)
├── theme.ts            Theme 型 + DEFAULT_THEME
└── validation.ts       文字数制限バリデーション (上限の正本は ontology.yaml)
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
│   ├── index.ts        renderToHtml() + renderSlide() — inline style HTML 生成
│   ├── slide-renderers.ts  layoutSlide() → HTML div 生成
│   ├── element-renderers.ts  TextBox → CSS 変換
│   ├── slide-css.ts    ★ スライド1枚ぶんの CSS (html と wiki で共有)
│   └── template.ts     HTML ドキュメントテンプレート
│
├── wiki/               Wiki レンダラ (複数デッキ → 1枚のリンク可能サイト)
│   ├── index.ts        renderToWiki() / buildWikiSite()
│   ├── types.ts        WikiDeck, WikiEntry, WikiSite, BrokenLink
│   ├── site-index.ts   ID のデッキ名前空間化 (deck-slug/slide-id)
│   ├── link-graph.ts   参照収集・4段階の解決・バックリンクの逆引き
│   ├── styles.ts       サイトシェルの CSS (slide-css.ts を取り込む)
│   ├── client-script.ts  ルーティング・ホバープレビュー・キーボード
│   └── template.ts     サイトのドキュメントテンプレート
│   ※ スライドの DOM は html/ の renderSlide() を再利用する。
│      複製すると PPTX/HTML/Wiki の三者がずれるため。
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
  → wiki/      → string (.html, 複数デッキを1枚に)
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

md の記法そのもの（区切り・要素・ディレクティブ・語彙・文字数・リンク）は
[ontology.md](ontology.md) が正本。ここに書くのは**実装側の制約だけ**。

- 箇条書きの描画: `block-formatter.ts` が Paragraph[] に変換し、PPTX はネイティブバレット・HTML は CSS 疑似要素で記号を描く (リテラルの `•` は書かない — 二重表示になる)
- 新レイアウト追加時: `ontology.yaml` の `layouts` に宣言 → `plugins/` にプラグインフォルダを作成 → `plugins/index.ts` に import 追加 → `gen-ontology-doc.ts` を実行。宣言が無いと `registerPlugin()` が落ちる（ドキュメントにも lint にも現れないレイアウトを作らせないため）
- スライド ID の採番: `parser/slide-ids.ts` が `ast-builder.ts` から**一括で**行う（11個のプラグイン converter を触らないため、かつ `raw.title` が読めるのが変換直前だけのため）
- HTML のスライド div は `id=` を持たない。Wiki のホバープレビューが `cloneNode` するので ID が重複する。ID は `data-slide-key`、`data-slide-id="slide-N"` は `html-inspector` 用なので触らない
- `display:flex` の直下に複数のインライン要素を置かない（1つずつが flex アイテムになり語の途中で改行される）。`richText` は `.rich-text`、`paragraphs` は `.para-stack` で1つにまとめる

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

ディレクティブと文字数上限は**プラグインには書かない**。正本は `ontology.yaml` の `layouts` で、
`registerPlugin()` が `id` を鍵に完全一致の `tokenMatcher` を導出し、`getValidationConfig()` が
`max-chars` を引く。したがって**通常 `tokenMatcher` は書かない** — 手書きするのは認識が
リテラル1本で表せない場合のみ (numbered-list の `circle|bar` 正規表現が唯一の例)。

**新プラグイン追加**: `ontology.yaml` の `layouts` に宣言 + `plugins/index.ts` に
`import "./my-layout/index.js"` を 1 行追加。宣言が無いと登録時に落ちる。

## Theme System

`schema/theme.ts` に `Theme` 型と `DEFAULT_THEME` を定義。CLI の `--theme <path>` で YAML テーマファイルを指定可能。テーマは色・フォントサイズ・マージン等をカスタマイズする。未指定時は DEFAULT_THEME がフォールバック。

## Test → Module 対応表

| テストファイル | 対象モジュール |
|---|---|
| `e2e.test.ts` | 全パイプライン (markdown → .pptx buffer) |
| `parser.test.ts` | parser/ (AST 構築) |
| `block-formatter.test.ts` | parser/block-formatter.ts (リスト → Paragraph 変換) |
| `inline-formatting.test.ts` | parser/inline-formatter.ts (**bold** / *italic* / `code` / リンク) |
| `slide-id.test.ts` | parser/slide-ids.ts (slug 生成・ID 採番・衝突の連番) |
| `wiki.test.ts` | renderer/wiki/ (デッキ合成・リンク解決・バックリンク・自己完結性) |
| `validation.test.ts` | schema/validation.ts (文字数制限) |
| `ontology.test.ts` | ontology.yaml + src/ontology/ (宣言の自己整合・宣言⇔実装・lint・生成物の鮮度) |
| `layout-engine.test.ts` | renderer/layout/ (座標計算・スナップショット) |
| `overflow.test.ts` | renderer/layout/overflow.ts + validate-layout.ts (はみ出し検出・縮小・失敗) |
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
