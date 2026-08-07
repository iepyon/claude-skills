import { Option as O } from "effect"
import { ParseError } from "../../errors.js"
import type { BuilderState } from "../../parser/builder-types.js"
import type { Token } from "../../parser/tokenizer.js"
import { saveSection } from "../../parser/builder-state.js"

export type RawConcreteExampleItem = {
  label: string
  text: string
}

export type RawConcreteExample = {
  number: number
  title: string
  goodExample: string
  goodPoints: string
  badExample: string
  badReason: string
  items: RawConcreteExampleItem[]
}

export type RawPatternLanguage = {
  meta: Record<string, string>
  sections: Record<string, string>
  principles: string[]
  success: { title: string; before: string; analysis: string; after: string }
  failure: { title: string; attempt: string; problem: string; improvement: string }
  concreteExamples: RawConcreteExample[]
  template: string
  checklist: string[]
  teamScenarios: string[]
  diagram: string
}

type PLPluginState = {
  phase: "frontmatter" | "body"
  currentH3: string
  currentSubField: string
  inCodeBlock: boolean
  currentCodeLang: string
  currentExampleIndex: number  // -1 = not in a concrete example
}

function getPLState(state: BuilderState): PLPluginState {
  return (state.pluginState["pattern-language"] as PLPluginState) || {
    phase: "frontmatter",
    currentH3: "",
    currentSubField: "",
    inCodeBlock: false,
    currentCodeLang: "",
    currentExampleIndex: -1,
  }
}

function setPLState(state: BuilderState, plState: PLPluginState): Record<string, unknown> {
  return { ...state.pluginState, "pattern-language": plState }
}

function getPL(state: BuilderState): RawPatternLanguage | undefined {
  return state.currentSlide.pipe(
    O.map((s) => s.pluginData?.["patternLanguage"] as RawPatternLanguage | undefined),
    O.getOrUndefined,
  )
}

function setPL(slide: { pluginData?: Record<string, unknown> }, pl: RawPatternLanguage) {
  return { ...slide.pluginData, patternLanguage: pl }
}

// DirectiveHandler: pattern-language mode開始
export const handlePatternLanguageDirective = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (!(token.type === "PluginDirective" && token.pluginId === "pattern-language")) return O.none()

  if (O.isNone(state.currentSlide) || state.currentSlide.value.type !== "content") {
    throw new ParseError({ message: "PatternLanguageDirective requires a content slide", line: token.line })
  }

  const afterSection = saveSection(state)
  if (O.isNone(afterSection.currentSlide)) return O.some(afterSection)

  const slide = afterSection.currentSlide.value
  const emptyPL: RawPatternLanguage = {
    meta: {},
    sections: {},
    principles: [],
    success: { title: "", before: "", analysis: "", after: "" },
    failure: { title: "", attempt: "", problem: "", improvement: "" },
    concreteExamples: [],
    template: "",
    checklist: [],
    teamScenarios: [],
    diagram: "",
  }

  return O.some({
    ...afterSection,
    currentSlide: O.some({
      ...slide,
      pluginData: { patternLanguage: emptyPL },
      sections: undefined,
    }),
    mode: "pattern-language",
    pluginState: setPLState(afterSection, {
      phase: "frontmatter",
      currentH3: "",
      currentSubField: "",
      inCodeBlock: false,
      currentCodeLang: "",
      currentExampleIndex: -1,
    }),
  })
}

