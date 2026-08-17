# patterns-slidewiki の実装計画（引き継ぎ用）

作成: 2026-08-17。起点はセッション「slide-wiki スキルのパターン整理」の計画 —
ブランチ `claude/slide-wiki-skill-pattern-c0z5ms` のコミット `2323c72`
（デッキの起こしと1枚目）、および同ブランチの
[patterns-slidewiki-sources.md](patterns-slidewiki-sources.md)（領土の線引きと出典の作法）。
**この文書は計画であって進捗表ではない** — 現在地はブランチの git log が正本で、
ここには手順と判断だけを書く。

## 元の計画が決めたこと（変えない）

- **新デッキ** `assets/doc/wiki/patterns-slidewiki.md`「スライドが育つパターン」
  （short: `slide`、グループ「スライドを育てる」）。第1部（intro-slidewiki）は
  書けたら前に足す — `order.yaml` のコメントに既記
- **領土**: スライドを wiki のように育てる**書き手の判断**。
  [patterns-wiki](../assets/doc/wiki/patterns-wiki.md)（媒体を選ばない Wiki 一般）とも
  [patterns-meta](../assets/doc/wiki/patterns-meta.md)（パターンという文章形式の書き方）とも
  重ねない。道具の実装規約（CLAUDE.md）はこのデッキに書かない
- **1枚の形**: `<!--pattern-->` の2部構成（いつ・なにが困るか 2行 + 太字1行 + 2行 /
  そこで 太字1行 + 2行）+ ラフ SVG + `<!--source-->` を 6pt・3行枠（0.3in）に刻む。
  全体で5枚。門は `3ストライクで書く` — 適用例3件が立たない名前は
  「保留（売り場）」に置いたまま書かない（奥付・渡し舟・正本と写し）
- **出典の作法**: 検証度（◎/○/△）を行ごとに明示。egress が遮断されている間、
  逐語は「複数の独立した検索結果が一致して返した文字列」まで。
  もっともらしい系譜を作らない

## フェーズ1 — 残りのパターンを1枚ずつ刻む

1枚 = 1コミットで進める（1枚目「原稿用紙」`2323c72` が手本。未 push の下書きを
コンテナに溜めない — リモートセッションのコンテナは回収されるため）。
1枚ごとの手順:

1. **検算**: 適用例3件が立つか（同一リポジトリ・同一書き手の例が過半なら、
   その弱さを sources に明示する — 原稿用紙の前例）
2. **本文**: `patterns-slidewiki.md` に追記。関連は文中に溶かす —
   既存デッキへのリンクを最低1本（`不揃いの石畳` の3方向を意識する）。
   枠に収まらなければ削る（このデッキの1枚目が言っていることを、デッキ自身が守る）
3. **出典**: `<!--source-->` を3行枠に収まる長さで刻み、
   [patterns-slidewiki-sources.md](patterns-slidewiki-sources.md) に検証度・
   「次に確認する点」・刻んだ文字列を追記
4. **図解**: `diagrams/patterns-slidewiki/名前.svg`。`<rect>`/`<line>` 等の定規線は
   禁止（`wiki-pattern.test.ts` が見張る）。`roughen-svg.ts` で揺らし、
   `trim-svg.ts` で viewBox を中身に寄せる（どちらも冪等）
5. **導線**: デッキ先頭の「読み方」agenda に1行。読み手が踏む場面なら
   `map.md` の「詰まったら」にも1行（原稿用紙は「収まらない:」で追加済み）
6. **検証**: `cd assets && npm test && npm run typecheck`、
   `npx tsx src/cli.ts --lint --strict doc/wiki`、
   `npx tsx src/tools/gen-okf-index.ts --check`（index.md の鮮度）
7. **コミットして push**（PR は頼まれてから）

## フェーズ2 — デッキとしての仕上げ

- **読み方の再構成**: 5枚が揃ったら agenda を動詞の節で並べ直す
  （現状は「削る: 原稿用紙」1行 + 隣接デッキへの2行）
- **関係の型付け**: `relations.yaml` の `decks:` に `patterns-slidewiki.md` を足し、
  本文の散文リンクに型を与える（BACKLOG-LATER の B-49 の1歩目。
  デッキをまたぐ辺は `cross-deck` 免除のまま — 言語内と言語間は別の語彙）。
  `relation-coverage` の「孤立させない」warning をゼロにする
- **孤立ゼロの確認**: 各パターンが `map.md` か他パターンの本文から指されていること
  （BACKLOG の B-42「孤立したスライドを誰も数えない」を手で先取りする）
- **main の取り込み**: ブランチの基底は #64 で、main には #65（ダッシュボード）が
  入っている。仕上げ前に main をマージし、`three-way-verify.test.ts`（全デッキの
  3者比較）を新デッキ込みで通す

## フェーズ3 — 畳んだあとに残るもの（このブランチではやらない）

- **一次資料の◎化**: egress が開いたら sources の「次に確認する点」を
  一次資料で当たる（現状 ◎ はゼロ、全て ○/△）
- **intro-slidewiki（第1部）**: 背景とショートストーリー。他の2組
  （intro-wiki / intro-meta）と同じ対の形で、書けたら同グループの前に足す
- **B-48**（型の付いた関係がサイトに出ていない）/ **B-49 の残り**
  （patterns-wiki の型付けと、またぐ辺の語彙）
- **保留の売り場**: 奥付・渡し舟・正本と写し。適用例3件が立つか
  置き場が定まるまで書かない

## 進め方の注意

計画の元になったセッションは同じブランチで作業を継続している
（1枚ずつコミット・push する方針に切替済み）。**同じ枚に二重に着手しない** —
このセッション側で引き継ぐのは、あちらが再び停滞して push が止まったときで、
その場合も起点は必ず `origin/claude/slide-wiki-skill-pattern-c0z5ms` の最新にする。
