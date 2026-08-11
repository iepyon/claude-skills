---
name: slide-wiki
description: Builds a link-navigable slide wiki from Markdown decks, and renders the same decks to PowerPoint and HTML. Converts structured Markdown through a pipeline of parse → validate → layout → render, with layout plugins and wiki-style links that carry hover previews and backlinks across deck boundaries. Supports 17 layout types including grid, icon columns, steps, tables, quotes, agenda, lean canvas, customer journey, pattern language, and wiki patterns with a required SVG diagram. Use when building a linked slide wiki from several decks, creating presentations, generating PPTX files, generating HTML slides, formatting markdown as slides, converting markdown to slides, or when the user wants to format content for presentation output.
---

# slide-wiki

Markdown のデッキを、リンクで辿れるスライド Wiki にする。同じデッキを PPTX と HTML にも出力し、座標は3系統で共通のレイアウトエンジンが計算する。

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

### デッキのメタ（frontmatter）

md の冒頭に YAML を置くと、デッキが自分について名乗れる。**書くのはデッキ1本の事実**で、
スライド1枚のメタは注釈ディレクティブ（`<!--id:-->` など）が担う。

```markdown
---
type: deck
title: Wiki が育つパターン
description: 人が書き、AI が手入れする。育つ知識の作り方
tags: [wiki, パターンランゲージ]
---

# Wiki が育つパターン
```

<!-- BEGIN GENERATED: frontmatter -->
| キー | level | 形 | 効き先 | 説明 |
|---|---|---|---|---|
| `type` | required | `text` | lint と外部ツール | このファイルが何であるか。**OKF が唯一必須とするキー**（SPEC.md §4.1）で、 読む側は種別で振り分ける。値は中央登録制ではないので、未知の型は 「ふつうの概念」として扱われる。 |
| `title` | recommended | `text` | lint と外部ツール | 1枚目の見出しと同じ文字列。表示名の正本は見出しのほうで、ここは写し。 |
| `description` | recommended | `text` | 絞り込み | 1行の説明。**サイドバーの絞り込みに流れる**ので、引きたい言葉を入れる。 |
| `resource` | optional | `uri` | lint と外部ツール | このデッキが説明している実体の URI（OKF の推奨キー）。 考えを書いたデッキには無い — 実在の資産を説明するときだけ名乗る。 |
| `tags` | recommended | `list-of-text` | 絞り込み | デッキの主題。**サイドバーの絞り込みに流れる**ので、題に出ない言葉を補う。 |
| `category` | optional | `text` | lint と外部ツール | デッキの区分。tags が主題を並べるのに対し、こちらは1つだけ選ぶ。 |
| `status` | optional | `draft` / `stable` / `deprecated` | lint と外部ツール | 書きかけかどうか。order.yaml のコメントに書いていた「まだ無い」を機械に見せる。 |
| `author` | optional | `text` | lint と外部ツール | 書いた人。複数なら読点で連ねる（機械に配るなら sources を使う）。 |
| `created` | optional | `date` | lint と外部ツール | 最初に書いた日。git が持っているが、デッキを移しても残る形で持たせる。 |
| `updated` | optional | `date` | lint と外部ツール | 最後に手を入れた日。**手で書く以上ずれる**ので、ずれても困らない用途にだけ使う。 |
| `sources` | optional | `list-of-objects` | lint と外部ツール | このデッキが依拠した資料。地の文に埋まっていた出典を機械可読にする。 |
| `verified` | optional | `list-of-objects` | lint と外部ツール | 誰がいつ内容を確かめたか。出典の照合結果を残す場所。 |
| `generated` | optional | `object` | lint と外部ツール | 機械が作ったデッキであることの表明。 |
| `stale_after` | optional | `date` | lint と外部ツール | この日を過ぎたら見直す。**落ちたら直すのは日付ではなく中身**。 |
| `theme` | optional | `uri` | **まだ効かない** | 使いたいテーマ YAML のパス。**まだ効かない** — テーマは1サイトに1つで、 デッキごとに違うものを選ぶと同じ座標系で描けなくなる。効かせるなら 「サイト全体で1つだけ宣言してよい」規則が先に要る。今は --theme が正本。 |
| `site_title` | optional | `text` | **まだ効かない** | サイトのタイトル。**まだ効かない** — サイトはデッキの集合なので、 どの1デッキが全体の名前を名乗るかを決める規則が先に要る。今は --site-title が正本。 |

1行目がちょうど `---` で、2行目が `key: value` の形のときだけメタとして読む（どちらかを満たさない `---` は今までどおりスライド区切り）。
<!-- END GENERATED: frontmatter -->

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
| WikiPattern | `<!--pattern-->` | Wiki のパターン1件。左に いつ・なにが困るか／そこで、右に SVG の図解 |
<!-- END GENERATED: layouts -->