// H3: Section切替, frontmatter→body遷移
export const handleH3InPL = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "H3" || state.mode !== "pattern-language") return O.none()

  const pl = getPL(state)
  if (O.isNone(state.currentSlide) || !pl) return O.some(state)

  const slide = state.currentSlide.value

  // 具体例N：タイトル pattern (full-width/half-width colon, full-width/half-width digits)
  const exampleMatch = token.text.match(/^具体例[0-9０-９]+[：:](.+)$/)
  if (exampleMatch) {
    const title = exampleMatch[1].trim()
    const num = pl.concreteExamples.length + 1
    const newExample: RawConcreteExample = {
      number: num,
      title,
      goodExample: "",
      goodPoints: "",
      badExample: "",
      badReason: "",
      items: [],
    }
    return O.some({
      ...state,
      currentSlide: O.some({
        ...slide,
        pluginData: setPL(slide, {
          ...pl,
          concreteExamples: [...pl.concreteExamples, newExample],
        }),
      }),
      pluginState: setPLState(state, {
        phase: "body",
        currentH3: token.text,
        currentSubField: "",
        inCodeBlock: false,
        currentCodeLang: "",
        currentExampleIndex: pl.concreteExamples.length, // 0-based index of newly pushed example
      }),
    })
  }

  return O.some({
    ...state,
    pluginState: setPLState(state, {
      phase: "body",
      currentH3: token.text,
      currentSubField: "",
      inCodeBlock: false,
      currentCodeLang: "",
      currentExampleIndex: -1,
    }),
  })
}

// H4: Sub-field labels within concrete examples (e.g., #### Before:, #### ズレ分析:)
export const handleH4InPL = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "H4" || state.mode !== "pattern-language") return O.none()

  const pl = getPL(state)
  const plState = getPLState(state)
  if (O.isNone(state.currentSlide) || !pl) return O.some(state)

  // Only handle H4 inside concrete examples
  if (plState.currentExampleIndex < 0) return O.some(state)

  const slide = state.currentSlide.value
  const idx = plState.currentExampleIndex
  const examples = [...pl.concreteExamples]
  const ex = examples[idx]
  if (!ex) return O.some(state)

  // Strip trailing colon (: or ：) from label
  const label = token.text.replace(/[：:]$/, "").trim()

  // Add new item to the current concrete example
  const newItem: RawConcreteExampleItem = { label, text: "" }
  examples[idx] = { ...ex, items: [...ex.items, newItem] }

  return O.some({
    ...state,
    currentSlide: O.some({
      ...slide,
      pluginData: setPL(slide, { ...pl, concreteExamples: examples }),
    }),
    pluginState: setPLState(state, { ...plState, currentSubField: `item:${ex.items.length}` }),
  })
}

// CodeFenceOpen: コードブロック開始
export const handleCodeFenceOpenInPL = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "CodeFenceOpen" || state.mode !== "pattern-language") return O.none()

  const plState = getPLState(state)
  return O.some({
    ...state,
    pluginState: setPLState(state, { ...plState, inCodeBlock: true, currentCodeLang: token.language }),
  })
}

// CodeFenceLine: コード行蓄積
export const handleCodeFenceLineInPL = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "CodeFenceLine" || state.mode !== "pattern-language") return O.none()

  const pl = getPL(state)
  const plState = getPLState(state)
  if (O.isNone(state.currentSlide) || !pl || !plState.inCodeBlock) return O.some(state)

  const slide = state.currentSlide.value

  // pattern-diagram: SVG コンテンツ蓄積
  if (plState.currentCodeLang === "pattern-diagram") {
    const separator = pl.diagram ? "\n" : ""
    return O.some({
      ...state,
      currentSlide: O.some({
        ...slide,
        pluginData: setPL(slide, { ...pl, diagram: pl.diagram + separator + token.text }),
      }),
    })
  }

  // テンプレートセクション: コードブロック蓄積
  if (plState.currentH3 === "テンプレート") {
    const separator = pl.template ? "\n" : ""
    return O.some({
      ...state,
      currentSlide: O.some({
        ...slide,
        pluginData: setPL(slide, { ...pl, template: pl.template + separator + token.text }),
      }),
    })
  }

  // 成功例 After: インラインコードブロック
  if (plState.currentH3 === "成功例" && plState.currentSubField === "after") {
    const existing = pl.success.after
    const separator = existing ? "\n" : ""
    return O.some({
      ...state,
      currentSlide: O.some({
        ...slide,
        pluginData: setPL(slide, {
          ...pl,
          success: { ...pl.success, after: existing + separator + token.text },
        }),
      }),
    })
  }

  // 具体例: goodExample コードブロック蓄積
  if (plState.currentExampleIndex >= 0 && plState.currentSubField === "goodExample") {
    const idx = plState.currentExampleIndex
    const examples = [...pl.concreteExamples]
    const ex = examples[idx]
    if (ex) {
      const separator = ex.goodExample ? "\n" : ""
      examples[idx] = { ...ex, goodExample: ex.goodExample + separator + token.text }
      return O.some({
        ...state,
        currentSlide: O.some({
          ...slide,
          pluginData: setPL(slide, { ...pl, concreteExamples: examples }),
        }),
      })
    }
  }

  return O.some(state)
}

