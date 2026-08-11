# CLAUDE.md

## Git Push Policy

**作業ブランチへの push は済ませる。** 以前ここには「push するな、要求されたときだけ」と
書いてあったが、**Claude Code on the web の停止フックが未 push のコミットを毎回差し戻すので、
規約として成り立っていなかった**（フックは無条件で、未コミット・未追跡・未 push のいずれかが
あれば止める）。守るべきものはフックのほうにある — リモートセッションのコンテナは
使い終わると回収されるので、**push していないコミットは失われる。**

代わりに残す線は3つ。どれもフックが見ていないので、ここにしか無い規約になる。

- **`main` に直接 push しない。** 公開サイトは `main` への push で再ビルドされる
  （`.github/workflows/pages.yml`）。作業は必ずブランチに置く
- **force push しない。** 明示的に要求されたときだけ
- **PR は頼まれてから作る。** ブランチを push しても PR は開かない

## Overview

Markdown のデッキをリンクで辿れる Wiki にする Claude Code skill。同じデッキを PPTX（AST → pptxgenjs）と HTML にも出力し、共通のレイアウトエンジンで座標を計算して3系統に出す。

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
npm run typecheck                                 # 型検査 (vitest は型を捨てるので別に要る)
npx tsx src/cli.ts input.md output.pptx           # PPTX 生成
npx tsx src/cli.ts input.md output.html --html    # HTML 生成
npx tsx src/cli.ts input.md out.html --html --verify  # 3者比較 (食い違えば非ゼロ終了)
npx tsx src/cli.ts --wiki doc/wiki _site/index.html    # Wiki サイト生成
npx tsx src/cli.ts --lint [--strict] doc/Spec.md doc/wiki  # 宣言に照らして検査
npx tsx src/ontology/selfcheck.ts                 # 宣言の自己点検
npx tsx src/tools/gen-ontology-doc.ts [--check]   # ontology.md / SKILL.md 生成領域
npx tsx src/tools/migrate-wikilinks.ts [--dry-run|--check] doc/wiki  # 旧 [[…]] の一括変換
```

## Code Reading Order

コードを読む順序。パイプラインの流れに沿って上流から下流へ。

### 1. Entry Points → Pipeline

```
src/index.ts        md2pptx(), md2html(), md2wiki() — 公開 API
src/cli.ts          CLI ラッパー (--html, --verify, --wiki, --lint, --strict)
src/pipeline.ts     パイプラインの組み立て: prepare()（tokenize → lint → parse → validate）→ render
```

### 1.5 Ontology: 宣言の読み取りと検査

```
src/ontology/
├── types.ts        ontology.yaml の宣言に対応する型（YAML のキーは kebab-case のまま）
├── index.ts        ローダ + 導出ルックアップ（registry / validation / lint / 生成器の唯一の入口）
├── frontmatter.ts  デッキ冒頭の YAML の分割と読み取り（依存は yaml だけ＝どこからでも呼べる）
├── selfcheck.ts    宣言そのものの点検（宣言 ⇔ 実装の両方向を突き合わせる）
└── lint.ts         書かれた md を宣言に照らして検査（トークン層で見る）
```

**frontmatter は生の md を受け取る3つの入口すべてで剥がす** — `pipeline.ts` の `prepare()`、
`parser/index.ts` の `parseMarkdown()`、`ontology/lint.ts` の `lintSource()`。
片方だけだと同じデッキから違うトークン列が出て、3者比較が原因の分かりにくい形で落ちる。
剥がし方は**同じ行数の空行への置換**で、切り落とすと以降の診断の行番号が実ファイルとずれる。

`lint.ts` がトークン層を見るのは、語彙外の `###` や未宣言のメタキーが **AST に変換される時点で
もう失われている**ため（消えたブロックは AST に痕跡を残さない）。

### 2. Parsing: Markdown → AST

```
src/parser/
├── index.ts            barrel export (parseMarkdown / parseTokens)
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
│   ├── client-script.ts  ルーティング・ホバープレビュー・キーボード・拡大率
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
├── inventory-diff.ts  2つのインベントリの差分
├── verify.ts          3者比較の組み立てと判定 (食い違い → 非ゼロ終了)
├── roughen-svg.ts     図解の線を手描き風に崩す (`ラフで出す` を図の側で守る)
└── migrate-wikilinks.ts  旧 `[[…]]` を OKF のバンドル相対リンクに書き換える
```

