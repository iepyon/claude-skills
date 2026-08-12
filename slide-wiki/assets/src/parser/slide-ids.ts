import { Slide, withSlideId } from "../schema/presentation.js"
import { RawSlide } from "./builder-types.js"
import { rawSlideToSlide } from "./slide-converter.js"

import { slugify } from "../slug.js"

/** 1つの RawSlide が生む2枚目以降の ID。`--2`, `--3` と数える */
const derive = (base: string, offset: number): string =>
  offset === 0 ? base : `${base}--${offset + 1}`

/**
 * RawSlide 列を Slide 列に変換し、デッキ内で一意な ID を刻む。
 *
 * ここが ID の唯一の採番点であることには理由が2つある:
 *
 * 1. 10個のプラグイン converter は、それぞれ自前で ContentSlide を組み立てる。
 *    採番を converter 側に持たせると10箇所の同期が必要になる。
 * 2. agenda は `title: ""` のスライドを吐くなど、converter の出力からは
 *    元の見出しが読めないことがある。`raw.title` を読めるのは変換の直前だけ。
 *
 * 1つの RawSlide が複数スライドを生む場合（customer-journey のページ分割）は、
 * 2枚目以降に `--2`, `--3` を付ける。
 *
 * **`<!--id:-->` は予約として扱う。** 書き手が明示した ID は、他のスライドの見出しから
 * 自動生成された slug より強い。`# 設計` の表紙と `<!--id:設計-->` の本文が同じデッキに
 * あるとき、`#設計` が指すのは書き手が名指したほうでなければならない
 * （以前は md の並び順で勝敗が決まり、先に現れた表紙が `設計` を取っていた）。
 *
 * **一意にすること自体は譲らない。** ID が重複するとサイトのリンクが解決できないので、
 * 明示 ID 同士がぶつかった場合も連番で先に進む。そこは機械に決められないので、
 * `ontology/lint.ts` の `slide-id` が跡を報告する（`--strict` で終了コード 1）。
 */
export function assignSlideIds(raws: readonly RawSlide[]): Slide[] {
  // 変換を先に済ませる。1つの RawSlide が何枚を生むかは変換しないと分からず、
  // 明示 ID を予約するには派生 ID（`--2`）まで数えておく必要がある。
  const converted = raws.map((raw, rawIndex) => {
    const explicit = raw.id?.trim()
    return {
      produced: rawSlideToSlide(raw),
      isExplicit: Boolean(explicit),
      base: explicit || slugify(raw.title) || `slide-${rawIndex + 1}`,
    }
  })

  // 明示 ID が押さえている名前。自動 slug はここを避けて連番に回る
  const claimed = new Set<string>()
  for (const entry of converted) {
    if (!entry.isExplicit) continue
    entry.produced.forEach((_, offset) => claimed.add(derive(entry.base, offset)))
  }

  const taken = new Set<string>()
  const assign = (want: string, isExplicit: boolean): string => {
    // 自動 slug は「まだ使われていない」だけでなく「明示 ID の予約でもない」ことを要求する。
    // 明示 ID 自身は予約の持ち主なので `claimed` を見ない
    const free = (candidate: string): boolean =>
      !taken.has(candidate) && (isExplicit || !claimed.has(candidate))

    let candidate = want
    for (let n = 2; !free(candidate); n++) candidate = `${want}-${n}`
    taken.add(candidate)
    return candidate
  }

  return converted.flatMap((entry) =>
    entry.produced.map((slide, offset) =>
      withSlideId(slide, assign(derive(entry.base, offset), entry.isExplicit))
    )
  )
}
