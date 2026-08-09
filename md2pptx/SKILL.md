---
name: md2pptx
description: Markdown to PowerPoint/HTML slide generator with layout plugins, wiki-style links and a link-navigable wiki output. Converts structured Markdown into presentation slides (.pptx, .html) using a pipeline of parse → validate → layout → render. Supports 17 layout types including grid, icon columns, steps, tables, quotes, agenda, lean canvas, customer journey, pattern language, and wiki patterns with a required SVG diagram. Use when creating presentations, generating PPTX files, generating HTML slides, formatting markdown as slides, converting markdown to slides, building a linked slide wiki from several decks, or when the user wants to format content for presentation output.
---

# md2pptx

Markdown → AST → PPTX/HTML 変換スキル。共通レイアウトエンジンで座標を計算し、PPTX と HTML 両方に出力する。

## Quick Start

```bash
cd <skill-path>/assets
npm install                                       # 初回のみ
npx tsx src/cli.ts input.md output.pptx           # PPTX 生成
npx tsx src/cli.ts input.md output.html --html    # HTML 生成
npx tsx src/cli.ts input.md out.html --html --verify  # 3者比較検証
npx tsx src/cli.ts --wiki doc/wiki out/index.html    # リンクで辿る Wiki 生成
npx tsx src/cli.ts --lint input.md                   # 構造の検査だけ
```

## md の構造の正本

このスキルが読む Markdown の構造 — 骨格要素・注釈・16レイアウトが `###` / `####` に何を期待するか・
見出しの語彙・`key: value` メタ・文字数 — は [ontology.yaml](ontology.yaml) が唯一の正本。
**書き方の全文リファレンスは [ontology.md](ontology.md)**（生成物）にあり、以下はその要約。
`--lint` はその宣言に照らして md を検査する。

### CLI Options

| Option | Description |
|--------|-------------|
| `--html` | HTML 出力 |
| `--compress`, `-c` | PPTX を ZIP 圧縮 |
| `--theme <path>`, `-t <path>` | YAML テーマファイル指定 |
| `--verify` | PPTX + HTML 生成 + AST との3者比較（食い違えば非ゼロ終了） |
| `--wiki` | 複数デッキを1枚のリンク可能な Wiki サイトに出力（入力はファイル・複数ファイル・ディレクトリ） |
| `--site-title <text>` | Wiki サイトのタイトル（`--wiki` と併用） |
| `--lint` | 生成せず、md の構造を [ontology.yaml](ontology.yaml) の宣言に照らして検査する |
| `--strict` | 宣言違反を警告でなくエラーにする（生成時にも使える） |

## Markdown 記法

### 基本構造

```markdown
# タイトル
サブタイトル

---

## スライドタイトル
### セクション見出し
本文テキスト
```

- `#` = タイトルスライド、`##` = コンテンツスライド、`###` = セクション見出し
- `---` = スライド区切り
- `- item` / `* item` / `+ item` = 箇条書き、`1. item` = 番号付きリスト（本文中で使用可）

文字数の制限:

<!-- BEGIN GENERATED: limits -->
- 1スライド **1000文字**を超えると ValidationError。本文と見出し（Markdown 構文を除く）。リンクは表示ラベルだけを数え、URL は数えない。
- 読みやすさの目安は **240文字程度**（ツールでは強制しない）
- PatternLanguage だけは **1024文字**まで（レイアウトごとの上書き）
- `CodeDisplay` は文字数を数えない（タイトルのみ）
<!-- END GENERATED: limits -->

### 箇条書き

```markdown
## タイトル
### 見出し
- 項目A
- 項目B
1. 手順1
2. 手順2
```

PPTX はネイティブのバレット/自動番号、HTML は CSS 疑似要素で記号を描画する。**リテラルの `•` を書いてはいけない**（記号が二重に表示される）。

### レイアウト一覧

<!-- BEGIN GENERATED: layouts -->
| レイアウト | ディレクティブ | 説明 |
|---|---|---|
| Default | (なし) | セクションを縦に並べる |
| LeftRight | `<!--left:N-->` `<!--right:M-->` | 左右分割（比率指定） |
| TopBottom | `<!--top:N-->` `<!--bottom:M-->` | 上下分割（比率指定） |
| Grid | `<!--grid:RxC-->` | R行×C列のグリッド |
| IconColumns | `<!--icon-cols-->` | アイコン付き3カラム |
| IconCards | `<!--icon-cards-->` | アイコン付きカード |
| Steps | `<!--steps-->` | 階段状のステップ表示 |
| NumberedList | `<!--numbered-list:circle-->` | 番号付きリスト（意匠は `circle` か `bar`） |
| CodeDisplay | `` ```<language> `` | シンタックスハイライト付きコード |
| TextOnly | `<!--text-only-->` | 自由形式テキスト |
| Table | `<!--table-->` | テーブル表示（ディレクティブの後にパイプ区切りの表を置く） |
| Quote | `<!--quote-->` | 引用・名言スライド |
| Agenda | `<!--agenda-->` | TOC/アジェンダ |
| LeanCanvas | `<!--lean-canvas-->` | リーンキャンバス |
| CustomerJourney | `<!--カスタマージャーニー:-->` | カスタマージャーニーマップ |
| PatternLanguage | `<!--pattern-language-a-->` | パターン・ランゲージ。1ブロックから概要ページ + 詳細ページの2スライドを生成 |
| WikiPattern | `<!--pattern-->` | Wiki のパターン1件。左に 状況/問題/解決、右に SVG の図解 |
<!-- END GENERATED: layouts -->

各レイアウトが `###` / `####` に何を期待するか（件数・見出しの語彙・本文の読まれ方）は
[ontology.md](ontology.md)「レイアウトごとの構造」が正本。`--lint` がそこに照らして検証する。

