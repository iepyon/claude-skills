import { CodeTextRun } from "../syntax-highlighter.js"

// --- Box types (output primitives) ---

// インラインリンク。external は URL、internal はサイト内の別スライドを指す。
// 解決はレンダラ側の責務（HTML は #<slide>、PPTX は hyperlink:{slide:N}、
// Wiki はリンクグラフ経由）。
//
// **internal が ref と slide の2つを持つ理由。** 3脚は違う粒度で索引を作っている:
// Wiki はサイト全体を束ねるので `deck/slide` で引くが、単体 HTML
// (`html/template.ts` の slideIndexByKey) と PPTX (`pptx/index.ts` の
// slideNumberById) は1ファイルしか知らないので**ローカルの ID** で引く。
// 1本の文字列に畳むと、どちらかが黙って解決できなくなる
// （Wiki だけ動いて単体 HTML と PPTX のリンクが死ぬ、という気づきにくい壊れ方をする）。
export type InlineLink =
  | { kind: "external"; href: string }
  | {
      kind: "internal"
      /** サイト全体で一意な参照。`resolveRef` が引く鍵 */
      ref: string
      /** デッキ内のスライド ID。省略時はデッキ先頭を指す */
      slide?: string
      /** 原文の綴り。診断（未解決リンクの一覧）で書き手に見せる */
      href: string
    }

export interface InlineTextRun {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
  link?: InlineLink
  /**
   * run 単位のフォントサイズ（pt）。省略時はボックスの fontSize。
   * KPI の「数字は大きく単位は小さく」が使う。
   *
   * 3者比較の段落の font_size は**先頭 run** から採る（PPTX インスペクタが段落の
   * 最初の `<a:rPr sz>` しか読めないため）。inventory.ts / element-renderers.ts の
   * paraDataAttrs / pptx の run 変換の3箇所が同じ規則を見る — 共有した規則は
   * 比較では守れないので、dashboard.test.ts が明示的に留めている。
   */
  fontSize?: number
}

// 段落。bullet があれば箇条書き項目として描画される。
// PPTX はネイティブ bullet、HTML は CSS 生成コンテンツで記号を出すため、
// runs のテキストにリテラルの記号を含めてはならない（二重表示になる）。
export interface Paragraph {
  runs: InlineTextRun[]
  bullet?: { type: "bullet" } | { type: "number"; startAt?: number }
}

export interface TextBox {
  x: number
  y: number
  w: number
  h: number
  text?: string                    // シンプルテキスト（既存・後方互換用）
  richText?: InlineTextRun[]       // リッチテキスト（単一段落）
  paragraphs?: Paragraph[]         // 複数段落（箇条書きを含む）
  isBold?: boolean
  isItalic?: boolean
  fontSize?: number
  color?: string
  align?: "center" | "left"
  valign?: "top" | "middle" | "bottom"
  lineHeight?: number
  fontFace?: string
}

export interface BorderBox {
  x: number
  y: number
  w: number
  h: number
  fillColor?: string // 背景色（16進数、例: "0891B2"）
  accentColor?: string // カード上部のアクセントバー色
  borderWidth?: number // ボーダー幅（px）— 未指定時はテーマ値
  borderColor?: string // ボーダー色（16進数）— 未指定時はテーマ値
  borderRadius?: number // 角丸の半径（インチ）— 未指定時はレンダラデフォルト
}

export interface IconBox {
  x: number
  y: number
  w: number
  h: number
  icon: string
  color?: string
  fontSize?: number
}

export interface CodeBox {
  x: number
  y: number
  w: number
  h: number
  language: string
  code: string
  textRuns: CodeTextRun[]
  backgroundColor: string
  fontFace: string
  fontSize: number
  lineHeight: number
}

export interface ShapeBox {
  x: number
  y: number
  w: number
  h: number
  shapeType: "ellipse" | "rect" | "line" | "svg"
  fillColor?: string
  text?: string
  textColor?: string
  fontSize?: number
  isBold?: boolean
  rectRadius?: number
  lineWidth?: number   // Line thickness in pt (used by "line" shapeType)
  lineColor?: string   // Line color hex (used by "line" shapeType)
  borderColor?: string // Border color hex (for rect/ellipse outline)
  borderWidth?: number // Border width in pt (for rect/ellipse outline)
  svgContent?: string  // SVG markup for "svg" shapeType
}

// --- Composite result ---

export interface LayoutResult {
  textBoxes: TextBox[]
  borderBoxes?: BorderBox[]
  iconBoxes?: IconBox[]
  codeBoxes?: CodeBox[]
  shapeBoxes?: ShapeBox[]
}

// --- Internal context types ---

// Section rendering context — passed to buildSectionBoxes
export interface SectionContext {
  readonly baseX: number
  readonly baseY: number
  readonly contentWidth: number
  readonly padding: number
  readonly theme: import("../../schema/index.js").Theme
  readonly headingBodyGap?: number // Optional gap between heading and body (defaults to HEADING_BODY_GAP)
  readonly headingHeight?: number // Optional heading height (defaults to HEADING_HEIGHT)
  readonly bodyHeight?: number // Optional body height (defaults to BODY_HEIGHT)
  readonly sectionGap?: number // Optional gap between sections (defaults to SECTION_GAP)
  readonly availableHeight?: number // Optional total container height for dynamic body sizing
  /**
   * 文字サイズの上書き。既定は `theme.contentSlide.{heading,body}Size`。
   *
   * 渡す側が「テーマのどこから採るか」を決められるようにするための口で、
   * `dispatchLayout` の段階的な縮小を受けないサイズ（`theme.wikiPattern` など）を
   * 使いたいレイアウトが指定する。**片方だけ渡してはいけない** — 高さの見積もりと
   * 実際の描画が別のサイズを見ると、文字は揃うのにボックスの高さだけがずれる。
   */
  readonly headingSize?: number
  readonly bodySize?: number
}

// Result of building section boxes
export interface SectionBoxResult {
  readonly textBoxes: TextBox[]
  readonly finalY: number
}

// --- Dimension calculation types ---

// Dimension configuration for grid layouts
export interface GridDimensions {
  readonly cellWidth: number
  readonly cellHeight: number
}

// Grid spacing configuration scaled by grid density
export interface GridSpacing {
  readonly headingSize: number
  readonly bodySize: number
  readonly headingHeight: number
  readonly headingBodyGap: number
  readonly bodyHeight: number
  readonly padding: number
}

// Column configuration for left-right layouts
export interface ColumnDimensions {
  readonly leftWidth: number
  readonly rightWidth: number
  readonly rightX: number
  readonly availableHeight: number
}

// Row configuration for top-bottom layouts
export interface RowDimensions {
  readonly topHeight: number
  readonly bottomHeight: number
  readonly bottomY: number
  readonly availableWidth: number
}

// LeanCanvas cell specification
export interface LeanCanvasCellSpec {
  readonly name: string
  readonly colStart: number // 0-indexed
  readonly colSpan: number
  readonly rowStart: number // 0-indexed
  readonly rowSpan: number
}

// LeanCanvas dimensions
export interface LeanCanvasDimensions {
  readonly colWidth: number
  readonly rowHeights: readonly [number, number, number]
}
