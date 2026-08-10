/**
 * 図解の線を手描き風に崩す。
 *
 * `ラフで出す` が「粗さが『ここは決めていない』の合図になる」と言っているので、
 * 配布している図解のほうが定規で引いた線でできていては困る。そこで `rect` /
 * `line` / `circle` / `polygon` / `polyline` を、角と辺を少しずらした `path` に
 * 置き換える。
 *
 * **`<path>` と `<text>` には触らない。** path は矢印の頭と曲線で、崩すと形が
 * 読めなくなる（9px の三角は 1px 揺らすと別物になる）。字は揺らすと壊れて見える。
 * 触らないので、この道具は何度走らせても結果が変わらない（すでに path になった
 * ものは変換対象に残っていない）。
 *
 * 揺れは**ファイル名と要素の並び順から決まる**ので、走らせ直しても同じ絵が出る。
 * 乱数を実行時に引くと、コミットのたびに全図が差分になる。
 *
 * フィルタ（feTurbulence 等）を使わないのは、`wiki-pattern.test.ts` が `<defs>`
 * と `id=` を禁じているため。揺れは座標そのものに焼き付けるしかない。
 *
 *   npx tsx src/tools/roughen-svg.ts                     # 配布中の図解すべて
 *   npx tsx src/tools/roughen-svg.ts path/to/one.svg ...  # 名指し
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs"
import { join, basename } from "node:path"

/**
 * 角をずらす量 (px)。1.3 では足りなかった —— 340x320 の絵を 300px 幅に縮めて置くと
 * 崩す前と見分けがつかず、整った図のままに読まれる。上げすぎると、中の字が
 * 箱の真ん中から外れて見える（字は動かさないので）。
 */
const CORNER = 2.2
/** 辺のふくらみ (px)。中点を法線方向へ寄せる。**線を2度引くとき、変えるのはここだけ** */
const BOW = 2.0
/** 閉じ損ないの量 (px)。塗りの無い形だけ、始点と終点をずらして開けておく */
const OVERSHOOT = 2.5

