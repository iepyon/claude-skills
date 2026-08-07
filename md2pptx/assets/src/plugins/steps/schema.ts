import type { SlideLayout } from "../../schema/presentation.js"

// StepItem: 段階的成長図の1ステップ
export class StepItem {
  readonly heading: string
  readonly icon: string
  readonly name: string
  readonly body?: string
  constructor(props: { heading: string; icon: string; name: string; body?: string }) {
    this.heading = props.heading
    this.icon = props.icon
    this.name = props.name
    this.body = props.body
  }
}

// StepsLayout: 段階的成長図レイアウト（左から右へ高くなる階段状ダイアグラム）
export class StepsLayout implements SlideLayout {
  readonly _tag = "Steps" as const
  readonly steps: readonly StepItem[]
  readonly takeaway?: string
  constructor(props: { steps: readonly StepItem[]; takeaway?: string }) {
    this.steps = props.steps
    this.takeaway = props.takeaway
  }
}
