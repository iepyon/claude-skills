import type { SlideLayout } from "../../schema/presentation.js"

// IconColumn: アイコン付きカラム
export class IconColumn {
  readonly heading: string
  readonly icon: string
  readonly body?: string
  constructor(props: { heading: string; icon: string; body?: string }) {
    this.heading = props.heading
    this.icon = props.icon
    this.body = props.body
  }
}

// IconColumnLayout: 3カラムアイコンレイアウト
export class IconColumnLayout implements SlideLayout {
  readonly _tag = "IconColumn" as const
  readonly columns: readonly [IconColumn, IconColumn, IconColumn]
  readonly takeaway?: string
  constructor(props: {
    columns: readonly [IconColumn, IconColumn, IconColumn]
    takeaway?: string
  }) {
    this.columns = props.columns
    this.takeaway = props.takeaway
  }
}

// IconCardLayout: アイコンカードレイアウト（カード背景 + アクセントバー + アイコン → 見出し → 本文）
export class IconCardLayout implements SlideLayout {
  readonly _tag = "IconCard" as const
  readonly columns: readonly [IconColumn, IconColumn, IconColumn]
  readonly takeaway?: string
  constructor(props: {
    columns: readonly [IconColumn, IconColumn, IconColumn]
    takeaway?: string
  }) {
    this.columns = props.columns
    this.takeaway = props.takeaway
  }
}
