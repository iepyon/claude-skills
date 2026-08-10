import type { SlideLayout } from "../../schema/presentation.js"

export class TextOnlyLayout implements SlideLayout {
  readonly _tag = "TextOnly" as const
  readonly body: string
  readonly takeaway?: string
  constructor(props: { body: string; takeaway?: string }) {
    this.body = props.body
    this.takeaway = props.takeaway
  }
}
