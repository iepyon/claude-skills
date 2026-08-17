import type { SlideLayout } from "../../schema/presentation.js"
import { TextBlock } from "../../schema/presentation.js"

/**
 * KPI の値。「数字は大きく、単位は小さく」を描画で実現するために、
 * 変換の段階で3つに割っておく（layout はサイズを決めるだけにする）。
 * 例: "¥1.2億" → { prefix: "¥", number: "1.2", suffix: "億" }
 */
export type KpiValue = {
  readonly prefix: string
  readonly number: string
  readonly suffix: string
}

/** 前期比。方向は先頭の記号から決まり、描画の色分けに使う */
export type KpiDelta = {
  readonly text: string
  readonly direction: "up" | "down" | "flat"
}

export type ChartType = "bar" | "line" | "donut"

export type ChartDatum = {
  readonly label: string
  readonly value: number
}

export type DashboardCell =
  | { readonly kind: "text"; readonly block: TextBlock }
  | {
      readonly kind: "kpi"
      readonly label: string
      readonly value: KpiValue
      readonly delta?: KpiDelta
      readonly spark?: readonly number[]
    }
  | {
      readonly kind: "chart"
      readonly chartType: ChartType
      readonly heading: string
      readonly data: readonly ChartDatum[]
    }

// DashboardLayout: 行ごとに列数が変わるグリッド
export class DashboardLayout implements SlideLayout {
  readonly _tag = "Dashboard" as const
  /** 行ごとの列数。`<!--dashboard:1,3,1-->` → [1, 3, 1] */
  readonly rows: readonly number[]
  /** セル。書いた順＝左上から行優先 */
  readonly cells: readonly DashboardCell[]
  constructor(props: { rows: readonly number[]; cells: readonly DashboardCell[] }) {
    this.rows = props.rows
    this.cells = props.cells
  }
}
