import { Effect } from "effect"
import { parse } from "yaml"
import { readFile } from "node:fs/promises"
import { ThemeError } from "../errors.js"

export interface Theme {
  fonts: {
    body: string
    code: string
  }
  titleSlide: {
    background: string
    titleColor: string
    titleSize: number
    subtitleColor: string
    subtitleSize: number
  }
  contentSlide: {
    background: string
    titleColor: string
    titleSize: number
    headingColor: string
    headingSize: number
    textColor: string
    bodySize: number
    gridHeadingSize: number
    gridBodySize: number
    iconSize: number
    iconColor: string
    takeawaySize: number
    takeawayColor: string
    iconCardAccentColors: string[]
    iconCardBackground: string
    iconCardHeadingSize: number
    iconCardBodySize: number
    stepsColors: string[]
  }
  codeDisplay: {
    backgroundColor: string
    textColor: string
    fontSize: number
    lineHeight: number
    labelColor: string
    labelSize: number
    captionSize: number
    captionColor: string
    borderRadius: number
    padding: number
  }
  border: {
    color: string
    width: number
  }
  indent: {
    body: number
  }
  numberedList: {
    badgeColors: string[]
    badgeTextColor: string
    separatorColor: string
    altRowColor: string
    headingSize: number
    bodySize: number
  }
  table: {
    headerBackground: string
    headerTextColor: string
    headerFontSize: number
    bodyFontSize: number
    borderColor: string
    altRowColor: string
  }
  agenda: {
    badgeColor: string
    badgeTextColor: string
    titleSize: number
    subtitleSize: number
    itemSize: number
  }
  /**
   * Wiki パターンの3節の文字サイズ。**`contentSlide` に相乗りさせてはいけない。**
   *
   * `dispatchLayout` は、はみ出したスライドの `contentSlide.{heading,body,…}Size` を
   * 段階的に縮めて再レイアウトする。それは1枚のスライドを収めるための仕組みだが、
   * Wiki のパターンは隣り合わせで読まれるページなので、**本文の長さに応じて
   * ページごとに文字が小さくなる**のがそのまま不揃いとして出る。
   * ここに置いた値は縮小の対象外なので、どのパターンも同じ大きさで描かれ、
   * 収まらない本文は縮む代わりに `validateLayout` がビルドを止める。
   */
  wikiPattern: {
    headingSize: number
    bodySize: number
    /** 出典の文字の大きさ。読まずに飛ばせる小ささが要件なので、本文とは桁を変える */
    sourceSize: number
    sourceColor: string
  }
}

/**
 * テーマ YAML は節ごとの部分指定を許す（`contentSlide.titleSize` だけ上書きする等）。
 *
 * **`Theme` は2階層なので、各節に `Partial` を当てるだけで足りる。** 汎用の DeepPartial を
 * 再帰させると `string[] extends object` が真なので**配列の要素まで省略可能**になり、
 * `(string | undefined)[]` が `Theme` に代入できず型検査が落ちる（実際に3件落ちていた）。
 * 再帰しなければその穴は構造的に生じない — 配列を特例で除外する必要も無い。
 *
 * 3階層目を足すと、その階層は部分指定できなくなる。黙って通るのではなく `mergeTheme` が
 * コンパイルエラーになるので、そのとき直せる。
 */
export type PartialTheme = { [K in keyof Theme]?: Partial<Theme[K]> }

