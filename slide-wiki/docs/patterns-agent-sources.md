# patterns-agent の出典調査

`assets/doc/wiki/patterns-agent.md`（AIエージェントと働くパターン）の8パターンについて、
名前と主張の出どころを辿った記録。**実装済み** — `<!--source-->` 注釈として
スライド下部に 6pt で刻んである（枠は3行ぶん 0.3in）。

**検証の度合いを行ごとに明示する。** 印刷されて残るので、辿れなかったものは
そう書く。もっともらしい系譜を作らない。

- ◎ 一次資料の本文を自分で取って引用を確認
- ○ 一次資料の要約・二次資料で確認（本文は未読）
- △ 未確認（本文にアクセスできず）

---

## この調査の限界を先に書く

**このデッキの出典は、ほぼ全部が ○ である。**
書いた環境の egress ポリシーが `anthropic.com` と `openai.com` への直接取得を
止めており、**一次記事のページ本文を1本も開けていない**。手元にあったのは
検索結果の要約と、それを引いた二次記事だけである。

したがって次の2つは、まだ誰も確かめていない。

- 引用の文言が、原文のとおりであること
- 数字が、原文の文脈のとおりであること（母数・期間・条件）

`patterns-meta` のほうは13件中の多くが ◎（本文を取って `grep` で確認）まで行っている。
このデッキはそこに届いていない。**開けた日に照合できる形にしておくのがこの文書の役目**なので、
数字は出どころを名指しで残し、丸めない。

**通る経路が1本だけある。** `github.com` と `raw.githubusercontent.com` は許可されている
（実測: `web.archive.org`・`arxiv.org`・`biorxiv.org`・`pubmed`・`nature.com` はいずれも接続不可）。
`git clone` も通るので、**成果物そのものを取って自分で数えられる**。

この経路で4件を ◎ に上げ、**数字の誤りを2件見つけた**（下記）。
記事本文は依然として読めないので、ブログの主張そのもの（"harness とは…"の定義など）は ○ のまま。
**取れるのは成果物と、著者がリポジトリに書いた断り書きである。**

| 対象 | 経路 | 効いた先 |
|---|---|---|
| `zou-group/virtual-lab` | README | 投網を打つ・座長を立てる |
| `anthropics/claudes-c-compiler` | README + shallow clone | 検品台が先・投網を打つ |
| `Future-House/robin` | README | 判子は人が押す・投網を打つ |
| `openai/codex` | AGENTS.md | 厨房ごと渡す |

数字の一覧（照合の当たり先）:

| 数字 | 出どころ | 検証 |
|---|---|---|
| 約100万行・5か月・人の手書きゼロ | OpenAI "Harness engineering" (2026) | ○ |
| 16体・約2,000セッション・約2万ドル | Anthropic "Building a C compiler…" (2026) | ○ |
| 公開コンパイラ 186,696行（Rust） | `anthropics/claudes-c-compiler` を clone して数えた | ◎ |
| 92個のナノボディを設計し実験で検証 | Swanson ら Virtual Lab（Nature 2025） | ◎ |
| 60超の科学データベース | Claude Science (2026) | ○ |
| 1,500本の論文・42,000行の解析コード | Kosmos（Edison Scientific / FutureHouse, 2026） | △ |
| 失敗の30〜40%が「静かな成功」 | 一人起業の実務報告（2026、個人ブログ） | △ |
| 2026年最初の7週で277本に1本 | 捏造引用の調査（Nature ほか, 2026） | ○ |
| 開発者の96% / 48% | 生成コードの信頼に関する各調査 | ○ |
| レビュー時間の中央値 +441.5% | Faros AI 2026 テレメトリ（22,000人） | △ |

**△ の3件は、母数と定義がとくに危ない。**
「失敗の30〜40%」は1人の実務報告で、母集団が示されていない。
「レビュー時間 +441.5%」はベンダのテレメトリで、比較の基準期間が読めていない。
Kosmos の数字はベンダ発表の要約経由で、1回の走行の定義が読めていない。
デッキ本文はこの3件を**主張の柱に置いていない**（現物合わせ の柱は
「静かな成功が失敗より見つけにくい」という質のほうで、割合ではない）。

---

## パターンごとの出典

### 厨房ごと渡す ○

