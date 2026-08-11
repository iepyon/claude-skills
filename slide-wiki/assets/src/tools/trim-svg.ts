/**
 * 図解の枠を中身に合わせて詰める。
 *
 * 図は右カラムの下敷きいっぱいに描かれるので、**SVG の中に残った余白は、
 * そのまま絵の小ささになる**。手で描いた図はどうしても canvas の端を余らせるため
 * （配布中の22枚は 340x320 の枠に平均 283x248 しか使っていなかった）、
 * 枠のほうを中身に寄せて、同じ場所に大きく描く。
 *
 * **縦横比は変えない。** 比を変えると下敷きの形がページごとに変わり、
 * Wiki として並べたときに図の枠が揃わなくなる（下敷きは `viewBox` の比で組まれる
 * ——`wiki-pattern/layout.ts` を見よ）。詰めるのは、比を保ったまま入る最小の枠まで。
 *
 * **中身の測り方は控えめに寄せる**（大きめに見積もる）。`<text>` の幅は読む人の
 * フォントで変わり、足りなければ字が枠の外に出て**切れる**（root の `<svg>` は
 * viewBox の外を描かない）。切るくらいなら余白が少し残るほうがよい。
 *
 * 中身から枠を決めるので、何度走らせても結果は変わらない（1度詰めた図は、
 * 次に測っても同じ枠を返す）。
 *
 *   npx tsx src/tools/trim-svg.ts                      # 配布中の図解すべて
 *   npx tsx src/tools/trim-svg.ts --dry-run            # 変えずに、詰まる量だけ見る
 *   npx tsx src/tools/trim-svg.ts --check              # 詰め残しがあれば非ゼロ終了
 *   npx tsx src/tools/trim-svg.ts path/to/one.svg ...  # 名指し
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"
import { decodeEntities } from "../entities.js"

/** 中身の周りに残す余白。図の大きいほうの辺に対する割合と、最低値（ユーザ単位） */
const PAD_RATIO = 0.02
const PAD_MIN = 4

/**
 * この割合より小さい詰め残しは触らない。
 *
 * 枠は整数で書く（`width` / `height` は実寸として md にも出る）ので、丸めのぶん
 * 比が 1 単位ぶん動く。閾値が無いと、走らせるたびに 1 単位ずつ揺れて**全図が
 * 差分になる**（`roughen-svg.ts` が乱数を実行時に引かないのと同じ話）。
 * 1% は絵の大きさとしては見えない差で、そこで止めておけば2度目は無風になる。
 */
const TOLERANCE = 0.01

/**
 * 字幅の見積もりを膨らませる係数。
 *
 * `<text>` は `font-family="sans-serif"` としか名乗っておらず、実際の字幅は
 * 読む人の環境で決まる。測った環境より広いフォントで開かれても切れないように、
 * 見積もりを 15% 増しで持つ。
 */
const TEXT_SAFETY = 1.15

/** 全角として数える文字の範囲（renderer/layout/helpers.ts と同じ範囲） */
const FULL_WIDTH = /[ᄀ-ᅟ⺀-〾ぁ-㏿㐀-䶿一-鿿ꀀ-꓏가-힣豈-﫿︰-﹯＀-｠￠-￦]/

/**
 * 1行の幅を「全角何個ぶんか」で返す。半角は 0.6。
 *
 * レイアウトの見積もり（`helpers.ts`、半角 0.5）より広く採るのは、目的が逆だから。
 * あちらは正しいスライドを誤って落とさないために**小さめ**に数えるが、こちらは
 * 足りなければ字が切れるので**大きめ**に数える。
 */
const widthInEm = (text: string): number => {
  let em = 0
  for (const char of text) em += FULL_WIDTH.test(char) ? 1 : 0.6
  return em
}

interface Box {
  readonly minX: number
  readonly minY: number
  readonly maxX: number
  readonly maxY: number
}

const EMPTY: Box = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }

const isEmpty = (b: Box) => b.minX > b.maxX || b.minY > b.maxY

const union = (a: Box, b: Box): Box => ({
  minX: Math.min(a.minX, b.minX),
  minY: Math.min(a.minY, b.minY),
  maxX: Math.max(a.maxX, b.maxX),
  maxY: Math.max(a.maxY, b.maxY),
})

const grow = (b: Box, by: number): Box => ({
  minX: b.minX - by,
  minY: b.minY - by,
  maxX: b.maxX + by,
  maxY: b.maxY + by,
})

