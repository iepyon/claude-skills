# CLAUDE.md

Markdown のデッキをリンクで辿れる Wiki にする Claude Code skill。同じデッキを PPTX
（AST → pptxgenjs）と HTML にも出力し、共通のレイアウトエンジンで座標を計算して3系統に出す。

**このファイルには、ここにしか無い規約だけを書く。** 他に正本があるものは指すだけにする
（写した瞬間、多重管理とドリフトが始まる）。

| 知りたいこと | 正本 |
|---|---|
| md の構造（骨格要素・注釈ディレクティブ・レイアウトと `###` / `####` の意味・見出しの語彙・文字数・リンク） | [ontology.yaml](ontology.yaml)（人間可読な生成物は [ontology.md](ontology.md)） |
| 書き方の案内・レイアウト一覧 | [SKILL.md](SKILL.md)（生成領域を含む） |
| コードの地図・CLI オプション・使い方 | [assets/README.md](assets/README.md) |
| バンドルが答えられるべき問い | `assets/doc/wiki/questions.yaml`（実走の手順は [docs/answerability-eval.md](docs/answerability-eval.md)） |
| やること・やらないこと | `BACKLOG.md` / `BACKLOG-LATER.md` / `BACKLOG-DONE.md` / `BACKLOG-WONTDO.md` |

## Git

- **`main` に直接 push しない。** 公開サイトは `main` への push で再ビルドされる
  （`.github/workflows/pages.yml`）。作業は必ずブランチに置く
- **force push しない。** 明示的に要求されたときだけ
- **PR は頼まれてから作る。** ブランチを push しても PR は開かない
- **作業ブランチへの push は済ませる。** リモートセッションのコンテナは使い終わると回収されるので、
  push していないコミットは失われる（停止フックも未 push を無条件で差し戻す）

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
npx tsx src/tools/migrate-wikilinks.ts [--dry-run|--check] doc/wiki  # 古い記法の一括変換
npx tsx src/tools/gen-okf-index.ts [--check]      # バンドルの index.md / log.md
```

## オントロジー（宣言の読み方）

- 実装は `assets/src/ontology/` 経由で宣言を読む。`registry.ts` はプラグインのディレクティブを、
  `schema/validation.ts` は文字数上限をそこから導出する。**コードに語彙や数値を再定義しない**
- `ontology.md` と SKILL.md の生成領域（`<!-- BEGIN GENERATED: … -->`）は
  `gen-ontology-doc.ts` の生成物。**手編集禁止**
- **frontmatter は生の md を受け取る3つの入口すべてで剥がす** — `pipeline.ts` の `prepare()`、
  `parser/index.ts` の `parseMarkdown()`、`ontology/lint.ts` の `lintSource()`。片方だけだと
  同じデッキから違うトークン列が出て、3者比較が原因の分かりにくい形で落ちる。剥がし方は
  **同じ行数の空行への置換**で、切り落とすと以降の診断の行番号が実ファイルとずれる
- `lint.ts` がトークン層を見るのは、語彙外の `###` や未宣言のメタキーが **AST に変換される
  時点でもう失われている**ため（消えたブロックは AST に痕跡を残さない）

## 3系統をずらさないための約束

```
Markdown → parser/ → schema/ → layout/ ─┬→ pptx/ → .pptx
                                        ├→ html/ → .html
                                        └→ wiki/ → .html (複数デッキを1枚に)
```

座標は `layout/` が一度だけ計算し、3レンダラが同じ `LayoutResult` を消費する。

- **Wiki のスライド DOM は `html/` の `renderSlide()` を再利用する。** 複製すると三者がずれる
- コアレイアウト以外（IconColumns / IconCards / Steps / NumberedList 等）の座標計算は
  各プラグインの `layout.ts` にあり、`layoutSlide()` が registry 経由で dispatch する
- **図形の名前は数えずに宣言する。** `--verify` が突き合わせる図形のキーは `shape-keys.ts` が
  唯一の語彙で、PPTX は pptxgenjs の `objectName`（→ `<p:cNvPr name>`）、HTML は
  `data-shape-id` に**同じ文字列**を書き出す。インスペクタは描画順を数えず、その名前を読む。
  比較対象は**テキストを運ぶ図形**だけで、境界ボックス・塗り・コード背景・SVG は `deco:` を
  付けて除外する（除外が生成物の中に書かれている状態を保つ）

