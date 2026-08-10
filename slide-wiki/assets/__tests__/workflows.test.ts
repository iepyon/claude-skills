import { describe, it, expect } from "vitest"
import { existsSync, readFileSync, readdirSync } from "fs"
import { join } from "path"
import { parse } from "yaml"

/**
 * GitHub Actions の宣言に対する検査。
 *
 * ここにあるのは1件の事故の再発防止である。公開用の `pages.yml` は
 * `concurrency: {group: pages, cancel-in-progress: true}` を持っていて、以前そこに PR の
 * run が混ざったとき、**後から始まった PR 側が push 側を殺してデプロイが消えた**。
 * 原因は pages.yml のコメントに書かれているが、コメントは次にワークフローを足す人を
 * 止められない — `pages.yml` に `pull_request` を1行足すか、新しいワークフローが
 * `group: pages` と書くだけで再発する。
 *
 * **だからワークフローは列挙して検査する。** ファイル名を書き並べると、3本目が足された日に
 * それが検査の対象から外れ、カバレッジが黙って減る（コメントと同じ弱さに戻る）。
 * 対象が1本に決まっている検査だけ、そのファイルを名指しする。
 */

const WORKFLOW_DIR = join(__dirname, "..", "..", "..", ".github", "workflows")

interface Workflow {
  readonly on: Record<string, unknown>
  readonly concurrency?: { readonly group?: string }
  readonly jobs?: Record<
    string,
    { readonly steps?: ReadonlyArray<{ readonly run?: string; readonly with?: Record<string, unknown> }> }
  >
}

const load = (name: string): Workflow => parse(readFileSync(join(WORKFLOW_DIR, name), "utf-8"))

const workflowFiles = (): string[] => readdirSync(WORKFLOW_DIR).filter((f) => /\.ya?ml$/.test(f))

const steps = (wf: Workflow): ReadonlyArray<{ run?: string; with?: Record<string, unknown> }> =>
  Object.values(wf.jobs ?? {}).flatMap((job) => job.steps ?? [])

/**
 * 実行時に実際に衝突する group か。`${{ github.workflow }}` を含む group は
 * ワークフローごとに別の値になるので、宣言の文字列が同じでも衝突しない。
 * リテラルを2本が書いた場合だけが衝突なので、その1点を見分ける。
 */
const groupIdentity = (wf: Workflow, file: string): string | undefined =>
  wf.concurrency?.group?.replace(/\$\{\{\s*github\.workflow\s*\}\}/g, file)

// スキルを `.github/` ごと持たない場所へ複製した場合に落とさない。判定はディレクトリの
// 有無ではなく**このリポジトリのワークフローがあるか**で見る — ディレクトリだけを見ると、
// 自前の Actions を持つ複製先で ENOENT になり、規約を押し付けた形で赤くなる
const present = existsSync(join(WORKFLOW_DIR, "pages.yml"))

describe.skipIf(!present)("github workflows", () => {
  it("never publishes from a pull request", () => {
    // PR で公開が走ると、レビュー前の内容が本番サイトに出る。
    // `on` を素直に読む（`?? {}` で補うと、`on:` を失った pages.yml で空振りして緑になる）
    expect(Object.keys(load("pages.yml").on)).not.toContain("pull_request")
  })

  it("keeps every workflow in its own concurrency group", () => {
    const files = workflowFiles()
    expect(files.length, "見つかったワークフローが少なすぎる（検査が空振りしている）").toBeGreaterThan(1)

    const identities = files.map((file) => groupIdentity(load(file), file))
    identities.forEach((identity, i) => {
      expect(identity, `${files[i]} は concurrency group を宣言していない`).toBeTruthy()
    })
    expect(new Set(identities).size, `group が衝突している: ${identities.join(" / ")}`).toBe(files.length)
  })

  it("checks pull requests on the version it publishes with", () => {
    // node-version は2本が別々に名乗る（共有しない判断は ci.yml のコメントにある）。
    // 片方だけ上げると「検査した runtime と公開した runtime が違う」状態になり、
    // どちらのファイルを個別に読んでも見えない
    const versions = new Set(
      workflowFiles().flatMap((file) =>
        steps(load(file))
          .map((step) => step.with?.["node-version"])
          .filter((version) => version !== undefined)
      )
    )
    expect(versions.size, `node-version が食い違っている: ${[...versions].join(" / ")}`).toBe(1)
  })

  it("runs the type checker somewhere, since vitest cannot", () => {
    // vitest は esbuild で型を捨てるので、npm test だけでは型エラーが出ない（BACKLOG B-25）。
    // 生の grep ではなく steps の `run` を読む — コメントアウトされた行を緑と読まないため
    const runs = steps(load("ci.yml")).map((step) => step.run ?? "")
    expect(runs.join("\n")).toContain("npm run typecheck")
  })
})
