import { CodeTextRun } from "../syntax-highlighter.js"

// --- Box types (output primitives) ---

export interface InlineTextRun {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
}

export interface TextBox {
  x: number
  y: number
  w: number
  h: number
  text?: string                    // シンプルテキスト（既存・後方互換用）
  richText?: InlineTextRun[]       // リッチテキスト（新規）
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
  readonly availableHeight?: number // Optional total container height for dynamic body sizing
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
