import type { SlideLayout } from "../../schema/presentation.js"

// CustomerJourneyCell: 各セルの箇条書き項目
export class CustomerJourneyCell {
  readonly items: readonly string[]
  constructor(props: { items: readonly string[] }) {
    this.items = props.items
  }
}

// CustomerJourneyRow: 1つの行（タッチ、行動、判断、感情のいずれか）
export class CustomerJourneyRow {
  readonly label: string
  readonly cells: readonly CustomerJourneyCell[]
  constructor(props: { label: string; cells: readonly CustomerJourneyCell[] }) {
    this.label = props.label
    this.cells = props.cells
  }
}

// CustomerJourneyLayout: カスタマージャーニーマップ
export class CustomerJourneyLayout implements SlideLayout {
  readonly _tag = "CustomerJourney" as const
  readonly phases: readonly string[]
  readonly rows: readonly [CustomerJourneyRow, CustomerJourneyRow, CustomerJourneyRow, CustomerJourneyRow]
  constructor(props: {
    phases: readonly string[]
    rows: readonly [CustomerJourneyRow, CustomerJourneyRow, CustomerJourneyRow, CustomerJourneyRow]
  }) {
    this.phases = props.phases
    this.rows = props.rows
  }
}