**移行ツールはパーサに依存しない。** `migrate-wikilinks.ts` は `[[…]]` を自分の
正規表現で拾い、解決に要るのはスライド ID の索引だけなので、パーサから旧記法を
落としたあとも動く。他人のデッキを受け取るスキルなので、破壊的変更の移行路は
同梱しておく（`--check` は「旧記法が紛れ込んでいないか」の恒常的な見張りにもなる）。

**図形の名前は数えずに宣言する。** `--verify` が突き合わせる図形のキーは
`src/shape-keys.ts` が唯一の語彙で、PPTX は pptxgenjs の `objectName`
(→ `<p:cNvPr name>`)、HTML は `data-shape-id` に**同じ文字列**を書き出す。
インスペクタは描画順を数えず、その名前を読む。比較対象は**テキストを運ぶ図形**だけで、
境界ボックス・塗り・コード背景・SVG は `deco:` を付けて除外する
（除外が生成物の中に書かれている状態を保つ）。

**段落の数え方**（`src/text-lines.ts`）と**書式の決め方**（`src/text-style.ts`）も1箇所。
PPTX は改行ごとに `<a:p>` を出すので、HTML も AST インベントリも「1行 = 1段落」で数える。
中央寄せとコードのフォントも同様。3脚が別々の規則を持つと、見た目が同じでも比較が落ちる。

**ただし、共有した規則は3者比較では守れない。** 3脚が同じ関数を呼ぶので、その関数が
間違っていれば3脚とも揃って間違う（比較は緑のまま）。冗長性を消したぶんの検査は
`text-style.test.ts` が明示的に置き直している。共有モジュールを増やすときは同じ手当てが要る。

### 6. Batch: 複数 Markdown の一括 HTML 化

```
src/batch-html.ts   drafts/*.md → htmls/*.html + index.html 目次ページ生成
                    (pattern-language ブロックからメタ情報を抽出して目次を作る)
```

### Shared: Constants & Errors

```
src/constants.ts    スライド寸法・マージン・GAP 等のレイアウト定数を集約
src/errors.ts       ParseError, ValidationError, RenderError (Tagged errors)
src/shape-keys.ts   3者比較で図形を指す名前 (レンダラとツールが共有)
src/text-lines.ts   「1行 = 1段落」の切り出し (レンダラとツールが共有)
src/text-style.ts   中央寄せ・コードのフォントの判定 (レンダラとツールが共有)
src/entities.ts     実体参照のデコード (レンダラとツールが共有)
src/slug.ts         見出し → ID の綴り (デッキ slug と #fragment が同じ規則で作られる保証)
src/okf.ts          OKF の予約ファイル名と内部リンクの形 (パーサ・CLI・lint・生成器が共有)
src/deck-order.ts   `--wiki`/`--lint` にディレクトリを渡したときのデッキの並び (order.yaml の宣言)
src/assets.ts       `![…](….svg)` の参照先の読み込み (**デッキ相対のパスを読むのはここだけ**)
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
- 新レイアウト追加時: `ontology.yaml` の `layouts` に宣言 → `plugins/` にプラグインフォルダを作成 → `plugins/index.ts` に import 追加 → `gen-ontology-doc.ts` を実行。宣言が無いと最初のトークン化で落ちる（ドキュメントにも lint にも現れないレイアウトを作らせないため）
- スライド ID の採番: `parser/slide-ids.ts` が `ast-builder.ts` から**一括で**行う（11個のプラグイン converter を触らないため、かつ `raw.title` が読めるのが変換直前だけのため）
- HTML のスライド div は `id=` を持たない。Wiki のホバープレビューが `cloneNode` するので ID が重複する。ID は `data-slide-key`、`data-slide-id="slide-N"` と `data-default-font-name` は `html-inspector` 用なので触らない（PPTX が `theme1.xml` に既定フォントを持つのと同じで、HTML も自分で名乗る — 読む側が定数を持つと `--theme` でその脚だけ食い違う）
- `display:flex` の直下に複数のインライン要素を置かない（1つずつが flex アイテムになり語の途中で改行される）。`richText` は `.rich-text`、`paragraphs` は `.para-stack` で1つにまとめる
- Wiki のデッキの並び順: ディレクトリ直下の `order.yaml` の `decks:`（拡張子なしのファイル名）が正本。無ければファイル名順。**並び替えのために md をリネームしない** — ファイル名はデッキの slug、つまり `[[deck/slide]]` のリンク先でもあるので、リネームするとサイト中のリンクが折れる。宣言に無いデッキは末尾に付き（追記忘れで消さないため）、宣言にあって存在しないデッキ名はビルドを止める
- 図解は md に書かず `![…](….svg)` で外部ファイルを指す（md をそのまま GitHub で開いても絵として表示させるため）。**パイプラインが文字列だけでは完結しない唯一の場所**で、`baseDir`（md が置かれているディレクトリ）を `md2pptx`/`md2html` のオプション・`WikiSource` から `parseTokens` まで引き回す。読み込みは `assets.ts` の1関数だけが行い、埋め込み時に幅高を `100%` に読み替える（ファイル側は md での表示のために実寸を名乗る）。**枠のほうを図の縦横比に合わせる** — `svgAspectRatio()` が `viewBox` から比を返し、wiki-pattern はその比で下敷きを組んで縦中央に置く。枠を図と違う比で置くと、HTML は `preserveAspectRatio` で図を縮めて余白を作り、PPTX は `addImage` が枠に引き伸ばして図を歪ませる（同じ原因で別々に崩れるので、生成物を見比べても気づきにくい）
- 図解に `<rect>` / `<line>` / `<circle>` / `<polygon>` / `<polyline>` を残さない（`wiki-pattern.test.ts` が止める）。定規で引いた線の図は、本文が道すじと書いても「これが唯一の実装」に読まれる — サイトが載せている `ラフで出す` を、図の側でも守るため。崩すのは `npx tsx src/tools/roughen-svg.ts`（揺れはファイル名と要素の並び順から決まるので、走らせ直しても同じ絵が出る。`<path>` と `<text>` には触らないので**冪等**）。フィルタで粗さを出せないのは `<defs>` と `id=` が禁じられているからで、揺れは座標に焼き付けるしかない

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
├── pattern-language/     `<!--pattern-language-a-->` (1ブロック → Overview + Detail の2スライド)
└── wiki-pattern/         `<!--pattern-->` (左に2節、右に `![…](….svg)` が指す外部 SVG)
```