各レイアウトが `###` / `####` に何を期待するか（件数・見出しの語彙・本文の読まれ方）は
[ontology.md](ontology.md)「レイアウトごとの構造」が正本。`--lint` がそこに照らして検証する。

### 注釈ディレクティブ

<!-- BEGIN GENERATED: annotations -->
| 注釈 | 記法 | 効くレイアウト | 説明 |
|---|---|---|---|
| `id` | `<!--id:<slug>-->` | すべて | スライドの ID。`デッキ名.md#…` の解決先であり HTML の `#hash` でもある。 |
| `icon` | `<!--icon:mi:<name>-->` | IconColumns・IconCards・Steps | セクションのアイコン。`mi:` 接頭辞で Material Icons、それ以外は絵文字。 |
| `takeaway` | `<!--takeaway-->` | Default・LeftRight・TopBottom・Grid・IconColumns・IconCards・Steps・NumberedList・TextOnly・Table・WikiPattern | スライド末尾の出典・まとめ。マーカーの次の行以降が本文になる。 |
| `source` | `<!--source-->` | WikiPattern | そのスライドの主張の典拠。マーカーの次の行以降が本文になる。 |
<!-- END GENERATED: annotations -->

### リンク

<!-- BEGIN GENERATED: inline -->
| 書き方 | 意味 |
|---|---|
| `**text**` | 太字 |
| `*text*` | 斜体 |
| `` `text` `` | インラインコード |
| `[ラベル](https://example.com)` | 外部リンク。HTML は `<a>`、PPTX はハイパーリンク。 |
| `[ラベル](デッキ名.md#スライドID)` | 内部リンク。**デッキ名だけの相対パス**で書く。同じデッキの中でもデッキ名を書く。 フラグメントを省くとそのデッキの1枚目に着く。解決できなければ未解決として報告する。 |

効くのは `section-heading`・`section-body`・`takeaway`。プラグインがテキストを直接描く箇所（テーブルのセル・引用本文・ステップのラベル等）では リンクはそのままの文字として出る（BACKLOG B-22）。
<!-- END GENERATED: inline -->

内部リンクは PPTX では同一ファイル内のスライドジャンプになる。

### スライド ID

`<!--id:foo-->` でスライドに ID を付ける。省略するとスライドタイトルから自動生成し、
衝突したら連番（`-2`）を付ける。ID は `デッキ名.md#ID` の解決先であり、HTML の `#hash` でもある。

```markdown
## 種ノート
<!--id:seed-->
### まず置く
育て方は [育つ見出し](patterns-wiki.md#育つ見出し) を見よ
```

### Wiki 出力（`--wiki`）

複数の Markdown デッキを1枚の自己完結 HTML にまとめ、ページ送りに加えて
**リンクを辿る／ホバーで覗く／逆リンクから戻る**という読み方ができるようにする。

```bash
npx tsx src/cli.ts --wiki --site-title "My Wiki" doc/wiki out/index.html
```

内部リンクは**バンドル相対の絶対パス1本**なので、解決は表を1回引くだけ
（`/デッキ名.md#スライドID`、フラグメントを省けばそのデッキの1枚目）。
同じデッキの中でも同じ形で書く — 書き方が1つだと「どのデッキから見た参照か」が要らず、
候補が2つあって決められない、ということが起きない。当たらなければ未解決として
サイドバーに一覧が出る。サンプルは `doc/wiki/`（機能ガイド + 人が育てる Wiki の2デッキ +
パターンを書くパターン + 索引の5デッキ。パターンは互いにデッキをまたいで参照し合う）。
「人が育てる Wiki」は**2部構成**で、第1部（`intro-wiki`）が背景・目的と語彙を使った
ショートストーリー（始める → 続ける → 繋げる → 新しい種を撒く）、第2部（`patterns-wiki`）が
パターンのカタログ。対になるので `order.yaml` では同じグループに置く。

**サイドバーの絞り込みは、題と ID に加えてデッキの `description` / `tags` を見る。**
スライドの題が比喩のとき（`夜勤`・`司書`・`剪定`）、その名前を知らないと引けなかったが、
デッキが frontmatter で名乗った語があれば束ごと残る。1枚ごとの本文はまだ見ない（BACKLOG B-37）。

### バンドル（デッキの集合と並び）

<!-- BEGIN GENERATED: okf -->
デッキを収めたディレクトリ1つ。そのまま配れば他のエージェントが読める Open Knowledge Format のバンドルになる。版は `0.2`（[SPEC.md](https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md)）。

**予約ファイル名**

| ファイル名 | 役割 | 説明 |
|---|---|---|
| `index.md` | 目録 | バンドルに何が入っているかの一覧（SPEC.md §8）。`order.yaml` の `groups:` から生成する。 |
| `log.md` | 更新履歴 | いつ何が変わったかの記録（SPEC.md §9）。デッキが日付を1つも名乗っていなければ作らない。 |