**一次**: OpenAI "Harness engineering: leveraging Codex in an agent-first world" (2026)。
harness＝エージェントを取り囲む足場・制約・フィードバックの総体。
リポジトリ構成・CI 設定・整形規則・パッケージ管理・アプリのフレームワーク・
プロジェクト指示・外部ツール連携・linter を含むと列挙している。
"World principles"（製品原則やチームの規範を、新しい同僚を迎えるように整えて渡す）と
"golden principles"（リポジトリに機械的な規則として直接書き込む）の2語もここ。

**併記**: Anthropic "Building a C compiler with a team of parallel Claudes" (2026)＝
労力の大半は Claude の周りの環境（テスト・環境・フィードバック）の設計に費やされた。

**"golden principles" の実物が見られる（◎）。** `github.com/openai/codex` の `AGENTS.md` が、
まさに「リポジトリに直接書き込まれた、意見の強い機械的な規則」である。抜粋:

> - When using format! and you can inline variables into {}, always do that.
> - Always collapse if statements per (clippy の該当ルール URL)
> - Avoid bool or ambiguous `Option` parameters that force callers to write hard-to-read code
>   such as `foo(false)` or `bar(None)`.
> - If you change `ConfigToml` or nested config types, run `just write-config-schema` …

**規則が、守らせたい相手の作業場に置いてある。**「頼むときに言う」のではなく
「そこに書いてある」形。厨房ごと渡す が言っているのはこれで、
ブログ本文は読めていないが、**仕組みのほうは実物で確かめられた**。

**名前**: 借り物の比喩。文献に対応語は無く、このデッキの追加。

### 検品台が先 ○

**一次**: Anthropic "Effective harnesses for long-running agents" (2026)＝
検証は後付けの点検ではなく第一級の入口（"verification is a first-class interface"）で、
ビルド失敗・プレビュー異常・ルーブリック違反・見た目の食い違いを、
エージェントがそのまま動ける機械可読なフィードバックとして返す。

**併記 ◎**: 同 "Building a C compiler…"＝タスクの検証器はほぼ完璧である必要があり、
高品質なコンパイラのテスト群を集め、検証器とビルドスクリプトを書き、
Claude の失敗を見張っては新しいテストを設計し続けた（ここまでは ○）。

**成果物の側から確認できた（◎）。** `github.com/anthropics/claudes-c-compiler` の README に、
唯一この段落だけ人が書いたと断ったうえで、こうある。

> 100% of the code and documentation in this repository was written by Claude Opus 4.6.
> **A human guided some of this process by writing test cases that Claude was told to pass**,
> but never interactively pair-programmed with Claude to debug or to provide feedback on code quality.

**人の寄与がテストだけだった**と著者自身が書いている。検品台が先 の主張そのもので、
このデッキで最も強い1件。デッキ本文もこの文言に寄せて書き直した。

同じ段落は 現物合わせ にも効く。**"None of it has been validated for correctness."**
**"The docs may be wrong and make claims that are false."** と続き、
出来上がった物の見栄えと、確かめられているかが別であることを著者が明言している。

**一人起業側**: 「問題 → 需要の確認 → 先に売る → MVP → 自動化」の順は
2026年の solo founder 向け記事に繰り返し出る定型（△、個々の出どころは特定していない）。

**名前**: 借り物の比喩。このデッキの追加。

### 投網を打つ ○

**一次 ○ / 成果物 ◎**: Anthropic "Building a C compiler…" (2026)＝16体の並列、
約2,000セッション、約2万ドル、Linux 6.9 を x86 / ARM / RISC-V でビルドできる。

**行数を1件修正した。** 検索要約は「10万行」と言うが、公開リポジトリを
`--depth 1` で clone して数えると **Rust 186,696行**だった（`target/` を除く全 `.rs`）。
ブログ本文が別の数え方（コア部分のみ等）をしている可能性はあるが、**本文を開けていない以上、
自分で数えた数字のほうを採る**。デッキは「18万行を超える」と書き直した。

**一次 ◎**: Swanson, K., Wu, W., Bulaong, N.L. et al.
"The Virtual Lab of AI agents designs new SARS-CoV-2 nanobodies"
**Nature (2025), doi:10.1038/s41586-025-09442-9**。

