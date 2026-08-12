# patterns-meta の出典調査

`assets/doc/wiki/patterns-meta.md`（パターンを書くパターン）の13パターンについて、
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
このデッキの正面の先行研究で、**13件のうち4件がここに名前付きで存在する**。
（`ドメイン言語` も Meaningful Metaphor Name の**出口条件**をこの文献に負っているが、
名前を負っているわけではないので4件には数えない）

節構成と、このデッキに対応するパターン:

| 節 | パターン | 対応 |
|---|---|---|
| B. Pattern Structure | **Visible Forces** | ザワつく状況 |
| C. Naming and Referencing | **Evocative Pattern Name** | ジワる名前 |
| C. Naming and Referencing | **Meaningful Metaphor Name** | メタファ（＋その対の ドメイン言語） |
| C. Naming and Referencing | **Readable References to Patterns** | 文に溶かす |
| C. Naming and Referencing | **Relationship to Other Patterns** | 不揃いの石畳（副） |
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

### メタファ ◎（旧名 `借りてきた比喩`）

**一次**: Meszaros & Doble (1997) **Meaningful Metaphor Name**
Problem: "How do you give your pattern a useful and memorable name?"
Solution: "Find a meaningful metaphor for the pattern, and name the pattern accordingly"
— 読者にとって馴染みのある比喩であること。

**ほぼ完全一致**。デッキの「覚える手間を読者に押し付けない」「借り物なら手間はゼロ」は
この解の理由付けをそのまま日本語にしたもの。ここは安心して刻める。

**`借りてきた比喩` から `メタファ` に改名した。出典は変わらない。**
改名の判断は下の一覧表の注記に畳んである（比喩名に戻さないこと）。

**出口条件を刻むよう書き換えた。** 同じ解の中に
"**If you have to explain the metaphor, it is not familiar enough.**" があり、
前回の捏造チェックで逐語確認まで済ませていながら（後述の表）刻んでいなかった。
これは**比喩の道が閉じる条件**そのもので、対の `ドメイン言語` への入口になる。
`往復切符` に従って対を立てた以上、この一文が両者を繋ぐ蝶番なので出典行に上げる。

> 草案: `Meszaros & Doble "Meaningful Metaphor Name" (PLoPD3, 1997) ＋ "If you have to explain the metaphor, it is not familiar enough."`

### ドメイン言語 ○（`メタファ` の対。一次資料の本文は未読）

**主張**: 馴染みの比喩がどれも少しずつずれるなら、比喩を諦める。**ドメイン専門家が現場で
使っている語彙を聞いて拾い**、定義を一箇所に置いて全員で使う。外の読者には覚える手間が
残るが、そのぶんずれない。

**この対は `往復切符` 本体より出典が強い。** `往復切符` は「逆向きも書け」という要求自体が
文献に無く △ だが、こちらは**比喩の道が閉じる条件を一次資料が自分で書いている**。
Meszaros & Doble は Meaningful Metaphor Name の解の中で
"If you have to explain the metaphor, it is not familiar enough." と述べており、
これは前回のセッションが hillside.net の本文を curl + grep して**逐語確認済み**（◎）。
比喩を勧めるパターン自身が、比喩が使えなくなる線を引いている。

**適用例は3件そろっている**（`3ストライクで書く` の検算）。**別々の場面**であることを確認した。

| # | 場面 | 内容 |
|---|---|---|
| 1 | Evans, DDD (2003) ユビキタス言語 | モデルを言語の骨格にし、図・文章・とりわけ話し言葉とコードで同じ語を使うことをチームに課す。指すのは **`注文` `請求書` `出荷` のような業務の語彙** — 現場が既に使っている語で、開発者がそれを借りる。**`Aggregate` / `Bounded Context` / `Value Object` を例に挙げてはいけない**（一度書いて利用者の指摘で消した）。あれは設計パターンの名前＝開発者側の語彙で、ユビキタス言語そのものではない |
| 2 | CUNY Graduate Center Writing Center "Coining a New Term?" | 既存の語彙で足りないとき、または既存語が多様に使われていて特定したいときに新語を作る。**作ったら初出の直後に定義を置き、似た既存語との違いを明示せよ**。ソフトウェアの外（学術文章）の場面。**これは打ち手の本体ではなく、拾える語彙が本当に無かった場合の作法**（順序は「まず聞いて拾う → 無ければ作り、定義を置く」） |
| 3 | このサイト自身の `ontology.yaml` | `いつ・なにが困るか` / `そこで` を閉じた語彙として宣言し、語彙外の見出しは `unknown: error` で止める。書き手は語彙を覚える手間を払い、見返りに3デッキの骨格が寸分違わない |