11ディレクトリ・**12プラグイン登録** (icon-layout のみ2つ)。パーサ側の受け取り方は2つの仕組みがあり、**排他ではなく併用可**:

- `sectionRoute`: `###` セクションを `pluginData` の指定フィールドに集めるだけの標準ルート — lean-canvas, numbered-list, steps, icon-layout, agenda, wiki-pattern
- `modeHandlers`: H3/H4/BodyText の解釈を自前で持つ — customer-journey, pattern-language, quote, table, text-only, steps, icon-layout, agenda, wiki-pattern

(steps / icon-layout / agenda / wiki-pattern は両方を持ち、標準ルートに加えて独自トークン解釈を挟んでいる。
wiki-pattern が挟むのは画像とコードフェンス — 画像は図解の参照を読み込む本題で、フェンスのほうは
飲むだけ。捕まえないとコアのハンドラが `mode` を `"code"` にして、スライドが CodeDisplay として
変換されてしまう)

ディレクティブと文字数上限は**プラグインには書かない**。正本は `ontology.yaml` の `layouts` で、
`registerPlugin()` が `id` を鍵に完全一致の `tokenMatcher` を導出し（宣言の読み込みは
初回の `getTokenMatchers()` まで遅延する）、文字数上限は `validation.ts` が `maxCharsForTag()` で
直接引く。レジストリが返すのは数え方（`getCharCounter()`）だけ。したがって**通常 `tokenMatcher` は書かない** — 手書きするのは認識が
リテラル1本で表せない場合のみ (numbered-list の `circle|bar` 正規表現が唯一の例)。

**新プラグイン追加**: `ontology.yaml` の `layouts` に宣言 + `plugins/index.ts` に
`import "./my-layout/index.js"` を 1 行追加。宣言が無いと登録時に落ちる。

## Theme System

`schema/theme.ts` に `Theme` 型と `DEFAULT_THEME` を定義。CLI の `--theme <path>` で YAML テーマファイルを指定可能。テーマは色・フォントサイズ・マージン等をカスタマイズする。未指定時は DEFAULT_THEME がフォールバック。

**`contentSlide` のフォントサイズは、はみ出したスライドで縮む。** `dispatchLayout` が
`contentSlide.{heading,body,gridHeading,gridBody}Size` を 0.9 → 0.6 と段階的に下げて再レイアウトする
(`renderer/layout/index.ts`)。これは1枚を収めるための仕組みなので、**並べて読ませるレイアウトが
使うと本文の長さでページごとに文字が変わる**。そういうレイアウトはサイズをテーマの別の節に置く
（`wikiPattern` がそれ。`numberedList` / `table` / `agenda` も `contentSlide` の外にある）。
別の節に置いたぶん縮小は空回りし、収まらなければ `validateLayout` がビルドを止める。

