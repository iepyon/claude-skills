# md2pptx 機能バックログ

Claude が標準の document-skills:pptx スキル(pptxgenjs スクリプト書き下ろし + 目視修正ループ)で生成するプレゼンテーションと同等の品質を、**決定論的な Markdown → PPTX パイプライン**として実現するためのバックログ。

- 調査日: 2026-08-07
- 比較対象: `~/.claude/plugins/cache/anthropic-agent-skills/document-skills/*/skills/pptx/`(version b29e7cf65e5c)
- md2pptx が既に優位な点: 決定論的再現性、レビュー可能な中間表現(Markdown)、AST/HTML/PPTX の3者比較検証(`src/tools/inventory-diff.ts`)、グラデーション表現

## 一覧

| ID | 優先度 | 項目 | カテゴリ |
|---|---|---|---|
| [B-01](#b-01) | ✅済 | ドキュメント乖離の解消 | ツール品質 |
| [B-02](#b-02) | P0 | 箇条書きリスト対応(1階層) | Markdown基本 |
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
