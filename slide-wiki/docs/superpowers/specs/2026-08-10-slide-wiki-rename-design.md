# スキル名を `md2pptx` から `slide-wiki` へ改名する

2026-08-10

## なぜ

このスキルは PPTX・HTML・Wiki の3系統に出力するが、**人が手を伸ばす理由は Wiki** である。
リンクで辿るスライド Wiki が目的で、PPTX と HTML は途中の成果物・確認用という位置にある。
直近のコミット #19〜#23 が全て Wiki ビューアとパターンデッキであることが、その順位を示している。

`md2pptx` という名前は pptx を筆頭に名乗っており、この順位と食い違う。改名はその**順位を入れ替える**作業である。

triggering は description が担っていて、そこには "generating PPTX files" も
"building a linked slide wiki" も入っている。したがって改名が買うのは discoverability ではなく
**アイデンティティ**である。名前が pptx を名乗らなくなるのは過小申告ではなく、正しい順位付けになる。

## 決定

スキル名は **`slide-wiki`**。

### 却下した案

| 案 | 却下の理由 |
|---|---|
| `md2pptx-wiki` | 「pptx-wiki」という存在しない形式を名乗る |
| `md2wiki-slide` | wiki と slide を連結して逃げており、順位を決めていないことが名前に残る |
| `md2deck-wiki` | deck と wiki を並列に置くので、決めた順位が名前で平らに戻る。加えてハイフンの位置が「`md2deck` の wiki 版」と読ませる（`md2deck` は存在しない） |
| `md2wiki` | 当初の推し。`md2*` 家族に留まり、既存の `md2wiki()` 関数と名前が一致する構図は今と同じ（`md2pptx` スキル ⇔ `md2pptx()` 関数）で筋は通っていた。**変換の方向より成果物を名乗るほうが伝わる**と判断して見送った |
| `md2slide-wiki` | 読みは割れないが12文字を超え、`/` で打つ名前として `slide-wiki` に劣る |
| 比喩系 | デッキ内のパターン名では効くが、スキル名は `/` で打つ識別子であり、名前から用途を推測される対象でもある。**本文の中の名前と入口の名前は別物** |
| 改名しない | SKILL.md の説明だけ直せば破壊ゼロで済むが、順位の食い違いは残る |

## 変えるもの

| 場所 | 内容 |
|---|---|
| ディレクトリ | `md2pptx/` → `slide-wiki/`（`git mv`。無視ファイルもディレクトリごと移動する） |
| `SKILL.md:2,6` | `name:` と H1 |
| `assets/package.json:2` | `"name": "md2pptx"` |
| `BACKLOG.md`（6箇所） | **記録ではなく生きた文書**。下の節を参照 |
| `assets/README.md:1,7` | プロジェクト名としての言及（`:85,:179` は API 名なので残す） |
| `assets/doc/theme.yaml:1` | コメント |
| `assets/src/tools/gen-ontology-doc.ts:206,208` | **`ontology.md` の正本**。ここを直して再生成する |
| `ontology.yaml:1,9` | コメント |
| `assets/doc/wiki/guide.md:95` | 公開サンプルの出典表記 |
| `.github/workflows/pages.yml` | パス4箇所（`:10,:28,:48,:75`）+ サイトタイトル（`:58`） |
| `assets/src/batch-html.ts:6`, `assets/src/ontology/index.ts:26` | パスコメント |
| `assets/src/text-style.ts:24`, `assets/src/tools/pptx-inspector.ts:189`, `assets/__tests__/docs-consistency.test.ts:8` | 「md2pptx が作った / というスキル」＝**ツールの通称**として `slide-wiki` に置換 |

`pages.yml:58` のサイトタイトルは `"md2pptx Slide Wiki"` → **`"Slide Wiki"`**。
`"slide-wiki Slide Wiki"` は重複するので、**`pages.yml` は一括置換に混ぜず手で直す**。

`ontology.md` は生成物なので**手編集しない**。`gen-ontology-doc.ts` を直して再生成する。

### リポジトリ外に直すものは無い

`~/.claude` 配下を走査した結果、直すべき参照は無かった。

- `~/.claude/projects/…/memory/` は**空**。`MEMORY.md` も無いので、記憶が陳腐化する経路は無い
- `~/.claude/plans/claude-serene-lecun.md`・`mossy-sleeping-fern.md` は**過去のプラン**（記録なので残す）
- `~/.claude/projects/-Users-eiji--claude-skills-md2pptx/` は旧 cwd の名を持つセッションログ。改名後は新しいディレクトリができるだけ
- `~/.claude/jobs/5d9d2142/state.json` の `cwd` は旧パスを指すが、完了済みジョブの記録

## 変えないもの

- **`md2pptx()` 関数と `Md2PptxOptions` 型、その全 import、`e2e.test.ts:108` の describe 名**（42箇所）。
  `md2html()` / `md2wiki()` と並ぶ「md → pptx 変換」の正しい名前である。`pptx-inspector.ts` のファイル名も同様。
- `CLAUDE.md:217` の `md2pptx`/`md2html` は**オプションを持つ関数**の話なので該当しない。
- **記録** — `docs/superpowers/plans/`（11箇所）・`doc/session-insights/`（10箇所）。
  日付を持つスナップショットであり、当時 `md2pptx` だった事実を書き換えると履歴の改変になる。
- `assets/package-lock.json` — `assets/.gitignore` の対象で**追跡されていない**（`pages.yml` が
  `npm ci` を使わず `npm install` にしている理由もこれ）。ローカルで直しても出荷されないので、
  変更対象に数えない。

