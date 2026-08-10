import type { SlideLayout, TextBlock } from "../../schema/presentation.js"

/**
 * Wiki のパターン1件。左に いつ・なにが困るか／そこで、右に SVG の図解。
 *
 * 節は `TextBlock[]` のまま持つ。**見出しの数（2つ）と要素の数は一致しない** —
 * converter が本文の空行で段落に割り、2段落目からは `heading` の無い `TextBlock` に
 * するため。見出し名の解決（語彙・別名・末尾コロン）も converter が `ontology` の
 * `resolveTerm` に任せ、ここには順番だけが残る
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
  /**
   * 主張の典拠。**`string` のまま持つ（`TextBlock` にも richText にもしない）。**
   *
   * インライン装飾を解かないことが、出典に `[[…]]` を書いてもリンクにならない
   * 理由そのもの。参照を拾う `collectRefs` が見るのは richText / paragraphs だけなので、
   * 素の text で置けばバックリンクのグラフに載らない
   * — 「関連」と「典拠」が混ざって、文献名がパターンの隣人として並ぶのを防ぐ。
   */
  readonly source?: string

  constructor(props: {
    sections: readonly TextBlock[]
    diagram: string
    diagramAspect?: number
    takeaway?: string
    source?: string
  }) {
    this.sections = props.sections
    this.diagram = props.diagram
    this.diagramAspect = props.diagramAspect
    this.takeaway = props.takeaway
    this.source = props.source
  }
}