**1箇所にしか持たない語彙・規則**（レンダラとツールが共有する）:

- `text-lines.ts` — 「1行 = 1段落」の切り出し（PPTX が改行ごとに `<a:p>` を出すので、
  HTML も AST インベントリも同じ数え方をする）
- `text-style.ts` — 中央寄せとコードのフォントの判定
- `slug.ts` — 見出し → ID の綴り（デッキ slug と `#fragment` が同じ規則で作られる保証）
- `okf.ts` — OKF の予約ファイル名と内部リンクの形（パーサ・CLI・lint・生成器が共有）
- `deck-order.ts` — `--wiki` / `--lint` にディレクトリを渡したときのデッキの並び（`order.yaml` の宣言）
- `assets.ts` — `![…](….svg)` の参照先の読み込み（**デッキ相対のパスを読むのはここだけ**）
- `constants.ts` — スライド寸法・マージン・GAP。`layout/` の全ファイルが参照するので、
  座標調整や新レイアウト追加時に必ず確認する
- `entities.ts` — 実体参照のデコード / `errors.ts` — Tagged errors

**ただし、共有した規則は3者比較では守れない。** 3脚が同じ関数を呼ぶので、その関数が
間違っていれば3脚とも揃って間違う（比較は緑のまま）。冗長性を消したぶんの検査は
`text-style.test.ts` が明示的に置き直している。共有モジュールを増やすときは同じ手当てが要る。

**移行ツールはパーサに依存しない。** `migrate-wikilinks.ts` は旧 `[[…]]` を自分の正規表現で
拾うので、パーサから旧記法を落としたあとも動く（他人のデッキを受け取るスキルなので、破壊的変更の
移行路は同梱しておく。`--check` は「古い記法が紛れ込んでいないか」の恒常的な見張りにもなる）。
**ただし「どちらの綴りが正しいか」は持たない** — 先頭 `/`・`./` 付きリンクの寄せ先は
`parseOkfLink` が返す `canonicalHref` そのもので、接頭辞の集合を移行ツールは知らない。
**2つの移行は残り方が違う** — `[[…]]` はサイトでも折れるので見れば分かるが、接頭辞つきは
サイトでは当たり github.com でだけ折れる（だから `--check` が要る）。

## Key Patterns

**Option-based handler dispatch** — tokenizer, ast-builder, layout/index で共通:
```typescript
const handlers: ReadonlyArray<(input) => O.Option<Output>> = [...]
pipe(handlers.map(h => h(input)), A.findFirst(O.isSome), O.flatten, O.getOrElse(...))
```

**Effect-TS** — `Effect.gen` + `yield*` で制御フロー。`.pipe()` チェーンは最小限に。

## Key Constraints

md の記法そのものは [ontology.md](ontology.md) が正本。ここに書くのは**実装側の制約だけ**。

- 箇条書きの描画: `block-formatter.ts` が Paragraph[] に変換し、PPTX はネイティブバレット・
  HTML は CSS 疑似要素で記号を描く（リテラルの `•` は書かない — 二重表示になる）
- 新レイアウト追加: `ontology.yaml` の `layouts` に宣言 → `plugins/` にフォルダを作成 →
  `plugins/index.ts` に `import "./my-layout/index.js"` を1行追加 → `gen-ontology-doc.ts` を実行。
  宣言が無いと登録時／最初のトークン化で落ちる（ドキュメントにも lint にも現れない
  レイアウトを作らせないため）
- スライド ID の採番は `parser/slide-ids.ts` が `ast-builder.ts` から**一括で**行う
  （11個のプラグイン converter を触らないため、かつ `raw.title` が読めるのが変換直前だけのため）
- HTML のスライド div は `id=` を持たない（Wiki のホバープレビューが `cloneNode` するので
  重複する）。ID は `data-slide-key`、`data-slide-id` と `data-default-font-name` は
  `html-inspector` 用なので触らない（PPTX が `theme1.xml` に既定フォントを持つのと同じで、
  HTML も自分で名乗る — 読む側が定数を持つと `--theme` でその脚だけ食い違う）
