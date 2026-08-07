import type { SlideLayout } from "../../schema/presentation.js"

export class TableLayout implements SlideLayout {
  readonly _tag = "Table" as const
  readonly headers: readonly string[]
  readonly rows: readonly (readonly string[])[]
  readonly takeaway?: string
  constructor(props: {
    headers: readonly string[]
    rows: readonly (readonly string[])[]
    takeaway?: string
  }) {
    this.headers = props.headers
    this.rows = props.rows
    this.takeaway = props.takeaway
  }
}
