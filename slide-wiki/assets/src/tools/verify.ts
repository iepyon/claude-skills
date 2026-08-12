import { diffInventory, Mismatch, SlideInventory } from "./inventory-diff.js"

/**
 * AST / HTML / PPTX の3者比較と、その報告。
 *
 * cli.ts から切り出してあるのは、**「食い違ったら失敗と呼ぶ」という判断を
 * テストできる場所に置くため**。この判断が cli.ts の中に埋まっていて、
 * かつ誰も表明していなかったことが BACKLOG B-24 の一部だった
 * （mismatch を印字しながら常に exit 0 を返していた）。
 */

// 1脚あたりに表示する mismatch の上限。
// 全件出すと400件級のデッキで端末が流れ、最初の1件が読めなくなる。
const VERIFY_MAX_SHOWN = 20

export interface VerifyLeg {
  readonly label: string
  readonly leftName: string
  readonly rightName: string
  readonly matches: number
  readonly mismatches: readonly Mismatch[]
}

export interface VerifyReport {
  readonly legs: readonly VerifyLeg[]
  readonly totalMismatches: number
}

export function verifyInventories(
  ast: SlideInventory,
  pptx: SlideInventory,
  html: SlideInventory
): VerifyReport {
  // DiffResult がちょうど { matches, mismatches } なので、脚の名前だけ足せば足りる
  const leg = (
    label: string,
    leftName: string,
    rightName: string,
    left: SlideInventory,
    right: SlideInventory
  ): VerifyLeg => ({ label, leftName, rightName, ...diffInventory(left, right) })

  const legs = [
    leg("PPTX vs Expected", "expected", "PPTX", ast, pptx),
    leg("HTML vs Expected", "expected", "HTML", ast, html),
    leg("PPTX vs HTML", "PPTX", "HTML", pptx, html),
  ]

  return {
    legs,
    totalMismatches: legs.reduce((sum, leg) => sum + leg.mismatches.length, 0),
  }
}

// どのスライドのどの図形か。`property` だけでは `shape.exists` や
// `paragraphs.length` の行が場所を持たず、デッキが大きいと探せない。
const locate = (mismatch: Mismatch): string =>
  mismatch.property.startsWith(`${mismatch.slide}.`)
    ? mismatch.property
    : `${mismatch.slide}.${mismatch.shape}.${mismatch.property}`

// どの種類の食い違いが何件あるか。原因に辿り着くのは、
// 個々の行より「alignment:27」のような分布のほうが早い。
export function mismatchBreakdown(mismatches: readonly Mismatch[]): string {
  const byKind = new Map<string, number>()
  for (const mismatch of mismatches) {
    const kind = mismatch.property.split(".").pop() ?? mismatch.property
    byKind.set(kind, (byKind.get(kind) ?? 0) + 1)
  }
  return [...byKind.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([kind, count]) => `${kind}:${count}`)
    .join(" ")
}

export function printVerifyReport(report: VerifyReport): void {
  for (const leg of report.legs) {
    console.log(`\n📊 ${leg.label}:`)

    if (leg.mismatches.length === 0) {
      console.log(`✅ All ${leg.matches} shapes match!`)
      continue
    }

    console.log(`⚠️  ${leg.matches} shapes match, ${leg.mismatches.length} mismatches:`)

    for (const mismatch of leg.mismatches.slice(0, VERIFY_MAX_SHOWN)) {
      const deltaStr = mismatch.delta !== undefined ? ` (Δ ${mismatch.delta.toFixed(4)})` : ""
      console.log(
        `  - ${locate(mismatch)}: ${leg.leftName}=${mismatch.expected}, ${leg.rightName}=${mismatch.actual}${deltaStr}`
      )
    }

    if (leg.mismatches.length > VERIFY_MAX_SHOWN) {
      console.log(`  … 他 ${leg.mismatches.length - VERIFY_MAX_SHOWN} 件`)
    }

    console.log(`  内訳: ${mismatchBreakdown(leg.mismatches)}`)
  }

  if (report.totalMismatches > 0) {
    console.log(`\n❌ 3者が一致しない（mismatch ${report.totalMismatches} 件）`)
  } else {
    console.log("\n✅ AST / HTML / PPTX の3者が一致した")
  }
}