/** mulberry32。種から決まる列を返すので、走らせ直しても同じ絵になる */
const rng = (seed: number) => () => {
  seed = (seed + 0x6d2b79f5) | 0
  let t = seed
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

const hash = (s: string) => {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

const n = (v: number) => Math.round(v * 10) / 10

type Pt = readonly [number, number]
type Next = () => number

/** 種から ±amp の揺れを引く */
const wobble = (next: Next, amp: number) => (next() - 0.5) * 2 * amp

const jitter = (next: Next, [x, y]: Pt, amp = CORNER): Pt => [x + wobble(next, amp), y + wobble(next, amp)]

/**
 * 崩した形。**角は一度だけ揺らして持ち回る。**
 *
 * 2度引くたびに角を引き直すと、線が2本ではなく箱が2つに見える
 * (角の差が最大 2*CORNER 開くので、縮めて置くと影付きの図形に読める)。
 * 手で引いた線に見えるのは、**始点と終点が同じで途中の反りだけが違う**とき。
 */
type Shape = { readonly pts: ReadonlyArray<Pt>; readonly closed: boolean }

/** 2点を、中点を法線方向へ寄せた2次曲線で結ぶ */
const bowed = (next: Next, [x1, y1]: Pt, [x2, y2]: Pt): string => {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  // 短い線ほど反りを抑える。9px の矢印の頭は 1px 曲げると別の形になる
  const off = wobble(next, BOW * Math.min(1, len / 40))
  const cx = (x1 + x2) / 2 + (-dy / len) * off
  const cy = (y1 + y2) / 2 + (dx / len) * off
  return `Q${n(cx)} ${n(cy)} ${n(x2)} ${n(y2)}`
}

/** 持ち回った角を、反りだけ引き直して1本の線にする */
const draw = (next: Next, { pts, closed }: Shape, filled: boolean): string => {
  const start = pts[0]!
  const segs = pts.slice(1).map((p, i) => bowed(next, pts[i]!, p))
  if (!closed) return `M${n(start[0])} ${n(start[1])} ${segs.join(" ")}`
  // 塗りがあるなら閉じる。無いなら閉じ損なわせて、下書きに見せる
  const back: Pt = filled ? start : jitter(next, start, OVERSHOOT)
  const last = bowed(next, pts[pts.length - 1]!, back)
  return `M${n(start[0])} ${n(start[1])} ${segs.join(" ")} ${last}${filled ? " Z" : ""}`
}

const attr = (tag: string, name: string): string | undefined => tag.match(new RegExp(`\\s${name}="([^"]*)"`))?.[1]

const num = (tag: string, name: string, fallback = 0): number => Number(attr(tag, name) ?? fallback)

const hasFill = (tag: string) => /fill="(?!none)/.test(tag)

/** 幾何の属性だけ落として、色や破線はそのまま持っていく */
const carryOver = (tag: string, drop: ReadonlyArray<string>): string => {
  const inner = tag.replace(/^<\w+\s*/, "").replace(/\s*\/?>$/, "")
  return (inner.match(/[\w-]+="[^"]*"/g) ?? []).filter((a) => !drop.includes(a.split("=")[0]!)).join(" ")
}

/** 線が引かれている図形には、手で引いた線の継ぎ目を与える */
const penAttrs = (kept: string): string => {
  if (!/stroke="(?!none)/.test(kept)) return ""
  const join = kept.includes("stroke-linejoin=") ? "" : ` stroke-linejoin="round"`
  const cap = kept.includes("stroke-linecap=") ? "" : ` stroke-linecap="round"`
  return join + cap
}

/**
 * 1本の線を2度引く。手描きに見せるいちばん強い合図で、座標を揺らすだけでは
 * 出てこない（揺れた直線は、細い直線のままに見える）。
 *
 * 2度引くのは実線だけ。破線を重ねると刻みがずれて、ただ汚れて見える。
 */
const toPaths = (kept: string, pen: () => string): string => {
  const filled = hasFill(kept)
  const first = `<path d="${pen()}" ${filled || kept.includes("fill=") ? kept : `fill="none" ${kept}`}${penAttrs(kept)}/>`
  if (!/stroke="(?!none)/.test(kept) || kept.includes("stroke-dasharray=")) return first
  // 2本目は線だけ。塗りを重ねると縁がぼやける
  const strokeOnly = (kept.match(/stroke[\w-]*="[^"]*"/g) ?? []).join(" ")
  return `${first}<path d="${pen()}" fill="none" ${strokeOnly}${penAttrs(kept)}/>`
}

/**
 * 丸だけは、多角形の弦では描けない。
 *
 * 8分割は八角形に、12分割でも半径を揺らすと面が見えた（r=10 の節点を等倍で置くと、
 * 5px の直線が数えられてしまう）。そこで**4つの3次ベジェ**で描き、揺らすのは
 * 各象限の半径と描き始めの角だけにする。
 *
 * 箱と違って、丸は2本目を別の楕円にしてよい。ずれても「丸が2つ」には見えず、
 * 一息で描けなかった線に見える。むしろ角を共有すると2本が重なって、
 * 崩していないのと同じになる。
 */
const roughCircle = (next: Next, cx: number, cy: number, r: number, filled: boolean): string => {
  const amp = Math.min(1.2, r * 0.09)
  const K = 0.5523 // 90度の弧を3次ベジェで近似する取っ手の長さ
  const from = wobble(next, 0.6) // 描き始めの角。2本目がぴったり重ならないように
  const rs = Array.from({ length: 5 }, () => r + wobble(next, amp))
  const at = (i: number): Pt => {
    const a = from + (i / 4) * Math.PI * 2
    return [cx + Math.cos(a) * rs[i]!, cy + Math.sin(a) * rs[i]!]
  }
  // 接線は半径に直交する。取っ手をその向きへ K*r 伸ばすと弧になる
  const handle = (i: number, sign: 1 | -1): Pt => {
    const a = from + (i / 4) * Math.PI * 2
    const p = at(i)
    return [p[0] + sign * -Math.sin(a) * K * rs[i]!, p[1] + sign * Math.cos(a) * K * rs[i]!]
  }
  const start = at(0)
  const segs = [1, 2, 3, 4].map((i) => {
    const c1 = handle(i - 1, 1)
    const c2 = handle(i, -1)
    const p = at(i)
    return `C${n(c1[0])} ${n(c1[1])} ${n(c2[0])} ${n(c2[1])} ${n(p[0])} ${n(p[1])}`
  })
  return `M${n(start[0])} ${n(start[1])} ${segs.join(" ")}${filled ? " Z" : ""}`
}

const ROUGHENERS: ReadonlyArray<{
  readonly tag: string
  readonly drop: ReadonlyArray<string>
  /** 角を1度だけ揺らして2本で持ち回る形。丸は `render` を持つのでこちらは無い */
  readonly shape?: (next: Next, tag: string) => Shape
  /** 1本ごとに引き直す形（丸だけ） */
  readonly render?: (next: Next, tag: string) => string
}> = [
  {
    tag: "rect",
    drop: ["x", "y", "width", "height", "rx", "ry"],
    shape: (next, tag) => {
      const x = num(tag, "x")
      const y = num(tag, "y")
      const w = num(tag, "width")
      const h = num(tag, "height")
      const corners: ReadonlyArray<Pt> = [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
      ]
      return { pts: corners.map((p) => jitter(next, p)), closed: true }
    },
  },
  {
    tag: "line",
    drop: ["x1", "y1", "x2", "y2"],
    shape: (next, tag) => ({
      pts: [jitter(next, [num(tag, "x1"), num(tag, "y1")]), jitter(next, [num(tag, "x2"), num(tag, "y2")])],
      closed: false,
    }),
  },
  {
    tag: "circle",
    drop: ["cx", "cy", "r"],
    render: (next, tag) =>
      roughCircle(next, num(tag, "cx"), num(tag, "cy"), num(tag, "r"), hasFill(tag)),
  },
  ...(["polygon", "polyline"] as const).map((tag) => ({
    tag,
    drop: ["points"],
    shape: (next: Next, t: string): Shape => ({
      pts: (attr(t, "points") ?? "")
        .trim()
        .split(/\s+/)
        .map((p) => jitter(next, p.split(",").map(Number) as unknown as Pt)),
      closed: tag === "polygon",
    }),
  })),
]

export const roughenSvg = (svg: string, seedKey: string): string => {
  let index = 0
  return svg.replace(/<(rect|line|circle|polygon|polyline)\b[^>]*\/?>/g, (tag, name: string) => {
    const r = ROUGHENERS.find((x) => x.tag === name)!
    const next = rng(hash(`${seedKey}:${index++}`))
    const kept = carryOver(tag, r.drop)
    if (r.render) return toPaths(kept, () => r.render!(next, tag))
    // shape は外で作る。2度引いても角は同じで、反りだけが変わる
    const shape = r.shape!(next, tag)
    return toPaths(kept, () => draw(next, shape, hasFill(tag)))
  })
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

const files = process.argv.slice(2).length > 0 ? process.argv.slice(2) : distributedDiagrams()

let changed = 0
for (const file of files) {
  const before = readFileSync(file, "utf-8")
  // 種はファイル名から。走らせ直しても同じ絵が出る
  const after = roughenSvg(before, basename(file))
  if (after === before) continue
  writeFileSync(file, after)
  changed++
  console.log(`  ${file.replace(`${DIAGRAMS}/`, "")}`)
}
console.log(`✅ ${changed} / ${files.length} 枚を崩した`)
