import { Option as O } from "effect"
import { ParseError } from "../../errors.js"
import type { BuilderState } from "../../parser/builder-types.js"
import type { Token } from "../../parser/tokenizer.js"
import { saveSection } from "../../parser/builder-state.js"
import { parsePipeRow, isSeparatorRow } from "../table/handler.js"

// DashboardDirective: <!--dashboard:1,3,1--> → mode="dashboard"
// 行構成は tokenMatcher が pluginId に載せて運ぶ（numbered-list の variant と同じ）
export const handleDashboardDirective = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (!(token.type === "PluginDirective" && token.pluginId.startsWith("dashboard:"))) return O.none()

  if (O.isNone(state.currentSlide) || state.currentSlide.value.type !== "content") {
    throw new ParseError({ message: "DashboardDirective requires a content slide", line: token.line })
  }

  const spec = token.pluginId.split(":")[1]
  const rows = spec.split(",").map((n) => parseInt(n, 10))
  if (rows.some((r) => r === 0)) {
    throw new ParseError({
      message: `<!--dashboard:${spec}-->: 列数に 0 は書けない`,
      line: token.line,
    })
  }

  const afterSection = saveSection(state)
  if (O.isNone(afterSection.currentSlide)) return O.some(afterSection)

  const slide = afterSection.currentSlide.value
  return O.some({
    ...afterSection,
    currentSlide: O.some({
      ...slide,
      pluginData: { dashboardRows: rows, dashboardCells: [] },
      sections: undefined,
    }),
    mode: "dashboard",
  })
}

// KpiMarker in dashboard mode: 現在のセルを KPI タイルにする
const handleKpiMarker = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "KpiMarker" || state.mode !== "dashboard") return O.none()
  if (O.isNone(state.currentSection)) return O.some(state)

  const section = state.currentSection.value
  return O.some({
    ...state,
    currentSection: O.some({ ...section, kpi: true }),
  })
}

// ChartDirective in dashboard mode: 現在のセルをグラフにする
const handleChartDirective = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "ChartDirective" || state.mode !== "dashboard") return O.none()
  if (O.isNone(state.currentSection)) return O.some(state)

  const section = state.currentSection.value
  return O.some({
    ...state,
    currentSection: O.some({ ...section, chartType: token.chartType }),
  })
}

// チャートセルの中のパイプ行をデータ表として積む。
// 1行目がヘッダ、`| --- |` の区切り行はスキップ、以降が本体行（table と同じ状態機械
// だが、状態は section のフィールドから導けるので pluginState は使わない）。
// パイプを含まない行・チャートでないセルの行は O.none() でコアの本文蓄積に落とす。
const handleChartTableRow = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "BodyText" || state.mode !== "dashboard") return O.none()
  if (O.isNone(state.currentSection)) return O.none()

  const section = state.currentSection.value
  if (!section.chartType || !token.text.includes("|")) return O.none()

  if (isSeparatorRow(token.text)) return O.some(state)

  const cells = parsePipeRow(token.text)
  if (!section.chartHeader) {
    return O.some({
      ...state,
      currentSection: O.some({ ...section, chartHeader: cells }),
    })
  }
  return O.some({
    ...state,
    currentSection: O.some({ ...section, chartRows: [...(section.chartRows ?? []), cells] }),
  })
}

export const dashboardModeHandlers = [handleKpiMarker, handleChartDirective, handleChartTableRow]
