import { Option as O } from "effect"

// --- Raw intermediate types (pre-validation) ---

export type RawSlide = {
  type: "title" | "content"
  title: string
  // <!--id:foo--> で明示された ID。未指定ならタイトルから導出する
  // （導出とユニーク化は slide-ids.ts の責務）
  id?: string
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
  /** `<!--source-->` の本文。典拠なので、レイアウトはリンクを作らずに小さく敷く */
  source?: string
  codeLanguage?: string
  codeLines?: string[]
  codeCaption?: string
  pluginData?: Record<string, unknown>
}

export type RawSection = {
  heading?: string
  icon?: string
  body?: string
  /** dashboard: `<!--kpi-->` でこのセルを KPI タイルにする */
  kpi?: boolean
  /** dashboard: `<!--chart:*-->` でこのセルをグラフにする */
  chartType?: "bar" | "line" | "donut"
  /** dashboard: グラフのデータ表。1行目（ヘッダ）と本体行を分けて運ぶ */
  chartHeader?: string[]
  chartRows?: string[][]
}

export type LayoutMode =
  | "default"
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "grid"
  | "takeaway"
  | "source"
  | "code"

/** 解析に要る、md の文字列の外側の情報 */
export type ParseOptions = {
  /**
   * `![…](….svg)` の相対パスを解く起点＝そのデッキの md が置かれているディレクトリ。
   * 文字列だけを渡す呼び出し（API・テスト）では省略でき、その場合は cwd から解く。
   */
  baseDir?: string
}

export type BuilderState = {
  slides: RawSlide[]
  currentSlide: O.Option<RawSlide>
  currentSection: O.Option<RawSection>
  mode: string                           // LayoutMode or plugin mode
  // Plugin-specific state
  pluginState: Record<string, unknown>
  // 解析中ずっと変わらない外側の情報。状態に載せているのは、トークンハンドラが
  // 引数を1つしか受け取らないため（増やすと12プラグインの全ハンドラの型が変わる）
  options: ParseOptions
}

// 初期状態
export const initialState = (options: ParseOptions = {}): BuilderState => ({
  slides: [],
  currentSlide: O.none(),
  currentSection: O.none(),
  mode: "default",
  pluginState: {},
  options,
})
