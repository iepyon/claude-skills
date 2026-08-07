import { describe, it, expect } from "vitest"
import { readFileSync, readdirSync } from "fs"
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
  if (!table) throw new Error("SKILL.md must have a レイアウト一覧 table")
  return table[1]
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|\s*-+/.test(line))
    .slice(1) // ヘッダ行を除く
}

describe("docs consistency", () => {
  it("SKILL.md's layout table lists every registered plugin directive", () => {
    const rows = layoutTableRows(read(SKILL_MD)).join("\n")

    // 登録が0件なら以下の照合は空振りで緑になる（件数そのものは次のテストがドキュメントと突き合わせる）
    expect(getPlugins().length).toBeGreaterThan(0)

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

  it("docs name every plugin that overrides the character limit", () => {
    // 「PatternLanguageOverview のみ 1024、他は全て 1000」という記述は、上書きが
    // 増減しても上の 1000 チェックでは落ちない。上書きしているプラグインを列挙して突き合わせる。
    const overrides = getPlugins().filter((p) => p.maxChars !== MAX_CHARS_PER_SLIDE)

    for (const p of overrides) {
      for (const path of [SKILL_MD, CLAUDE_MD, ASSETS_README]) {
        expect(read(path), `${path} must mention ${p.id}'s ${p.maxChars}-char limit`).toContain(
          String(p.maxChars)
        )
      }
      // レイアウト名は日英で表記が揺れる SKILL.md を除き、実タグ名で書かれていること
      for (const path of [CLAUDE_MD, ASSETS_README]) {
        expect(read(path), `${path} must name the overriding layout`).toContain(p.layoutTag)
      }
    }
  })

  it("CLAUDE.md and README state the current plugin count", () => {
    const pluginDirs = readdirSync(join(ASSETS_DIR, "src", "plugins"), {
      withFileTypes: true,
    }).filter((e) => e.isDirectory())

    // icon-layout が2つ登録するのでディレクトリ数と登録数は一致しない。どちらも
    // ドキュメントが数字で書いているため、プラグイン追加時に両方の更新を強制する。
    expect(read(CLAUDE_MD)).toContain(`${pluginDirs.length}ディレクトリ`)
    expect(read(CLAUDE_MD)).toContain(`${getPlugins().length}プラグイン登録`)
    expect(read(ASSETS_README)).toContain(`(${getPlugins().length} registrations)`)
  })

  it("docs never reference a .ts file that does not exist", () => {
    // src/ 配下・__tests__ 配下・assets 直下のいずれかに同名ファイルがあればよい。
    // ツリー図のインデントやパス表記の揺れに強くするため basename で照合する。
    const basename = (path: string): string => path.split("/").pop()!
    const known = new Set(
      [
        ...readdirSync(join(ASSETS_DIR, "src"), { recursive: true }),
        ...readdirSync(join(ASSETS_DIR, "__tests__"), { recursive: true }),
        ...readdirSync(ASSETS_DIR),
      ]
        .map((entry) => basename(String(entry)))
        .filter((name) => name.endsWith(".ts"))
    )

    for (const path of [CLAUDE_MD, ASSETS_README]) {
      const mentioned = new Set(read(path).match(/[\w.-]+\.ts\b/g) ?? [])
      const missing = [...mentioned].filter((name) => !known.has(basename(name)))
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
