import type { SlideLayout } from "../../schema/presentation.js"
import { TextBlock } from "../../schema/presentation.js"

// AgendaLayout: 左パネル(タイトル)+右パネル(番号付き項目)
export class AgendaLayout implements SlideLayout {
  readonly _tag = "Agenda" as const
  readonly title: string
  readonly subtitle?: string
  readonly items: readonly TextBlock[]
  constructor(props: {
    title: string
    subtitle?: string
    items: readonly TextBlock[]
  }) {
    this.title = props.title
    this.subtitle = props.subtitle
    this.items = props.items
  }
}
