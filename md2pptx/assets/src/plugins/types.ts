import { Option as O } from "effect"
import type { SlideLayout, Slide } from "../schema/presentation.js"
import type { BuilderState, RawSlide } from "../parser/builder-types.js"
import type { Token } from "../parser/tokenizer.js"
import type { Theme } from "../schema/theme.js"
import type { LayoutResult } from "../renderer/layout/types.js"

/** Token matcher: line → Option<Token> */
export type TokenMatcher = (line: string, lineNum: number) => O.Option<Token>

/** Token handler: state + token → Option<new state> */
export type TokenHandler = (state: BuilderState, token: Token) => O.Option<BuilderState>

/** Layout handler: layout + titleY + theme → Option<LayoutResult> */
export type LayoutHandler = (
  layout: SlideLayout,
  titleY: number,
  theme: Theme
) => O.Option<LayoutResult>

/** Plugin definition — covers all pipeline layers */
export interface LayoutPlugin {
  readonly id: string                    // e.g. "lean-canvas"
  readonly layoutTag: string             // _tag on SlideLayout, e.g. "LeanCanvas"
  readonly mode: string                  // parser mode value

  // Tokenizer: directive recognition
  readonly tokenMatcher: TokenMatcher

  // Parser: directive handler
  readonly directiveHandler: TokenHandler
  // Tier1: standard section collection (mode → RawSlide field name)
  readonly sectionRoute?: { field: string }
  // Tier2: custom token handlers (intercept H3/H4/BodyText etc.)
  readonly modeHandlers?: ReadonlyArray<TokenHandler>

  // Slide Converter: RawSlide → typed slide(s)
  readonly converterPriority: number     // lower = checked first
  readonly converter: (raw: RawSlide) => O.Option<Slide[]>

  // Validation: character limits
  readonly maxChars: number
  readonly countChars?: (layout: SlideLayout) => number

  // Layout Engine: _tag → LayoutResult
  readonly layoutHandler: LayoutHandler

  // Title display customization (optional)
  readonly titleFontSize?: number        // e.g. LeanCanvas uses 16pt
}
