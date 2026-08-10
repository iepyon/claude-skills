import { Option as O } from "effect"
import { directiveForPlugin, getLayoutByTag } from "../ontology/index.js"
import type { LayoutPlugin, TokenMatcher, TokenHandler, LayoutHandler } from "./types.js"

const plugins: LayoutPlugin[] = []

/**
 * Matchers, derived from the declaration on first use.
 *
 * Deriving them eagerly in `registerPlugin` would parse ontology.yaml as a side effect of
 * importing `plugins/index.js` — which every entry point and every test file does, so a
 * 32 KB YAML parse landed on startup even for paths that never tokenize anything.
 * Registration is always complete before the first `tokenize()`, so first-use is safe.
 */
let matchers: TokenMatcher[] | undefined

/**
 * Recognize a directive by exact match on the line.
 *
 * Every plugin but numbered-list is recognized this way, so deriving the matcher from
 * ontology.yaml's declaration keeps the string in one place instead of repeating it in
 * each plugin's closure where nothing could check the two spellings still agree.
 */
const directiveMatcher = (directive: string, pluginId: string): TokenMatcher =>
  (line, lineNum) =>
    line.trim() === directive
      ? O.some({ type: "PluginDirective" as const, pluginId, line: lineNum })
      : O.none()

/** Called by plugins at import time to self-register */
export function registerPlugin(plugin: LayoutPlugin): void {
  plugins.push(plugin)
  matchers = undefined // a later registration must not be missed by an already-built list
}

/** All registered plugins (read-only) */
export function getPlugins(): ReadonlyArray<LayoutPlugin> {
  return plugins
}

// --- Derived lookups for each pipeline layer ---

/**
 * One matcher per plugin, derived from ontology.yaml unless the plugin supplies its own.
 *
 * `directiveForPlugin` throws when the declaration has no layout for this id — registering
 * without a declaration would give a layout that parses but appears in no documentation and
 * is checked by no lint, which is the exact failure the ontology exists to prevent.
 */
export function getTokenMatchers(): ReadonlyArray<TokenMatcher> {
  if (!matchers) {
    matchers = plugins.map(
      p => p.tokenMatcher ?? directiveMatcher(directiveForPlugin(p.id), p.id)
    )
  }
  return matchers
}

export function getDirectiveHandlers(): ReadonlyArray<TokenHandler> {
  return plugins.map(p => p.directiveHandler)
}

export function getSectionRoute(mode: string): string | undefined {
  return plugins.find(p => p.mode === mode && p.sectionRoute)?.sectionRoute?.field
}

export function getModeHandlers(mode: string): ReadonlyArray<TokenHandler> | undefined {
  return plugins.find(p => p.mode === mode)?.modeHandlers
}

export function getConverters(): ReadonlyArray<(raw: import("../parser/builder-types.js").RawSlide) => import("effect").Option.Option<import("../schema/presentation.js").Slide[]>> {
  return [...plugins]
    .sort((a, b) => a.converterPriority - b.converterPriority)
    .map(p => p.converter)
}

export function getLayoutHandlers(): ReadonlyArray<LayoutHandler> {
  return plugins.map(p => p.layoutHandler)
}

/**
 * How to measure this layout's characters. The *limit* is not here — ontology.yaml owns it,
 * and `validation.ts` reads it via `maxCharsForTag`. Keeping one door onto the number is the
 * point of the ontology, so the registry does not offer a second.
 *
 * `produces`-side tags (PatternLanguageDetail) have no registration of their own, so fall
 * back to the plugin that owns the declaring layout. That fallback is general — it keys off
 * the declared `produces` list, not off any layout name.
 */
export function getCharCounter(
  tag: string
): ((layout: import("../schema/presentation.js").SlideLayout) => number) | undefined {
  const owner =
    plugins.find(p => p.layoutTag === tag) ??
    plugins.find(p => p.id === getLayoutByTag(tag)?.plugin)
  return owner?.countChars
}

export function getTitleFontSize(tag: string): number | undefined {
  return plugins.find(p => p.layoutTag === tag)?.titleFontSize
}
