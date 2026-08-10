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

  /**
   * Tokenizer: directive recognition. **Omit it** — the registry derives an exact-match
   * matcher from the directive declared in ontology.yaml, which covers every plugin but one.
   *
   * The directive itself is NOT declared here: ontology.yaml is its single source of
   * truth, so the string that users type, the string the tokenizer matches and the string
   * the documentation shows are one and the same. `registerPlugin` looks it up by `id`
   * and throws when the plugin has no ontology entry — a new plugin cannot stay invisible
   * to the Claude that has to use it.
   *
   * Supply a matcher only when recognition is genuinely richer than a single literal, as
   * with numbered-list's `<!--numbered-list:(circle|bar)-->`, whose captured variant has
   * to reach the parser. A hand-written matcher takes over recognition completely, so the
   * ontology's directive then only documents the canonical spelling.
   */
  readonly tokenMatcher?: TokenMatcher

  // Parser: directive handler
  readonly directiveHandler: TokenHandler
  // Tier1: standard section collection (mode → RawSlide field name)
  readonly sectionRoute?: { field: string }
  // Tier2: custom token handlers (intercept H3/H4/BodyText etc.)
  readonly modeHandlers?: ReadonlyArray<TokenHandler>

  // Slide Converter: RawSlide → typed slide(s)
  readonly converterPriority: number     // lower = checked first
  readonly converter: (raw: RawSlide) => O.Option<Slide[]>

  // Validation: how to count this layout's characters.
  // The *limit* is not declared here — ontology.yaml's `max-chars` (falling back to
  // `limits.max-chars-per-slide`) is its single source of truth, keyed by `_tag`, so a
  // layout that renders as two slides gets the same limit on both.
  readonly countChars?: (layout: SlideLayout) => number

  // Layout Engine: _tag → LayoutResult
  readonly layoutHandler: LayoutHandler

  // Title display customization (optional)
  readonly titleFontSize?: number        // e.g. LeanCanvas uses 16pt
}