適用例2が効いているのは、**「定義を一箇所に置く」までが打ち手に含まれる**と分かるから。
語を並べるだけなら押し付けで終わる。デッキの「定義は一箇所に置き」はここから来ている。

**検証度は ○。** この回も egress が絞られており、`hillside.net`・`domainlanguage.com`・
Evans の PDF はいずれも CONNECT が 403 で取れなかった（`curl` も `WebFetch` も同じ）。
通ったのは検索だけなので、**Evans については逐語引用を刻まない**。刻んだのは
独立した複数の二次資料が一致して伝える「Therefore」の要約までで、
`往復切符` のときと同じ線の引き方にしてある。次に外へ出られるとき確認するのは1点。

- Evans, *DDD* 第2章 UBIQUITOUS LANGUAGE の囲みの "Therefore:" の逐語
  （`domainlanguage.com` の DDD Reference が Evans 自身の手による要約版で、CC ライセンス）

**Fowler『Domain-Specific Languages』(2010) は適用例に入れない。** 利用者の当初の言い方は
「メタファとドメイン特化言語」だったが、Fowler の DSL は
"a computing programming language of limited expressiveness focused on a particular domain"
＝**実行可能な言語**の話で、散文で概念に名前を付ける話ではない。
足すともっともらしい系譜になるので落とした。**名前が似ているだけで繋がない。**

**「語を作る」と書いてはいけない。この線は先に引いてあったのに、本文が越えた。**

ユビキタス言語は業務の現場に既にある語を採ることも多く、Evans の主眼は**語を発明すること**
ではなく**ドメイン専門家と開発者が同じ語彙を厳密に使い続けること**にある。ここまでは
最初の調査で書いてあった。にもかかわらず本文は **「その場だけの語を作り、全員で使う」** に落ち、
「作る対象は語彙であって単語ではない」という言い訳をこの文書に足していた。
**言い訳のほうを消す。** 記録が先に正しく、本文が越えたという順序をここに残す。

利用者の指摘で **「ドメイン専門家が使う語彙を、全員で使う。／作るのではなく、聞いて拾う。」**
に直した（図2枚の `<text>` も揃えた。本文から消えた語を図だけが持っている状態にしないため）。

**直したら対の軸が鋭くなった。** 造語 ⇔ 借用ではなく、**借りる先が逆**になる —
`メタファ` は**読者に馴染んだ外の比喩**を借りて手間をゼロにし、`ドメイン言語` は
**現場に馴染んだ内の語彙**を採って、外の読者に手間を残す。どちらも借り物なので、
`メタファ` の「新語は、覚える手間を読者に押し付ける」と衝突しない。

> 刻んだ文字列: `Evans『エリック・エヴァンスのドメイン駆動設計』(2003) ユビキタス言語＝ドメイン専門家と開発者が同じ語彙を、図・文章・話し言葉・コードで使い続ける。語は発明せず、現場で使われている語を採る。出口は Meszaros & Doble "Meaningful Metaphor Name"（PLoPD3, 1997）の "If you have to explain the metaphor, it is not familiar enough."`

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
`不揃いの石畳` と同じ扱い（名前は 247、内容は序文）にするのが筋が通る。

**確認すべきこと**: ザワつく状況というオノマトペは、実際にここから採ったのか。
採ったなら名前の出典として書ける。偶然一致したなら「同じ着想の別系統」と書くべきで、
刻む文字列が変わる。

**気づいたこと（次の段階の判断材料、いま直す話ではない）**: EDP の書式は
「なぜなら〜とはいえ〜」で**対立を明示的に持っている**。このデッキの
`いつ・なにが困るか` ／ `そこで` の2節には、対立を示す接続がない
（「こういう場面で、こう困る。そこで、こうする」）。ザワつく状況が
「解に反対する力も書く」と要求している当のものが、**書式の側では支えられていない**。

> 草案: `Meszaros & Doble "Visible Forces" (PLoPD3, 1997) / 名前は東京科学大学 EDP の「ざわざわ感」`

