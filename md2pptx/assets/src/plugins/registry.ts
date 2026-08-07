import { Option as O } from "effect"
import type { LayoutPlugin, TokenMatcher, TokenHandler, LayoutHandler } from "./types.js"

/** A plugin whose optional fields have been resolved to their derived defaults. */
type RegisteredPlugin = LayoutPlugin & { readonly tokenMatcher: TokenMatcher }

const plugins: RegisteredPlugin[] = []

/**
 * Recognize a directive by exact match on the line.
 *
 * Every plugin but numbered-list is recognized this way, so deriving the matcher from
 * the declared directive keeps the string in one place instead of repeating it in each
 * plugin's closure where nothing could check the two spellings still agree.
 */
const directiveMatcher = (directive: string, pluginId: string): TokenMatcher =>
  (line, lineNum) =>
    line.trim() === directive
      ? O.some({ type: "PluginDirective" as const, pluginId, line: lineNum })
      : O.none()

/** Called by plugins at import time to self-register */
export function registerPlugin(plugin: LayoutPlugin): void {
  plugins.push({
    ...plugin,
    tokenMatcher: plugin.tokenMatcher ?? directiveMatcher(plugin.docDirective, plugin.id),
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

export function getValidationConfig(tag: string): { maxChars: number; countChars?: (layout: import("../schema/presentation.js").SlideLayout) => number } | undefined {
  return plugins.find(p => p.layoutTag === tag)
}

export function getTitleFontSize(tag: string): number | undefined {
  return plugins.find(p => p.layoutTag === tag)?.titleFontSize
}