著者自身が公開している `github.com/zou-group/virtual-lab` の README から、
著者の文言をそのまま取って確認した（`raw.githubusercontent.com` は通る）。

> The Virtual Lab built a computational pipeline consisting of ESM, AlphaFold-Multimer,
> and Rosetta and used it to design **92 nanobodies that were experimentally validated**.

**ここで1件修正した。** 当初この文書とデッキは出典を
「bioRxiv 2024 / 査読版 2025」と書いていたが、**掲載誌は Nature (2025)** である。
巻号ではなく DOI で残す。また「実験で有望だったのは一部」という書き方も、
著者は "92 nanobodies that were experimentally validated" と書いており、
92個すべてが実験にかけられている。デッキ本文の「実験で有望だったのは数個」は
二次記事（うち2個が新旧の変異株の両方に結合した、とする報道）に依っており、
**一次と二次で粒度が違う**。デッキは「残ったのは数個」と書いてあるので誤りではないが、
論文本文を開けたら「有望」の定義を確認して書き直すこと。

**構造の語彙も README で確認した**: team meetings（全エージェントが議題を討議）と
individual meetings（人と1体が個別の課題を解く）の2種類があり、
座長を立てる が「議題を配る」と書いているのはこの前者に当たる。

**「篩が固いときだけ数が効く」は、このデッキの追加。**
どちらの文献も並列の効果は言うが、篩の固さを条件として立ててはいない。
条件として立てられるのは、[検品台が先] と並べたときに初めて言えることなので、
**パターン間の関係から出てきた主張であって、文献からの引き写しではない**。

### 座長を立てる ○

**一次**: Virtual Lab（Zou ら, 2024 / 2025）＝LLM の PI エージェントが、
背景の違う専門家エージェント（化学者・計算機科学者・批評役）を率い、
「研究会」の形で進める。人の研究者は問いを出し、高次のフィードバックを返す。

**併記**: Claude Science (2026)＝調整役エージェントが専門サブエージェントに仕事を配り、
別立ての査読エージェントが引用と計算を検める。

**逆向き**: Anthropic "Building a C compiler…"＝オーケストレータ役のエージェントを置かず、
メッセージバスもタスクキューも使わず Git を使った。各エージェントが
`current_tasks/…` にロックファイルを書いて持ち場を取り、
2体が同じものを取ろうとすると Git のマージ衝突が2体目に「別のを取れ」と告げる。

**この逆向きは、まだパターンにしていない。** 実例が1件しかなく、
[3ストライクで書く] の3件目に届いていない。座長を立てる の本文に
1行で置き、種として寝かせてある。

### 毒味役を置く ○

**一次**: Virtual Lab（Zou ら）＝批評役（critic）エージェントをチームに常置する。

**併記**: Claude Science (2026)＝別立ての査読エージェントが引用と計算をすべて照合し、
誤りをその場で直す。

**併記**: OpenAI "Harness engineering" (2026)＝Codex に自分の変更をローカルでレビューさせ、
さらにローカルとクラウドの両方で別のレビュー用エージェントを指名して呼び、
人からの指摘にもエージェントからの指摘にも応え、**全レビュアが納得するまで**回す。

**名前**: 借り物の比喩。このデッキの追加。
[黙って聴く著者](../assets/doc/wiki/patterns-meta.md) との対応は本文で触れている。

### 現物合わせ ○ / △

**△**: 一人起業の実務報告（2026、個人ブログ）＝走らせる前に意図のログを1本置くと
5行で失敗の約30%が捕まり、自己申告と24時間後の実際の結果を突き合わせる日次バッチが
「静かな成功のずれ」を捕まえる。これが失敗全体の30〜40%を占める。
**母集団が示されていないので、割合は柱にしない。**

**○**: 捏造引用の調査（Nature, 2026 ほか）＝2025年は458本に1本、
2026年の最初の7週で277本に1本が捏造参考文献を1件以上含む。
捏造された参考文献は「明らかに壊れてはいなかった」——
具体的な科学トピックを扱い、書式は正しく、実在の研究者に帰され、
publication date ももっともらしかった。**報告の見栄えが良いことが問題の核**という、
このパターンの主張にそのまま当たる。

**○**: 生成コードの信頼に関する各調査＝完全には信頼しない開発者が96%、
それでもコミット前に必ず検証するのは48%。生成コードは
「流し読みで通る程度にはもっともらしい」ためレビューは易しくならず難しくなる。