### ときめく解法 ○（この回に足した一枚。一次資料の本文は取れていない）

**立った経緯を書いておく。** 利用者の依頼は「`ジワる名前`・`ザワつく状況` に続く
〇〇解法が欲しい。**経済的合理性だけで自分を喪失するような解ではなく、
じぶんがいきいき、ワクワク、ときめく解**であってほしい」だった。
名前の三枚目として頼まれたのではなく、**選ぶ基準が要る**という依頼として読んだ
（`ザワつく状況` は力を見せるところまでで、見せた力のどれを採るかを言っていない）。

**主張**: 打ち手の候補が複数あって、どれも一応通るとき、費用と効果で並べれば
選ぶ手間は消える。だが採算だけで選んだ解には書き手が居ないので、二度目に手が出ない。
`3ストライクで書く` が要求する3度目が来ないので、パターンにならない。
だから並べるのは採算で、選ぶのはときめきにする。

**名前の出典（○）**: 近藤麻理恵『人生がときめく片づけの魔法』（サンマーク出版, 2011）。
**捨てるものを選ぶのではなく残すものを選び、判断は手に取って触ってときめくかで決める。**
独立した複数の二次資料が一致してこう伝えるが、**書籍本文は取れていない**
（この回も egress が絞られており、通ったのは検索だけ）。だから
**逐語引用は刻まない** — `ドメイン言語` の Evans と同じ線の引き方にしてある。

**内容の先例（○）**: Alexander の **mirror-of-the-self**（*The Nature of Order*, Book 1, 2002）
＝二つを並べ「どちらが自分自身の像に近いか／どちらが自分の中の全体性を強く感じさせるか」を
問う判定。分析ではなく感覚を測りに使う先例として、これがいちばん近い。

**ただし、そのまま出典にはできない。線を引いておく。**
Alexander の狙いは**個人の思いつきの好み（idiosyncratic preference）を超えて、
人のあいだで一致する判定に届くこと**で、被験者の7〜8割が同じ側を選ぶという
経験的な主張までしている。つまり測っているのは**その物の生命**であって、
**選ぶ人のときめき**ではない。デッキの「ときめく方を採る」は主体を書き手に寄せているので、
**Alexander に負わせられるのは「感覚を判定に使う」ところまで**。
だから出典行は「あちらは個人の好みを超えた一致を測る」と**食い違いのほうを刻む**
（`ジワる名前` で Meszaros の遅効性を切り分けたのと同じ扱い）。

**`ザワつく状況` の検算 — 反対の力は書ける。** 採算で選ぶ側にも力がある:
説明しやすい・他人に通る・外れても責められない。だから「べき論」ではない。
図の左半分（採算で選ぶ → 一度きり）がその力を捨てた先を描いている。

**`往復切符` の売り場**: 逆向き（**採算で選ぶ**）は書ける。
費用を払うのが自分ではないとき、決めるのが自分ではないとき、ときめきは根拠にならない。
**ただし書く義務はない**ので、この回は立てない（名前だけ取っておく: `そろばんで選ぶ`）。

**`ジワる名前` と重ならないことを確かめた。** どちらも「一度で効く／すぐ得な方」を
退ける形をしているが、**層が違う** — `ジワる名前` は付ける名前の選び方、
`ときめく解法` は書く打ち手の選び方。名前が薄れるのは会話に載らないからで、
解が薄れるのは書き手が二度目に手を出さないから。理由も違うので、2枚に分かれる。

**適用例（`3ストライクで書く` の検算。3件そろっているが、弱いところを明示する）**

| # | 場面 | 内容 |
|---|---|---|
| 1 | 名前の選定 — `借りてきた比喩` → `メタファ`（#38） | `ジワる名前`（一度で伝わる名前は、たいてい説明である）の基準から**外れる**改名を、利用者が採った。この文書は「**比喩名に戻さない**」と残している。採算の側で選べば元の名前が勝っていた |
| 2 | 図の作り方 — `でこぼこ石畳` → `不揃いの石畳` と目地の草（#52） | 図は石が噛み合うところまで既に描けていた。にもかかわらず草を79株205本足した。コミットが挙げている理由は「**埋めなかったことの心地よさが文に残る**」 |
| 3 | 道具立ての方針 — Mermaid を退けて `roughen-svg.ts` を書いた（[B-16](../BACKLOG-WONTDO.md)） | 図は機械で出すほうが安い。手で描いた SVG を崩す道具と、定規の線を禁じる検査を書く側を採った |
| 外 | 片づけ（別ドメイン） | 残すものを、値段でも使用頻度でもなく、触ってときめくかで決める（近藤麻理恵） |

