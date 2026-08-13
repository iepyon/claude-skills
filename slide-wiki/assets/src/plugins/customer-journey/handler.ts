import { Option as O } from "effect"
import { ParseError } from "../../errors.js"
import type { BuilderState } from "../../parser/builder-types.js"
import type { Token } from "../../parser/tokenizer.js"
import { saveSection } from "../../parser/builder-state.js"
import { getVocabulary, resolveTerm } from "../../ontology/index.js"

/**
 * 行ラベルの語彙は ontology.yaml の `journey-rows` が正本。
 *
 * セルは正書ではなく語彙の `key` で持つ。表記のゆれ（全角/半角コロン、別名）の吸収は
 * `resolveTerm` ひとつに任せる — かつてここは半角コロンしか剥がさず、`#### タッチ：` と
 * 書かれた行の項目が黙って消えるのに lint は「宣言どおり」と言っていた。
 */
const rowVocabulary = () => getVocabulary("journey-rows")!

/** 語彙の key で初期化した空のセル */
const emptyCells = (): Record<string, string[]> =>
  Object.fromEntries(rowVocabulary().terms.map((t) => [t.key, [] as string[]]))

export type RawCustomerJourney = {
  phases: Array<{ name: string; cells: Record<string, string[]> }>
}

type CJPluginState = {
  phase?: string
  rowLabel?: string
}

function getCJState(state: BuilderState): CJPluginState {
  return (state.pluginState["customer-journey"] as CJPluginState) || {}
}

function setCJState(state: BuilderState, cjState: CJPluginState): Record<string, unknown> {
  return { ...state.pluginState, "customer-journey": cjState }
}

function getJourney(state: BuilderState): RawCustomerJourney | undefined {
  return state.currentSlide.pipe(
    O.map((s) => s.pluginData?.["customerJourney"] as RawCustomerJourney | undefined),
    O.getOrUndefined,
  )
}

function setJourney(slide: { pluginData?: Record<string, unknown> }, journey: RawCustomerJourney) {
  return { ...slide.pluginData, customerJourney: journey }
}

// CustomerJourneyDirective: カスタマージャーニーモード開始
export const handleCustomerJourneyDirective = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (!(token.type === "PluginDirective" && token.pluginId === "customer-journey")) return O.none()

  if (O.isNone(state.currentSlide) || state.currentSlide.value.type !== "content") {
    throw new ParseError({ message: "CustomerJourneyDirective requires a content slide", line: token.line })
  }

  const afterSection = saveSection(state)
  if (O.isNone(afterSection.currentSlide)) return O.some(afterSection)

  const slide = afterSection.currentSlide.value
  return O.some({
    ...afterSection,
    currentSlide: O.some({
      ...slide,
      pluginData: { customerJourney: { phases: [] } },
      sections: undefined,
    }),
    mode: "customer-journey",
    pluginState: setCJState(afterSection, {}),
  })
}

// H3 in CustomerJourney mode: フェーズ名
const handleH3InCustomerJourney = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "H3" || state.mode !== "customer-journey") return O.none()

  const journey = getJourney(state)
  if (O.isNone(state.currentSlide) || !journey) {
    return O.some(state)
  }

  const slide = state.currentSlide.value
  const newPhase = { name: token.text, cells: emptyCells() }

  return O.some({
    ...state,
    currentSlide: O.some({
      ...slide,
      pluginData: setJourney(slide, {
        phases: [...journey.phases, newPhase],
      }),
    }),
    pluginState: setCJState(state, { phase: token.text }),
  })
}

// H4: カスタマージャーニーの行ラベル
const handleH4InCustomerJourney = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "H4" || state.mode !== "customer-journey") return O.none()

  // 語彙外のラベルは行を選ばない（以降の箇条書きは捨てられる。lint が slot-vocabulary で報告する）
  const rowLabel = resolveTerm(rowVocabulary(), token.text)?.key

  return O.some({
    ...state,
    pluginState: setCJState(state, { ...getCJState(state), rowLabel }),
  })
}

// BodyText in CustomerJourney mode: 箇条書き項目を追加
const handleBodyTextInCustomerJourney = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "BodyText" || state.mode !== "customer-journey") return O.none()

  const cj = getCJState(state)
  if (
    O.isNone(state.currentSlide) ||
    !cj.phase ||
    !cj.rowLabel
  ) {
    return O.some(state)
  }

  const slide = state.currentSlide.value
  const journey = getJourney(state)
  if (!journey) return O.some(state)

  const phaseName = cj.phase
  const rowLabel = cj.rowLabel

  // 現在のフェーズを探す
  const phaseIndex = journey.phases.findIndex((p) => p.name === phaseName)
  if (phaseIndex === -1) return O.some(state)

  // 箇条書き項目を抽出（- で始まる場合のみ）
  if (!token.text.startsWith('-')) return O.some(state)
  const item = token.text.slice(1).trim()

  // フェーズのcellsを更新
  const phase = journey.phases[phaseIndex]
  const updatedPhase = {
    ...phase,
    cells: {
      ...phase.cells,
      [rowLabel]: [...(phase.cells[rowLabel] || []), item],
    },
  }

  const updatedPhases = [
    ...journey.phases.slice(0, phaseIndex),
    updatedPhase,
    ...journey.phases.slice(phaseIndex + 1),
  ]

  return O.some({
    ...state,
    currentSlide: O.some({
      ...slide,
      pluginData: setJourney(slide, { phases: updatedPhases }),
    }),
  })
}

// All mode handlers for CJ (exported for plugin registration)
export const journeyModeHandlers = [
  handleH3InCustomerJourney,
  handleH4InCustomerJourney,
  handleBodyTextInCustomerJourney,
]