**名前**: `現物合わせ` は日本の製造・大工の現場語（図面ではなく現物に当てて合わせる）。
[ドメイン言語](../assets/doc/wiki/patterns-meta.md) に従い、発明せず拾った。

### 置き手紙 ○ / △

**一次**: Anthropic "Effective harnesses for long-running agents" (2026)＝
要約による圧縮（context compaction）だけでは非常に長い仕事に足りず、
**全面的な文脈リセット**が必要だった。harness がセッションを畳み、
構造化された引き継ぎファイルから組み直す。文脈は「有限で手入れの要る資源」として扱う。
harness は2本立てで、環境を整える initializer エージェントと、
セッションごとに少しずつ進める coding エージェントに分かれる。

**参考数値**: 同社の context compaction のリファレンスは、100ターンの web 検索の評価で
トークン消費を84%削減した（○、ただし本文未読）。

**△**: Kosmos（Edison Scientific / FutureHouse, 2026）＝「構造化された世界モデル」で
1回の走行に1,500本の論文と42,000行の解析コードを通す。ベンダ発表の要約経由。

**名前**: 借り物の比喩。このデッキの追加。

### 判子は人が押す ○

**切り分けの出どころ**: 「エージェントは証拠つきで調べ（resolve lookups with evidence）、
人は判断の要る決定をする」という言い方は、2026年のレビュー実務の議論に繰り返し現れる。
**単一の一次文献に帰せない**ので、そう書いてある。

**一次 ○ / 実装 ◎**: Robin（FutureHouse, 2025）＝加齢黄斑変性の治療仮説を2.5か月で
自律的に立て、検証した。仮説・実験の選択・データ解析・図の生成はすべてエージェントが出し、
**物理実験を実行したのは人の研究者**だった。

**実装の側から確認できた（◎）。** `github.com/Future-House/robin` の README が、
パイプラインの段を次のように区切っている。

> - **Experimental Assay Generation:** Generates and ranks potential experimental assays.
> - **Therapeutic Candidate Generation:** Based on the top assay, generates and ranks
>   therapeutic candidates.
> - **(Optional) Experimental Data Analysis:** **If you have experimental data**, this section
>   can analyze it and feed insights back into candidate generation.

**「実験データを持っていれば」という条件節が、人の持ち場をそのまま示している。**
機械は仮説を出して順位を付けるところまでで、データを持ち込むのは人である。
判子は人が押す の線引きが、コードの構造にそのまま現れている。

**投網を打つ にも効く。** 同じ README は `num_queries` / `num_assays` / `num_candidates` を
調整可能なパラメータとして挙げ、出力に `experimental_assay_ranking_results.csv`
（総当たり比較の結果）と `ranked_therapeutic_candidates.csv` を並べる。
**多く出して順位で絞る**という形が、そのまま実装されている。

**座長を立てる にも効く。** 専門役が名前を持っている（文献の Crow / Falcon、
データ解析の Finch）。

**一次**: Virtual Lab（Zou ら）＝人が返すのは高次のフィードバックだけ。

**△**: 一人起業の実務報告＝顧客に届くものはレビューを通さずに出さない。

**名前**: 日本の事務の現場語。[ドメイン言語] に従い、拾った語。

---

## 次に確かめること

egress が通る環境で、次の順に照合する。効き目の大きい順。

0. **まず環境の network policy を広げる。** 一次記事が開けないのは能力ではなく設定で、
   環境を作るときに選んだ egress の許可範囲がすべてを決めている
   （→ https://code.claude.com/docs/en/claude-code-on-the-web ）。
   ここを直すのが、以下の1〜5をまとめて片付ける唯一の手である。
1. OpenAI "Harness engineering"（厨房ごと渡す・毒味役を置く の2件が乗っている）
2. Anthropic "Effective harnesses for long-running agents"（検品台が先・置き手紙 の2件）
3. Anthropic "Building a C compiler…"（3件に散っている）
4. Virtual Lab の論文本文（毒味役を置く の批評役の記述。座長・92個は README で済んだ）
5. △ の3件（Kosmos・一人起業の割合・Faros AI の441.5%）は、
   **母数と定義が読めなければ数字を落とす**。もっともらしい数字を残さない。
