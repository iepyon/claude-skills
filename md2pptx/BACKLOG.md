# md2pptx 機能バックログ

Claude が標準の document-skills:pptx スキル(pptxgenjs スクリプト書き下ろし + 目視修正ループ)で生成するプレゼンテーションと同等の品質を、**決定論的な Markdown → PPTX パイプライン**として実現するためのバックログ。

- 調査日: 2026-08-07
- 比較対象: `~/.claude/plugins/cache/anthropic-agent-skills/document-skills/*/skills/pptx/`(version b29e7cf65e5c)
- md2pptx が既に優位な点: 決定論的再現性、レビュー可能な中間表現(Markdown)、AST/HTML/PPTX の3者比較検証(`src/tools/inventory-diff.ts`)、グラデーション表現

B-24 以降は別の調査（2026-08-08、オントロジー観点のレビュー + 動作確認）で追加した。
上記の「3者比較検証」は長らく機能していなかった（AST の脚が別のキー空間を使い、
`--verify` は食い違いを見つけても常に exit 0 だった）。2026-08-08 に修復した — [B-24](#b-24)。
残る範囲は [B-33](#b-33)。

## 一覧

| ID | 優先度 | 項目 | カテゴリ |
|---|---|---|---|
| [B-01](#b-01) | ✅済 | ドキュメント乖離の解消 | ツール品質 |
| [B-02](#b-02) | ✅済 | 箇条書きリスト対応(1階層) | Markdown基本 |
| [B-03](#b-03) | P0 | スピーカーノート対応 | 表現力 |
| [B-04](#b-04) | P1 | 画像挿入 `![alt](src)` | 表現力 |
| [B-05](#b-05) | P1 | ネイティブチャート | 表現力 |
| [B-06](#b-06) | P1 | テーブルのネイティブ化 | 表現力 |
| [B-07](#b-07) | P1 | 固定要素数レイアウトの柔軟化 | ツール品質 |
| [B-08](#b-08) | P1 | オーバーフロー処理の一般化 | ツール品質 |
| [B-09](#b-09) | P1 | デザイン規範の反映・テーマプリセット | 表現力 |
| [B-10](#b-10) | P2 | レンダリング検証ループ | ツール品質 |
| [B-11](#b-11) | P2 | OOXML 検証の統合 | ツール品質 |
| [B-12](#b-12) | P2 | テーマカバレッジ拡大 | ツール品質 |
| [B-13](#b-13) | P2 | ページ番号・マスタースライド | 表現力 |
| [B-14](#b-14) | ✅済 | ハイパーリンク対応 | Markdown基本 |
| [B-15](#b-15) | P2 | テスト補強 | ツール品質 |
| [B-16](#b-16) | P3 | Mermaid 図対応 | 表現力 |
| [B-17](#b-17) | P3 | .potx テンプレート駆動出力 | 表現力 |
| [B-18](#b-18) | P3 | Good/Bad/Hat レイアウト・アイコン図解 | 表現力 |
| [B-19](#b-19) | P3 | Markdown 拡張(ネストリスト・引用ブロック等) | Markdown基本 |
| [B-20](#b-20) | P3 | スライド寸法・マージンのテーマ化 | ツール品質 |
| [B-21](#b-21) | P3 | HTML 出力の印刷/PDF 対応 | 表現力 |
| [B-22](#b-22) | P2 | プラグイン内テキストのリンク対応 | Markdown基本 |
| [B-23](#b-23) | P2 | 記法そのものの整理（宣言で洗い出した候補） | Markdown基本 |
| [B-24](#b-24) | ✅済 | `--verify` の3者比較が壊れている | ツール品質 |
| [B-25](#b-25) | P0 | 型検査が CI にもテストにも無い | ツール品質 |
| [B-26](#b-26) | P1 | 文字数の数え方が宣言に反する | オントロジー |
| [B-27](#b-27) | P1 | lint の盲点（タイトルスライド・`slot.body`） | オントロジー |
| [B-28](#b-28) | P1 | 宣言の「誰が読むか」が宣言に無い | オントロジー |
| [B-29](#b-29) | P1 | コア側の宣言駆動化 | オントロジー |
| [B-30](#b-30) | P2 | 層ごとに名前が違う同一概念 | オントロジー |
| [B-31](#b-31) | P2 | `LayoutPlugin` に足りないモデル | オントロジー |
| [B-32](#b-32) | P2 | 存在しない保証を主張しているコメント・数え上げ | ツール品質 |
| [B-33](#b-33) | P2 | 3者比較が見ていない残り | ツール品質 |

---

## P0 — 前提整備・基本要素

<a id="b-01"></a>
### B-01: ドキュメント乖離の解消

**背景**: ドキュメントと実装の乖離が複数箇所ある。md2pptx は「Claude がドキュメントを読んで機械的に使う」ツールなので、ドキュメントの誤りはそのまま生成品質の劣化・機能の不使用につながる。

- 文字数制限: 実装は `MAX_CHARS_PER_SLIDE = 1000`(`assets/src/constants.ts:31`)だが、SKILL.md / CLAUDE.md / assets/README.md は「240文字」、`assets/src/schema/validation.ts` のコメントは「240文字、LeanCanvas は800文字」と3様に食い違う
- SKILL.md のレイアウト一覧に `pattern-language`(`<!--pattern-language-a-->`)が未記載 — 実装済みなのに Claude から発見できない
- CLAUDE.md が存在しない `renderer/layout/visual.ts` を記載(icon-layout / steps / numbered-list プラグインに移動済み)
- CLAUDE.md のプラグインツリーが lean-canvas と customer-journey の2つのみ(実際は10プラグイン登録)
- CLAUDE.md のテスト対応表に `inline-formatting.test.ts` / `table.test.ts` / `pattern-language.test.ts` が未記載
- assets/README.md の Architecture 図が旧構成(`renderer/layout-engine.ts` 等)のまま

**受け入れ基準**: 文字数制限の正を決めて(実装に合わせるか仕様に戻すか)3ドキュメント + validation.ts コメントを統一。SKILL.md に全12レイアウトタグが載っている。CLAUDE.md のツリー・テスト表が実態と一致。

**✅ 完了（オントロジー導入）**: 個別に直すのではなく、乖離しうる事実の置き場を1つにした。
`ontology.yaml` が md の構造の正本になり、SKILL.md のレイアウト表・注釈表・インライン記法表・
文字数の記述は `gen-ontology-doc.ts` の生成領域になった（`--check` でドリフトを検出）。
文字数上限と各プラグインのディレクティブはコードから消え、`src/ontology/` 経由で宣言を読む。
`ontology.test.ts` が宣言 ⇔ 実装 ⇔ 生成物の3者を留める。CLAUDE.md / README に残った
「数え上げ」（プラグイン件数・ファイル名・テスト表）は `docs-consistency.test.ts` が引き続き見る。

<a id="b-02"></a>
### B-02: 箇条書きリスト対応(1階層)

**背景**: `- ` / `* ` / `1. ` のマッチャがコアトークナイザ(`assets/src/parser/tokenizer.ts`)に存在せず、`- foo` は BodyText として本文に混入しハイフンがそのまま描画される。Markdown の最も基本的な要素が欠落しており、Claude が自然に書く Markdown がそのまま通らない。

**実装方針**: pptxgenjs の `bullet: true` + `breakLine: true` + `paraSpaceAfter` を使用(標準スキルの規範に従い、リテラル `•` の埋め込みは禁止 — 二重表示になる。`lineSpacing` ではなく `paraSpaceAfter` で間隔調整)。HTML レンダラ側は `<ul>/<li>` 相当の描画を `LayoutResult` 経由で同一座標に出す。

**受け入れ基準**: `- item` が箇条書きとして PPTX/HTML 両方に描画される。番号付き `1. item` も対応。既存の pattern-language プラグインのローカル解釈(`handler.ts:367`)と衝突しない。

**✅ 実装済み**。ただし置き場所は上の想定と違う — マッチャは `tokenizer.ts` ではなく
**ブロック層の `parser/block-formatter.ts`** にある（`UNORDERED` / `ORDERED` 正規表現、
`- ` `* ` `+ ` `N. ` を受理）。トークン層で拾わないので `*italic*` と衝突せず、
`parseInlineFormatting` とも素直に合成できる。
`renderer/layout/helpers.ts:357` の `buildSectionBoxes` が `hasListMarker` で分岐し、
PPTX は `slide-builder.ts` の `bulletToPptxOption` でネイティブバレット、HTML は
`element-renderers.ts` の `.para-bullet` / `.para-number` を CSS 疑似要素で描く
（リテラルの `•` は書かない）。`block-formatter.test.ts` が9件で覆っている。

**残っているスコープ外**: 箇条書きが効くのは `buildSectionBoxes` を通る経路
（コアレイアウトと lean-canvas）だけ。`layout.ts` で `text:` に直接書き出す
プラグインには届かない — B-22 と同じ範囲。

<a id="b-03"></a>
### B-03: スピーカーノート対応

**背景**: `slide.addNotes()` が未使用(`assets/src` 全体で0ヒット)。標準スキルではスピーカーノートは定番機能で、「ノートをスライド上のテキストボックスに書くのは禁止」と明記されるほど基本の出力先。プレゼン原稿を Markdown で一緒に管理できると中間表現としての価値が大きく上がる。

**実装方針**: 記法案 — スライド内の `<!--notes-->` 以降の本文をノートとして収集し `addNotes()`(プレーンテキスト、1スライド1回)に渡す。240/1000文字制限のカウント対象外とする。HTML 出力では `data-notes` 属性 or 表示トグルで確認可能にする。

**受け入れ基準**: `<!--notes-->` 以降が PowerPoint のノートペインに表示され、スライド面には描画されない。

---

## P1 — 表現力ギャップ

<a id="b-04"></a>
### B-04: 画像挿入 `![alt](src)`

**背景**: `![alt](src)` のマッチャが存在せず、ユーザー画像を挿入する手段がゼロ。`addImage` は Material Icon の SVG 埋め込み専用(`assets/src/renderer/icon-resolver.ts`)。スクリーンショットや図版を貼れないのはプレゼンツールとして大きな欠落。

**実装方針**: ローカルパス/相対パスを読み込み base64 data URI で `addImage`。レイアウトエンジンに `ImageBox` を追加し PPTX/HTML 両対応。LeftRight レイアウトとの組み合わせ(左テキスト+右画像 — 標準スキルの推奨パターン)を最優先ユースケースとする。アスペクト比保持・領域内フィットを自動計算。

**受け入れ基準**: `![説明](./fig.png)` が PPTX/HTML 両方に表示される。存在しないパスは ParseError/ValidationError で明確に失敗する。

<a id="b-05"></a>
### B-05: ネイティブチャート

**背景**: `addChart` 未使用。`assets/README.md` の TODO「グラフ表示」の残件でもある。標準スキルは「チャートは必ずネイティブ `addChart()`、画像フォールバック禁止」を規範とする(PowerPoint 上で編集できるため)。

**実装方針**: bar / line / pie から着手。記法はパイプ表 + ディレクティブ(例: `<!--chart:bar-->` + テーブル)か YAML フェンスかを設計時に決定。**pptxgenjs 固有の破損パターンを必ず回避**(標準スキル SKILL.md に列挙): stacked bar での `dataLabelPosition: "outEnd"` はファイル破損、combo チャートは `valAxes` と `catAxes` の両方が必要、16進色に `#` を付けると破損。B-11 の検証と併せて導入すると安全。

**受け入れ基準**: Markdown からネイティブチャート入りの PPTX が生成され、PowerPoint で開いてチャートを編集できる。HTML 側は SVG 等で同等の見た目を描画。

<a id="b-06"></a>
### B-06: テーブルのネイティブ化

**背景**: 現在の table プラグイン(`assets/src/plugins/table/`)は shape + text の自力描画で、PowerPoint 上では単なる図形の集まり。行の追加や列幅調整ができない。`addTable` を使えば編集可能なネイティブテーブルになる。

**実装方針**: `addTable` への移行 or `<!--table:native-->` のようなオプトイン。注意: 標準スキルのバリデータは `<a:tblPr>` 内の重複 `<a:tableStyleId>` を「PowerPoint が拒否する致命的エラー」として検出しており、生成時に留意。自力描画には HTML との座標一致という利点があるため、レイアウトエンジンの座標計算は維持しつつ PPTX 出力のみネイティブ化する設計を検討。

**受け入れ基準**: 生成された表を PowerPoint 上で行・列単位に編集できる。3者比較(`--verify`)が引き続き通る。

<a id="b-07"></a>
### B-07: 固定要素数レイアウトの柔軟化

**背景**: IconColumn / IconCard は TypeScript の tuple 型で **3要素固定**(2個や4個は型エラー)。CustomerJourney も4行固定。Claude が生成するコンテンツは必ずしも3項目に収まらず、機械的生成の入力制約として厳しすぎる。

**実装方針**: tuple を長さ2〜4の配列 + バリデーションに変更し、レイアウト側(`assets/src/plugins/icon-layout/layout.ts` 等)で要素数に応じた幅・フォントサイズ計算を行う(Grid の `calculateGridSpacing` と同様の段階縮小)。

**受け入れ基準**: `<!--icon-cols-->` で2〜4項目が均等配置される。3項目の既存スナップショットテストが変化しない(後方互換)。

<a id="b-08"></a>
### B-08: オーバーフロー処理の一般化

**背景**: 自動改ページは CustomerJourney のみ実装(converter 内ページネーション)。他レイアウトはオーバーフローしても切り詰め・縮小されず**はみ出したまま出力される**。標準スキルは「テキストのはみ出しは最優先チェック項目、はみ出したまま出荷禁止」とする。決定論的パイプラインでは目視ループがないぶん、レイアウト側での保証が必須。

**実装方針**: `estimateTextHeight`(`assets/src/renderer/layout/helpers.ts`)を使い、レイアウト計算後に (1) 段階的フォント縮小 (2) それでも溢れる場合は ValidationError で明確に失敗 — の2段構え。黙ってはみ出すのが最悪。

**受け入れ基準**: 全コアレイアウトで、収まらないコンテンツが「縮小されて収まる」か「エラーで弾かれる」かのどちらかになる。はみ出したまま成功終了するケースがない。

<a id="b-09"></a>
### B-09: デザイン規範の反映・テーマプリセット

**背景**: 標準スキルは強いデザイン規範を持つ("Don't create boring slides"、支配色60-70% + アクセント、ダーク/ライトのサンドイッチ構造、名前付き10パレット)。同時に **Avoid リスト**があり、「装飾的なカラーバー・アクセントストライプ全面禁止(カード端の細いストライプ含む)」と明記される — **現行 IconCard の「上部アクセントバー」はこれに抵触**(`assets/src/plugins/icon-layout/`)。「カードの差別化は淡い背景ティント・ドロップシャドウ・アイコンで行う」が代替。

**実装方針**:
1. IconCard のアクセントバーをデフォルト無効化 or 背景ティント方式に変更
2. 標準スキルの10パレット(Midnight Executive / Forest & Moss / Coral Energy 等)を `--theme` 用 YAML プリセットとして `assets/themes/` に同梱
3. タイトル・結論スライドをダーク背景にする「サンドイッチ構造」をテーマで表現可能にする
4. 安全フォント(Arial, Calibri, Cambria 等)をデフォルトに、Aptos をデフォルトにしない

**受け入れ基準**: `--theme themes/midnight-executive.yaml` で標準スキル相当のパレットが適用される。デフォルト出力が Avoid リストに抵触しない。

---

## P2 — 運用・信頼性

<a id="b-10"></a>
### B-10: レンダリング検証ループ

**背景**: 標準スキルは「soffice で PDF 化 → pdftoppm で JPEG 化 → 全スライドを目視」を**必須ワークフロー**とし、18種のチェック項目(はみ出し・重なり・マージン不足・低コントラスト等)を規定する。md2pptx は決定論的だが、レイアウトバグや新プラグインの検証にこのループがあると開発・利用両面で品質が上がる。

**実装方針**: CLI に `--render-check` を追加し、`soffice --convert-to pdf` → `pdftoppm -jpeg -r 150` を実行してスライド画像を出力(標準スキルの `scripts/office/soffice.py` と同様、sandbox でのハング対策を考慮)。SKILL.md に「生成後に画像を確認する」手順を追記。

**受け入れ基準**: `npx tsx src/cli.ts in.md out.pptx --render-check` でスライドごとの JPEG が生成される。soffice 不在時は明確なエラーメッセージでスキップ。

<a id="b-11"></a>
### B-11: OOXML 検証の統合

**背景**: 標準スキルは ISO-IEC29500 XSD 一式 + 14種の検証 + 「**pptxgenjs は PowerPoint が開けないチャート XML を出すが、python-pptx も LibreOffice も XSD もそれを通す**」という他ツールで検出不能な破損パターンの検出器(`scripts/office/validators/pptx.py`)を持つ。md2pptx の `--verify` は座標の3者比較のみで、**ファイルとしての妥当性**は検証していない。B-05(チャート)導入時には特に必須。

**実装方針**: 標準スキルの `validate.py` を外部コマンドとして呼び出す統合(パスは環境依存のため設定可能に)か、最低限 SKILL.md に「チャート使用時は validate.py を実行する」手順を記載。

**受け入れ基準**: 生成 PPTX に対して OOXML 検証を1コマンドで実行でき、破損パターンが検出されたら CI/テストで落ちる。

<a id="b-12"></a>
### B-12: テーマカバレッジ拡大

**背景**: テーマ(`assets/src/schema/theme.ts`、約60キー)でカスタマイズできない配色が多い: lean-canvas / customer-journey / pattern-language / quote / steps の配色は各プラグインの `constants.ts` にハードコード、シンタックスハイライト配色も固定。また `mergeTheme` は全キー手書き列挙のため、テーマ項目を1つ増やすたびに interface / DEFAULT_THEME / merge の3箇所修正が必要で拡張コストが高い。

**実装方針**: (1) `mergeTheme` を汎用 deep-merge に置き換え(キー列挙の廃止)、(2) プラグインが自分のテーマセクションを登録できるフックを `LayoutPlugin` インターフェース(`assets/src/plugins/types.ts`)に追加、(3) ハイライト配色のテーマ化。

**受け入れ基準**: B-09 のプリセット YAML で全プラグインの配色が変わる。テーマ項目追加が1箇所の変更で済む。

<a id="b-13"></a>
### B-13: ページ番号・マスタースライド

**背景**: `slideNumber` / `defineSlideMaster` が未使用。全スライドが素の白紙に絶対座標で描画されるため、PowerPoint 上でレイアウトを一括変更する手段がなく、ページ番号・フッタも出ない。

**実装方針**: `defineSlideMaster` でタイトル用・コンテンツ用マスターを定義し、背景色・ページ番号・フッタをマスター側に移す。テーマからフッタテキスト・ページ番号の有無を制御。

**受け入れ基準**: 生成 PPTX にページ番号が入り、マスター編集で背景を一括変更できる。既存スナップショットへの影響を確認済み。

<a id="b-14"></a>
### B-14: ハイパーリンク対応

**背景**: `[text](url)` のマッチャがなく、`hyperlink` オプションも未使用。リンクは PPTX/HTML どちらにも出力されない。参考資料スライドで URL を活かせない。

**実装方針**: `inline-formatter.ts` に link パターンを追加し、`InlineTextRun` に `hyperlink` プロパティを追加。PPTX は `addText` の `hyperlink` オプション、HTML は `<a>` タグで出力。文字数カウントは表示テキストのみ対象。

**受け入れ基準**: `[Anthropic](https://anthropic.com)` がクリック可能なリンクとして両出力に現れる。

**✅ 実装済み**。想定より広く実装した:

- フィールド名は `hyperlink` ではなく `link`（`{kind:"external"|"internal"}` の判別共用体）。
  外部 URL だけでなく `[[slide-id]]` の内部リンクも同じ経路に載せたため。
- PPTX は外部が `hyperlink:{url}`、内部が `hyperlink:{slide:N}`（`ppaction://hlinksldjump`）。
  解決できない内部リンクはリンクを付けない。
- 文字数カウントは表示ラベルのみ。`validation.ts` が strip 正規表現を複製していたので
  `stripInlineFormatting` に一本化した。
- 副産物: スライド ID（B-14 の派生）と `--wiki` 出力（`renderer/wiki/`）。

**残っているスコープ外**: 下記 B-22。

<a id="b-22"></a>
### B-22: プラグイン内テキストのリンク対応

**背景**: リンクが効くのは `parseInlineFormatting` を通る箇所、すなわち `###` セクションの
見出し・本文と takeaway だけ。スライドタイトル、タイトルスライド、および11個のプラグインが
`layout.ts` で `text:` に直接書き出す箇所（table のセル、quote の本文、steps のラベル等）では
`[[…]]` が生の文字列として表示される。

**実装方針**: 各所の `text: X` を `richText: parseInlineFormatting(X)` に置き換える。
1行ずつの機械的な変更だが、PPTX/HTML のレンダ分岐が変わるため
`layout-engine.test.ts` のスナップショットと `snapshot-comparison.test.ts` の確認が要る。
`ShapeBox.text` は `richText` を持たないので、型の拡張が別途必要。

**受け入れ基準**: table のセルと quote の本文に書いた `[[slide-id]]` がリンクになる。

**一部対応済み**: agenda は対応した（目次スライドで `[[…]]` が生のまま出ると
索引としてまったく機能しないため）。残りは table / quote / steps / icon-layout /
numbered-list / pattern-language / customer-journey / text-only / lean-canvas。

<a id="b-15"></a>
### B-15: テスト補強

**背景**: 専用テストファイルがないプラグインが7つ(agenda / quote / text-only / steps / icon-layout / lean-canvas / numbered-list — 後3者は `layout-engine.test.ts` で座標のみ間接カバー、パーサ経路は未テスト)。`src/batch-html.ts`(825行超)と `assets/verify-fonts.ts`、`src/tools/inventory-diff.ts` は完全に未テスト。

**実装方針**: `__tests__/markdown-spec/` のゴールデン入力方式を踏襲し、各プラグインにトークン化 → AST → レイアウトの経路テストを追加。batch-html.ts は最低限の E2E(drafts → htmls + index 生成)。

**受け入れ基準**: 全12レイアウトタグにパーサ経路のテストがある。`npm test` のカバレッジで主要ソースに未テストファイルがない。

---

## P3 — 将来検討

<a id="b-16"></a>
### B-16: Mermaid 図対応

**背景**: `assets/README.md` TODO の残件。フローチャート・シーケンス図は技術プレゼンの頻出要素。PowerPoint にネイティブ形がないため画像化が許容されるケース(標準スキルも Sankey 等は画像可としている)。

**実装方針**: mermaid-cli で SVG/PNG 化して `addImage`(B-04 が前提)。HTML 側はクライアントサイドレンダリング可。

<a id="b-17"></a>
### B-17: .potx テンプレート駆動出力

**背景**: 標準スキルは企業テンプレートのマスター・テーマ・図版を継承して中身だけ差し替えられる(unpack → OOXML 編集 → pack、`add_slide.py` / `clean.py`)。業務利用では「会社テンプレに流し込む」需要が大きいが、md2pptx は素の白紙に絶対座標描画のみ。

**備考**: pptxgenjs の枠を超える(OOXML 直接操作が必要)ため設計インパクト大。B-13(マスタースライド)を先に済ませ、需要を見て判断。

<a id="b-18"></a>
### B-18: Good/Bad/Hat レイアウト・アイコン図解

**背景**: `assets/README.md` TODO の残件(「Good/Bad/Hat」「Google マテリアルアイコンで Mermaid みたいな図解」)。プラグイン機構(`plugins/index.ts` に1行追加)で追加可能。

<a id="b-19"></a>
### B-19: Markdown 拡張

**背景**: ネストリスト(`doc/Spec.md:233` も非対応と明記)、引用ブロック `> `、打ち消し線 `~~`、テーブルのアラインメント `:---:`、H5 以降などが非対応。B-02(1階層リスト)の後、需要に応じて拡張。

<a id="b-20"></a>
### B-20: スライド寸法・マージンのテーマ化

**背景**: `assets/src/constants.ts` に 16:9(10×5.625インチ)固定でハードコード。4:3 や A4 縦(ドキュメント風スライド)を出せない。レイアウト全ファイルが constants を参照するため影響範囲は広いが、テーマ経由で注入する設計に改めれば対応可能。

<a id="b-21"></a>
### B-21: HTML 出力の印刷/PDF 対応

**背景**: HTML テンプレート(`assets/src/renderer/html/template.ts`)に `@media print` がなく、ブラウザ印刷で1スライド1ページの PDF を作れない。PPTX を経由せず配布用 PDF を出せると用途が広がる。

<a id="b-23"></a>
### B-23: 記法そのものの整理（宣言で洗い出した候補）

**背景**: `ontology.yaml` に md の構造を書き起こしたことで、「宣言はできるが素直ではない」箇所が
輪郭を持った。今回は**記法を変えない**方針で宣言と検証だけを入れたので、以下は未着手のまま残る。
どれも既存デッキの書き換えを伴うため、まとめて1回で行うか、やらないかを決める必要がある。

- **デッキ frontmatter が無い**: 先頭の `---` がスライド区切りとして読まれるため、デッキ名・既定テーマ・
  サイトタイトルを md 自身に書けない（`--site-title` は CLI 引数でしか渡せない）。導入するなら
  「先頭の `---` は、直後が `key: value` なら frontmatter」という例外規則が要る
- **暗黙の位置依存**: Steps の本文は「1行目が役割名」、Quote の `###` は著者、Agenda のディレクティブ
  直後の行は副題。宣言で説明はできるが、`####` の名前付きラベルにするほうが読んで分かる
- **固定件数**: IconColumns / IconCards は3件ちょうど。2件以下だと黙って Default に落ち、4件目以降は
  捨てられる（B-07 と重なる）
- **日本語ディレクティブ**: `<!--カスタマージャーニー:-->` だけが日本語で、末尾のコロンにも意味が無い。
  英語 `<!--customer-journey-->` に寄せるなら旧綴りの受理期間が要る
- **語彙の日英混在**: lean-canvas は `課題` と `problem` の両方を受理するが、pattern-language の節名は
  日本語のみ。受理の広さが語彙ごとに違う

**受け入れ基準**: 変えるものを選び、`ontology.yaml` の宣言・`doc/` のデッキ・
`__tests__/markdown-spec/` の入力を同時に更新して、`--lint --strict` が通る。

### 併せて残っている「宣言はしたが読んでいない」箇所

オントロジー導入後の整理で、lean-canvas とカスタマージャーニーの語彙はコードから消して
`resolveTerm` 経由にした（宣言に別名を足せばその場で描画にも効く）。以下は残り:

> このメモは 2026-08-08 の調査で [B-28](#b-28)（読まれていない宣言の可視化）と
> [B-29](#b-29)（コア側の宣言駆動化）に引き継いだ。下の4点はその内訳として残す。

- **pattern-language の語彙**: 節名は `handler.ts` の約10箇所にリテラルで、`sub-labels` の
  照合も handler が自前で持つ。600行の状態機械の改修になるため繰り延べた。当面は
  `ontology.test.ts` が「宣言した節名がハンドラのソースに存在すること」を照合してドリフトを
  赤くする（内容の一致までは見ていない）
- **`detectLayout` の完全な宣言駆動化**: `lint.ts` の `CORE_PRECEDENCE` は
  `parser/slide-converter.ts` の順序を手で写している。宣言側に `directives[].pattern` と
  `kind: code-fence` があるので、行を宣言のパターンに当てれば表ごと消せる
  （`pluginId.split(":")[0]` も一緒に消える）
- **コアディレクティブの正規表現**: `tokenizer.ts` と `ontology.yaml` の両方にある。
  プラグインのぶんは `registerPlugin` が宣言から導出しているが、コアはまだ手書き
- **ビルダーへの診断チャネル**: lint がトークン列に対する2つ目のパーサになっている
  （`lint.ts` 冒頭のコメント参照）。ビルダーが「いま落とした」と報告できれば、
  入れ子モデルの写しが要らなくなる

---

## オントロジー観点のレビューと動作確認（2026-08-08）

`ontology.yaml` 導入後のスキルを、(1) 宣言と実装のズレ、(2) 実際に動かしての破損、の2観点で
点検した結果。B-01〜B-23 が「標準スキルとの機能差」を見ていたのに対し、こちらは
**「宣言したことが本当に効いているか」**と**「検証機構そのものが動いているか」**を見ている。

### 動作確認の実測（`cd assets && npm install` 後）

| 確認 | 結果 |
|---|---|
| `npm test` | ✅ 22 files / 444 tests |
| `npx tsx src/ontology/selfcheck.ts` | ✅ レイアウト 16 / 注釈 3 / 語彙 3 / プラグイン 11 — 整合 |
| `npx tsx src/tools/gen-ontology-doc.ts --check` | ✅ ドリフト無し |
| `--lint --strict`（`doc/Spec.md` / `doc/wiki` / `__tests__/markdown-spec/` 全件） | ✅ 全通過 |
| 全 20 デッキの PPTX / HTML 生成 | ✅ 全成功 |
| `--verify`（3者比較） | ❌ 20 デッキ中 14 デッキで大量の偽陽性。常に exit 0 → [B-24](#b-24) で修復済み |
| `npx tsc --noEmit` | ❌ 8 件のエラー。うち1件は実行時に落ちる → [B-25](#b-25)（B-24 で4件消化、残り4件） |

**緑のものが緑なのは本物**（selfcheck・gen --check・lint はいずれも宣言と実装を実際に突き合わせて
いる）。問題は、緑のチェックが**見ていない範囲**が広いことと、赤いはずのものが赤くならないこと。

---

<a id="b-24"></a>
### B-24: `--verify` の3者比較が壊れている

**背景**: 「AST/HTML/PPTX の3者比較」はこのスキルの品質保証の看板（このファイルの冒頭にも
優位点として書いてある）だが、**AST の脚が実質機能していない**。

- `src/tools/inventory.ts` は `iconBoxes` を `icon-N`、`codeBoxes` を `code-N` というキーで出す
  （`inventory.ts:130,138`）。一方 `pptx-inspector.ts:173` と `html-inspector.ts:279` は
  `shape-N` の連番。キー空間が違うので、アイコンやコードを含むスライドでは全項目がずれる
- `borderBoxes` / `shapeBoxes` は inventory に入らない（`layoutResultToSlideInventory` が
  `textBoxes` / `iconBoxes` / `codeBoxes` しか見ていない）
- `alignment` は TitleSlide にしか付かない（`inventory.ts:51`）ので、中央寄せするプラグインは
  全て `expected undefined, got CENTER` になる
- `cli.ts` の verify 分岐は結果を表示して `return` するだけで、mismatch を exit code に
  反映しない（`cli.ts:236` 付近）

実測（`__tests__/markdown-spec/` + `doc/`、20 デッキ）: `7-steps` で 298 mismatch、
`10-numbered-list` で `0 shapes match, 102 mismatches`、`Spec.md` で 400 mismatch。
一方 **PPTX vs HTML はほぼ全デッキで完全一致** — つまり実際に効いているのは2者比較だけ。

`snapshot-comparison.test.ts` が緑のままなのは、このテストがコアレイアウト6種
（title-only / default-layout / left-right / grid-2x2 / inline-formatting / bullet-list）の
インライン markdown しか流しておらず、アイコン・コード・プラグインを1つも通していないため。

**実装方針**: inventory 側をインスペクタのキー付け（描画順の `shape-N` 連番）に合わせ、
`borderBoxes` / `shapeBoxes` も含める。`align` は `TextBox.align`（`layout/types.ts:40`）を
そのまま反映する。`--verify` は mismatch があれば非ゼロ終了にする。

**受け入れ基準**: `__tests__/markdown-spec/` 全件で3脚が一致する。同じ入力集合を回すテストを
追加し、キーのずれが再発したら赤くなる。

**✅ 実装済み（2026-08-08）**。方針は上と違う道を採った。

インベントリをインスペクタの**描画順の連番に合わせる**と、アクセントバー・コード背景・
テキストオーバーレイという「1ボックス → 複数図形」の展開規則をインベントリ側に写すことになる。
写経はまた必ずずれる — B-24 が生まれたのと同じ機構をもう一度作る。そこで逆にした:

- **レンダラがキーを宣言し、インスペクタは数えずに読む。** 語彙は `src/shape-keys.ts` の1本で、
  PPTX は pptxgenjs の `objectName`（→ `<p:cNvPr name>`）、HTML は `data-shape-id` に
  同じ文字列を書く。`pptx-inspector` は `<p:sp>` を数える代わりにこの名前を読む
- **比較対象は「テキストを運ぶ図形」。** 境界ボックス・塗り・コード背景・SVG アイコンは
  `deco:` を付けて除外する。これは両インスペクタの既存の実挙動でもあった
  （テキストの無い図形は元から拾えない）。違ったのは AST の脚だけ。
  除外が生成物の中に書かれている状態にして、拡大（B-33）を安くした
- `--verify` は mismatch があれば**非ゼロ終了**。判定は `src/tools/verify.ts` に切り出して、
  「食い違いを失敗と呼ぶ」こと自体をテストできるようにした

**併せて見つけて直した実バグ**（比較を直したから見えた。どれも PowerPoint 上の実害がある）:

- 絵文字アイコンの `addText` に `fontFace` が無く、テーマ既定の Calibri Light で
  描かれていた（デッキの他の文字と別フォント）
- 改行を含む run を pptxgenjs にそのまま渡すと、STEP 4-C が**共有の options** に
  `breakLine` を立ててから全断片を push するため、最後の断片にも改行が付いて
  後続の run が1行余計に下がる（リンクだけ次行に落ちる）
- **末尾が改行の文字列は pptxgenjs がまったく分割しない**（`match(/\n$/g) === null` ガード）。
  生の改行を含む1つの `<a:p>` になっていた
- `pptx-inspector` の `extractText` が実体参照をデコードしておらず、`=>` を含むコードが
  `=&gt;` として読み出されていた。両インスペクタで `tools/entities.ts` を共有した
- `html-inspector` の `font_name` が `"Arial"` のリテラル。DEFAULT_THEME と偶然一致して
  いただけで、`--theme` を使うと PPTX 側とだけ食い違う。`data-font-name` を読むようにした
- コードテキストの座標が `padding` ぶん内側にずれていた（HTML は外枠を報告）。
  座標から引くのをやめて pptxgenjs の `margin` に移した — 見た目は同じ

**実測（修復後）**: `__tests__/markdown-spec/` 20件 + `doc/Spec.md` + `doc/wiki/` の
**全22デッキで3脚とも mismatch 0**。`10-numbered-list` は `0 shapes match, 102 mismatches`
から全一致、`Spec.md` は 400 件から 0 件になった。
`__tests__/three-way-verify.test.ts` が全デッキ + 非既定テーマ + 判定そのものを見る（25件、0.7秒）。
`npm test` は 22 files / 444 tests → 23 files / 471 tests。

**副産物**: `src/tools/index.ts` の壊れた再輸出（存在しない `inspectHtml`）も直した。
このバレルは CLAUDE.md が検証ユーティリティの入口として案内している当のもので、
import するだけで実行時に throw していた。B-25 の8件のうち4件（これと
`html-inspector` の `fontSize`/`font_size` 3件）が消え、残り4件は `schema/theme.ts`。

<a id="b-25"></a>
### B-25: 型検査が CI にもテストにも無い

**背景**: `npx tsc --noEmit` が 8 件のエラーで落ちる。vitest は esbuild で型を捨てるので
`npm test` では検出できず、`package.json` に typecheck スクリプトも無い。

最も重いのは **`src/tools/index.ts:3` が存在しない `inspectHtml` を再輸出している**点。
実体は `extractInventoryFromHtml`（`html-inspector.ts:266`）で、このバレルを import すると
型エラーではなく**実行時に throw する**:

```
BROKEN: The requested module './html-inspector.js' does not provide an export named 'inspectHtml'
```

CLAUDE.md は `src/tools/` を「検証ユーティリティ」の入口として紹介しているので、
書かれたとおりに使うと落ちる。テストも `cli.ts` も個別ファイルを直接 import しているため、
誰もこのバレルを踏んでおらず気付かれていない。

残り7件:
- `tools/html-inspector.ts:133,148,180` — `fontSize` と `font_size` の取り違え。
  `parseParagraphStyle` が `Partial<ParagraphData>` を返すと宣言しているが `fontSize` を詰めている
- `schema/theme.ts:210,214,236` — 配列テーマ値のマージが `(string｜undefined)[]` になる
- `renderer/pptx/slide-builder.ts:308` — `box.text` が undefined のまま `addText` に渡りうる

**併せて**: CI（`.github/workflows/pages.yml`）のトリガは `main` への push と手動実行だけで、
**PR ではテストが一度も走らない**。`gen-ontology-doc --check` と `selfcheck` も
`package.json` のスクリプトに無く、`ontology.test.ts` 経由でしか実行されない。

**実装方針**: `npm run typecheck`（`tsc --noEmit`）を足して8件を潰し、CI に PR トリガと
typecheck ステップを追加する。

**一部消化（B-24 の作業中）**: `src/tools/index.ts` の壊れた再輸出と、
`tools/html-inspector.ts:133,148,180` の `fontSize`/`font_size` 取り違え（`parseParagraphStyle` が
`Partial<ParagraphData>` を返すと宣言していたのをやめ、専用の `ParagraphStyle` 型にした）、
`renderer/pptx/slide-builder.ts` の `box.text` が undefined のまま渡りうる箇所を直した。
**残り4件は `schema/theme.ts:210,214,236` の配列マージのみ。** typecheck スクリプトと
CI トリガはまだ無い。`__tests__` は tsconfig の `exclude` にあるので、テスト側も
見るなら別 tsconfig が要る。

**受け入れ基準**: `npm run typecheck` が緑。PR で test + typecheck が走る。
`import("./src/tools/index.js")` が throw しない。

---

<a id="b-26"></a>
### B-26: 文字数の数え方が宣言に反する

**背景**: `ontology.yaml:762` の `limits.counts` は
「本文と見出し（Markdown 構文を除く）。**リンクは表示ラベルだけを数え、URL は数えない**」と宣言する。
正本の `countPlainTextChars`（`schema/validation.ts:11`）はそのとおり `stripInlineFormatting` を
通し、リスト記号も落とす。

ところが同名の関数が **5つのプラグインにコピーされている** —
`plugins/{steps,lean-canvas,icon-layout,numbered-list,agenda}/index.ts` の各 `index.ts` 冒頭。
いずれも `stripInlineFormatting` もリスト記号除去も持たない弱い版で、`#`・`<!--…-->`・
空行しか落とさない。結果、**URL とリスト記号がそのまま文字数に入る**。

再現（同一の本文、リンク1本、URL は 1200 文字強）:

| 入力 | 結果 |
|---|---|
| `### 見出し` + `[ラベル](長いURL)`（Default） | ✅ 生成成功 |
| `<!--lean-canvas-->` + `### 課題` + 同じ本文 | ❌ `ValidationError` `charCount: 1230` |

宣言では両者とも「ラベル3文字」のはずで、レイアウトを変えただけで通らなくなるのは
オントロジーが約束していない挙動。

**実装方針**: `registry.getCharCounter` がプラグインから受け取るのは「どのフィールドを数えるか」
だけにして、正規化は `validation.ts` の `countPlainTextChars` 1本に寄せる。
プラグイン側の5コピーを削除する。

**受け入れ基準**: 同じ本文は、レイアウトの `max-chars` が同じなら同じ文字数になる。
上の URL ケースを回帰テストにする。

<a id="b-27"></a>
### B-27: lint の盲点（タイトルスライド・`slot.body`）

**背景**: lint がトークン層を見ているのは「消えたブロックは AST に痕跡を残さない」から
（`lint.ts` 冒頭）。その設計意図に対して、**黙って消える2つの経路が検査されていない**。

1. **タイトルスライドを一切検査しない**。`detectLayout` は `##` を持たないトークン列に
   `undefined` を返し（`lint.ts:100`）、`lintTokens` はそこで `continue` する（`lint.ts:292`）。
   実測: タイトルスライドに書いた `### 未宣言の見出し` + 本文は出力から消えるが
   `--lint --strict` は「✅ 宣言に沿っている」を返す。宣言側は
   `annotations[].applies-to` に骨格要素を持っているのに、lint は `layouts[].annotations` しか
   参照していないので、この情報が使われていない
2. **`slots[].body` の `free｜lines｜bullets-only｜none` が未強制**。
   `gen-ontology-doc.ts:186` が文書に印字するだけで、誰も照合しない。
   実測: カスタマージャーニーの `#### タッチ` 直下に非箇条書きの行を書くと
   `customer-journey/handler.ts:135` の `if (!token.text.startsWith('-')) return` で捨てられ、
   HTML にも PPTX にも現れないが `--lint --strict` は緑

**実装方針**: (1) `detectLayout` が undefined を返す断片にも、TitleSlide 用の宣言
（`elements.title-slide`）を当てて注釈スコープと未宣言 `###` を見る。
(2) `slot.body` を lint の検査項目に加える（`bullets-only` の slot 配下で `- ` 以外の
BodyText を warning）。

**受け入れ基準**: 上の2ケースが `--lint` で警告になる。既存デッキが引き続き
`--lint --strict` を通る（通らないものが出たらデッキ側の実バグ）。

<a id="b-28"></a>
### B-28: 宣言の「誰が読むか」が宣言に無い

**背景**: `ontology.yaml` は自らを正本と宣言し、CLAUDE.md も「コードに語彙や数値を再定義しない」と
書いている。だが実際に実装を駆動しているのは4つだけ:

1. プラグインのディレクティブ認識（`registry.ts` が `directiveForPlugin` から導出）
2. 文字数上限（`validation.ts` の `maxCharsForTag` / `isCharCountExcluded`）
3. `lean-canvas-blocks` と `journey-rows` の2語彙（`resolveTerm` 経由）
4. lint（`lint.ts` が layouts / vocabularies / field-sets / cardinality を読む）

**宣言のみで誰も読まないもの**: `elements` 全体、`annotations[].pattern｜applies-to｜cardinality｜position｜example`、
`layouts[].directives[].pattern` と `kind: code-fence`、`slots[].body`、
`field-sets[].keys[].kind｜separator`、`inline`（`counts-chars` を含む）、
`vocabularies.pattern-sections`。

どれが規範でどれが解説かが宣言自身に書かれていないので、読み手（Claude を含む）は全部を
規範として読む。B-26 / B-27 はどちらもこの構造から出た具体例。

さらに `selfcheck` の `CONSUMED_KEYS`（`gen-ontology-doc.ts:291-300`）は**トップレベル名しか
見ていない**。「黙って文書化されない宣言は出してはいけない」という当のコメントを持ちながら、
サブキーの未消費は緑のまま通る — 仕組みが防ごうとした失敗が、一段下で起きている。

**実装方針**: 各フィールドに `enforced-by:` 相当の印を持たせるか、`selfcheck` に
「宣言されているが誰も読まないフィールド」の一覧をサブキーまで降りて出させる。
前者は宣言が重くなるので、まず後者（可視化）から。

**受け入れ基準**: `selfcheck` の出力から、宣言の各項目が「実装を駆動する / 文書のみ」の
どちらかに分類できる。新しいサブキーを足して誰も読まなければ、その一覧に載る。

<a id="b-29"></a>
### B-29: コア側の宣言駆動化

**背景**: B-23 末尾のメモの具体化。プラグイン側は宣言駆動になったが、コア側は手書きのままで、
しかも selfcheck がコアを見ていない。

- **コアディレクティブの正規表現が二重管理**。`parser/tokenizer.ts` の
  `matchLeftDirective`〜`matchTakeawayMarker`（8本、`tokenizer.ts:42,54,66,78,90,103,117,129`）と
  `ontology.yaml:73,83,91,141,143,168,170,195` の `pattern:` が同じものを別々に持つ。
  `selfcheck.ts:64-70` はパターンが**コンパイルできるか**しか見ていないので、
  どちらかを変えても赤くならない
- **selfcheck がコアレイアウトを飛ばす**。`selfcheck.ts:216` の `if (!layout.plugin) continue` により、
  `Default` / `LeftRight` / `TopBottom` / `Grid` / `CodeDisplay` の5つと、`produces` 側の
  `PatternLanguageDetail` は、**実クラスの `_tag` と一度も照合されていない**。
  「宣言 ⇔ 実装を両方向で突き合わせる」と謳っているのはプラグインの11個だけ
- **レイアウト優先順位が4箇所**。正は `parser/slide-converter.ts`、写しが
  `lint.ts` の `CORE_PRECEDENCE`、`renderer/layout/index.ts` のディスパッチ、
  `schema/validation.ts` の文字数分岐
- **`numbered-list` の `bar` 綴りにテストが無い**。`ontology.test.ts` は
  `directives[0]`（= `circle`）だけをトークン化する。`index.ts` の
  `circle|bar` 正規表現から `bar` を落としても緑のまま

**受け入れ基準**: コアディレクティブが宣言のパターンから導出される（または両者の一致がテストで
留まる）。selfcheck がコアレイアウトの `name` と `produces` を実クラスの `_tag` と照合する。

---

<a id="b-30"></a>
### B-30: 層ごとに名前が違う同一概念

**背景**: `ontology.yaml` は冒頭に用語体系（`element` / `annotation` / `layout` / `slot` /
`vocabulary` / `field-set` / `inline`）を置いているが、実装の識別子には効いていない。

- **同じものが4つの名前を持つ**: 宣言の `Slot` → parser の `RawSection`
  （`parser/builder-types.ts`）→ schema の `TextBlock`（`schema/presentation.ts`）→
  layout の `TextBox`（`renderer/layout/types.ts`）。変換点は `parser/slide-converter.ts` の
  `toTextBlocks`
- **`element` が2つの意味を持つ**: 宣言では骨格要素（`#` / `##` / `###`）、
  `renderer/html/element-renderers.ts` ではレンダラのボックス
- **`layout` が5つの意味を持つ**: `SlideLayout`（検証済みデータ）/ `LayoutMode`（パーサの状態）/
  各プラグインの `layout.ts`（座標計算）/ `LayoutResult`（幾何）/ 宣言の `Layout`（宣言レコード）

オントロジーの目的が「同じものを同じ名前で呼ぶ」ことなら、宣言の語彙が実装の識別子に届いて
いないのは中心的な未達。

**実装方針**: まず宣言側に「宣言の語 ⇔ 各層の型名」の対応表を持たせ、`gen-ontology-doc.ts` に
出させる（読む側の混乱がまず消える）。改名は影響が広いので段階的に、`element` の衝突など
実害の大きいものから。

**受け入れ基準**: `ontology.md` に層をまたぐ対応表がある。少なくとも `element` の二義が解消する。

<a id="b-31"></a>
### B-31: `LayoutPlugin` に足りないモデル

**背景**: プラグイン機構が表現できない事情が、特例フォールバックとハックとして散っている。

- **1プラグイン = 1タグの前提**。`pattern-language` は `PatternLanguageOverview` と
  `PatternLanguageDetail` の2タグを出すのに `layoutTag` は1つしか持てず、
  `registry.ts` の `getCharCounter` と `ontology/index.ts` の `getLayoutByTag` に
  `produces` 経由の特例フォールバックが2本ある（後者のコメントに、これが無かったとき
  Detail に 1024 ではなく 1000 が適用されていたと記録されている）。
  `LayoutPlugin` に `producesTags` を持たせれば両方消える
- **`titleFontSize: 1` が「タイトルを描かない」の代用**。`agenda/index.ts` と
  `pattern-language/index.ts` が 1pt フォントで隠している。`showTitle: false` としてモデル化すべき
- **ファイル構成が守られていない**。`customer-journey` と `text-only` は `constants.ts` を持たず、
  `customer-journey/layout.ts` は `PRIMARY_COLOR = "0891B2"` をハードコードしている。
  この色は `schema/theme.ts` の `iconCardAccentColors` にもある同じ値で、テーマを変えても追随しない
  （B-12 のテーマカバレッジと重なる）

**受け入れ基準**: `registry.ts` と `ontology/index.ts` から `produces` の特例分岐が消える。
`titleFontSize: 1` が無くなる。

<a id="b-32"></a>
### B-32: 存在しない保証を主張しているコメント・数え上げ

**背景**: B-01 で「乖離しうる事実の置き場を1つにした」が、**保証の所在についての記述**が
乖離している。これは普通のドキュメント誤りより悪い — 読んだ人が「守られている」と信じて
チェックを足さなくなる。

- `plugins/lean-canvas/layout.ts` の `findCellIndex` のコメントが
  「その `key` は上の `LEAN_CANVAS_CELLS` の `name` と対応する（**selfcheck が両者を突き合わせる**）」
  と書くが、**`selfcheck.ts` は lean-canvas を import していない**。実際に守っているのは
  `ontology.test.ts` の描画テスト。書き換えるべきは保証の名前
- `SKILL.md:24` と `CLAUDE.md:14` の「**16レイアウト**」は生成領域の外の手書き。
  `docs-consistency.test.ts` が見ているのは `10ディレクトリ` / `11プラグイン登録` だけで、
  この2文は無防備。17個目を足した瞬間に両方が黙って嘘になる。
  CLAUDE.md 自身が「そちらにある内容をここへ写さない（写した瞬間、四重管理とドリフトが始まる）」と
  書いている、その直後の行で写している

**実装方針**: コメントを実際のガード（`ontology.test.ts`）の名前に直すか、selfcheck に
本当に照合を足す（B-29 のコアレイアウト照合と同じ作業になる）。
レイアウト件数は `gen-ontology-doc.ts` の生成領域に入れるか、`docs-consistency.test.ts` で
宣言の件数と突き合わせる。

**受け入れ基準**: コードコメントが主張する保証が全て実在する。レイアウト件数を1つ増やすと
テストが赤くなる。

<a id="b-33"></a>
### B-33: 3者比較が見ていない残り

**背景**: [B-24](#b-24) で3脚を揃えたが、意図的に対象外にした範囲と、直さずに
コメントで明示した弱点が残る。「何を保証していないか」を項目として持っておく
（B-32 と同じ理由 — 書いていない除外は「守られている」と読まれる）。

- **幾何のみの図形が比較対象外**。境界ボックス・塗り・コード背景・SVG アイコンは
  `deco:` で除外している。`inventory-diff.ts` の語彙がテキスト前提（`text` /
  `font_name` / `font_size` / `bold` / `color`）なので、幾何だけの脚を足すには
  両インスペクタが「テキストの無い `<p:sp>` / `<p:pic>` / div」を拾えるようにする必要がある。
  名前は既に両生成物に書かれているので、緩めるのはフィルタだけ
- **`slide-builder.ts` は codeBoxes があると borderBoxes を丸ごと描かない**。
  HTML は常に描く。実在する PPTX/HTML の乖離だが `deco:` なので現在の比較には出ない
- **`pptx-inspector.ts` は段落の最初の `<a:rPr>` しか読まない**。同一段落内で書式が
  変わるデッキ（太字の途中挿入など）では2番目以降の run の書式を取りこぼす。
  インベントリ側も「行の先頭 run」で揃えてあるので現状は一致するが、
  両方が同じ弱点を持っているだけで、真に一致を検証しているわけではない

**受け入れ基準**: 上の3点それぞれについて、直すか「直さない理由」を持つ。
少なくとも幾何のみの図形が比較に入る。
