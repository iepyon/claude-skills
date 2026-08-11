# patterns-meta の出典調査

`assets/doc/wiki/patterns-meta.md`（パターンを書くパターン）の11パターンについて、
名前と主張の出どころを一次資料まで辿った記録。**実装済み** — `<!--source-->` 注釈として
スライド下部に 6pt で刻んである（枠は3行ぶん 0.3in）。

**検証の度合いを行ごとに明示する。** 印刷されて残るので、辿れなかったものは
「出典なし」と書く。もっともらしい系譜を作らない。

- ◎ 一次資料の本文を自分で取って引用を確認（`curl` + `grep`、PDF は zlib 展開）
- ○ 一次資料の要約・二次資料で確認（本文は未読）
- △ 未確認（本文にアクセスできず）

---

## 主要な発見: 半分は1つの文献で決まる

Meszaros & Doble, **"A Pattern Language for Pattern Writing"**
(*Pattern Languages of Program Design 3*, Addison-Wesley, 1997, pp.529–574) が
このデッキの正面の先行研究で、**10件のうち4件がここに名前付きで存在する**。

節構成と、このデッキに対応するパターン:

| 節 | パターン | 対応 |
|---|---|---|
| B. Pattern Structure | **Visible Forces** | ザワつく状況 |
| C. Naming and Referencing | **Evocative Pattern Name** | ジワる名前 |
| C. Naming and Referencing | **Meaningful Metaphor Name** | 借りてきた比喩 |
| C. Naming and Referencing | **Readable References to Patterns** | 文に溶かす |
| C. Naming and Referencing | **Relationship to Other Patterns** | でこぼこ石畳（副） |
| D. Understandable | Understood Notations | ラフで出す（**不一致**、後述） |

---

## パターンごとの出典

### ジワる名前 ◎

**一次**: Meszaros & Doble (1997) **Evocative Pattern Name**
Problem: "How do you name a pattern so that it is easy to remember and refer to?"
Solution: "Choose a pattern name that are likely to conjure up images which convey
the essence of the pattern solution."

**併記**: まつもとゆきひろ「名前重要」（『プログラマが知るべき97のこと』
オライリー・ジャパン、2010 所収）。適切な名前を付けられた機能は設計の8割が完成している、
という設計上の座右の銘。名前が付けられないのは設計者自身が役割を理解できていない証拠。

**このエッセイは日本語版だけの書き下ろし。** 原書 *97 Things Every Programmer Should Know*
(Henney 編) には無く、日本語版が小飼弾・関将俊・舘野祐一・まつもとゆきひろ・宮川達彦・
森田創・吉岡弘隆・和田卓人による10本を追加した、その1本（本文は CC-by-3.0-US で
Wikisource にある）。**刻むときは「日本語版」と分かる形にする** —
原書を探した読者が見つけられない。

**Meszaros のどこまでが使えるか、線を引いておく。**
Evocative Pattern Name が本当に対立させているのは **evocative 対 descriptive**（喚起的か、
説明的か）で、これはデッキの「一度で伝わる名前は、たいてい説明である」と**正面から一致する**。
ここは Meszaros を出典にできる。

一致しないのは「**使うたびにジワジワくる**」の遅効性のほうで、これはどちらの出典にも無い
（Meszaros はむしろ即座に像が浮かぶことを求めている）。**このデッキの追加**。
だから出典行は「説明的な名前を避ける」までを Meszaros に負わせ、
遅効性は名前重要側と地の文に持たせる。丸ごと落とす必要はない。

