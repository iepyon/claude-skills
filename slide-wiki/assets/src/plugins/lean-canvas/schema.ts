import type { SlideLayout } from "../../schema/presentation.js"
import { TextBlock } from "../../schema/presentation.js"

// LeanCanvasLayout: リーンキャンバス用レイアウト
// 9つのブロック（Problem, Solution, Key Metrics, UVP, Unfair Advantage, Channels, Customer Segments, Cost Structure, Revenue Streams）
export class LeanCanvasLayout implements SlideLayout {
  readonly _tag = "LeanCanvas" as const
  readonly blocks: readonly TextBlock[]
  constructor(props: { blocks: readonly TextBlock[] }) {
    this.blocks = props.blocks
  }
}
