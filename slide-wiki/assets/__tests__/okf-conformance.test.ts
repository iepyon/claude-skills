import { describe, it, expect } from "vitest"
import { existsSync, readFileSync } from "fs"
import { basename, join } from "path"
import { Effect } from "effect"

import { parseMarkdown } from "../src/parser/index.js"
import { readFrontmatter, splitFrontmatter } from "../src/ontology/frontmatter.js"
import { lintSource } from "../src/ontology/lint.js"
import { RESERVED_OKF_FILES, OKF_VERSION, listDeckFiles, parseOkfLink } from "../src/okf.js"
import { main as genOkfIndex } from "../src/tools/gen-okf-index.js"

/**
 * 配っているバンドル `doc/wiki/` が **Open Knowledge Format v0.2 に適合している**ことを、
 * 主張ではなく検査にする。
 * https://github.com/GoogleCloudPlatform/knowledge-catalog/blob/main/okf/SPEC.md
 *
 * 適合は §11 が3条件で定義している。それをそのまま並べたのが最初の describe で、
 * 残りは「適合しているが読む側に届かない」形（折れたリンク・古い目録）を止めるためのもの。
 *
 * **これが無いと「準拠した」は誰も確かめていない言葉になる。** 記法を移した回に
 * 通ったきり、次にデッキを1本足した人が黙って外れる。
 */

const BUNDLE = join(import.meta.dirname, "..", "doc", "wiki")

const deckFiles = listDeckFiles(BUNDLE)
const read = (path: string): string => readFileSync(path, "utf-8")

describe("OKF v0.2 §11 適合", () => {
  it("検査対象のデッキが集まっている", () => {
    expect(deckFiles.length).toBeGreaterThan(0)
  })

  it.each(deckFiles)("%s は読める frontmatter を持つ", (path) => {
    // §11-1: Every non-reserved `.md` file contains a parseable YAML frontmatter block
    const split = splitFrontmatter(read(path))
    expect(split.block).toBeDefined()
    expect(readFrontmatter(split.block!).data).toBeTruthy()
  })

  it.each(deckFiles)("%s は空でない type を名乗る", (path) => {
    // §11-2: Every frontmatter block contains a non-empty `type` field
    const { data } = readFrontmatter(splitFrontmatter(read(path)).block!)
    expect(typeof data?.type).toBe("string")
    expect(data?.type).not.toBe("")
  })

  it("予約ファイルは目録と履歴だけで、デッキとして混ざらない", () => {
    // §11-3 と §2。予約名がデッキ一覧に出てくると「型を名乗らない md」になる
    for (const reserved of RESERVED_OKF_FILES) {
      expect(deckFiles.map((p) => basename(p))).not.toContain(reserved)
    }
  })
})

describe("OKF v0.2 §8 目録", () => {
  const indexPath = join(BUNDLE, "index.md")

  it("バンドルの根に置かれている", () => {
    expect(existsSync(indexPath)).toBe(true)
  })

  it("frontmatter は okf_version ひとつだけ", () => {
    // §8: index files contain no frontmatter, with one exception — bundle-root
    // `index.md` MAY carry an `okf_version` key. `type` すら置いてはいけない
    const { data } = readFrontmatter(splitFrontmatter(read(indexPath)).block!)
    expect(Object.keys(data ?? {})).toEqual(["okf_version"])
    expect(data?.okf_version).toBe(OKF_VERSION)
  })

  it("本文はグループ見出しとリンク一覧でできている", () => {
    const body = splitFrontmatter(read(indexPath)).body
    expect(body).toMatch(/^# .+$/m)
    expect(body).toMatch(/^\* \[.+\]\(.+\)/m)
  })

  it("バンドルのどのデッキも目録から漏れていない", () => {
    // 漏れたデッキは、バンドルを読む側からは存在しないのと同じになる
    const body = read(indexPath)
    for (const path of deckFiles) expect(body).toContain(`(${basename(path)})`)
  })

  it("目録はバンドルと一致している（生成し直しても変わらない）", () => {
    expect(genOkfIndex(["--check", BUNDLE])).toBe(0)
  })
})

describe("OKF v0.2 §9 更新履歴", () => {
  const logPath = join(BUNDLE, "log.md")

  it("置くなら日付見出しは ISO 8601 で新しい順", () => {
    // まだどのデッキも created / updated を名乗っていないので、log.md は無いのが正しい。
    // **空の履歴を置くより、まだ何も宣言していないことが見えるほうが正直である。**
    if (!existsSync(logPath)) return

    const dates = [...read(logPath).matchAll(/^## (.+)$/gm)].map((m) => m[1])
    expect(dates.length).toBeGreaterThan(0)
    for (const d of dates) expect(d).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect([...dates]).toEqual([...dates].sort().reverse())
  })
})

describe("OKF v0.2 §6 リンク", () => {
  /** インラインコードの外にある markdown リンクだけを見る（記法の見本を数えない） */
  const linksOf = (source: string): { label: string; href: string }[] => {
    const code = [...source.matchAll(/`[^`]+?`/g)].map((m) => [m.index, m.index + m[0].length])
    return [...source.matchAll(/\[([^\[\]]+?)\]\(([^()\s]+)\)/g)]
      .filter((m) => !code.some(([a, b]) => m.index >= a && m.index < b))
      .map((m) => ({ label: m[1], href: m[2] }))
  }

  it("旧記法も、内部リンクにならない書き方も残っていない", () => {
    // **判定は lint に委ねる。** ここで2本目の走査を書くと、フェンスの扱いや
    // `https://…/SPEC.md` のような外部 URL の除外が本体と割れる
    // （割れたとき直されるのはテストのほうで、書き手が実際に走らせる lint は古いまま残る）
    for (const path of deckFiles) {
      const found = lintSource(read(path))
        .filter((d) => d.check === "legacy-wikilink" || d.check === "link-form")
        .map((d) => `${basename(path)}:${d.line} ${d.message}`)
      expect(found).toEqual([])
    }
  })

  it("内部リンクの行き先が実在する", () => {
    // OKF は「折れたリンクを拒むな」と定めているが、それは読む側の話。
    // **配る側が折れたまま出してよい理由にはならない**
    const slidesOf = new Map<string, Set<string>>()
    for (const path of deckFiles) {
      const pres = Effect.runSync(parseMarkdown(read(path), { baseDir: BUNDLE }))
      slidesOf.set(
        basename(path, ".md"),
        new Set(pres.slides.map((s) => s.id).filter((id): id is string => Boolean(id)))
      )
    }

    for (const path of deckFiles) {
      for (const { href } of linksOf(read(path))) {
        const target = parseOkfLink(href)
        if (!target) continue
        const [deck, slide] = target.ref.split("/")
        expect(slidesOf.has(deck), `${basename(path)}: ${href} のデッキが無い`).toBe(true)
        if (slide !== undefined) {
          expect(slidesOf.get(deck)!.has(slide), `${basename(path)}: ${href} のスライドが無い`).toBe(true)
        }
      }
    }
  })
})