const pointsBox = (points: ReadonlyArray<readonly [number, number]>): Box =>
  points.reduce(
    (box, [x, y]) => union(box, { minX: x, minY: y, maxX: x, maxY: y }),
    EMPTY
  )

const attr = (tag: string, name: string): string | undefined =>
  tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1]

/**
 * `d` の通る点を返す。**制御点も点として数える。**
 *
 * 曲線は制御点の凸包の内側を通るので、制御点まで含めた箱は実際より大きい
 * ＝ 切らない側に外れる。正確な曲線の極値を解くより、この見積もりのほうが
 * この道具の目的（切らない）に合っている。
 */
const pathPoints = (d: string): Array<readonly [number, number]> => {
  const points: Array<readonly [number, number]> = []
  // コマンド1つ = 英字 + それに続く数値の並び
  const commands = d.match(/[MmLlHhVvCcSsQqTtAaZz][^MmLlHhVvCcSsQqTtAaZz]*/g) ?? []
  let x = 0
  let y = 0
  let startX = 0
  let startY = 0
  for (const command of commands) {
    const code = command[0]!
    const nums = (command.slice(1).match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number)
    const rel = code === code.toLowerCase()
    const upper = code.toUpperCase()

    if (upper === "Z") {
      x = startX
      y = startY
      continue
    }
    if (upper === "H" || upper === "V") {
      for (const v of nums) {
        if (upper === "H") x = rel ? x + v : v
        else y = rel ? y + v : v
        points.push([x, y])
      }
      continue
    }
    if (upper === "A") {
      // rx ry rot large-arc sweep x y。弧の膨らみは半径ぶんまでなので、
      // 終点を半径で膨らませた箱で受ける（配布中の図に弧は無く、備えだけ）
      for (let i = 0; i + 6 < nums.length; i += 7) {
        const [rx, ry] = [Math.abs(nums[i]!), Math.abs(nums[i + 1]!)]
        const ex = rel ? x + nums[i + 5]! : nums[i + 5]!
        const ey = rel ? y + nums[i + 6]! : nums[i + 6]!
        points.push([Math.min(x, ex) - rx, Math.min(y, ey) - ry])
        points.push([Math.max(x, ex) + rx, Math.max(y, ey) + ry])
        x = ex
        y = ey
      }
      continue
    }

    // M/L/T は1組、S/Q は2組、C は3組。いずれも最後の組が次の現在点になる
    const stride = upper === "C" ? 6 : upper === "S" || upper === "Q" ? 4 : 2
    for (let i = 0; i + 1 < nums.length; i += stride) {
      const group = nums.slice(i, i + stride)
      for (let k = 0; k + 1 < group.length; k += 2) {
        const px = rel ? x + group[k]! : group[k]!
        const py = rel ? y + group[k + 1]! : group[k + 1]!
        points.push([px, py])
        if (k + 2 >= group.length) {
          x = px
          y = py
        }
      }
      if (upper === "M" && i === 0) {
        startX = x
        startY = y
      }
    }
  }
  return points
}

/**
 * 字の箱。基線から上に 1.0em、下に 0.35em を見る。
 *
 * 実測（Chromium + IPAGothic）の字面は上 0.9em・下 0.3em ほどだが、和文は
 * フォントによって仮想ボディいっぱいまで使う。**足りない側に外すと字が切れる**ので、
 * em の外まで採っておく。
 */
const textBox = (tag: string, body: string): Box => {
  const size = Number(attr(tag, "font-size") ?? 16)
  const x = Number(attr(tag, "x") ?? 0)
  const y = Number(attr(tag, "y") ?? 0)
  const w = widthInEm(decodeEntities(body).trim()) * size * TEXT_SAFETY
  const anchor = attr(tag, "text-anchor") ?? "start"
  const left = anchor === "middle" ? x - w / 2 : anchor === "end" ? x - w : x
  // 字は始点より左へ出ることがある（サイドベアリングが負の字がある）。
  // 実測でも 1 単位ぶん左に出ていたので、両側に 0.1em 見ておく
  const bearing = size * 0.1
  return { minX: left - bearing, minY: y - size, maxX: left + w + bearing, maxY: y + size * 0.35 }
}

const COMMENT = /<!--[\s\S]*?-->/g
const PATH = /<path\b[^>]*>/g
const TEXT = /<text\b([^>]*)>([\s\S]*?)<\/text>/g