**弱いのは「有意に異なる3件」のほう。** 1〜3は場面（名前・図・道具）としては別だが、
**同じリポジトリの同じ書き手**である。Coplien の rule of three が求めているのは
それより広い散らばりなので、**検証度は ○ 止まりにしてある**。外の場面が出たらここへ足す。

> 刻んだ文字列: `名前は近藤麻理恵『人生がときめく片づけの魔法』(2011)＝捨てるものではなく残すものを、触ってときめくかで選ぶ。感覚で判定する先例は Alexander の mirror-of-the-self（The Nature of Order, 2002）だが、あちらは個人の好みを超えた一致を測る。書き手のときめきで採れとは誰も言っておらず、そこはこのデッキの追加。`

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
つまり `不揃いの石畳`（名前は 247、内容は序文）と同じ構造 — **名前は Fowler、内容は Coplien**。
デッキ本文の「パターンは発明ではなく発見である」は Coplien の主張そのもの。

> 刻んだ文字列: `名前は『リファクタリング』の "Three strikes and you refactor"（Don Roberts 由来）。内容は Coplien の rule of three (1996)＝…`

### 不揃いの石畳 ○

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

**目地を埋めないことまで 247 の記述**なので、デッキ本文の「目地は埋めない」と
図の同じ字も、名前の借り先の中に収まっている（草が生えるのはモルタルを使わないから）。

**副**: Meszaros & Doble (1997) **Relationship to Other Patterns** —
leads to / specializes / generalizes / alternatives の関係を記録する。

