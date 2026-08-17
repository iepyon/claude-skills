import { Option as O } from "effect"
import type { SlideLayout } from "../../schema/presentation.js"
import { registerPlugin } from "../registry.js"
import { handleDashboardDirective, dashboardModeHandlers } from "./handler.js"
import { convertDashboard } from "./converter.js"
import { handleDashboardLayout } from "./layout.js"
import { DashboardLayout } from "./schema.js"

function countPlainTextChars(text: string): number {
  return text
    .replace(/^#+\s+/gm, "")
    .replace(/<!--.*?-->/gs, "")
    .replace(/^\s*$/gm, "")
    .trim().length
}

// 数えるのは散文（見出し・本文・ラベル・KPI の値と前期比）だけ。
// 表の数値とスパークラインの数値は数えない — データの密度はグラフの可読性が
// 上限であって、散文の上限ではない（CodeDisplay がコードを数えないのと同じ理屈。
// この方針は ontology.yaml の Dashboard.guidance にも書いてある）。
function countDashboardChars(layout: SlideLayout): number {
  const l = layout as DashboardLayout
  let count = 0
  for (const cell of l.cells) {
    if (cell.kind === "text") {
      if (cell.block.heading) count += countPlainTextChars(cell.block.heading)
      if (cell.block.body) count += countPlainTextChars(cell.block.body)
    } else if (cell.kind === "kpi") {
      count += countPlainTextChars(cell.label)
      count += (cell.value.prefix + cell.value.number + cell.value.suffix).trim().length
      if (cell.delta) count += cell.delta.text.trim().length
    } else {
      count += countPlainTextChars(cell.heading)
      for (const d of cell.data) count += d.label.trim().length
    }
  }
  return count
}

registerPlugin({
  id: "dashboard",
  layoutTag: "Dashboard",
  mode: "dashboard",
  // 行構成（1,3,1）が引数なので、認識はリテラル1本で表せない（numbered-list と同じ）。
  // 正規の綴りの文書化は ontology.yaml の directives が持つ。
  tokenMatcher: (line, lineNum) => {
    const m = line.match(/^<!--dashboard:(\d+(?:,\d+)*)-->$/)
    return m
      ? O.some({ type: "PluginDirective" as const, pluginId: `dashboard:${m[1]}`, line: lineNum })
      : O.none()
  },
  directiveHandler: handleDashboardDirective,
  sectionRoute: { field: "dashboardCells" },
  modeHandlers: dashboardModeHandlers,
  converterPriority: 45,
  converter: convertDashboard,
  countChars: countDashboardChars,
  layoutHandler: handleDashboardLayout,
})
