import { SLIDE_WIDTH, SLIDE_HEIGHT, MARGIN_X, MARGIN_Y } from "../../constants.js"
import { stripInlineFormatting } from "../../parser/inline-formatter.js"
import { countVisualLines } from "./helpers.js"
import type { LayoutResult, TextBox } from "./types.js"

// 見積もりは近似なので、この倍率を超えて溢れた場合のみ報告する。
// 正しいスライドを誤って失敗させないためのマージン。
const ESTIMATE_TOLERANCE = 1.2

// 座標の丸め誤差を吸収する許容値（インチ）
const BOUNDS_EPSILON = 0.02

export interface Overflow {
  readonly kind: "outOfBounds" | "textTooTall"
  readonly box: TextBox
  readonly needed?: number
}

/**
 * テキストを描画するのに物理的に必要な高さ（インチ）。
 *
 * `estimateTextHeight` はレイアウトが領域を確保するための見積もりで、全行に
 * 行間 150% を掛けて余裕を持たせている。それをそのまま「はみ出し」の閾値に使うと、
 * 1行ぶんの固定高ボックス（タイトル・見出し）が常に溢れていると判定される:
 * 24pt のタイトルは実際には 24/72 = 0.33in で足りるのに 0.55in 必要と見積もられ、
 * 高さ 0.4in のボックスが誤検出される。
 *
 * 行間は行と行の「あいだ」にしか掛からないので、L 行の必要高は
 * `em * (1 + (L-1) * 1.5)` とする。ビルドを失敗させる判定なので、
 * 過大評価（誤検出）より過小評価（見逃し）に寄せる。
 */
function requiredHeight(text: string, fontSize: number, width: number): number {
  const em = fontSize / 72
  const lines = countVisualLines(text, fontSize, width)
  return em * (1 + (lines - 1) * 1.5) + 0.05
}

/**
 * ボックスが保持するテキストを、行区切り付きのプレーンテキストに平坦化する。
 * 高さ見積もりに渡すため、実描画されないインライン記法は除去する。
 */
function boxPlainText(box: TextBox): string {
  if (box.paragraphs) {
    return box.paragraphs.map((para) => para.runs.map((run) => run.text).join("")).join("\n")
  }
  if (box.richText) return box.richText.map((run) => run.text).join("")
  return stripInlineFormatting(box.text ?? "")
}

/**
 * LayoutResult のテキストボックスを検査して、はみ出しを列挙する。
 *
 * 2種類を検出する:
 * - outOfBounds: ボックス自体がスライドの安全領域を超えている
 * - textTooTall: ボックスはスライド内だが、テキストがボックスより高い
 *
 * 純関数。座標のみを見るため、PPTX/HTML どちらのレンダラでも同じ判定になる。
 */
export function detectOverflow(result: LayoutResult): Overflow[] {
  const overflows: Overflow[] = []

  for (const box of result.textBoxes) {
    // 下辺・右辺のみを見る。全コアレイアウトが availableHeight を
    // SLIDE_HEIGHT - titleY - MARGIN_Y で計算しており、この境界を守る前提で
    // 書かれている。左辺・上辺をデザインマージンで判定すると、独自のオフセットを
    // 持つプラグイン（customer-journey は自グリッド原点から +0.03 する等）が
    // 正常なスライドでも失敗する。
    if (
      box.y + box.h > SLIDE_HEIGHT - MARGIN_Y + BOUNDS_EPSILON ||
      box.x + box.w > SLIDE_WIDTH - MARGIN_X + BOUNDS_EPSILON
    ) {
      overflows.push({ kind: "outOfBounds", box })
      continue
    }

    const text = boxPlainText(box)
    if (!text) continue

    const needed = requiredHeight(text, box.fontSize ?? 14, box.w)
    if (needed > box.h * ESTIMATE_TOLERANCE) {
      overflows.push({ kind: "textTooTall", box, needed })
    }
  }

  return overflows
}
