import type { LayoutPlugin, TokenMatcher, TokenHandler, LayoutHandler } from "./types.js"

const plugins: LayoutPlugin[] = []

/** Called by plugins at import time to self-register */
export function registerPlugin(plugin: LayoutPlugin): void {
  plugins.push(plugin)
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
