import type { SlideLayout, TextBlock } from "../../schema/presentation.js"

/**
 * Wiki のパターン1件。左に 状況/問題/解決、右に SVG の図解。
 *
 * 3節は `TextBlock[]` のまま持つ。見出し名の解決（語彙・別名・末尾コロン）は
 * converter が `ontology` の `resolveTerm` に任せ、ここには順番だけが残る
 * ＝レイアウトは「上から順に積む」以上のことを知らない。
 */
export class WikiPatternLayout implements SlideLayout {
  readonly _tag = "WikiPattern" as const
  readonly sections: readonly TextBlock[]
  /** `![…](….svg)` が指すファイルの中身（枠に合わせて幅高だけ 100% に読み替えた SVG） */
  readonly diagram: string
  /**
   * 図の縦横比（幅 ÷ 高さ）。`viewBox` を名乗っていない図では `undefined`。
   * レイアウトが下敷きをこの比で組むために持つ — 枠が図と違う比だと、
   * SVG は縮んで枠の中に余白が出る。
   */
  readonly diagramAspect?: number
  readonly takeaway?: string

  constructor(props: {
    sections: readonly TextBlock[]
    diagram: string
    diagramAspect?: number
    takeaway?: string
  }) {
    this.sections = props.sections
    this.diagram = props.diagram
    this.diagramAspect = props.diagramAspect
    this.takeaway = props.takeaway
  }
}