/** 描いているものが占める範囲。線の太さのぶんだけ外へ広げる */
export const contentBox = (svg: string): Box | undefined => {
  const markup = svg.replace(COMMENT, "")
  let box = EMPTY
  for (const tag of markup.match(PATH) ?? []) {
    const points = pathPoints(attr(tag, "d") ?? "")
    if (points.length === 0) continue
    const stroke = Number(attr(tag, "stroke-width") ?? 1)
    box = union(box, grow(pointsBox(points), stroke / 2))
  }
  for (const [, tag, body] of markup.matchAll(TEXT)) {
    box = union(box, textBox(tag!, body!))
  }
  return isEmpty(box) ? undefined : box
}

export interface Trimmed {
  readonly svg: string
  /** 詰めたことで絵が何倍に描かれるか（1 なら詰め残しが無い） */
  readonly scale: number
}

/**
 * 枠を中身に寄せる。比は元のまま、中身を中央に置く。
 *
 * `width` / `height` も一緒に書き換える。md から `<img>` として読まれるときの
 * 表示サイズで、`viewBox` と食い違うと図が拡大・縮小されて字が潰れる
 * （`wiki-pattern.test.ts` が実寸を名乗ることを見張っている）。
 */
export const trimSvg = (svg: string): Trimmed => {
  const open = svg.match(/<svg\b[^>]*>/)?.[0]
  const viewBox = open && attr(open, "viewBox")
  const content = contentBox(svg)
  if (!open || !viewBox || !content) return { svg, scale: 1 }

  const [vx, vy, vw, vh] = viewBox.trim().split(/[\s,]+/).map(Number)
  if (![vx, vy, vw, vh].every((v) => Number.isFinite(v)) || vw! <= 0 || vh! <= 0) {
    return { svg, scale: 1 }
  }

  const pad = Math.max(PAD_MIN, PAD_RATIO * Math.max(content.maxX - content.minX, content.maxY - content.minY))
  const padded = grow(content, pad)
  const aspect = vw! / vh!
  // 比を保ったまま padded を容れる最小の枠。足りないほうの辺だけが伸びる
  const width = Math.ceil(Math.max(padded.maxX - padded.minX, (padded.maxY - padded.minY) * aspect))
  const height = Math.ceil(width / aspect)
  if (Math.abs(width - vw!) <= TOLERANCE * vw!) return { svg, scale: 1 }

  const cx = (padded.minX + padded.maxX) / 2
  const cy = (padded.minY + padded.maxY) / 2
  const minX = Math.round(cx - width / 2)
  const minY = Math.round(cy - height / 2)

  const trimmedOpen = open
    .replace(/\sviewBox="[^"]*"/, ` viewBox="${minX} ${minY} ${width} ${height}"`)
    .replace(/\swidth="[^"]*"/, ` width="${width}"`)
    .replace(/\sheight="[^"]*"/, ` height="${height}"`)

  return { svg: svg.replace(open, trimmedOpen), scale: vw! / width }
}

const DIAGRAMS = join(import.meta.dirname, "..", "..", "doc", "wiki", "diagrams")

const distributedDiagrams = (): string[] =>
  readdirSync(DIAGRAMS)
    .filter((d) => statSync(join(DIAGRAMS, d)).isDirectory())
    .flatMap((d) =>
      readdirSync(join(DIAGRAMS, d))
        .filter((f) => f.endsWith(".svg"))
        .map((f) => join(DIAGRAMS, d, f))
    )

const main = () => {
  const args = process.argv.slice(2)
  const dryRun = args.includes("--dry-run")
  const check = args.includes("--check")
  const named = args.filter((a) => !a.startsWith("--"))
  const files = named.length > 0 ? named : distributedDiagrams()

  let changed = 0
  for (const file of files) {
    const before = readFileSync(file, "utf-8")
    const { svg, scale } = trimSvg(before)
    if (svg === before) continue
    changed++
    console.log(`  ${file.replace(`${DIAGRAMS}/`, "")}  x${scale.toFixed(2)}`)
    if (!dryRun && !check) writeFileSync(file, svg)
  }

  if (check) {
    console.log(
      changed === 0
        ? `✅ ${files.length} 枚とも枠が中身に寄っている`
        : `❌ ${changed} / ${files.length} 枚に詰め残しがある。npx tsx src/tools/trim-svg.ts を通すこと`
    )
    if (changed > 0) process.exit(1)
    return
  }
  console.log(`✅ ${changed} / ${files.length} 枚の枠を詰めた${dryRun ? "（--dry-run なので書いていない）" : ""}`)
}

// 直に走らせたときだけ書き換える（roughen-svg.ts と同じ理由）
if (import.meta.filename === process.argv[1]) main()
