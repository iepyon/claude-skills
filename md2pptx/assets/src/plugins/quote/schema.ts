import type { SlideLayout } from "../../schema/presentation.js"

export class QuoteLayout implements SlideLayout {
  readonly _tag = "Quote" as const
  readonly body: string
  readonly author?: string
  constructor(props: { body: string; author?: string }) {
    this.body = props.body
    this.author = props.author
  }
}