export const DEFAULT_THEME: Theme = {
  fonts: {
    body: "Arial",
    code: "Consolas",
  },
  titleSlide: {
    background: "1E40AF", // 鮮やかなブルー
    titleColor: "FFFFFF",
    titleSize: 32,
    subtitleColor: "BFDBFE", // ライトブルー
    subtitleSize: 18,
  },
  contentSlide: {
    background: "",
    titleColor: "1E40AF", // 鮮やかなブルー（スライドタイトル）
    titleSize: 24,
    headingColor: "3B82F6", // ミディアムブルー（セクション見出し）
    headingSize: 18,
    textColor: "1F2937", // ダークグレー（本文）
    bodySize: 16,
    gridHeadingSize: 10,
    gridBodySize: 9,
    iconSize: 56,
    iconColor: "3B82F6", // ミディアムブルー
    takeawaySize: 20,
    takeawayColor: "1E40AF", // 鮮やかなブルー（目立つように）
    iconCardAccentColors: ["E67E22", "0891B2", "7C3AED"],
    iconCardBackground: "F8FAFC",
    iconCardHeadingSize: 16,
    iconCardBodySize: 14,
    stepsColors: ["9CA3AF", "14B8A6", "F97316", "3B82F6", "8B5CF6", "EC4899", "F59E0B"],
  },
  codeDisplay: {
    backgroundColor: "1E1E1E",
    textColor: "D4D4D4",
    fontSize: 12,
    lineHeight: 1.5,
    labelColor: "858585",
    labelSize: 10,
    captionSize: 14,
    captionColor: "1F2937",
    borderRadius: 0.08,
    padding: 0.2,
  },
  border: {
    color: "93C5FD", // ライトブルー
    width: 2.0,
  },
  indent: {
    body: 0, // 見出しと本文の位置を揃える（インチ）
  },
  numberedList: {
    badgeColors: ["1E40AF", "3B82F6", "0891B2", "059669", "D97706"],
    badgeTextColor: "FFFFFF",
    separatorColor: "E5E7EB",
    altRowColor: "F3F4F6",
    headingSize: 14,
    bodySize: 12,
  },
  // 15/14 は contentSlide の 18/16 に一段だけ寄せた値（元は 12/11）。表だけ本文より
  // 5pt 小さいと、同じサイトを読み進めたときにその1枚で目が止まる。**行の高さは
  // 残りの高さを行数で割って決まる**ので、字を大きくしても行は増えない — 増えるのは
  // 1行に入る字数の上限が下がることだけで、折り返して2行になった枚は
  // `validateLayout` が止める（配布先のデッキで黙って重ならないため、ここは
  // contentSlide の 18/16 までは上げない）。
  table: {
    headerBackground: "1B2A4A",
    headerTextColor: "FFFFFF",
    headerFontSize: 15,
    bodyFontSize: 14,
    borderColor: "E5E7EB",
    altRowColor: "F7F8FA",
  },
  agenda: {
    badgeColor: "14B8A6",
    badgeTextColor: "FFFFFF",
    titleSize: 36,
    subtitleSize: 14,
    itemSize: 16,
  },
  // 16/14 は「配布中の22パターンが1枚も縮まずに収まる最大」から決めた。
  // 18/16（contentSlide の既定）だと本文の長い2枚が入らず、左カラムをどれだけ
  // 広げても入らない（幅ではなく高さで詰まる）
  wikiPattern: {
    headingSize: 16,
    bodySize: 14,
    sourceSize: 6,
    sourceColor: "94A3B8",
  },
}

function stripHashPrefix(value: unknown): unknown {
  if (typeof value === "string" && value.startsWith("#")) {
    return value.slice(1)
  }
  if (Array.isArray(value)) {
    return value.map(stripHashPrefix)
  }
  if (typeof value === "object" && value !== null) {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      result[k] = stripHashPrefix(v)
    }
    return result
  }
  return value
}

