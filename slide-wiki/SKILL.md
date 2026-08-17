---
name: slide-wiki
description: Builds a link-navigable slide wiki from Markdown decks, and renders the same decks to PowerPoint and HTML. Converts structured Markdown through a pipeline of parse → validate → layout → render, with layout plugins and wiki-style links that carry hover previews and backlinks across deck boundaries. Supports 16 layout types including grid, icon columns, steps, tables, quotes, agenda, lean canvas, customer journey, and wiki patterns with a required SVG diagram. Use when building a linked slide wiki from several decks, creating presentations, generating PPTX files, generating HTML slides, formatting markdown as slides, converting markdown to slides, or when the user wants to format content for presentation output.
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
見出しの語彙・文字数 — は [ontology.yaml](ontology.yaml) が唯一の正本。
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
| `short` | recommended | `text` | Wiki の表示 | デッキの短い呼び名。**Wiki の各スライドの右上と、そのデッキへ渡るリンクの 末尾に、この文字列がそのまま出る**。両方に出るので短く保つ（全角4字・ 半角6字が目安）。名乗らなければデッキ名（slug）で代替するので、 欠けても壊れないが、そこへ渡るリンクだけ長い語が出て語調が揃わない。 |
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
| WikiPattern | `<!--pattern-->` | Wiki のパターン1件。左に いつ・なにが困るか／そこで、右に SVG の図解 |
| LeanCanvas | `<!--lean-canvas-->` | リーンキャンバス |
| CustomerJourney | `<!--カスタマージャーニー:-->` | カスタマージャーニーマップ |
| Steps | `<!--steps-->` | 階段状のステップ表示 |
| NumberedList | `<!--numbered-list:circle-->` | 番号付きリスト（意匠は `circle` か `bar`） |
| Agenda | `<!--agenda-->` | TOC/アジェンダ |
| Quote | `<!--quote-->` | 引用・名言スライド |
| Table | `<!--table-->` | テーブル表示（ディレクティブの後にパイプ区切りの表を置く） |
| CodeDisplay | `` ```<language> `` | シンタックスハイライト付きコード |
| TextOnly | `<!--text-only-->` | 自由形式テキスト |
| Default | (なし) | セクションを縦に並べる |
| IconColumns | `<!--icon-cols-->` | アイコン付き3カラム |
| IconCards | `<!--icon-cards-->` | アイコン付きカード |
| Grid | `<!--grid:RxC-->` | R行×C列のグリッド |
| LeftRight | `<!--left:N-->` `<!--right:M-->` | 左右分割（比率指定） |
| TopBottom | `<!--top:N-->` `<!--bottom:M-->` | 上下分割（比率指定） |
<!-- END GENERATED: layouts -->

各レイアウトが `###` / `####` に何を期待するか（件数・見出しの語彙・本文の読まれ方）は
[ontology.md](ontology.md)「レイアウトごとの構造」が正本。`--lint` がそこに照らして検証する。

### 注釈ディレクティブ

<!-- BEGIN GENERATED: annotations -->
| 注釈 | 記法 | 効くレイアウト | 説明 |
|---|---|---|---|
| `id` | `<!--id:<slug>-->` | すべて | スライドの ID。`デッキ名.md#…` の解決先であり HTML の `#hash` でもある。 |
| `icon` | `<!--icon:mi:<name>-->` | Steps・IconColumns・IconCards | セクションのアイコン。`mi:` 接頭辞で Material Icons、それ以外は絵文字。 |
| `takeaway` | `<!--takeaway-->` | Steps・NumberedList・Table・TextOnly・Default・IconColumns・IconCards・Grid・LeftRight・TopBottom | スライド末尾のまとめ。マーカーの次の行以降が本文になる（典拠は source）。 |
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

**internal-link**

**先頭に `/` も `./` も付けない。** 書く形は `デッキ名.md#スライドID` だけである。

理由は GitHub で当たること。先頭に `/` を付けると、github.com はそれを
**バンドルのルートではなくリポジトリのルート**と読む。バンドルはリポジトリの
深い場所にあるので、生の md を開いた読者にはリンクが折れて見える。
相対形なら置き場所の深さに関係なく当たるので、綴りが1つで両方に効く。

OKF v0.2 §6.1 は相対も絶対も許し、絶対形を「推奨」と書く。ただしその理由は
「概念をサブディレクトリの中で移してもリンクが折れない」ことなので、
サブディレクトリを持たないこのバンドルには効かない（→ `okf` 節）。

**読むほうは `./x.md` と `/x.md` も解決する。** 書く形を絞るのは lint の仕事で、
パーサに蹴らせてはいけない。蹴られたリンクは外部リンクとして `target="_blank"`
で描かれ、未解決リンクの一覧にも出ない — **見た目はリンクのまま黙って壊れる。**
読みを広く、書きを狭く。

**次の2つは内部リンクにしない。**