- **Wiki だけの装飾は `.slide` の外に置く。** デッキのバッジは `.wiki-slide` の中・`.slide` の
  兄弟に吐く（中に入れると `renderSlide()` の出力が変わり `--html` と DOM が割れる）。足場は
  `position: relative` の `.stage-frame` で、**`.wiki-slide` には `position` を持たせない**
  （`.slide` の absolute の基準がそちらへ移る）。またぐリンクの補足は**属性 + CSS の `::after`**
  （`data-cross-deck`）で足す — 節点を挿すとホバーのカードが `cloneNode` で運び、カード側で
  足し直すと二重になる。CSS は `wiki/styles.ts` にだけ書く（`html/slide-css.ts` に書くと
  `--html` に漏れる）
- `display:flex` の直下に複数のインライン要素を置かない（1つずつが flex アイテムになり語の
  途中で改行される）。`richText` も `paragraphs` も素のテキストも `Paragraph[]` に正規化して
  `.para-stack` の1経路で描く（`element-renderers.ts`）
- バンドル（デッキ集合・`order.yaml` の並び・デッキ slug・予約ファイル名・ID の一意性の範囲）の
  規則は `ontology.yaml` の `okf` 節が正本。コード側が持つのは綴りだけ
  （`RESERVED_OKF_FILES` / `OKF_VERSION` / `DECK_ORDER_FILE`）で、宣言との一致は
  `ontology.test.ts` が留める

### 図解（`![…](….svg)`）

図解は md に書かず外部ファイルを指す（md をそのまま GitHub で開いても絵として表示させるため）。

- **パイプラインが文字列だけでは完結しない唯一の場所。** `baseDir`（md が置かれている
  ディレクトリ）を `md2pptx` / `md2html` のオプション・`WikiSource` から `parseTokens` まで
  引き回す。読み込みは `assets.ts` の1関数だけが行い、埋め込み時に幅高を `100%` に読み替える
  （ファイル側は md での表示のために実寸を名乗る）
- **枠のほうを図の縦横比に合わせる。** `svgAspectRatio()` が `viewBox` から比を返し、
  wiki-pattern はその比で下敷きを組む。違う比で置くと、HTML は `preserveAspectRatio` で図を
  縮めて余白を作り、PPTX は `addImage` が枠に引き伸ばして図を歪ませる（同じ原因で別々に
  崩れるので、生成物を見比べても気づきにくい）
- **定規で引いた線を残さない** — `<rect>` / `<line>` / `<circle>` / `<polygon>` / `<polyline>` は
  禁止。サイトが載せている `ラフで出す` を図の側でも守るため。崩すのは `roughen-svg.ts`
  （揺れはファイル名と要素の並び順から決まり、`<path>` と `<text>` には触らないので**冪等**）。
  フィルタで粗さを出せないのは `<defs>` と `id=` が禁じられているからで、揺れは座標に焼き付ける
- **`viewBox` は中身に寄せる。** 図は下敷きいっぱいに描かれるので、枠に残した余白はそのまま
  絵の小ささになる。逆に中身がはみ出した図は枠を広げて収める（切れた線や字は生成物を開いても
  消えているだけで気づけない）。寄せるのは `trim-svg.ts`（`--dry-run` / `--check` あり、**冪等**）
- 上の2つは `wiki-pattern.test.ts` が配布中の図で見張る

## Plugin System

自己登録パターン。各プラグインが import 時に `registerPlugin()` を呼ぶ。標準構成は
`index.ts`（自己登録）/ `schema.ts` / `handler.ts` / `converter.ts` / `layout.ts` / `constants.ts`
（`registry.ts` が派生ルックアップを、`plugins/index.ts` が side-effect import を持つ）。

10ディレクトリ・**11プラグイン登録**（`icon-layout` だけが `icon-cols` と `icon-cards` の2つを
登録する）。パーサ側の受け取り方は2つあり、**排他ではなく併用可**:

- `sectionRoute`: `###` セクションを `pluginData` の指定フィールドに集めるだけの標準ルート
- `modeHandlers`: H3/H4/BodyText の解釈を自前で持つ

steps / icon-layout / agenda / wiki-pattern は両方を持つ。wiki-pattern が挟むのは画像と
コードフェンスで、画像は図解の参照を読み込む本題、フェンスのほうは飲むだけ（捕まえないと
コアのハンドラが `mode` を `"code"` にして、スライドが CodeDisplay として変換されてしまう）。