**予約ファイルはデッキではない。** 概念を書いたものではなくバンドル自身についての
メタなので、スライドとして読み込まず、内部リンクの行き先にもしない
（指すと外部リンクとして描かれる）。`order.yaml` に書くこともできない。

**デッキの集合と並び**

- デッキ集合: ディレクトリ直下の `*.md` から予約ファイル名を除いたもの
- 並び順の正本: `order.yaml`（`groups: [{title, decks}]`）

デッキ名は**拡張子を除いたファイル名**で書く。グループ名は生成される目録の見出しに
なるので、「第1部と第2部は対」といった意図が機械にも読める場所に載る。
宣言が無ければファイル名順。

宣言に無いデッキは末尾へ回す（追記を忘れたデッキがサイトから黙って消えないため）。
宣言にあって存在しないデッキ名はビルドを止める。

**デッキ slug**

- もと: 拡張子を除いたファイル名
- 綴りの規則: 見出し → スライド ID と同じ1つの規則（`src/slug.ts`）
- 衝突したときの扱い: `error`

| ファイル名 | デッキ slug | リンクの書き方 |
|---|---|---|
| `patterns-wiki.md` | `patterns-wiki` | `patterns-wiki.md#スライドID` |
| `My_Deck.md` | `my-deck` | `My_Deck.md#スライドID` |
| `Wiki の作り方.md` | `wiki-の作り方` | `Wiki の作り方.md#スライドID` |
| `種ノート.md` | `種ノート` | `種ノート.md#スライドID` |

**`order.yaml` に書く名前・リンクに書くファイル名・サイトの slug は同じものを指す。**
3つが同じ規則を通るからそう言える。ファイル名は `デッキ名.md#スライドID` の
行き先そのものなので、並び替えのためにリネームするとサイト中のリンクが折れる。

slug が衝突する2つの md は誤りとして止める。デッキはファイルなので書き手が改名できる
（スライド ID と違い、機械が一意化して先へ進む理由が無い）。

**スライド ID の一意性**

- 一意な範囲: デッキ
- サイト全体での綴り: `{deck-slug}/{slide-id}`

ID がデッキ内で閉じているのは、単体ファイルを `--html` にかけたときに短く安定した
ID であってほしいため。サイトにまとめる段で `deck-slug/` を前置して名前空間化する。

**閉じているからこそ、ID の衝突の検査を lint に置けた** — lint は1ファイルずつ
呼ばれるので、検査の範囲と一意性の範囲がそのまま一致する。

**バンドルは平坦である。** 読むのはディレクトリ直下の md だけで、サブディレクトリは
降りない。内部リンクがパス区切りを含む形を受けないのはそのためで、`sub/deck.md` は
内部リンクにならない。ここで basename だけを採ると、`deck.md` と `sub/deck.md` が
同じ slug に落ちて「同名の最上位デッキに黙って当たる」形の誤りが入り込む。

**平坦だから、相対リンクの解決に元ドキュメントの位置が要らない。** デッキは全部が
兄弟なので、`x.md` はどのデッキから書かれても同じ1枚を指す。階層を許すとこの性質が
消え、リンクを読む側が「どのファイルに書かれたリンクか」を持ち歩くことになる
（→ `inline` 節の `internal-link`）。

**この節が宣言するのは綴りと規則だけで、正規化の中身は持たない。**
デッキ slug の作り方は `deck-slug` が「見出し → ID と同じ1つの規則を通る」と
言うにとどめ、規則そのものは実装（`src/slug.ts`）に1本だけ置く。
**両側が同じ規則で作られること自体が保証なので、規則を2箇所に書いた時点でその保証が消える。**

**CLI の打ち方はここに書かない。** 宣言はコマンドを持たない。目録と履歴の作り方は
SKILL.md が、実装の入口は CLAUDE.md が持つ。

<!-- END GENERATED: okf -->

`order.yaml` はこう書く。並びはサイドバーの順であり、`← →` で送る順でもある
（送りはグループを平坦に均した順なので、デッキの境界を越えて進む）。

```yaml
groups: # グループ名は生成される index.md の見出しになる
  - title: ガイド
    decks: [guide] # 拡張子を除いたファイル名
  - title: 人が育てる Wiki
    decks: [intro-wiki, patterns-wiki] # 第1部と第2部は対なので同じグループへ
```

目録は `npx tsx src/tools/gen-okf-index.ts` が `order.yaml` の `groups:` から生成し、
バンドルに置いて追跡する（`--check` で鮮度を見る）。これで `doc/wiki/` は、
そのまま配っても他のエージェントが読める OKF のバンドルになっている。

旧 `[[…]]` 記法で書かれた md は `npx tsx src/tools/migrate-wikilinks.ts <dir>` が
一括で書き換える（`--dry-run` で下見、`--check` で残存の検査）。

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