## Test → Module 対応表

| テストファイル | 対象モジュール |
|---|---|
| `e2e.test.ts` | 全パイプライン (markdown → .pptx buffer) |
| `parser.test.ts` | parser/ (AST 構築) |
| `block-formatter.test.ts` | parser/block-formatter.ts (リスト → Paragraph 変換) |
| `inline-formatting.test.ts` | parser/inline-formatter.ts (**bold** / *italic* / `code` / リンク) |
| `slide-id.test.ts` | parser/slide-ids.ts (slug 生成・ID 採番・衝突の連番) |
| `wiki.test.ts` | renderer/wiki/ (デッキ合成・リンク解決・バックリンク・自己完結性・ビューア幾何) |
| `deck-order.test.ts` | deck-order.ts (order.yaml の宣言順・未宣言デッキの扱い・宣言の誤り) |
| `validation.test.ts` | schema/validation.ts (文字数制限) |
| `ontology.test.ts` | ontology.yaml + src/ontology/ (宣言の自己整合・宣言⇔実装・lint・生成物の鮮度) |
| `frontmatter.test.ts` | ontology/frontmatter.ts (冒頭 YAML の認識規則・行番号の保存・既存 md を巻き込まないこと) |
| `layout-engine.test.ts` | renderer/layout/ (座標計算・スナップショット) |
| `overflow.test.ts` | renderer/layout/overflow.ts + validate-layout.ts (はみ出し検出・縮小・失敗) |
| `html-renderer.test.ts` | renderer/html/ (HTML 生成・data 属性) |
| `theme.test.ts` | schema/theme.ts (YAML テーマ読み込み) |
| `snapshot-comparison.test.ts` | tools/ (コアレイアウト6種のインベントリ比較) |
| `three-way-verify.test.ts` | tools/ (実在する全デッキの3者比較 + 食い違いの判定) |
| `text-style.test.ts` | text-style.ts (3脚が共有する書式規則 — 共有したぶん比較では守れない) |
| `cli.test.ts` | cli.ts (CLI 引数・ファイル出力) |
| `customer-journey.test.ts` | CustomerJourney レイアウト |
| `table.test.ts` | Table レイアウト (パイプ区切り表のパース + 座標) |
| `pattern-language.test.ts` | PatternLanguage レイアウト (Overview + Detail) |
| `wiki-pattern.test.ts` | WikiPattern レイアウト (2節の並べ替え・空行で割れる段落・図解の必須化・外部 SVG の読み込み・座標・配布デッキの SVG 検査＝実寸・禁止要素・定規で引いた線) |
| `migrate-wikilinks.test.ts` | tools/migrate-wikilinks.ts (旧記法の一括変換・表示テキストの不変・コード表記の据え置き) |
| `docs-consistency.test.ts` | SKILL.md / CLAUDE.md / assets/README.md と実装の乖離検出 |
| `workflows.test.ts` | `.github/workflows/` の宣言 (公開が PR で走らないこと・concurrency group が重ならないこと) |
| `pptx-inspector.test.ts` | tools/pptx-inspector.ts |
| `icon-resolver.test.ts` | renderer/icon-resolver.ts |
| `syntax-highlighter.test.ts` | renderer/syntax-highlighter.ts |
| `html-inspector.test.ts` | tools/html-inspector.ts |

## Development Notes

- `cd assets` してから npm コマンド実行
- `.pptx`, `.html` は gitignore 済み
- `npx tsx` で直接実行 (ビルド不要)
- PPTX/HTML 両レンダラは同一の `LayoutResult` を消費 → 座標ドリフト防止
- **CI は2本に分ける。** `ci.yml` が PR で `npm test` + `npm run typecheck`、`pages.yml` が
  `main` への push で公開する。**pages.yml に `pull_request` を足してはいけない**し、
  2本が同じ concurrency group を使ってもいけない — 以前 PR の run が公開側と同じ
  group に入り、`cancel-in-progress` が push 側を殺してデプロイが消えた。
  この2点は `workflows.test.ts` が落ちる形で守っている
- **型検査は `npm test` に含まれない。** vitest は esbuild で型を捨てるので
  `npm run typecheck` を別に打つ。見るのは `src/` だけ（`__tests__` は tsconfig の
  `exclude` にあり、入れるには別 tsconfig と 38 件の解消が要る — BACKLOG B-45）