- `sub/x.md` `../x.md` — バンドルが平坦なので、指す先が存在しない
- デッキ名を省いた `#id` — どのデッキに書かれたリンクかを知らないと解決できず、
  「href だけ見れば行き先が決まる」という性質が壊れる（その性質の根拠 → `okf` 節）

`#スライドID` は OKF の規定外で、この道具の拡張。OKF は1ファイル=1概念だが、
こちらは1ファイルに何十枚も入るので、ファイルだけでは行き先を指せない。

予約ファイル名（→ `okf` 節の `reserved-files`）はデッキではないので、
指しても内部リンクにはならず外部リンクとして描かれる。

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

内部リンクは**デッキ名だけの相対パス1本**なので、解決は表を1回引くだけ
（`デッキ名.md#スライドID`、フラグメントを省けばそのデッキの1枚目）。
同じデッキの中でもデッキ名を書く — 書き方が1つだと「どのデッキから見た参照か」が要らず、
候補が2つあって決められない、ということが起きない。当たらなければ未解決として
サイドバーに一覧が出る。サンプルは `doc/wiki/`（機能ガイドと索引のあいだに、
パターンのデッキが主題ごとに並ぶ。パターンは互いにデッキをまたいで参照し合う）。
「人が育てる Wiki」は**2部構成**で、第1部（`intro-wiki`）が背景・目的と語彙を使った
ショートストーリー（始める → 続ける → 繋げる → 新しい種を撒く）、第2部（`patterns-wiki`）が
パターンのカタログ。対になるので `order.yaml` では同じグループに置く。

**サイドバーの絞り込みは、題と ID に加えてデッキの `short` / `description` / `tags` を見る。**
スライドの題が比喩のとき（`夜勤`・`司書`・`剪定`）、その名前を知らないと引けなかったが、
デッキが frontmatter で名乗った語があれば束ごと残る。1枚ごとの本文はまだ見ない（BACKLOG B-37）。

**どの束を読んでいるかは、スライドの中で名乗る。** デッキが frontmatter の `short` で
名乗った短い呼び名が、各スライドの**右上**に出る（名乗らなければデッキ名）。
形の同じパターン集が2本並ぶと、1枚を見ただけではどちらか分からない — 題は上の
パンくずにあるが、読んでいる最中に目を上げないと分からないため。

**リンクは、またぐものにだけ行き先の呼び名が付く。** 同じデッキの中を指すリンクは
素のまま（付いていること自体が「またぐ」の合図）。バックリンクの帯も同じ規則で、
来し方が別のデッキならその呼び名が付く。これは `--wiki` だけの表示で、
`--html` の1枚ものはデッキが1つなので「またぐ」に指すものが無い。

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

### パターン間の関係

<!-- BEGIN GENERATED: relations -->
パターン1枚と1枚のあいだに張る、型のついた辺。本文の散文リンクに型を与えるだけで、 新しい辺を書き足す場所ではない。

辺の正本はバンドルの `relations.yaml`（`decks: [デッキ名.md], edges: [{from, rel, to, note}]`）。両端になれるのは `WikiPattern` だけ。

**型と、その代数**

| 型 | 逆向き | 意味 | 出どころ |
|---|---|---|---|
| `上位` | `下位` | このパターンを含む、ひとまわり大きなパターン。 | Alexander『パタン・ランゲージ』(1977) 序文の larger patterns |
| `下位` | `上位` | このパターンの中に含まれ、これを完成させる小さなパターン。 | 同 smaller patterns（"helps complete"） |
| `同位` | 自分自身（対称） | 同じ大きさで隣り合い、互いを取り囲むパターン。 | 同 surrounding patterns |
| `対` | 自分自身（対称） | 逆向きの打ち手として対で置くパターン。どちらが勝つかは状況が決める。 | 往復切符（Fowler『リファクタリング』の 関数の抽出／インライン化） |
| `先行` | `後続` | これより前に済ませておくパターン。 | Coplien の generative sequence（"a sequence is one path through a pattern language"） |
| `後続` | `先行` | これのあとに来るパターン。 | 同上 |
| `検算` | 無し（一方向） | この一枚の出来を確かめる打ち手。落ちれば書き直す。 | このバンドルの反復（agenda の `### 検算:` と本文に計6件） |

- **推移しない。** `上位` / `下位` を辿って畳むのは問い合わせる側の仕事で、書いた1本の辺と導いた辺は別のものとして扱う
- **排他**: `上位` / `下位` / `同位` / `対` — 同じ2枚に同時には立たない
- **片側だけ書く**: 逆向きの辺はローダが導出する
- **孤立させない**: どのパターンも `上位` / `同位` / `下位` のどれか1本は持つ（warning）

**宣言と本文は互いを縛る**

