---
name: md2pptx
description: Markdown to PowerPoint/HTML slide generator with layout plugins. Converts structured Markdown into presentation slides (.pptx, .html) using a pipeline of parse → validate → layout → render. Supports 12+ layout types including grid, icon columns, steps, tables, quotes, agenda, lean canvas, and customer journey. Use when creating presentations, generating PPTX files, generating HTML slides, formatting markdown as slides, converting markdown to slides, or when the user wants to format content for presentation output.
---

# md2pptx

Markdown → AST → PPTX/HTML 変換スキル。共通レイアウトエンジンで座標を計算し、PPTX と HTML 両方に出力する。

## Quick Start

```bash
cd <skill-path>/assets
npm install                                       # 初回のみ
npx tsx src/cli.ts input.md output.pptx           # PPTX 生成
npx tsx src/cli.ts input.md output.html --html    # HTML 生成
npx tsx src/cli.ts input.md out.html --html --verify  # 3者比較検証
```

### CLI Options

| Option | Description |
|--------|-------------|
| `--html` | HTML 出力 |
| `--compress`, `-c` | PPTX を ZIP 圧縮 |
| `--theme <path>`, `-t <path>` | YAML テーマファイル指定 |
| `--verify` | PPTX + HTML 生成 + AST との3者比較 |

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
- 各スライド全体で **240文字以内**（Markdown 構文を除く）

### レイアウト一覧

| レイアウト | ディレクティブ | 説明 |
|-----------|--------------|------|
| Default | (なし) | セクションを縦に並べる |
| LeftRight | `<!--left:N-->` `<!--right:M-->` | 左右分割（比率指定） |
| TopBottom | `<!--top:N-->` `<!--bottom:M-->` | 上下分割（比率指定） |
| Grid | `<!--grid:RxC-->` | R行×C列のグリッド |
| IconColumns | `<!--icon-cols-->` | アイコン付き3カラム |
| IconCards | `<!--icon-cards-->` | アイコン付きカード |
| Steps | `<!--steps-->` | 階段状のステップ表示 |
| NumberedList | `<!--numbered-list:circle-->` or `<!--numbered-list:bar-->` | 番号付きリスト |
| CodeDisplay | ` ```language ` | シンタックスハイライト付きコード |
| TextOnly | `<!--text-only-->` | 自由形式テキスト |
| Table | `<!--table-->` + パイプ区切りテーブル | テーブル表示 |
| Quote | `<!--quote-->` | 引用・名言スライド |
| Agenda | `<!--agenda-->` | TOC/アジェンダ |
| LeanCanvas | `<!--lean-canvas-->` | リーンキャンバス |
| CustomerJourney | `<!--カスタマージャーニー:-->` | カスタマージャーニーマップ |

### Takeaway

任意のレイアウトの末尾に `<!--takeaway-->` で出典・まとめを追加可能。

### アイコン指定

`<!--icon:mi:icon_name-->` (Material Icons) または `<!--icon:🔥-->` (絵文字)

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