// CodeFenceClose: コードブロック終了
export const handleCodeFenceCloseInPL = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "CodeFenceClose" || state.mode !== "pattern-language") return O.none()

  const plState = getPLState(state)
  return O.some({
    ...state,
    pluginState: setPLState(state, { ...plState, inCodeBlock: false, currentCodeLang: "" }),
  })
}

// BodyText: frontmatter key:value解析 / bodyフェーズのセクション本文蓄積
export const handleBodyTextInPL = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "BodyText" || state.mode !== "pattern-language") return O.none()

  const pl = getPL(state)
  const plState = getPLState(state)
  if (O.isNone(state.currentSlide) || !pl) return O.some(state)

  const slide = state.currentSlide.value
  const text = token.text

  // --- Frontmatter phase: key:value parsing ---
  if (plState.phase === "frontmatter") {
    const colonIdx = text.indexOf(":")
    if (colonIdx > 0) {
      const key = text.slice(0, colonIdx).trim()
      let value = text.slice(colonIdx + 1).trim()
      // Strip quotes
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      // Strip array brackets for related_patterns
      if (value.startsWith("[") && value.endsWith("]")) {
        value = value.slice(1, -1)
      }
      // Unescape backslash-escaped double quotes
      value = value.replace(/\\"/g, '"')
      return O.some({
        ...state,
        currentSlide: O.some({
          ...slide,
          pluginData: setPL(slide, { ...pl, meta: { ...pl.meta, [key]: value } }),
        }),
      })
    }
    return O.some(state)
  }

  // --- Body phase: route based on currentH3 ---
  const h3 = plState.currentH3

  // コミュニケーション図メモ → absorb (not displayed)
  if (h3 === "コミュニケーション図メモ") return O.some(state)

  // Simple sections: situation, problem, result, caution
  const sectionMap: Record<string, string> = {
    "状況・いつ使うか": "situation",
    "問題・なぜ必要か": "problem",
    "期待結果": "result",
    "注意": "caution",
  }

  if (sectionMap[h3]) {
    const key = sectionMap[h3]
    const existing = pl.sections[key] || ""
    const separator = existing ? "\n" : ""
    return O.some({
      ...state,
      currentSlide: O.some({
        ...slide,
        pluginData: setPL(slide, {
          ...pl,
          sections: { ...pl.sections, [key]: existing + separator + text },
        }),
      }),
    })
  }

  // 何をするのか: solution body or principles (- prefix)
  if (h3 === "何をするのか") {
    if (text.startsWith("- ")) {
      const item = text.slice(2).trim()
      return O.some({
        ...state,
        currentSlide: O.some({
          ...slide,
          pluginData: setPL(slide, { ...pl, principles: [...pl.principles, item] }),
        }),
      })
    }
    // Skip bold sub-labels like **核となる原則:**
    if (text.startsWith("**") && text.endsWith("**")) return O.some(state)
    // Regular body text → solution
    const existing = pl.sections["solution"] || ""
    const separator = existing ? "\n" : ""
    return O.some({
      ...state,
      currentSlide: O.some({
        ...slide,
        pluginData: setPL(slide, {
          ...pl,
          sections: { ...pl.sections, solution: existing + separator + text },
        }),
      }),
    })
  }

  // 成功例: bold sub-labels switch currentSubField
  if (h3 === "成功例") {
    const boldMatch = text.match(/^\*\*(.+?):\*\*\s*(.*)$/)
    if (boldMatch) {
      const label = boldMatch[1]
      const content = boldMatch[2]
      const fieldMap: Record<string, string> = {
        "タイトル": "title",
        "Before": "before",
        "ズレ分析": "analysis",
        "After": "after",
      }
      const field = fieldMap[label]
      if (field) {
        return O.some({
          ...state,
          currentSlide: O.some({
            ...slide,
            pluginData: setPL(slide, {
              ...pl,
              success: { ...pl.success, [field]: content },
            }),
          }),
          pluginState: setPLState(state, { ...plState, currentSubField: field }),
        })
      }
    }
    // Continue appending to current sub-field
    if (plState.currentSubField) {
      const field = plState.currentSubField as keyof typeof pl.success
      const existing = pl.success[field] || ""
      const separator = existing ? "\n" : ""
      return O.some({
        ...state,
        currentSlide: O.some({
          ...slide,
          pluginData: setPL(slide, {
            ...pl,
            success: { ...pl.success, [field]: existing + separator + text },
          }),
        }),
      })
    }
    return O.some(state)
  }

  // 失敗例: bold sub-labels switch currentSubField
  if (h3 === "失敗例") {
    const boldMatch = text.match(/^\*\*(.+?):\*\*\s*(.*)$/)
    if (boldMatch) {
      const label = boldMatch[1]
      const content = boldMatch[2]
      const fieldMap: Record<string, string> = {
        "タイトル": "title",
        "やったこと": "attempt",
        "何がダメだったか": "problem",
        "こうすればよかった": "improvement",
      }
      const field = fieldMap[label]
      if (field) {
        return O.some({
          ...state,
          currentSlide: O.some({
            ...slide,
            pluginData: setPL(slide, {
              ...pl,
              failure: { ...pl.failure, [field]: content },
            }),
          }),
          pluginState: setPLState(state, { ...plState, currentSubField: field }),
        })
      }
    }
    // Continue appending to current sub-field
    if (plState.currentSubField) {
      const field = plState.currentSubField as keyof typeof pl.failure
      const existing = pl.failure[field] || ""
      const separator = existing ? "\n" : ""
      return O.some({
        ...state,
        currentSlide: O.some({
          ...slide,
          pluginData: setPL(slide, {
            ...pl,
            failure: { ...pl.failure, [field]: existing + separator + text },
          }),
        }),
      })
    }
    return O.some(state)
  }

  // 具体例: bold sub-labels, H4-based items, + body text accumulation
  if (plState.currentExampleIndex >= 0) {
    const idx = plState.currentExampleIndex
    const examples = [...pl.concreteExamples]
    const ex = examples[idx]
    if (ex) {
      // Check for bold sub-label: **Label:**
      const boldMatch = text.match(/^\*\*(.+?)[：:]\*\*\s*(.*)$/)
      if (boldMatch) {
        const label = boldMatch[1]
        const content = boldMatch[2]
        let field: string | undefined
        if (label.includes("ポイント")) {
          field = "goodPoints"
        } else if (label.includes("良い") && label.includes("例")) {
          field = "goodExample"
        } else if (label.includes("NG") || label.includes("短すぎる")) {
          field = "badExample"
        } else if (label.includes("失敗")) {
          field = "badReason"
        }
        if (field) {
          if (content) {
            examples[idx] = { ...ex, [field]: content }
          }
          return O.some({
            ...state,
            currentSlide: O.some({
              ...slide,
              pluginData: setPL(slide, { ...pl, concreteExamples: content ? examples : pl.concreteExamples }),
            }),
            pluginState: setPLState(state, { ...plState, currentSubField: field }),
          })
        }
      }
      // Accumulate into H4-based item (currentSubField = "item:N")
      const itemMatch = plState.currentSubField.match(/^item:(\d+)$/)
      if (itemMatch) {
        const itemIdx = parseInt(itemMatch[1], 10)
        const items = [...ex.items]
        const item = items[itemIdx]
        if (item) {
          const existing = item.text
          const separator = existing ? "\n" : ""
          items[itemIdx] = { ...item, text: existing + separator + text }
          examples[idx] = { ...ex, items }
          return O.some({
            ...state,
            currentSlide: O.some({
              ...slide,
              pluginData: setPL(slide, { ...pl, concreteExamples: examples }),
            }),
          })
        }
      }
      // Accumulate into current sub-field (legacy bold-label fields)
      if (plState.currentSubField) {
        const field = plState.currentSubField as keyof RawConcreteExample
        if (typeof ex[field] === "string") {
          const existing = ex[field] as string
          const separator = existing ? "\n" : ""
          examples[idx] = { ...ex, [field]: existing + separator + text }
          return O.some({
            ...state,
            currentSlide: O.some({
              ...slide,
              pluginData: setPL(slide, { ...pl, concreteExamples: examples }),
            }),
          })
        }
      }
    }
    return O.some(state)
  }

  // セルフチェック: - [ ] checkbox pattern
  if (h3 === "セルフチェック") {
    const checkMatch = text.match(/^- \[[ x]\]\s*(.+)$/)
    if (checkMatch) {
      return O.some({
        ...state,
        currentSlide: O.some({
          ...slide,
          pluginData: setPL(slide, { ...pl, checklist: [...pl.checklist, checkMatch[1]] }),
        }),
      })
    }
    return O.some(state)
  }

  // チーム活用シナリオ: numbered list
  if (h3 === "チーム活用シナリオ") {
    const numMatch = text.match(/^\d+\.\s*(.+)$/)
    if (numMatch) {
      return O.some({
        ...state,
        currentSlide: O.some({
          ...slide,
          pluginData: setPL(slide, { ...pl, teamScenarios: [...pl.teamScenarios, numMatch[1]] }),
        }),
      })
    }
    return O.some(state)
  }

  // テンプレート: non-code body text (absorb, code is handled by CodeFence*)
  if (h3 === "テンプレート") return O.some(state)

  return O.some(state)
}

