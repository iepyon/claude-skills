import { Slide, withSlideId } from "../schema/presentation.js"
import { RawSlide } from "./builder-types.js"
import { rawSlideToSlide } from "./slide-converter.js"

/**
 * 見出しから ID を作る。
 *
 * 日本語の見出しをそのまま残すのは、この Wiki のデッキが日本語で書かれるため。
 * `[[種ノート]]` と書けることに価値があるので、ラテン文字に潰さない。
 * URL のフラグメントは UTF-8 を許すので、これで困らない。
 */
export function slugify(text: string): string {
  return text
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\s/\\_]+/g, "-")        // 空白・パス区切り → ハイフン
    .replace(/[^\p{L}\p{N}-]/gu, "")   // 文字・数字・ハイフン以外を落とす
    .replace(/-{2,}/g, "-")            // ハイフンの連続を畳む
    .replace(/^-+|-+$/g, "")           // 端のハイフンを落とす
}

/**
 * RawSlide 列を Slide 列に変換し、デッキ内で一意な ID を刻む。
 *
 * ここが ID の唯一の採番点であることには理由が2つある:
 *
 * 1. 11個のプラグイン converter は、それぞれ自前で ContentSlide を組み立てる。
 *    採番を converter 側に持たせると11箇所の同期が必要になる。
 * 2. pattern-language は `title: ""` のスライドを吐くなど、converter の出力からは
 *    元の見出しが読めないことがある。`raw.title` を読めるのは変換の直前だけ。
 *
 * 1つの RawSlide が複数スライドを生む場合（pattern-language の概要+詳細、
 * customer-journey のページ分割）は、2枚目以降に `--2`, `--3` を付ける。
 */
export function assignSlideIds(raws: readonly RawSlide[]): Slide[] {
  const used = new Map<string, number>()

  // 同じ ID が二度要求されたら連番を足して必ず一意にする。
  // 明示 ID の衝突も黙って解決せず、あとで /lint 相当の検出ができるよう
  // 元の並び順は保つ（採番は決定的）。
  const unique = (base: string): string => {
    const seen = used.get(base) ?? 0
    used.set(base, seen + 1)
    return seen === 0 ? base : `${base}-${seen + 1}`
  }

  return raws.flatMap((raw, rawIndex) => {
    const produced = rawSlideToSlide(raw)
    const explicit = raw.id?.trim()
    const base = explicit || slugify(raw.title) || `slide-${rawIndex + 1}`

    return produced.map((slide, offset) =>
      withSlideId(slide, unique(offset === 0 ? base : `${base}--${offset + 1}`))
    )
  })
}