> 刻んだ文字列: `Alexander『パタン・ランゲージ』(1977) 序文＝…／名前は同書 247「目地に草の生える石畳」＝目地を1インチ空け、モルタルで固めず地面に直に置く。草や苔はそこから生える。`

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
| 3 | このサイトの `patterns-wiki` | `動く北極星` ↔ `動かない物差し`。しかも本文が「けもの道 と逆で、これだけは事前に置く」と逆向きの関係を散文で書いている |
| 4 | このデッキ自身 | `メタファ` ↔ `ドメイン言語`。`往復切符` を書いた後で、片道のまま置かれていた `借りてきた比喩` に適用して立てた対 |

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
   Coplien の rule of three。`不揃いの石畳` と同じ「名前は A、内容は B」の構造なので、
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
| メタファ | ◎ | Meszaros & Doble "Meaningful Metaphor Name" (PLoPD3, 1997) ＋ "If you have to explain the metaphor, it is not familiar enough." | ほぼ完全一致。単独で足りる。**旧名は `借りてきた比喩`。利用者の判断で説明的な語に改名した** — `ジワる名前`（一度で伝わる名前は、たいてい説明である）の基準からは外れるが、`メタファ` 本来の基準＝**読者にとって既に馴染みがあるか**で測れば、このデッキの読者に学習コストはゼロで借り物として成立している。**比喩名に戻さない。** 出口条件の一文を足したのは、対の `ドメイン言語` への蝶番だから |
| ドメイン言語 | ○ | Evans『エリック・エヴァンスのドメイン駆動設計』(2003) ユビキタス言語 / Meszaros の出口条件 | `メタファ` の対（`往復切符`）。**Evans の逐語を刻まない** — egress で本文に触れておらず、刻んだのは二次資料が一致して伝える Therefore の要約まで。**`Fowler の DSL を足さない`** — あれは実行可能な言語の話で、散文の命名ではない。**「語を作る」と書かない** — Evans の主眼は語の発明ではなく、ドメイン専門家の語彙を全員が厳密に使い続けること。打ち手は**聞いて拾う**（一度「その場だけの語を作り」と書いて利用者の指摘で直した。この文書は先に線を引いていた）。適用例3件目はこのサイトの `ontology.yaml` |
| 声に出して読む | ◎ | Evans『ドメイン駆動設計』(2003) ユビキタス言語の節「Modeling Out Loud」 | **Gabriel の Author Reads Selection を足さない。** あれは合評の場での手順で、このパターンは書いた直後の一人での検算。場面が違う |
| ザワつく状況 | ◎（名前は提供された本文で確認） | Meszaros & Doble "Visible Forces" (PLoPD3, 1997) / 名前は東京科学大学 EDP の「ざわざわ感」 | EDP の記事は Alexander も forces も引いていない**独立の語彙**。「フォースの言い換え」と書くと無い系譜を作る。**名前の由来**として並べる（不揃いの石畳と同じ扱い）。表記は「ざわざわ感」 |
| ときめく解法 | ○ | 名前は近藤麻理恵『人生がときめく片づけの魔法』(2011) / 感覚で判定する先例は Alexander の mirror-of-the-self (The Nature of Order, 2002) / 書き手のときめきで採ることはデッキの追加 | **Alexander を単独にしない。** あちらは個人の好みを超えた一致を測る（7〜8割の被験者が同じ側を選ぶ、という経験的主張まである）ので、「ときめきで選べ」と刻むと**無い主張を負わせる**ことになる。だから出典行は食い違いのほうを書く。**どちらの逐語も刻まない** — egress で近藤も Alexander も本文に触れていない。**`ジワる名前` に畳まない** — 退ける形は似ているが層が違う（名前の選び方 / 打ち手の選び方）。逆向き `そろばんで選ぶ` は売り場にあるが、この回は立てない |
| 釣り竿を渡す | ○ | Alexander『時を超えた建設の道』(1979) の生成性 / Coplien, generative pattern (1994) | **名前の由来（魚と釣り方の格言）は書かない** — 典拠が無い。出典は内容＝生成性のほうに付ける |
| ラフで出す | ◎ | Buxton『Sketching User Experiences』(2007) Appropriate Degree of Refinement | 唯一の一次資料確認済み。**Meszaros の Understood Notations を足さない**（記法の馴染みの話で、粗さの話ではない） |
| 3ストライクで書く | ○ | 名前は『リファクタリング』の "Three strikes and you refactor"（Don Roberts 由来）/ 内容は Coplien の rule of three (1996) | **主従ではなく役割分担。** 「3ストライク」という名前は Fowler の "Three strikes and you refactor" から。内容（発明ではなく発見）は Coplien。不揃いの石畳と同じ構造。**Coplien 1996 の本文は未読**なので逐語引用は避け、数字（3件）だけに留める |
| 不揃いの石畳 | ○ | Alexander『パタン・ランゲージ』(1977) 序文 + 247 Paving With Cracks Between The Stones | 序文が**上位・同位・下位の3方向**の出典、247 が**名前**の出典。役割が違うので両方要る |
| 往復切符 | △ | Fowler『リファクタリング』の逆向きの対（関数の抽出／インライン化ほか）/ Buxton のスケッチ／プロトタイプ / 要求自体はデッキの追加 | **「規則」と刻まない** — Alexander はパターン自体を rule と呼ぶので、無い衝突を作る（本文は「べき論」）。**逐語引用を足さない** — egress で一次資料に触れておらず、"inverse of" のような文字列は未確認。適用例3件目はこのサイトの `動く北極星` ↔ `動かない物差し` |
| 文に溶かす | ◎ | Meszaros & Doble "Readable References to Patterns" (PLoPD3, 1997) | 完全一致。単独で足りる |
| 黙って聴く著者 | ◎ | Gabriel "Fly on the Wall"（Writers' Workshops の合評） | **綴りは Fly on the Wall。** on-the-fly ではない（この注意は調査メモに留め、スライドには刻まない — 読者向けの典拠ではなく書き手向けの覚え書き） |

保留:
- ザワつく状況 の名前は、実際に EDP の「ざわざわ感」から採ったのか
  → 採ったなら名前の出典として書ける。偶然なら「同じ着想の別系統」で、刻む文字列が変わる
- Gush を新パターンとして立てるか → 出典は Positive Feedback First
- `往復切符` の一次資料（refactoring.com のカタログ、Buxton の対比表）→ 外に出られる回に取り、
  △ を上げる。取れたら逐語を足せるが、**それまで刻む文字列は変えない**
- `ドメイン言語` の Evans 逐語（DDD 第2章の "Therefore:"、または Evans 自身の DDD Reference）
  → 外に出られる回に取り、○ を ◎ に上げる。**それまで刻む文字列は変えない**