**参考**: 柴田ほか「Pattern Naming Patterns」(PLoP'16, 慶應義塾大学井庭研究室) が
命名だけで40パターンを立てている。A132 Synonym Search が名前の選定基準に
"pronounceable, memorable" を挙げる。デッキの主張そのものは無い。

> 草案: `Meszaros & Doble "Evocative Pattern Name" (PLoPD3, 1997) / まつもとゆきひろ「名前重要」`

### 借りてきた比喩 ◎

**一次**: Meszaros & Doble (1997) **Meaningful Metaphor Name**
Problem: "How do you give your pattern a useful and memorable name?"
Solution: "Find a meaningful metaphor for the pattern, and name the pattern accordingly"
— 読者にとって馴染みのある比喩であること。

**ほぼ完全一致**。デッキの「覚える手間を読者に押し付けない」「借り物なら手間はゼロ」は
この解の理由付けをそのまま日本語にしたもの。ここは安心して刻める。

> 草案: `Meszaros & Doble "Meaningful Metaphor Name" (PLoPD3, 1997)`

### 声に出して読む ◎

**一次候補が2つあり、どちらも部分的にしか合わない。**

1. Evans, *Domain-Driven Design* (2003) のユビキタス言語 —
   モデルを声に出して使うことが言語とモデルのテストになる。ドメイン専門家は
   「言いにくい」用語に異議を唱えるべきだとされる。デッキの「声に出して詰まる名前も、
   黙読では詰まらない」に対応する。
2. Gabriel, *A Pattern Language for Writers' Workshops* の **Author Reads Selection**
   — 著者が一節を音読する。ただしこれは**合評の場での手順**で、デッキの
   「書いた直後に、一人で同僚に向けて声に出す」とは場面が違う。

**パターンコミュニティの一般則としては**「名前は言いやすくあるべき」が
共有語彙を作る目的から導かれている（Hillside の命名ガイドライン）。

**書籍本文を取って確認した（◎）。** ユビキタス言語の章に **「Modeling Out Loud」** という
節がそのままある。

> "One of the best ways of refining a model is to explore with speech, trying out loud
> various constructs from possible model variations. **Rough edges are easy to hear.**"

> "Play with the model as you talk about the system. Describe scenarios out loud using
> the elements and interactions of the model…"

「Rough edges are easy to hear」がデッキの「声に出して詰まる名前も、黙読では詰まらない」の
逐語の裏付け。**節名を刻む** — 「ユビキタス言語」だけでは章が広すぎて読者が辿れない。
Gabriel を併記しないのは場面が混ざるから（合評の場 vs 書いた直後の一人での検算）。

> 刻んだ文字列: `Evans『…ドメイン駆動設計』(2003) ユビキタス言語の節「Modeling Out Loud」＝…"Rough edges are easy to hear"`

### ザワつく状況 ◎

**一次**: Meszaros & Doble (1997) **Visible Forces**
Problem: "How do you ensure that the reader understands the choice of solution?"
Solution: "Ensure that the forces are highly visible" — 見出し・強調・組版で目立たせる。

デッキの「困りごとの核は太字で1文に立てる」という書き方の規約が、
この解の "typographic techniques" と一致している（オントロジーの guidance にも書いてある）。
根は Alexander の forces（文脈の中で競合する力）。

**「ざわざわ感」は本文を確認した ◎**（東京科学大学 EDP「POV の新フォーマット」。
Cloudflare で機械的には読めず、本文の提供を受けた）。

**表記は「ざわざわ感」。** 提供された抜粋の中では助詞に続く形で「ざわざわ」と
短く現れていたが、記事の用語としては「ざわざわ感」。抜粋は部分だったので、
用語の形は記事を知る側の指摘に従う。**ただし役割が Visible Forces とは違う。**

EDP の「ざわざわ感」は、**インタビュアー自身の違和感**（ツッコミ）を指す。
POV の「なぜなら［　］だからだ。とはいえ［　］である。」という書式の、
**2つの対立から生まれるもの**とされ、対立の中身は3通りが挙げられている
（建前／本音、ユーザーの声／デザイナーのツッコミ、Aさんの声／Bさんの声）。
そして「ざわざわ感」は**インサイトの材料**である — 最終行のインサイトを発想するための入力。

つまり:

| | ざわつきの役割 |
|---|---|
| EDP の「ざわざわ感」 | **発見の入力**。対立から違和感が立ち、そこからインサイトを発想する |
| Meszaros の Visible Forces | **記述の要件**。読者が解の選択を理解できるよう、力を目立たせる |
| このデッキの ザワつく状況 | **両方**。「反対の力が書けないなら、それはパターンではない」は発見の検査 |

**判定の役割では EDP と一致している。** ざわざわ感が立たなければインサイトは無い ＝
反対の力が書けなければパターンではない。ここは Visible Forces には無い側面で、
むしろ EDP のほうが近い。だから併記する価値がある。

**ただし出典としては「名前の由来」に寄せるのが正確。** EDP の記事は Alexander も
forces も引いておらず、パターン・ランゲージからの派生ではなく**独立に立った語彙**。
「フォースの緊張関係を言い換えたもの」と刻むと、無い系譜を作ることになる。
`でこぼこ石畳` と同じ扱い（名前は 247、内容は序文）にするのが筋が通る。

**確認すべきこと**: ザワつく状況というオノマトペは、実際にここから採ったのか。
採ったなら名前の出典として書ける。偶然一致したなら「同じ着想の別系統」と書くべきで、
刻む文字列が変わる。

**気づいたこと（次の段階の判断材料、いま直す話ではない）**: EDP の書式は
「なぜなら〜とはいえ〜」で**対立を明示的に持っている**。このデッキの
`いつ・なにが困るか` ／ `そこで` の2節には、対立を示す接続がない
（「こういう場面で、こう困る。そこで、こうする」）。ザワつく状況が
「解に反対する力も書く」と要求している当のものが、**書式の側では支えられていない**。

> 草案: `Meszaros & Doble "Visible Forces" (PLoPD3, 1997) / 名前は東京科学大学 EDP の「ざわざわ感」`

### 釣り竿を渡す ○

**一次**: Alexander の生成性（generativity）。パターンは物であると同時に過程であり、
「生きた物の記述」と「その物を生成する過程の記述」の両方である
（*The Timeless Way of Building*, 1979）。構造そのものが解ではなく、解を生成する。

**併記**: Coplien, *A Development Process Generative Pattern Language* (1994) —
生成的パターンは問題に直接当たらず、下にある構造に間接的に働きかけて
振る舞いを創発させる。非生成的パターンは現象を記述するだけで再現の仕方を語らない。

**名前**「魚ではなく釣り方」は出所不明の格言（老子由来と言われるが典拠なし）。
名前の出典は書かないほうがよい。**内容の出典は生成性**で、これはデッキ本文の
「形が生まれる道すじを書く」と正面から一致する。

> 草案: `Alexander の生成性 (The Timeless Way of Building, 1979) / Coplien, generative pattern (1994)`

### ラフで出す ◎

**一次資料を本文で確認した。** Buxton, "What Sketches (and Prototypes) Are and Are Not"
(*Sketching User Experiences*, 2007 の章) のスケッチの属性一覧に、
このパターンの主張が**2つ、ほぼそのまま**ある。

> **Appropriate Degree of Refinement**: "The resolution or style of a sketch's rendering
> should not suggest a degree of refinement of the concept depicted that exceeds the
> actual state of development, or thinking, of that concept."

> **Suggest & explore rather than confirm**: "sketches don't tell, they suggest.
> Their value lies not in the artifact of the sketch itself, but its ability to provide
> a catalyst to the desired and appropriate behaviours, conversations, and interactions."

> **Constrained Resolution**: "Going beyond good enough is a negative, not positive."

> **Ambiguity**: "Sketches are intentionally ambiguous, and much of their value derives
> from their being able to be interpreted in different ways."

デッキの「整った図は『これが唯一の実装』と読まれる」＝ refinement が実際の検討状態を
超えて見えてしまう問題。「粗さが『ここは決めていない』の合図になる」＝ Ambiguity の価値。
**このデッキで最も出典が強いパターン。**

**Meszaros の Understood Notations は出典にしない。** あれは「対象読者に馴染みのある
記法を使え」で、粗さの話ではない。近い場所にあるが別の主張。

> 草案: `Buxton『Sketching User Experiences』(2007) — Appropriate Degree of Refinement`

### 3ストライクで書く ○

**系譜が2本あり、デッキはパターン側を採っている。**

1. **パターンの妥当性の基準**（こちらが一次）: Coplien (1996) の rule of three —
   文書化されたパターンは実践における既知の適用例（known uses）を少なくとも3件、
   それも有意に異なる3件、示さなければならない。パターンは発明も開発もされず
   **観察される**。デッキの「パターンは発明ではなく発見である」はこの主張そのもの。
2. **リファクタリングの合図**（こちらは反響）: Fowler & Beck『リファクタリング』の
   Rule of Three（Don Roberts 由来）— 3回目の重複でリファクタリングする。
   ユーザの記憶どおり実在するが、**扱っている対象が違う**（コードの重複 vs パターンの妥当性）。

**主従ではなく、役割分担だった。** Fowler のルールの言い回しは
**"Three strikes and you refactor"** で、**「3ストライク」という名前はここから来ている**。
つまり `でこぼこ石畳`（名前は 247、内容は序文）と同じ構造 — **名前は Fowler、内容は Coplien**。
デッキ本文の「パターンは発明ではなく発見である」は Coplien の主張そのもの。

> 刻んだ文字列: `名前は『リファクタリング』の "Three strikes and you refactor"（Don Roberts 由来）。内容は Coplien の rule of three (1996)＝…`

### でこぼこ石畳 ○

**「上位・同位・下位の3方向」は Alexander の序文にそのまま書いてある。**

> "Each pattern is connected to certain 'larger' patterns which come above it in the
> language; and to certain 'smaller' patterns which come below it in the language.
> A pattern language has the structure of a network."

> "Each pattern can exist in the world, only to the extent that is supported by other
> patterns: the larger patterns in which it is embedded, the patterns of the same size
> that surround it, and the smaller patterns which are embedded in it."
> — *A Pattern Language* (1977) 序文

同位（same size）まで含めて3方向が揃っているので、デッキの記述は**要約として正確**。

**名前の借り先**は Alexander のパターン 247 **Paving With Cracks Between The Stones**
（目地を1インチ空けて草や苔が生えるようにする石畳。モルタルを使わず地面に直に置く）。
不揃いのまま噛み合う、という比喩がここから来ている。名前の出典として書ける。

**副**: Meszaros & Doble (1997) **Relationship to Other Patterns** —
leads to / specializes / generalizes / alternatives の関係を記録する。

> 草案: `Alexander『パタン・ランゲージ』(1977) 序文 + 247 Paving With Cracks Between The Stones`

### 文に溶かす ◎

**一次**: Meszaros & Doble (1997) **Readable References to Patterns**
Problem: "How do you refer to other patterns within the description of your pattern?"
Solution: "When referring to patterns within the body of your pattern,
**weave the pattern names into the narrative**."

**完全一致。** デッキの「関連は、本文の文の中に溶かして書く」は weave into the narrative の
直訳に近い。「末尾の欄は読み飛ばされる」という理由付けもこのパターンの動機と同じ。
コミット #22 / #23 で「関連欄を本文に溶かす」を実装したのも、結果的にこのパターンの適用。

> 草案: `Meszaros & Doble "Readable References to Patterns" (PLoPD3, 1997)`

### 往復切符 △（この回は一次資料に触れていない）

**主張**: 逆向きの打ち手も名前を持つ一枚として書けるなら、その解は状況に依っている。
逆が書けないなら、状況に依らない「べき論」を書いている。

**適用例は3件そろっている**（`3ストライクで書く` の検算）。

| # | 場面 | 対 |
|---|---|---|
| 1 | Fowler『リファクタリング』のカタログ | 関数の抽出 ↔ 関数のインライン化、変数の抽出 ↔ 変数のインライン化 |
| 2 | Buxton『Sketching User Experiences』 | 示唆するスケッチ ↔ 確認するプロトタイプ（**このデッキが `ラフで出す` で既に引いている一次資料**） |
| 3 | このサイトの `patterns-wiki` | `動く北極星` ↔ `動かない物差し`。しかも本文が「[[けもの道]] と逆で、これだけは事前に置く」と逆向きの関係を散文で書いている |

**パターン文献側に同じ要求は見つかっていない。** いちばん近いのは Meszaros & Doble の
**Relationship to Other Patterns** の *alternatives*（同じ問題を別に解くパターンとの関係を
**記録せよ**）で、これは**関係の記録**の話。往復切符が要求しているのは
**逆向きを一枚として書け**であり、別の主張。だから出典行では「このデッキの追加」と刻む。

**スライドに「規則」と刻んではいけない。** Alexander は『時を超えた建設の道』で
パターン自体を "rule"（context → conflicting forces → configuration の規則）と呼んでいる。
「パターンではなく規則」と書くと、一次資料と衝突する対立を作ることになる。
そこで本文は **「べき論」**（状況を問わない作法）にした。`ザワつく状況` の「手順書」とも
語が重ならないので、2枚が別のことを言っていると読める。

**検証度は △。** この回のセッションは egress が絞られており、`refactoring.com`（カタログ）も
Buxton の PDF も CONNECT が 403 で取れなかった。**だから逐語引用を刻んでいない** —
刻んだのは「対で並べている」という事実の要約までで、Fowler の "inverse of" のような
文字列は避けた。次に外へ出られるとき、確認するのは以下2点。

- `refactoring.com/catalog/inlineFunction.html` が Extract Function を逆として名指す言い回し
- Buxton のスケッチ／プロトタイプ対比表（"suggest & explore rather than confirm" は
  既に ◎ で取れているので、対になっていること自体の裏付けを足す）

**第三の選択肢（仮称 `三すくみ`）は、まだ書かない。** 対で並べると読者は二択だと読むが、
実際には両方を捨てる三つ目の手があることが多い、という主張。適用例は2件しか立たない
（Fowler の smells が1つの臭いに複数の候補を挙げる／Meszaros の *alternatives*）ので、
デッキ自身の `3ストライクで書く` に従って `種ノート` の段階に置く。名前だけ先に取っておく
（三すくみ＝蛇・蛙・なめくじ。常勝する手が無い関係を指す既存の日本語）。

> 刻んだ文字列: `Fowler『リファクタリング』は関数の抽出／インライン化、変数の抽出／インライン化のように、打ち手を互いの逆として対で並べる。Buxton も「示唆するスケッチ」と「確認するプロトタイプ」を対にする。ただし「逆向きも書け」という要求そのものはパターン文献に見つからず、このデッキの追加。`

### 黙って聴く著者 ◎

**一次**: Gabriel, *A Pattern Language for Writers' Workshops* の **Fly on the Wall**
— 著者を破壊的な存在にせずに活動の中に留めるには、どうするか。
書籍は Gabriel, *Writers' Workshops and the Work of Making Things*
(Addison-Wesley, 2002)。

Hillside の "How to Hold a Writer's Workshop" の手順書でも
"Although the author is present, he or she remains 'invisible' during most of the
discussion." / ラウンド3・4・5では著者は「仮想的にしか」その場にいない、と規定されている。

**「オンザフライ」は名前の記憶違い。** 正しくは **Fly on the Wall**（壁の蝿＝
気づかれない観察者）。on-the-fly（その場しのぎ）ではない。
**この注意はスライドには刻まない** — 読者向けの典拠ではなく、書き手向けの覚え書きなので。

7ラウンドの手順:
1. 導入 → 2. **著者が一節を音読** → 3. 参加者が要約 → 4. **良かった点**（内容→文体）
→ 5. 改善案 → 6. 著者が質問 → 7. 謝意

> 草案: `Gabriel "Fly on the Wall" (A Pattern Language for Writers' Workshops)`

---

## 捏造チェック（一次資料の本文を自分で取って突き合わせた）

WebFetch の要約は小型モデルが書くので、引用が捏造される経路がある。そこで
**HTML を curl して grep、PDF は zlib で展開して grep** し、引用を1件ずつ当て直した。

**結論: 捏造は1件も無かった。** パターン名も、引用した Problem / Solution の文も、
すべて一次資料に実在する。ただし2点を直し、1点を訂正した。

### 逐語で一致を確認したもの

Meszaros & Doble の4件は、hillside.net の本文（82K字）から `Pattern:` 見出しごとに
Problem / Solution を切り出して照合した。

| パターン | 確認した文 |
|---|---|
| Visible Forces | Problem "How do you ensure that the reader understands the choice of solution?" / Solution "ensure that the forces are highly visible… by highlighting them using fonts, underlining, or other typographic techniques" |
| Evocative Pattern Name | Solution "Choose a pattern name that are likely to conjure up images which convey the essence of the pattern solution to the target audience."（原文の "that are" という崩れまで一致） |
| Meaningful Metaphor Name | Solution "Find a meaningful metaphor for the pattern, and name the pattern accordingly." ＋ "**If you have to explain the metaphor, it is not familiar enough.**" |
| Readable References to Patterns | Solution "weave the pattern names into the narrative" |

他:

- **Buxton** — PDF 本文から属性一覧を抽出（前から ◎）。
- **Alexander 247** — patternlanguage.cc の本文。表題も "lay paving stones with a 1 inch
  crack between the stones, so that grass and mosses and small flowers can grow" も一致。
- **Alexander『時を超えた建設の道』** — "It is both a process and a thing; both a description
  of a thing which is alive, and a description of the process which will generate that thing."
  を2つの独立した転記で逐語確認（書籍本体の PDF は字形が埋め込みで抽出できず）。
- **Gabriel** — 書籍 *Writers' Workshops & the Work of Making Things* (2002) の
  目次に **Fly on the Wall (p.109)** が章として実在。本文でも "fly-on-the-wall" を使う。
- **まつもとゆきひろ「名前重要」** — Wikisource（CC-by-3.0-US）。日本語版の書き下ろし10本の1つ。

### 直した2点

1. **声に出して読む が ○ → ◎ に上がった。** DDD の本文を取って grep したら、
   ユビキタス言語の章に **「Modeling Out Loud」という節がそのままあった**。
   「One of the best ways of refining a model is to explore with speech, trying out loud
   various constructs from possible model variations. **Rough edges are easy to hear.**」
   デッキの「声に出して詰まる名前も、黙読では詰まらない」の逐語の裏付け。
   節名を刻むよう書き換えた（「ユビキタス言語」だけだと読者が辿れない）。

2. **3ストライクで書く は、名前と内容で出典の役割が違う。** Fowler『リファクタリング』の
   ルールは **"Three strikes and you refactor"**（Don Roberts 由来）で、
   **「3ストライク」という名前はここから来ている**。内容（発明ではなく発見）は
   Coplien の rule of three。`でこぼこ石畳` と同じ「名前は A、内容は B」の構造なので、
   主従ではなくそう書き換えた。

### 訂正: gush は文献に実在した

前回「Gabriel の PL にも hillside の手順書にも gush は無い、コミュニティの口語」と
報告したが、**書籍の本文にあった**。検索が大文字の "Gush" だけを見ていたのが原因。

> The shorthand I have heard to cover this case is to say, "gush!" In many cases I have
> heard a comment followed by a virtual chorus of gushes.
> — *Writers' Workshops & the Work of Making Things* (2002), p.132

索引にも項目がある: `"gush" See Also Culture / as shorthand for "I agree with the
preceding statement," 133`。

つまり gush は**章の名前ではないが、Gabriel が記録した語彙**。章の名前は
**Positive Feedback (p.127)**。パターンとして立てるなら、出典は
`Gabriel, Writers' Workshops (2002) の "gush" (p.132)` と書ける。

### まだ一次で取れていないもの（○ 止まり）

- **Coplien の rule of three (1996)** — 『Software Patterns』(SIGS) 本体が読めていない。
  複数の査読論文が「Coplien (1996) が rule of three を確立した」と帰属させており、
  「3件」も一致するが、言い回しは二次資料間で揺れる（"three known uses" /
  "three insightfully different implementations"）。**数字は安全、逐語は避ける。**
- **Alexander『パタン・ランゲージ』序文の上位/同位/下位** — 検索要約が逐語で一致するが、
  書籍本文は未読。
- **東京科学大学 EDP の「ざわざわ感」** — Cloudflare で機械的に読めず、
  **ユーザから本文の提供を受けて確認**した（自分で取得したものではない）。

---

## Gush について: 正式なパターン名としては確認できなかった

ユーザが足したいと言っている「Gush」を、次の3つで探して**見つからなかった**。

- Gabriel, *A Pattern Language for Writers' Workshops* (dreamsongs.com, 全27パターン)
- Hillside "How to Hold a Writer's Workshop"（7ラウンドの手順書）
- PLoP の合評ガイドライン各種

**gush はコミュニティの口語**（褒めちぎるラウンドをそう呼ぶ）で、
文献上の正式名は **Positive Feedback First** —
「集まりに支持的な調子を作り、著者が受け入れられる気分になる feedback から始めるには」。
Hillside の手順書ではラウンド4「良かった点を、まず内容について、次に文体について」。

**パターンとして立てるなら**、名前は日本語のオノマトペ（このデッキの命名規約どおり）で
自由に付けてよいが、**出典行には Positive Feedback First と書く**。
Gush と刻むと、探した読者が文献に見つけられない。

---

## 一覧（刻む文字列の草案）

**この表が次の段階の写し元になる。表に無い判断はスライドまで残らない**ので、
地の文で決めた「主と従」「なぜ他方を書かないか」を注記ごとセルに畳んで入れてある。

| パターン | 検証 | 出典行の草案 | 注記（草案を変えるときに壊してはいけない判断） |
|---|---|---|---|
| ジワる名前 | ◎ | Meszaros & Doble "Evocative Pattern Name" (PLoPD3, 1997) / まつもとゆきひろ「名前重要」（日本語版書き下ろし, 2010） | Meszaros が負うのは**説明的な名前を避ける**ところまで。「使うたびにジワジワくる」の遅効性は**どの出典にも無い**デッキの追加なので、Meszaros 単独にしない |
| 借りてきた比喩 | ◎ | Meszaros & Doble "Meaningful Metaphor Name" (PLoPD3, 1997) | ほぼ完全一致。単独で足りる |
| 声に出して読む | ◎ | Evans『ドメイン駆動設計』(2003) ユビキタス言語の節「Modeling Out Loud」 | **Gabriel の Author Reads Selection を足さない。** あれは合評の場での手順で、このパターンは書いた直後の一人での検算。場面が違う |
| ザワつく状況 | ◎（名前は提供された本文で確認） | Meszaros & Doble "Visible Forces" (PLoPD3, 1997) / 名前は東京科学大学 EDP の「ざわざわ感」 | EDP の記事は Alexander も forces も引いていない**独立の語彙**。「フォースの言い換え」と書くと無い系譜を作る。**名前の由来**として並べる（でこぼこ石畳と同じ扱い）。表記は「ざわざわ感」 |
| 釣り竿を渡す | ○ | Alexander『時を超えた建設の道』(1979) の生成性 / Coplien, generative pattern (1994) | **名前の由来（魚と釣り方の格言）は書かない** — 典拠が無い。出典は内容＝生成性のほうに付ける |
| ラフで出す | ◎ | Buxton『Sketching User Experiences』(2007) Appropriate Degree of Refinement | 唯一の一次資料確認済み。**Meszaros の Understood Notations を足さない**（記法の馴染みの話で、粗さの話ではない） |
| 3ストライクで書く | ○ | 名前は『リファクタリング』の "Three strikes and you refactor"（Don Roberts 由来）/ 内容は Coplien の rule of three (1996) | **主従ではなく役割分担。** 「3ストライク」という名前は Fowler の "Three strikes and you refactor" から。内容（発明ではなく発見）は Coplien。でこぼこ石畳と同じ構造。**Coplien 1996 の本文は未読**なので逐語引用は避け、数字（3件）だけに留める |
| でこぼこ石畳 | ○ | Alexander『パタン・ランゲージ』(1977) 序文 + 247 Paving With Cracks Between The Stones | 序文が**上位・同位・下位の3方向**の出典、247 が**名前**の出典。役割が違うので両方要る |
| 往復切符 | △ | Fowler『リファクタリング』の逆向きの対（関数の抽出／インライン化ほか）/ Buxton のスケッチ／プロトタイプ / 要求自体はデッキの追加 | **「規則」と刻まない** — Alexander はパターン自体を rule と呼ぶので、無い衝突を作る（本文は「べき論」）。**逐語引用を足さない** — egress で一次資料に触れておらず、"inverse of" のような文字列は未確認。適用例3件目はこのサイトの `動く北極星` ↔ `動かない物差し` |
| 文に溶かす | ◎ | Meszaros & Doble "Readable References to Patterns" (PLoPD3, 1997) | 完全一致。単独で足りる |
| 黙って聴く著者 | ◎ | Gabriel "Fly on the Wall"（Writers' Workshops の合評） | **綴りは Fly on the Wall。** on-the-fly ではない（この注意は調査メモに留め、スライドには刻まない — 読者向けの典拠ではなく書き手向けの覚え書き） |

保留:
- ザワつく状況 の名前は、実際に EDP の「ざわざわ感」から採ったのか
  → 採ったなら名前の出典として書ける。偶然なら「同じ着想の別系統」で、刻む文字列が変わる
- Gush を新パターンとして立てるか → 出典は Positive Feedback First
- `往復切符` の一次資料（refactoring.com のカタログ、Buxton の対比表）→ 外に出られる回に取り、
  △ を上げる。取れたら逐語を足せるが、**それまで刻む文字列は変えない**
- `三すくみ`（第三の選択肢）を立てるか → 適用例が2件なので `3ストライクで書く` に従って保留。
  3件目が出たら `往復切符` の隣に置く

---

## 実装側の下調べ（次の段階の材料。まだ手を付けていない）

実装は済んでいる（`<!--source-->` 注釈として入れた）。以下は下調べの記録と、
**途中で1つ間違えた計算の訂正**。

### 訂正: 高さは足りていた

当初「左段の残りは約1行（0.31in）しかないので、takeaway の 0.35in を流用すると
8行が入らなくなる」と見積もったが、**これは間違いだった**。

実測すると、10枚とも左段の下端は **4.32in**。下マージン（5.325in）まで **1.0in 余っている**。
2.76in という数字は固定費（見出し・節間）を引いた後の本文の取り分で、
本文が実際に使っているのはそのうちの一部だった。だから 0.35in でも入る。

**つまり「takeaway を流用しない理由は高さではない」。** 正しい理由は役割:

| | takeaway | source |
|---|---|---|
| 大きさ | 20pt・太字 | 6pt |
| 位置 | 全幅・中央寄せ | 左段幅・左寄せ |
| リンク | `richText` なので `[[…]]` が効く | 素の `text` なので効かない |
| 役割 | 読ませる（まとめ・関連） | 読み飛ばせる（典拠） |

とくに3行目が効く。takeaway に出典を書くと、文献名がバックリンクのグラフに載って
**パターンの隣人として並ぶ**。「関連」と「典拠」が混ざる。

確保は 0.3in ＝ 6pt の3行ぶんにした（インク 0.333in、許容 0.36in）。
4行になると許容を超えてビルドが止まるので、余地は1行ぶん。余りを全部確保しないのは、
確保した高さがそのまま本文の取り分から消えるため。

### 訂正: shape-keys.ts は触らなくてよかった

`textBoxes` のキーは `textKey(index)` で索引から出るので、箱を1つ足せば
自動で `shape-N` が付き、3者比較の対象に入る。実際 130 図形で3者一致した。

### そのまま正しかったもの

- **3pt は HTML/Wiki 側では約4px**（`font-size: Npt` をそのまま出し、CSS の 1in = 96px）。
  実際にビューアで見て 5pt → **6pt** にした。Wiki は画面幅に合わせて拡大するので、そのぶん大きく出る。
- 文字数上限（1000字）には余裕がある。最長の出典は 187字。

## 出典の出典（この調査で読んだもの）

- [A Pattern Language for Pattern Writing (Meszaros & Doble)](https://hillside.net/index.php/a-pattern-language-for-pattern-writing)
- [A Pattern Language for Writers' Workshops (Gabriel)](https://dreamsongs.com/Files/WritersWorkshopPL.pdf)
- [How to Hold a Writer's Workshop (Hillside)](https://hillside.net/conferences/plop/235-how-to-hold-a-writers-workshop)
- [What Sketches (and Prototypes) Are and Are Not (Buxton)](https://www.cs.cmu.edu/~bam/uicourse/Buxton-SketchesPrototypes.pdf)
- [Paving With Cracks Between the Stones (247)](https://patternlanguage.cc/Patterns/Paving-With-Cracks-Between-the-Stones-(247))
- [A Development Process Generative Pattern Language (Coplien)](https://www.laputan.org/pub/papers/processpatterns.pdf)
- [Pattern Naming Patterns (柴田ほか, PLoP'16)](https://hillside.net/plop/2016/papers/proceedings/papers/shibata.pdf)
- [プログラマが知るべき97のこと「名前重要」](https://ja.wikisource.org/wiki/プログラマが知るべき97のこと/名前重要)
- [Rule Of Three (c2 wiki)](https://wiki.c2.com/?RuleOfThree)