export function mergeTheme(partial: PartialTheme): Theme {
  const stripped = stripHashPrefix(partial) as PartialTheme

  return {
    fonts: {
      body: stripped.fonts?.body ?? DEFAULT_THEME.fonts.body,
      code: stripped.fonts?.code ?? DEFAULT_THEME.fonts.code,
    },
    titleSlide: {
      background: stripped.titleSlide?.background ?? DEFAULT_THEME.titleSlide.background,
      titleColor: stripped.titleSlide?.titleColor ?? DEFAULT_THEME.titleSlide.titleColor,
      titleSize: stripped.titleSlide?.titleSize ?? DEFAULT_THEME.titleSlide.titleSize,
      subtitleColor: stripped.titleSlide?.subtitleColor ?? DEFAULT_THEME.titleSlide.subtitleColor,
      subtitleSize: stripped.titleSlide?.subtitleSize ?? DEFAULT_THEME.titleSlide.subtitleSize,
    },
    contentSlide: {
      background: stripped.contentSlide?.background ?? DEFAULT_THEME.contentSlide.background,
      titleColor: stripped.contentSlide?.titleColor ?? DEFAULT_THEME.contentSlide.titleColor,
      titleSize: stripped.contentSlide?.titleSize ?? DEFAULT_THEME.contentSlide.titleSize,
      headingColor: stripped.contentSlide?.headingColor ?? DEFAULT_THEME.contentSlide.headingColor,
      headingSize: stripped.contentSlide?.headingSize ?? DEFAULT_THEME.contentSlide.headingSize,
      textColor: stripped.contentSlide?.textColor ?? DEFAULT_THEME.contentSlide.textColor,
      bodySize: stripped.contentSlide?.bodySize ?? DEFAULT_THEME.contentSlide.bodySize,
      gridHeadingSize: stripped.contentSlide?.gridHeadingSize ?? DEFAULT_THEME.contentSlide.gridHeadingSize,
      gridBodySize: stripped.contentSlide?.gridBodySize ?? DEFAULT_THEME.contentSlide.gridBodySize,
      iconSize: stripped.contentSlide?.iconSize ?? DEFAULT_THEME.contentSlide.iconSize,
      iconColor: stripped.contentSlide?.iconColor ?? DEFAULT_THEME.contentSlide.iconColor,
      takeawaySize: stripped.contentSlide?.takeawaySize ?? DEFAULT_THEME.contentSlide.takeawaySize,
      takeawayColor: stripped.contentSlide?.takeawayColor ?? DEFAULT_THEME.contentSlide.takeawayColor,
      iconCardAccentColors: stripped.contentSlide?.iconCardAccentColors ?? DEFAULT_THEME.contentSlide.iconCardAccentColors,
      iconCardBackground: stripped.contentSlide?.iconCardBackground ?? DEFAULT_THEME.contentSlide.iconCardBackground,
      iconCardHeadingSize: stripped.contentSlide?.iconCardHeadingSize ?? DEFAULT_THEME.contentSlide.iconCardHeadingSize,
      iconCardBodySize: stripped.contentSlide?.iconCardBodySize ?? DEFAULT_THEME.contentSlide.iconCardBodySize,
      stepsColors: stripped.contentSlide?.stepsColors ?? DEFAULT_THEME.contentSlide.stepsColors,
    },
    codeDisplay: {
      backgroundColor: stripped.codeDisplay?.backgroundColor ?? DEFAULT_THEME.codeDisplay.backgroundColor,
      textColor: stripped.codeDisplay?.textColor ?? DEFAULT_THEME.codeDisplay.textColor,
      fontSize: stripped.codeDisplay?.fontSize ?? DEFAULT_THEME.codeDisplay.fontSize,
      lineHeight: stripped.codeDisplay?.lineHeight ?? DEFAULT_THEME.codeDisplay.lineHeight,
      labelColor: stripped.codeDisplay?.labelColor ?? DEFAULT_THEME.codeDisplay.labelColor,
      labelSize: stripped.codeDisplay?.labelSize ?? DEFAULT_THEME.codeDisplay.labelSize,
      captionSize: stripped.codeDisplay?.captionSize ?? DEFAULT_THEME.codeDisplay.captionSize,
      captionColor: stripped.codeDisplay?.captionColor ?? DEFAULT_THEME.codeDisplay.captionColor,
      borderRadius: stripped.codeDisplay?.borderRadius ?? DEFAULT_THEME.codeDisplay.borderRadius,
      padding: stripped.codeDisplay?.padding ?? DEFAULT_THEME.codeDisplay.padding,
    },
    border: {
      color: stripped.border?.color ?? DEFAULT_THEME.border.color,
      width: stripped.border?.width ?? DEFAULT_THEME.border.width,
    },
    indent: {
      body: stripped.indent?.body ?? DEFAULT_THEME.indent.body,
    },
    numberedList: {
      badgeColors: stripped.numberedList?.badgeColors ?? DEFAULT_THEME.numberedList.badgeColors,
      badgeTextColor: stripped.numberedList?.badgeTextColor ?? DEFAULT_THEME.numberedList.badgeTextColor,
      separatorColor: stripped.numberedList?.separatorColor ?? DEFAULT_THEME.numberedList.separatorColor,
      altRowColor: stripped.numberedList?.altRowColor ?? DEFAULT_THEME.numberedList.altRowColor,
      headingSize: stripped.numberedList?.headingSize ?? DEFAULT_THEME.numberedList.headingSize,
      bodySize: stripped.numberedList?.bodySize ?? DEFAULT_THEME.numberedList.bodySize,
    },
    table: {
      headerBackground: stripped.table?.headerBackground ?? DEFAULT_THEME.table.headerBackground,
      headerTextColor: stripped.table?.headerTextColor ?? DEFAULT_THEME.table.headerTextColor,
      headerFontSize: stripped.table?.headerFontSize ?? DEFAULT_THEME.table.headerFontSize,
      bodyFontSize: stripped.table?.bodyFontSize ?? DEFAULT_THEME.table.bodyFontSize,
      borderColor: stripped.table?.borderColor ?? DEFAULT_THEME.table.borderColor,
      altRowColor: stripped.table?.altRowColor ?? DEFAULT_THEME.table.altRowColor,
    },
    agenda: {
      badgeColor: stripped.agenda?.badgeColor ?? DEFAULT_THEME.agenda.badgeColor,
      badgeTextColor: stripped.agenda?.badgeTextColor ?? DEFAULT_THEME.agenda.badgeTextColor,
      titleSize: stripped.agenda?.titleSize ?? DEFAULT_THEME.agenda.titleSize,
      subtitleSize: stripped.agenda?.subtitleSize ?? DEFAULT_THEME.agenda.subtitleSize,
      itemSize: stripped.agenda?.itemSize ?? DEFAULT_THEME.agenda.itemSize,
    },
    wikiPattern: {
      headingSize: stripped.wikiPattern?.headingSize ?? DEFAULT_THEME.wikiPattern.headingSize,
      bodySize: stripped.wikiPattern?.bodySize ?? DEFAULT_THEME.wikiPattern.bodySize,
      sourceSize: stripped.wikiPattern?.sourceSize ?? DEFAULT_THEME.wikiPattern.sourceSize,
      sourceColor: stripped.wikiPattern?.sourceColor ?? DEFAULT_THEME.wikiPattern.sourceColor,
    },
  }
}

export function loadThemeFile(path: string): Effect.Effect<Theme, ThemeError> {
  return Effect.gen(function* () {
    const content = yield* Effect.tryPromise({
      try: () => readFile(path, "utf-8"),
      catch: (error) =>
        new ThemeError({
          message: `Failed to read theme file: ${error instanceof Error ? error.message : String(error)}`,
        }),
    })

    const parsed = yield* Effect.try({
      try: () => parse(content) as PartialTheme,
      catch: (error) =>
        new ThemeError({
          message: `Failed to parse YAML: ${error instanceof Error ? error.message : String(error)}`,
        }),
    })

    return mergeTheme(parsed)
  })
}