- `三すくみ`（第三の選択肢）を立てるか → 適用例が2件なので `3ストライクで書く` に従って保留。
  3件目が出たら `往復切符` の隣に置く。**`メタファ` ↔ `ドメイン言語` は3件目に数えない** —
  二択で書き切れており、両方を捨てる三つ目を必要としていない
- **オノマトペで名付ける道を独立した一枚にするか → 立てない。** 比喩の一種として `メタファ` に
  内包させる（利用者の判断）。`ジワる名前` が遅効性の側から既に押さえている
- `ときめく解法` の Alexander 側（*The Nature of Order*, Book 1 の mirror-of-the-self の章）
  → 外に出られる回に本文を取り、「どちらが自分自身の像に近いか」の逐語と、
  個人の好みを超える旨の一文を確認する。**それまで刻む文字列は変えない**
- `ときめく解法` の近藤側（『人生がときめく片づけの魔法』の該当箇所）
  → 「残すものを選ぶ」「触ってときめくか」の逐語と、それが書かれている章
- `ときめく解法` の適用例に**外の場面**を足す → 現状の3件は同じリポジトリの同じ書き手で、
  Coplien の「有意に異なる3件」としては弱い。足せたら ○ を上げる
- `そろばんで選ぶ`（`ときめく解法` の逆向き）を立てるか → 売り場にはある。
  払うのが自分でないとき・決めるのが自分でないときの一枚。**戻る義務はない**ので急がない

`往復切符` の売り場に出ていて、まだ書いていない対（**書く義務はない**。
「戻る義務はない。売り場にあるかを問うだけ」）:

- **`ラフで出す` の対** — いちばん借金に近い。`往復切符` の出典行が既に
  「Buxton も『示唆するスケッチ』と『確認するプロトタイプ』を対にする」と**刻んでいる**のに、
  対の片側しか書いていない。適用例3件目はこのリポジトリ自身（崩した SVG ⇔ 寸分違わない
  `ontology.yaml`）で立つ
- **`黙って聴く著者` の対** — Gabriel の7ラウンドの6が「著者が質問」で、Shepherding は
  場の外での一対一。**場では黙る ⇔ 場の外では喋る**。7ラウンドは既にこの文書に控えてある
- `釣り竿を渡す` の対（魚も見せる）→ 「いつ完成形を見せるか」の線引きが微妙で、
  真正面から `釣り竿を渡す` を打ち消して読まれる危険がある。急がない

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
| リンク | `richText` なのでリンクが効く | 素の `text` なので効かない |
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

`ドメイン言語` の回に見たもの（**いずれも本文は取れず、検索の要約どまり**。だから ○）:

- [Ubiquitous Language (Martin Fowler bliki)](https://martinfowler.com/bliki/UbiquitousLanguage.html)
- [What is Ubiquitous Language? (Agile Alliance 用語集)](https://agilealliance.org/glossary/ubiquitous-language/)
- [Domain-Driven Design Reference (Evans 自身による要約版, CC)](https://www.domainlanguage.com/wp-content/uploads/2016/05/DDD_Reference_2015-03.pdf)
- [Coining a New Term? Introducing It Clearly and Precisely (CUNY Graduate Center Writing Center)](https://gcwritingcenter.commons.gc.cuny.edu/rs_keyterms_keytermsintroduction/rs_key-terms_evaluating-coined-terms-for-issues-of-clarity/)
- [Domain-Specific Languages (Fowler) — **適用例には入れなかった**](https://books.google.com/books/about/Domain_Specific_Languages.html?id=ri1muolw_YwC)

`ときめく解法` の回に見たもの（**本文はどれも取れていない**。だから ○）:

- 近藤麻理恵『人生がときめく片づけの魔法』（サンマーク出版, 2011）— 書籍本文は未読。
  「残すものを選ぶ」「触ってときめくか」は日本語の二次資料が独立に一致して伝える範囲まで
- Alexander, *The Nature of Order*, Book 1（2002）の mirror-of-the-self — 書籍本文は未読。
  解説している2ページ（`onluminousgrounds.wordpress.com` / `iamronen.com`）は
  **プロキシに遮断されて開けなかった**ので、拠っているのは検索の要約のみ
