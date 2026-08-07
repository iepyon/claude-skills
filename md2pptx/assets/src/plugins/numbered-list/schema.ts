import type { SlideLayout } from "../../schema/presentation.js"
import { TextBlock } from "../../schema/presentation.js"

// NumberedListLayout: 番号付きリストレイアウト
export class NumberedListLayout implements SlideLayout {
  readonly _tag = "NumberedList" as const
  readonly variant: "circle" | "bar"
  readonly items: readonly TextBlock[]
  readonly takeaway?: string
  constructor(props: {
    variant: "circle" | "bar"
    items: readonly TextBlock[]
    takeaway?: string
  }) {
    this.variant = props.variant
    this.items = props.items
    this.takeaway = props.takeaway
  }
}