`both` = 宣言した辺には本文に対応するリンクがあること、かつ本文のパターン間リンクは
いずれかの型に分類されていること。前者だけだと本文から関係が消えても宣言が生き残り、
後者だけだと宣言を消しても誰も気づかない。

| 分類を求めないリンク | 理由 |
|---|---|
| `cross-deck` | デッキをまたぐリンク。型付けの対象を1デッキずつ広げるあいだ、 またぐ辺には分類を求めない。 |
| `agenda` | `<!--agenda-->` スライドのリンク。クラスタから見出しへの目次であって、 パターン同士の関係ではない。 |
| `source` | `<!--source-->` の中。**主張の典拠は関連ではない** （→ `annotations` の source）。 |

**語彙は発明していない。** 型はこのバンドル自身が規範として要求しているものだけを写す。
`上位` `同位` `下位` は 不揃いの石畳 の「上位・同位・下位の3方向へ噛ませる」
（出典 Alexander『パタン・ランゲージ』1977 序文＝各パターンは、それを含む上位・
周りを囲む同位・内に含まれる下位のパターンに支えられてのみ存在する）、
`対` は 往復切符 の「逆向きにも名前を付け、対で置く」（出典 Fowler『リファクタリング』の
関数の抽出／インライン化）。**パターンが要求していない型は立てない。**

**型の名前は、相手が自分にとって何であるかを言う。** `A 上位 B` は「B は A の上位」で、
`A 検算 B` は「A を確かめるのが B」である。**「A が B に何をするか」ではない** —
サイトはこの名前を1枚のページの見出しとして出すので（`上位: 不揃いの石畳`）、
2つの読み方が混じると、同じ欄の中で矢印の向きが型ごとに裏返る。

**型そのものにも 3ストライクで書く を効かせる。** 本文に3度現れるか、パターンが
規範として要求しているかのどちらかを満たすまで、新しい型を宣言しない。
一度きりの言い回し（`代替` = メタファ → ドメイン言語 の1件など）は型ではなく、
まだ散文のままにしておく。version 8 で削った仕組み4つと同じ理由で、
**使い手のいない型は、宣言を読んでも効き目を確かめられない。**

**本文の書き方は変えない。** 関連は文中に溶かす（→ `layouts` の WikiPattern）ままで、
`relations.yaml` は本文の写しではなく**既にあるリンクへの型付け**である。だから
`prose` の双方向検査が要る — 片方だけ動かせば必ず落ちるので、二重管理にならない。

**推移閉包は宣言に書かない。** `上位` / `下位` は非推移として扱い、辿った先を
まとめるのは問い合わせる側の仕事にする（SKOS が非推移な `broader` と推移的な
`broaderTransitive` を分けたのと同じ理由 — 推移を宣言に混ぜると、書いた1本の辺と
導かれた辺の区別が消える）。

**片側だけ書く。** 対称な型（`同位` `対`）と逆対のある型（`上位`⇄`下位`・
`先行`⇄`後続`）は、どちらか一方に書けば足りる。逆向きはローダが導出する。
両側に書くと、片方を消したときにもう片方が残って辺が生き続ける。

**対象は `decks:` が名乗る。** 型付けは1デッキずつ広げるので、どこまで済んでいるかを
ファイル自身に書かせる。名乗っていないデッキのリンクは「まだ分類していない」であって
「分類し忘れた」ではない — この2つを機械が区別できないと、広げる途中は
検査を切るしかなくなる。

<!-- END GENERATED: relations -->

`relations.yaml` はこう書く。**本文の散文リンクに型を与えるだけで、新しい辺を書く場所ではない**
（関連は文中に溶かすまま。lint が両方向を突き合わせるので、どちらか片方だけ動かすと落ちる）。

```yaml
version: 1
decks: [patterns-meta.md] # 型付けが済んでいるデッキ。ここに無いデッキは検査しない
edges:
  - from: patterns-meta.md#声に出して読む
    rel: 対 # 逆向きは書かない（ローダが導出する）
    to: patterns-meta.md#黙って聴く著者
    note: ":353 著者は黙り、声に出すのは読者の役。対で効く。" # 型を付けた根拠
```

目録は `npx tsx src/tools/gen-okf-index.ts` が `order.yaml` の `groups:` から生成し、
バンドルに置いて追跡する（`--check` で鮮度を見る）。これで `doc/wiki/` は、
そのまま配っても他のエージェントが読める OKF のバンドルになっている。

古い記法で書かれた md は `npx tsx src/tools/migrate-wikilinks.ts <dir>` が一括で
書き換える（`--dry-run` で下見、`--check` で残存の検査）。移すのは2つ — 旧 `[[…]]` 記法と、
先頭に `/`・`./` の付いた内部リンク。後者は**サイトでは当たるので目で見ても分からない**
（折れるのは生の md を github.com で開いたときだけ）ので、他人のデッキを受け取ったら
まず `--check` を通す。コード表記の中の見本は据え置く。

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