### `BACKLOG.md` は記録ではない

当初これを記録に分類したのは誤りだった。780行の**生きた文書**で、
「2026-08-08 に修復した」のような追記が続いており、`md2pptx` の6箇所すべてが
**現在のツールの状態を現在形で述べている**（`:7` 「既に優位な点」、`:190` 「`--verify` は
座標の3者比較のみで」、`:277` 「素の白紙に絶対座標描画のみ」）。過去の出来事を書いた行に
`md2pptx` は現れない。したがって全6箇所を置換する。

放置すると**公開サンプルとの食い違い**になる。`assets/doc/wiki/guide.md:95` の出典が
`slide-wiki BACKLOG B-14` を指すのに、その文書の題が `# md2pptx 機能バックログ` のままになる。

## 同時にやる掃除（改名とは別の腐り）

両 `settings.local.json` が参照する `/Users/eiji/src/co-generative-agility` は**存在しない**。
`~/.config/git/ignore` の `**/.claude/settings.local.json` でグローバルに無視されているため、
**削除すると git から復元できない**。

`assets/.claude/settings.local.json` は**ファイルごと削除**。全5選択子が死んでいる
（消えたリポジトリ宛の完全リテラル2本 — うち1本は現存しない `layout-engine.ts` を指す —
と、`assets/` 階層に置く理由のない `git worktree add` / `merge` / `rebase`）。

`.claude/settings.local.json` は**剪定**。18選択子のうち9本を残す。

残す9本:
`mcp__plugin_context7_context7__query-docs`, `mcp__plugin_context7_context7__resolve-library-id`,
`WebSearch`, `Bash(xxd:*)`, `Bash(test:*)`, `Bash(python3:*)`, `Bash(git rm:*)`,
`Bash(git restore:*)`, `Bash(GIT_EDITOR=true git rebase:*)`

落とす9本と理由:

| 選択子 | 理由 |
|---|---|
| `Bash(/tmp/verify_layout.py:*)` | 消えた使い捨てスクリプト |
| `Bash(/tmp/verify_constants.py:*)` | 同上 |
| `Bash(/tmp/verify_wide_layout.py:*)` | 同上 |
| `Bash(for f in pattern-04-kotae-awase pattern-14-yomiyasui pattern-16-yosan)` | 複数行 for ループが行分割されて誤って捕まった断片。単独では絶対にマッチしない |
| `Bash(do)` | 同じループの断片 |
| `Bash(done)` | 同じループの断片 |
| `Bash(test-bold.md:*)` | md ファイルをコマンドとして許可しており無意味 |
| `Bash(test-all-formats.md:*)` | 同上 |
| `Bash(bash:*)` | 「`bash` 経由なら何でも実行可」に近く、他の項目より一段広い |

加えて **`hooks.TaskCompleted` ブロック全体を削除**。存在しないリポジトリの
`scripts/check-tests.sh` を叩いており、このディレクトリでタスクを完了するたびに空振りしている。

## 実行順

**掃除を `git mv` の前に置く。** `settings.local.json` はグローバルに無視されており、
`git mv` がディレクトリを移すときに無視ファイルをどう扱うかを当てにしたくない。
先に消して剪定すれば、その問いごと消える。

1. `assets/.claude/settings.local.json` を削除、`.claude/settings.local.json` を剪定
2. `git mv md2pptx slide-wiki` → **移動漏れを即座に確認する**:
   `ls slide-wiki/doc/ slide-wiki/.claude/settings.local.json; ls md2pptx`
   （`md2pptx/` が残っていればその場で分かる。`doc/` は未追跡、`settings.local.json` は無視ファイル）
3. 上の表のテキスト置換。**`pages.yml` は手で直す**（サイトタイトルを一括置換に巻き込ませない）
4. `npx tsx src/tools/gen-ontology-doc.ts` — `ontology.md` と `SKILL.md` の生成領域を更新
5. `cd assets && npm test`
6. 下の残存確認

改名と `pages.yml` は**同じコミット**にする。`pages.yml` のパス誤りはテストが検出せず、
CI でしか露見しないため、分けると壊れた中間状態が残る。

## 残存確認

`grep -v 'md2pptx('` を判定に使ってはいけない。`import { md2pptx, md2html }` の行には
`md2pptx(` が無いので**素通りする**。API 名を除くにはこう書く:

```bash
grep -rIn 'md2pptx' --exclude-dir=node_modules --exclude-dir=.git . \
  | grep -vE 'md2pptx\(|md2pptx,|md2pptx *\}|Md2Pptx'
```

これで残るべきものは、**記録2系統 + この仕様書 + 意図して残す3行**だけである。

| 残存 | 種別 |
|---|---|
| `docs/superpowers/plans/2026-08-07-…md`（11） | 記録 |
| `doc/session-insights/insights-20260807.md`（10） | 記録 |
| `docs/superpowers/specs/2026-08-10-…md`（この文書） | 記録 |
| `CLAUDE.md:217` | 関数 `md2pptx`/`md2html` のオプションの話。丸括弧が無いのでフィルタを素通りするが**正しい残存** |
| `assets/__tests__/e2e.test.ts:108` | `describe("md2pptx e2e", …)` — テスト対象の関数名 |
| `assets/src/cli.ts:194` | 「上の `md2pptx` が」= 直前の関数呼び出しを指すコメント |

これ以外の行が出たら、置換漏れである。
