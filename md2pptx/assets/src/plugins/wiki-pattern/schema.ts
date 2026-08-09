import type { SlideLayout } from "../../schema/presentation.js"
import type { TextBlock } from "../../schema/presentation.js"

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
  /** ```pattern-diagram フェンスの中身（SVG マークアップそのまま） */
  readonly diagram: string
  readonly takeaway?: string

  constructor(props: {
    sections: readonly TextBlock[]
    diagram: string
    takeaway?: string
  }) {
    this.sections = props.sections
    this.diagram = props.diagram
    this.takeaway = props.takeaway
  }
}
