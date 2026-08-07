import { Option as O } from "effect"
import { ParseError } from "../../errors.js"
import type { BuilderState } from "../../parser/builder-types.js"
import type { Token } from "../../parser/tokenizer.js"
import { saveSection } from "../../parser/builder-state.js"

export type RawTable = {
  headers: string[]
  rows: string[][]
}

type TablePluginState = {
  headersDone: boolean
  separatorSeen: boolean
}

function getTableState(state: BuilderState): TablePluginState {
  return (state.pluginState["table"] as TablePluginState) || { headersDone: false, separatorSeen: false }
}

function setTableState(state: BuilderState, tableState: TablePluginState): Record<string, unknown> {
  return { ...state.pluginState, table: tableState }
}

function getTable(state: BuilderState): RawTable | undefined {
  return state.currentSlide.pipe(
    O.map((s) => s.pluginData?.["table"] as RawTable | undefined),
    O.getOrUndefined,
  )
}

function setTable(slide: { pluginData?: Record<string, unknown> }, table: RawTable) {
  return { ...slide.pluginData, table }
}

/** Parse a pipe-delimited row into cell values, trimming whitespace */
function parsePipeRow(text: string): string[] {
  // Remove leading/trailing pipes and split
  const stripped = text.replace(/^\|/, "").replace(/\|$/, "")
  return stripped.split("|").map((cell) => cell.trim())
}

/** Check if a row is a separator row (e.g., | --- | --- |) */
function isSeparatorRow(text: string): boolean {
  const cells = parsePipeRow(text)
  return cells.every((cell) => /^[-:]+$/.test(cell))
}

// Directive handler: <!--table--> → mode="table"
export const handleTableDirective = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (!(token.type === "PluginDirective" && token.pluginId === "table")) return O.none()

  if (O.isNone(state.currentSlide) || state.currentSlide.value.type !== "content") {
    throw new ParseError({ message: "Table directive requires a content slide", line: token.line })
  }

  const afterSection = saveSection(state)
  if (O.isNone(afterSection.currentSlide)) return O.some(afterSection)

  const slide = afterSection.currentSlide.value
  return O.some({
    ...afterSection,
    currentSlide: O.some({
      ...slide,
      pluginData: setTable(slide, { headers: [], rows: [] }),
      sections: undefined,
    }),
    mode: "table",
    pluginState: setTableState(afterSection, { headersDone: false, separatorSeen: false }),
  })
}

// BodyText in "table" mode: parse pipe-delimited rows
export const handleBodyTextInTable = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "BodyText" || state.mode !== "table") return O.none()

  // Only process lines that look like table rows
  if (!token.text.includes("|")) return O.some(state)

  const tableState = getTableState(state)
  const table = getTable(state)
  if (O.isNone(state.currentSlide) || !table) return O.some(state)

  const slide = state.currentSlide.value

  // Check for separator row
  if (isSeparatorRow(token.text)) {
    return O.some({
      ...state,
      pluginState: setTableState(state, { ...tableState, separatorSeen: true }),
    })
  }

  const cells = parsePipeRow(token.text)

  // First non-separator row becomes headers
  if (!tableState.headersDone) {
    return O.some({
      ...state,
      currentSlide: O.some({
        ...slide,
        pluginData: setTable(slide, { ...table, headers: cells }),
      }),
      pluginState: setTableState(state, { ...tableState, headersDone: true }),
    })
  }

  // Subsequent rows are data rows
  return O.some({
    ...state,
    currentSlide: O.some({
      ...slide,
      pluginData: setTable(slide, { ...table, rows: [...table.rows, cells] }),
    }),
  })
}

export const tableModeHandlers = [handleBodyTextInTable]
