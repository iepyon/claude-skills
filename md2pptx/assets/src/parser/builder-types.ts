import { Option as O } from "effect"

// --- Raw intermediate types (pre-validation) ---

export type RawSlide = {
  type: "title" | "content"
  title: string
  subtitle?: string
  sections?: RawSection[]
  leftRatio?: number
  rightRatio?: number
  leftSections?: RawSection[]
  rightSections?: RawSection[]
  topRatio?: number
  bottomRatio?: number
  topSections?: RawSection[]
  bottomSections?: RawSection[]
  gridRows?: number
  gridCols?: number
  gridCells?: RawSection[]
  takeaway?: string
  codeLanguage?: string
  codeLines?: string[]
  codeCaption?: string
  pluginData?: Record<string, unknown>
}

export type RawSection = {
  heading?: string
  icon?: string
  body?: string
}

export type LayoutMode = "default" | "left" | "right" | "top" | "bottom" | "grid" | "takeaway" | "code"

export type BuilderState = {
  slides: RawSlide[]
  currentSlide: O.Option<RawSlide>
  currentSection: O.Option<RawSection>
  mode: string                           // LayoutMode or plugin mode
  // Plugin-specific state
  pluginState: Record<string, unknown>
}

// 初期状態
export const initialState: BuilderState = {
  slides: [],
  currentSlide: O.none(),
  currentSection: O.none(),
  mode: "default",
  pluginState: {},
}