### 注釈ディレクティブ

<!-- BEGIN GENERATED: annotations -->
| 注釈 | 記法 | 効くレイアウト | 説明 |
|---|---|---|---|
| `id` | `<!--id:<slug>-->` | すべて | スライドの ID。`[[…]]` の解決先であり HTML の `#hash` でもある。 |
| `icon` | `<!--icon:mi:<name>-->` | IconColumns・IconCards・Steps | セクションのアイコン。`mi:` 接頭辞で Material Icons、それ以外は絵文字。 |
| `takeaway` | `<!--takeaway-->` | Default・LeftRight・TopBottom・Grid・IconColumns・IconCards・Steps・NumberedList・TextOnly・Table・WikiPattern | スライド末尾の出典・まとめ。マーカーの次の行以降が本文になる。 |
<!-- END GENERATED: annotations -->

### リンク

<!-- BEGIN GENERATED: inline -->
| 書き方 | 意味 |
|---|---|
| `**text**` | 太字 |
| `*text*` | 斜体 |
| `` `text` `` | インラインコード |
| `[ラベル](https://example.com)` | 外部リンク。HTML は `<a>`、PPTX はハイパーリンク。 |
| `[[slide-id]]` | 内部リンク。表示テキストは ID そのまま。解決できなければ素のテキストになる。 |
| `[[slide-id\|表示テキスト]]` | 表示テキストを指定した内部リンク。 |

効くのは `section-heading`・`section-body`・`takeaway`。プラグインがテキストを直接描く箇所（テーブルのセル・引用本文・ステップのラベル等）では `[[…]]` はそのままの文字として出る（BACKLOG B-22）。
<!-- END GENERATED: inline -->

内部リンクは PPTX では同一ファイル内のスライドジャンプになる。

### スライド ID

`<!--id:foo-->` でスライドに ID を付ける。省略するとスライドタイトルから自動生成し、
衝突したら連番（`-2`）を付ける。ID は `[[…]]` の解決先であり、HTML の `#hash` でもある。

```markdown
## 種ノート
<!--id:seed-->
### まず置く
育て方は [[育つ見出し]] を見よ
```

### Wiki 出力（`--wiki`）

複数の Markdown デッキを1枚の自己完結 HTML にまとめ、ページ送りに加えて
**リンクを辿る／ホバーで覗く／逆リンクから戻る**という読み方ができるようにする。

```bash
npx tsx src/cli.ts --wiki --site-title "My Wiki" doc/wiki out/index.html
```

リンクの解決順は、① `deck/slide` の明示 → ② 自デッキ内 → ③ サイト全体で一意 →
④ 未解決（複数一致しても選ばない。サイドバーに一覧が出る）。
サンプルは `doc/wiki/`（機能ガイド + パターンの4主題 × 2デッキの9デッキ。パターンは互いに
デッキをまたいで参照し合う）。パターンの主題は**2部構成**で、第1部（`intro-*`）が背景・目的と
語彙を使ったショートストーリー（始める → 続ける → 繋げる → 新しい種を撒く）、第2部（`patterns-*`）が
パターンのカタログ。対になるので `order.yaml` では隣り合わせに置く。

**デッキの並び順**は、ディレクトリ直下の `order.yaml` で宣言する（サイドバーの並びと
`Shift + ← →` で送る順）。無ければファイル名順。

```yaml
decks: # 拡張子を除いたファイル名
  - guide
  - intro-human
  - patterns-human
```

ファイル名は `[[deck/slide]]` のリンク先（デッキの slug）でもあるので、
並び替えのためにリネームしない — リンクが折れる。宣言に無いデッキは末尾に付き、
宣言にあるのに存在しないデッキ名はビルドを止める。

## 記法サンプル

### Default（セクション縦並び）

```markdown
## スライドタイトル
### 見出しA
本文テキスト
### 見出しB
本文テキスト
```

### LeftRight（左右分割）

```markdown
## タイトル
<!--left:2-->
### 左側
左の内容
<!--right:1-->
### 右側
右の内容
```

### Grid（グリッド）

```markdown
## タイトル
<!--grid:2x2-->
### セル1
内容1
### セル2
内容2
### セル3
内容3
### セル4
内容4
```

### Table（テーブル）

```markdown
## タイトル
<!--table-->
| 列1 | 列2 | 列3 |
| --- | --- | --- |
| A | B | C |
| D | E | F |
```

### Quote（引用）

```markdown
## タイトル
<!--quote-->
引用テキスト。複数行も可能。
### 著者名
```

### Agenda（アジェンダ）

```markdown
## Agenda
<!--agenda-->
サブタイトル
### 項目1
### 項目2
### 項目3
```

### Steps（ステップ）

```markdown
## タイトル
<!--steps-->
### ステップ1
<!--icon:mi:search-->
役割名
説明テキスト
### ステップ2
<!--icon:mi:code-->
役割名
説明テキスト
```

### NumberedList（番号リスト）

```markdown
## タイトル
<!--numbered-list:circle-->
### 項目1
説明テキスト
### 項目2
説明テキスト
<!--takeaway-->
まとめテキスト
```

## テーマ

YAML ファイルでカスタマイズ可能。`--theme <path>` で指定。未指定時はデフォルトテーマ。

```yaml
fonts:
  body: "Noto Sans JP"
titleSlide:
  background: "#1E40AF"
  titleColor: "#FFFFFF"
contentSlide:
  titleColor: "#1E40AF"
  headingColor: "#3B82F6"
```

## テスト

```bash
cd <skill-path>/assets
npm test           # 全テスト
```

## サンプル

`doc/Spec.md` に全レイアウトのサンプルがあります。

```bash
npx tsx src/cli.ts doc/Spec.md doc/Spec.html --html && open doc/Spec.html
```
