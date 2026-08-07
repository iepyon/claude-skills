import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync, existsSync } from "fs"
import { join } from "path"
import { getPlugins } from "../src/plugins/registry.js"
import { MAX_CHARS_PER_SLIDE } from "../src/constants.js"
import "../src/plugins/index.js" // side-effect: self-registration

/**
 * md2pptx は「Claude がドキュメントを読んで機械的に使う」スキルなので、ドキュメントの
 * 誤りは実装済み機能の不使用・生成品質の劣化に直結する（BACKLOG B-01）。
 *
 * ここでは人間のレビューに頼らず、レジストリ・定数・ファイル一覧という
 * 「実装側の事実」とドキュメントを機械的に突き合わせる。
 */

const ASSETS_DIR = join(__dirname, "..")
const SKILL_DIR = join(ASSETS_DIR, "..")

const SKILL_MD = join(SKILL_DIR, "SKILL.md")
const CLAUDE_MD = join(SKILL_DIR, "CLAUDE.md")
const ASSETS_README = join(ASSETS_DIR, "README.md")

const read = (path: string): string => readFileSync(path, "utf-8")

/**
 * SKILL.md の「レイアウト一覧」表の本文行（ヘッダ・区切り行を除く）。
 *
 * 全文 includes ではなく表に限定して照合する。記法サンプル節に同じディレクティブが
 * 残っていると、表から行が消えても全文照合は緑になってしまう（Claude が最初に読むのは表）。
 */
const layoutTableRows = (skill: string): string[] => {
  const table = skill.match(/### レイアウト一覧\n\n([\s\S]*?)\n\n/)
  expect(table, "SKILL.md must have a レイアウト一覧 table").not.toBeNull()
  return table![1]
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|\s*-+/.test(line))
    .slice(1) // ヘッダ行を除く
}

describe("docs consistency", () => {
  it("SKILL.md's layout table lists every registered plugin directive", () => {
    const rows = layoutTableRows(read(SKILL_MD)).join("\n")

    // 登録が0件なら以下の照合は空振りで緑になる。plugins/index.ts から
    // プラグインが1つ落ちた場合もここで気付ける（icon-layout は2つ登録するので 10 ディレクトリ = 11 登録）
    expect(getPlugins().length).toBe(11)

    const undocumented = getPlugins()
      .filter((p) => !rows.includes(p.docDirective))
      .map((p) => `${p.id} (${p.docDirective})`)

    expect(undocumented).toEqual([])
  })

  it("all three docs state the current character limit", () => {
    const limit = String(MAX_CHARS_PER_SLIDE)
    for (const path of [SKILL_MD, CLAUDE_MD, ASSETS_README]) {
      expect(read(path), `${path} must mention the ${limit}-char limit`).toContain(limit)
    }
  })

  it("docs never reference a .ts file that does not exist", () => {
    // src/ 配下・__tests__ 配下・assets 直下のいずれかに同名ファイルがあればよい。
    // ツリー図のインデントやパス表記の揺れに強くするため basename で照合する。
    const known = new Set<string>()
    const walk = (dir: string): void => {
      for (const entry of readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === "node_modules") continue
        if (entry.isDirectory()) walk(join(dir, entry.name))
        else if (entry.name.endsWith(".ts")) known.add(entry.name)
      }
    }
    walk(join(ASSETS_DIR, "src"))
    walk(join(ASSETS_DIR, "__tests__"))
    for (const entry of readdirSync(ASSETS_DIR)) {
      if (entry.endsWith(".ts")) known.add(entry)
    }

    for (const path of [CLAUDE_MD, ASSETS_README]) {
      const mentioned = new Set(read(path).match(/[\w.-]+\.ts\b/g) ?? [])
      const missing = [...mentioned].filter((name) => !known.has(name.split("/").pop()!))
      expect(missing, `${path} references nonexistent files`).toEqual([])
    }
  })

  it("CLAUDE.md's test table lists every test file", () => {
    const claude = read(CLAUDE_MD)
    const testFiles = readdirSync(join(ASSETS_DIR, "__tests__")).filter((f) =>
      f.endsWith(".test.ts")
    )

    // テストファイルが1つも見つからないなら照合が空振りしている
    expect(testFiles.length).toBeGreaterThan(0)

    const unlisted = testFiles.filter((f) => !claude.includes(f))
    expect(unlisted).toEqual([])
  })

  it("the skill description's layout count matches SKILL.md's layout table", () => {
    const skill = read(SKILL_MD)

    const claimed = skill.match(/Supports (\d+) layout types/)
    expect(claimed, "SKILL.md frontmatter must state a layout count").not.toBeNull()

    expect(Number(claimed![1])).toBe(layoutTableRows(skill).length)
  })
})
