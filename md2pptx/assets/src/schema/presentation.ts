// TextBlock: 見出し + 本文
export class TextBlock {
  readonly heading?: string
  readonly body?: string
  constructor(props: { heading?: string; body?: string }) {
    this.heading = props.heading
    this.body = props.body
  }
}

// --- SlideLayout base interface ---
export interface SlideLayout {
  readonly _tag: string
}

// DefaultLayout: セクションを縦に並べる
export class DefaultLayout implements SlideLayout {
  readonly _tag = "Default" as const
  readonly sections: readonly TextBlock[]
  readonly takeaway?: string
  constructor(props: { sections: readonly TextBlock[]; takeaway?: string }) {
    this.sections = props.sections
    this.takeaway = props.takeaway
  }
}

// LeftRightLayout: 左右分割
export class LeftRightLayout implements SlideLayout {
  readonly _tag = "LeftRight" as const
  readonly leftRatio: number
  readonly rightRatio: number
  readonly leftSections: readonly TextBlock[]
  readonly rightSections: readonly TextBlock[]
  readonly takeaway?: string
  constructor(props: {
    leftRatio: number
    rightRatio: number
    leftSections: readonly TextBlock[]
    rightSections: readonly TextBlock[]
    takeaway?: string
  }) {
    this.leftRatio = props.leftRatio
    this.rightRatio = props.rightRatio
    this.leftSections = props.leftSections
    this.rightSections = props.rightSections
    this.takeaway = props.takeaway
  }
}

// TopBottomLayout: 上下分割
export class TopBottomLayout implements SlideLayout {
  readonly _tag = "TopBottom" as const
  readonly topRatio: number
  readonly bottomRatio: number
  readonly topSections: readonly TextBlock[]
  readonly bottomSections: readonly TextBlock[]
  readonly takeaway?: string
  constructor(props: {
    topRatio: number
    bottomRatio: number
    topSections: readonly TextBlock[]
    bottomSections: readonly TextBlock[]
    takeaway?: string
  }) {
    this.topRatio = props.topRatio
    this.bottomRatio = props.bottomRatio
    this.topSections = props.topSections
    this.bottomSections = props.bottomSections
    this.takeaway = props.takeaway
  }
}

// GridLayout: rows × cols グリッド
export class GridLayout implements SlideLayout {
  readonly _tag = "Grid" as const
  readonly rows: number
  readonly cols: number
  readonly cells: readonly TextBlock[]
  readonly takeaway?: string
  constructor(props: {
    rows: number
    cols: number
    cells: readonly TextBlock[]
    takeaway?: string
  }) {
    this.rows = props.rows
    this.cols = props.cols
    this.cells = props.cells
    this.takeaway = props.takeaway
  }
}

// IconColumn, IconColumnLayout, IconCardLayout — re-exported from plugin
export { IconColumn, IconColumnLayout, IconCardLayout } from "../plugins/icon-layout/schema.js"

// TextOnlyLayout — re-exported from plugin
export { TextOnlyLayout } from "../plugins/text-only/schema.js"

// QuoteLayout — re-exported from plugin
export { QuoteLayout } from "../plugins/quote/schema.js"

// AgendaLayout — re-exported from plugin
export { AgendaLayout } from "../plugins/agenda/schema.js"

// HOOK: CodeDisplayLayout - コード表示用レイアウト
// シンタックスハイライト付きコードブロック
export class CodeDisplayLayout implements SlideLayout {
  readonly _tag = "CodeDisplay" as const
  readonly language: string
  readonly code: string
  readonly caption?: string
  constructor(props: { language: string; code: string; caption?: string }) {
    this.language = props.language
    this.code = props.code
    this.caption = props.caption
  }
}

// TitleSlide: タイトルスライド
export class TitleSlide {
  readonly _tag = "TitleSlide" as const
  readonly title: string
  readonly subtitle?: string
  constructor(props: { title: string; subtitle?: string }) {
    this.title = props.title
    this.subtitle = props.subtitle
  }
}

// ContentSlide: コンテンツスライド
export class ContentSlide {
  readonly _tag = "ContentSlide" as const
  readonly title: string
  readonly layout: SlideLayout
  constructor(props: { title: string; layout: SlideLayout }) {
    this.title = props.title
    this.layout = props.layout
  }
}

export type Slide = TitleSlide | ContentSlide

// Presentation: ルート
export class Presentation {
  readonly slides: readonly Slide[]
  constructor(props: { slides: readonly Slide[] }) {
    this.slides = props.slides
  }
}