// BlankLine: absorb (but preserve inside code blocks for template/concrete examples)
export const handleBlankLineInPL = (state: BuilderState, token: Token): O.Option<BuilderState> => {
  if (token.type !== "BlankLine" || state.mode !== "pattern-language") return O.none()

  const plState = getPLState(state)
  if (plState.inCodeBlock) {
    const pl = getPL(state)
    if (O.isSome(state.currentSlide) && pl) {
      const slide = state.currentSlide.value

      if (plState.currentH3 === "テンプレート") {
        return O.some({
          ...state,
          currentSlide: O.some({
            ...slide,
            pluginData: setPL(slide, { ...pl, template: pl.template + "\n" }),
          }),
        })
      }

      // 具体例 code block: preserve blank lines
      if (plState.currentExampleIndex >= 0 && plState.currentSubField === "goodExample") {
        const idx = plState.currentExampleIndex
        const examples = [...pl.concreteExamples]
        const ex = examples[idx]
        if (ex) {
          examples[idx] = { ...ex, goodExample: ex.goodExample + "\n" }
          return O.some({
            ...state,
            currentSlide: O.some({
              ...slide,
              pluginData: setPL(slide, { ...pl, concreteExamples: examples }),
            }),
          })
        }
      }
    }
  }

  return O.some(state)
}

// All mode handlers (exported for plugin registration)
export const patternLanguageModeHandlers = [
  handleH3InPL,
  handleH4InPL,
  handleCodeFenceOpenInPL,
  handleCodeFenceLineInPL,
  handleCodeFenceCloseInPL,
  handleBodyTextInPL,
  handleBlankLineInPL,
]
