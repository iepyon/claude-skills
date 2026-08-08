import { Option as O } from "effect"
import { directiveForPlugin, getLayoutByTag, maxCharsForTag } from "../ontology/index.js"
import type { LayoutPlugin, TokenMatcher, TokenHandler, LayoutHandler } from "./types.js"

/** A plugin whose optional fields have been resolved to their derived defaults. */
type RegisteredPlugin = LayoutPlugin & { readonly tokenMatcher: TokenMatcher }

const plugins: RegisteredPlugin[] = []

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

/**
 * Called by plugins at import time to self-register.
 *
 * Throws when ontology.yaml has no layout for this plugin id — registering without a
 * declaration would give a layout that parses but appears in no documentation and is
 * checked by no lint, which is the exact failure the ontology exists to prevent.
 */
export function registerPlugin(plugin: LayoutPlugin): void {
  plugins.push({
    ...plugin,
    tokenMatcher: plugin.tokenMatcher ?? directiveMatcher(directiveForPlugin(plugin.id), plugin.id),
  })
}

/** All registered plugins (read-only) */
export function getPlugins(): ReadonlyArray<LayoutPlugin> {
  return plugins
}

// --- Derived lookups for each pipeline layer ---

export function getTokenMatchers(): ReadonlyArray<TokenMatcher> {
  return plugins.map(p => p.tokenMatcher)
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
 * The character budget for a layout and how to measure it.
 *
 * The limit comes from ontology.yaml (keyed by `_tag`), the counter from the plugin.
 * Splitting them this way is what lets a layout that renders as two slides —
 * PatternLanguage's overview and detail — share one declared limit: the detail page has
 * no registration of its own, so keying the limit off the registry silently gave it the
 * default while the declaration said 1024.
 */
export function getValidationConfig(tag: string): {
  maxChars: number
  countChars?: (layout: import("../schema/presentation.js").SlideLayout) => number
} {
  // `produces` side tags (PatternLanguageDetail) have no registration of their own, so
  // fall back to the plugin that owns the declaring layout.
  const owner =
    plugins.find(p => p.layoutTag === tag) ??
    plugins.find(p => p.id === getLayoutByTag(tag)?.plugin)
  return { maxChars: maxCharsForTag(tag), countChars: owner?.countChars }
}

export function getTitleFontSize(tag: string): number | undefined {
  return plugins.find(p => p.layoutTag === tag)?.titleFontSize
}