**ディレクティブと文字数上限はプラグインに書かない。** 正本は `ontology.yaml` の `layouts` で、
`registerPlugin()` が `id` を鍵に完全一致の `tokenMatcher` を導出し（宣言の読み込みは初回の
`getTokenMatchers()` まで遅延する）、上限は `validation.ts` が `maxCharsForTag()` で直接引く。
レジストリが返すのは数え方（`getCharCounter()`）だけ。したがって**手書きの `tokenMatcher` は
認識がリテラル1本で表せない場合のみ**（numbered-list の `circle|bar` 正規表現が唯一の例）。

## Theme System

`schema/theme.ts` の `Theme` 型と `DEFAULT_THEME`。CLI の `--theme <path>` で YAML を指定できる。

**`contentSlide` のフォントサイズは、はみ出したスライドで縮む。** `dispatchLayout` が
`contentSlide.{heading,body,gridHeading,gridBody}Size` を 0.9 → 0.6 と段階的に下げて再レイアウト
する（`renderer/layout/index.ts`）。これは1枚を収めるための仕組みなので、**並べて読ませる
レイアウトが使うと本文の長さでページごとに文字が変わる**。そういうレイアウトはサイズをテーマの
別の節に置く（`wikiPattern` がそれ。`numberedList` / `table` / `agenda` も `contentSlide` の外）。
別の節に置いたぶん縮小は空回りし、収まらなければ `validateLayout` がビルドを止める。

## Tests

名前が対象を言っているもの — `parser.test.ts` / `block-formatter.test.ts` /
`inline-formatting.test.ts` / `slide-id.test.ts` / `validation.test.ts` / `theme.test.ts` /
`layout-engine.test.ts` / `overflow.test.ts` / `html-renderer.test.ts` / `cli.test.ts` /
`deck-order.test.ts` / `frontmatter.test.ts` / `migrate-wikilinks.test.ts` /
`customer-journey.test.ts` / `table.test.ts` / `icon-resolver.test.ts` /
`syntax-highlighter.test.ts` / `html-inspector.test.ts` / `pptx-inspector.test.ts`。

そうでないもの:

| テストファイル | 対象 |
|---|---|
| `e2e.test.ts` | 全パイプライン (markdown → .pptx buffer) |
| `ontology.test.ts` | 宣言の自己整合・宣言 ⇔ 実装・lint・生成物の鮮度 |
| `wiki.test.ts` | デッキ合成・リンク解決・バックリンク・自己完結性・ビューア幾何 |
| `wiki-pattern.test.ts` | WikiPattern の座標と2節の並べ替え、配布デッキの SVG 検査（実寸・禁止要素・定規で引いた線） |
| `snapshot-comparison.test.ts` | コアレイアウト6種のインベントリ比較 |
| `three-way-verify.test.ts` | 実在する全デッキの3者比較 + 食い違いの判定 |
| `text-style.test.ts` | 3脚が共有する書式規則（共有したぶん比較では守れない） |
| `okf-conformance.test.ts` | `doc/wiki/` が OKF v0.2 に適合していること |
| `answerability.test.ts` | `doc/wiki/` が想定の問い（`questions.yaml`）に答えられること — アンカーの実在と検索語の到達可能性（決定論の半分。実走は `docs/answerability-eval.md`） |
| `docs-consistency.test.ts` | ドキュメントが数え上げている件数・ファイル名と実装の乖離 |
| `workflows.test.ts` | 公開が PR で走らないこと・concurrency group が重ならないこと |

## Development Notes

- `cd assets` してから npm コマンド実行。`npx tsx` で直接実行（ビルド不要）。
  `.pptx` / `.html` は gitignore 済み
- **型検査は `npm test` に含まれない。** vitest は esbuild で型を捨てるので `npm run typecheck` を
  別に打つ。見るのは `src/` だけ（`__tests__` は tsconfig の `exclude` にあり、入れるには別
  tsconfig と 38 件の解消が要る — BACKLOG B-45）
- **CI は2本に分ける。** `ci.yml` が PR で `npm test` + `npm run typecheck`、`pages.yml` が
  `main` への push で公開する。**pages.yml に `pull_request` を足してはいけない**し、2本が
  同じ concurrency group を使ってもいけない — 以前 PR の run が公開側と同じ group に入り、
  `cancel-in-progress` が push 側を殺してデプロイが消えた。`workflows.test.ts` が守っている
