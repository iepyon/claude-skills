/**
 * md が `![…](….svg)` で参照した図の読み込み。**デッキからの相対パスを読むのはここだけ。**
 * （`icon-resolver.ts` は Material Icon の同梱 SVG を、`ontology/index.ts` は宣言を読む。
 * どちらも場所が固定で、書き手の書いたパスには触れない。）
 *
 * 図を md の外に置くのは、md をそのまま GitHub で開いたときに絵として表示させるため。
 * そのぶん「どこから見た相対パスか」を誰かが知っていなければならず、それが `baseDir`
 * （デッキの md が置かれているディレクトリ）。パイプラインの入口から parser まで
 * 引き回している唯一の理由がこれなので、I/O もパス解決もこの1ファイルに閉じる。
 */
import { readFileSync } from "fs"
import { isAbsolute, resolve } from "path"
import { ParseError } from "./errors.js"

/** `<svg …>` 開始タグと、その中の width / height 属性 */
const SVG_OPEN_TAG = /<svg\b[^>]*>/i
const SVG_TAG_HEAD = /^<svg\b/i
const SIZE_ATTRIBUTE = /\s(width|height)\s*=\s*("[^"]*"|'[^']*')/gi
const VIEW_BOX = /\sviewBox\s*=\s*(?:"([^"]*)"|'([^']*)')/i

/**
 * 図の縦横比（幅 ÷ 高さ）を `viewBox` から返す。名乗っていなければ `undefined`。
 *
 * `fitSvgToBox` が外すのは width / height だけなので、埋め込んだ後の文字列にも
 * `viewBox` は残っている。読む側（レイアウト）が枠を図の形に合わせられるように、
 * ここで**唯一の解釈**を与える。SVG の既定の `preserveAspectRatio` は
 * `xMidYMid meet` — 枠の比が図と違えば、図は縮んで余白（レターボックス）が出る。
 * その余白を出さないための値。
 */
export function svgAspectRatio(svg: string): number | undefined {
  const tag = svg.match(SVG_OPEN_TAG)?.[0]
  if (!tag) return undefined
  const box = tag.match(VIEW_BOX)
  const value = box?.[1] ?? box?.[2]
  if (!value) return undefined
  const parts = value.trim().split(/[\s,]+/).map(Number)
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) return undefined
  const [, , width, height] = parts
  if (width <= 0 || height <= 0) return undefined
  return width / height
}

/**
 * 埋め込む前に、ルート `<svg>` の width / height を 100% に読み替える。
 *
 * ファイル側は実寸（viewBox と同じ大きさ）を名乗る必要がある — `<img>` として
 * 読まれるとき、実寸が無い SVG は既定の 300×150 に押し込められて字が潰れる。
 * 一方スライドでは右カラムの枠いっぱいに伸びてほしい。両方を1つの属性値では
 * 満たせないので、**ファイルは md のために実寸で書き、埋め込み側でここが読み替える**。
 * viewBox はそのまま残すので、拡大縮小しても座標系は変わらない。
 */
export function fitSvgToBox(svg: string): string {
  return svg.replace(SVG_OPEN_TAG, (tag) =>
    tag.replace(SIZE_ATTRIBUTE, "").replace(SVG_TAG_HEAD, '<svg width="100%" height="100%"')
  )
}

/**
 * 図のファイルを読んで、埋め込める SVG マークアップにして返す。
 *
 * 見つからない・拡張子が違うは **その場で落とす**。図解は WikiPattern の必須スロットで、
 * 空のまま通すと右半分が白いスライドが公開される（converter が空を弾くのと同じ考え）。
 *
 * `extension` を引数に取るのは汎用のためではない — 返すのは常に SVG で、
 * 受理する種類の**正本を宣言側に置く**ため（呼ぶ側が ontology.yaml から引いて渡す）。
 */
export function readSvgAsset(options: {
  readonly src: string
  readonly baseDir: string | undefined
  readonly extension: string
  readonly line: number
  /** メッセージに出す文脈（「パターン『種ノート』の図解」など） */
  readonly what: string
}): string {
  const { src, baseDir, extension, line, what } = options

  if (!src.toLowerCase().endsWith(extension)) {
    throw new ParseError({
      message: `${what}: '${src}' は ${extension} ではない（この枠が読めるのは ${extension} だけ）`,
      line,
    })
  }
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(src)) {
    throw new ParseError({
      message: `${what}: '${src}' は URL。生成時に中身を埋め込むので、参照はローカルのパスで書く`,
      line,
    })
  }

  // baseDir が無いのはデッキの出どころを知らない呼び出し（API に文字列だけ渡した場合）。
  // cwd から解く。読めなければ下のメッセージが baseDir の渡し忘れごと教える。
  const path = isAbsolute(src) ? src : resolve(baseDir ?? process.cwd(), src)
  try {
    return fitSvgToBox(readFileSync(path, "utf-8"))
  } catch {
    throw new ParseError({
      message:
        `${what}: '${src}' を読めない（${path}）。` +
        `パスは md ファイルからの相対で書く`,
      line,
    })
  }
}
