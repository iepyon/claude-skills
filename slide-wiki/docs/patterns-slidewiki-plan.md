# patterns-slidewiki 計画と進捗（セッション引き継ぎ用）

## 背景 — なぜこのデッキを作るのか

slide-wiki のサンプル Wiki には、パターン集のデッキが2つあった。
[patterns-wiki](../assets/doc/wiki/patterns-wiki.md) は **Wiki 一般を育てる話**
（ノートの置き方・割り方・繋ぎ方。媒体を選ばない）、
[patterns-meta](../assets/doc/wiki/patterns-meta.md) は
**パターンという文章の書き方**（名前の付け方・出典の辿り方）である。

ところが、この道具のいちばん中心にある実践 —
**スライドそのものをどう作り、発表のあとも育てるか** — には、まとまった置き場が無かった。
枠に収める・リンクを先に張る・規約は検査で守る、といった判断のコツは
CLAUDE.md や BACKLOG の散文に散らばっていて、困った人が場面から引ける形になっていなかった。

## 目的 — なにができれば終わりか

1. スライド作りの判断に**名前を付け、出典付きのパターン5枚**として
   新デッキ `assets/doc/wiki/patterns-slidewiki.md`（スライドが育つパターン）に立てる
2. 「発表して終わり」ではなく **wiki のように育てて読み直せるスライド**の作り方を、
   困った場面から索引で引けるようにする（`map.md` に導線を張る）
3. 全枚に典拠を刻み、**どこまでが先人の知見で、どこからがこのデッキの追加か**を
   調査記録（[patterns-slidewiki-sources.md](patterns-slidewiki-sources.md)）で言えるようにする

依頼の原文は「wiki パターンではなく slidewiki パターンを整理し直す」。
これを**新デッキの新設**として実装した。書式は patterns-meta と過去の git log の慣例に従う。

## 現在の状態: 5枚とも実装済み・push 済み

| コミット | パターン | 内容 |
|---|---|---|
| `2323c72` | デッキ新設 + **原稿用紙** | 枠（2+3+3行・全角26字）は動かさず、中身を削る。出典: PechaKucha 20x20（Klein & Dytham, 2003） |
| `78783c4` | **赤リンク** | 無い行き先へ先にリンクを書く。未解決一覧が次の1枚の畑。出典: Spinellis & Louridas（CACM, 2008）＋ c2 wiki の「?」リンク |
| `2058d7f` | **上下巻** | なぜの物語と引くカタログを対の2冊に割る。出典: Alexander の2冊（1977/1979） |
| `32a7558` | **実行可能な規約** | 決まりは文章ではなく検査で持つ。散文に2度先に現れていた名前の着地。出典: 新郷重夫のポカヨケ（1986）＋ Adzic（2011） |
| `a11eb26` | **読みを広く、書きを狭く** | 読む側は広く解決し、書く形は lint が1つに絞る。名前は ontology.yaml:1216 の地の文。出典: Postel の堅牢性原則（RFC 761/1122） |

並びは書き手の動線: **削る → 繋ぐ → 組む → 守る → 迎える**。

検算はコミットごとに実施済み: 879テスト・型検査・3者比較・trim --check・
gen-okf-index --check 通過。lint --strict の警告は main と同一の既知3件
（B-49 の relation-coverage）のみ。

## 既存パターンとの整理（3デッキの領土）

- **patterns-wiki（10枚・出典なし）**: Wiki 一般が育つ話。種ノート・育つ見出し・
  一枚一義・接ぎ木・けもの道・剪定・収穫・動く北極星・動かない物差し・街灯の外へ
- **patterns-meta（13枚・全枚出典）**: パターンという文章形式の書き方
- **patterns-slidewiki（5枚・全枚出典）← 今回新設**: スライドを wiki のように
  育てる実践。道具の実装規約（CLAUDE.md）ではなく、書き手が手を動かすときの判断だけ

## 決めたパターンフォーマット（正本は ontology.yaml:396-481 の WikiPattern）

1枚のテンプレート:

```markdown
## パターン名
<!--id:パターン名-->
<!--pattern-->
### いつ・なにが困るか
（場面 2行。1行は全角26字まで）

**（困りごとの核 = 太字1文）**
（理由 2行）

### そこで
**（打ち手 = 太字1文）** （同じ行に補足可）
（補足 2行。関連パターンへのリンクはここに溶かす。末尾に「関連:」は積まない）

![パターン名](diagrams/patterns-slidewiki/パターン名.svg)

<!--source-->
（典拠1行。6pt・3行枠 0.3in に収まる長さ。リンクにしない）
```

- 見出しは `いつ・なにが困るか` / `そこで` の2つだけ（語彙 `wiki-pattern-sections`、unknown: error）
- 図は必須・外部 SVG。`<rect>`/`<line>` 等の素の図形で描き
  `npx tsx src/tools/roughen-svg.ts <file>` → `npx tsx src/tools/trim-svg.ts <file>` を通す
  （`<path>`/`<text>` のみになる。`<defs>`/`id=` 禁止、viewBox 実寸）
- 命名は比喩・オノマトペ・ドメイン言語（サイトが既に使っている語はそのまま採る）
- デッキ frontmatter: `short: slide`、`sources:` で調査記録を指す

## 1枚足すときの定型（git log の慣例）

1コミット = 5ファイル:

1. `assets/doc/wiki/patterns-slidewiki.md` — 本文 +24行前後、`読み方` agenda に1行
2. `assets/doc/wiki/diagrams/patterns-slidewiki/<名前>.svg` — 新規
3. `assets/doc/wiki/map.md` — 索引 +1行（ただし「全部は並べない」— 詰まる場面のときだけ）
4. `docs/patterns-slidewiki-sources.md` — 調査記録 +80行前後
   （検証度◎○△・一次/併記・**線を引いておく**（食い違いの明示）・適用例3件・
   「次に確認する点」・`> 刻んだ文字列:`）
5. `assets/__tests__/wiki-pattern.test.ts` — it.each の枚数を ±1

コミットメッセージは7項目型: なぜ足すか / 本文 / 図 / 出典 / 目次 / 調査記録 / 検算結果。

## 残作業

- **intro-slidewiki（第1部）**: 上の「背景・目的」を読み手向けに書いた背景と物語のデッキ。
  intro-meta が後から足された前例（#59, `a38abc2`）に従い、order.yaml の
  「スライドを育てる」グループの先頭に挿す。
  足したら patterns-slidewiki の `読み方` に `背景:` を1行足す
- **保留3枚**（`docs/patterns-slidewiki-sources.md` の売り場に名前だけ置いてある）:
  奥付（典拠は関連ではない）/ 渡し舟（移行路の同梱）/ 正本と写し（写しは機械が書く）。
  いずれも適用例3件か置き場が定まったら
- **relations.yaml への参加**: 今回は見送り（B-49 が patterns-wiki の手前で
  止まっているため）。patterns-wiki の型付けが済んだら追随
- **出典の格上げ**: この回は egress 遮断で ◎ ゼロ。各節の「次に確認する点」を
  一次資料で当たる（RFC の逐語・Alexander 序文の "two halves"・新郷の英訳本文など）

## 引き継ぎの記録

起草したセッション「slide-wiki スキルのパターン整理」
（ブランチ `claude/slide-wiki-skill-pattern-c0z5ms`）は5枚を push してアーカイブ済み。
以降の作業はブランチ `claude/neighboring-session-plan-31gawz` が
main と当該ブランチをマージした上で続けている。この文書が引き継ぎの正本。
