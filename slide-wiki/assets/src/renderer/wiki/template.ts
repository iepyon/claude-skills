import { Theme } from "../../schema/index.js"
import { WikiSite, WikiOptions } from "./types.js"
import { wikiCss } from "./styles.js"
import { wikiScript } from "./client-script.js"

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")

const escapeAttr = (s: string): string => escapeHtml(s).replace(/"/g, "&quot;")

// </script> がデータ中に現れると script 要素が途中で閉じてしまうので封じる
const safeJson = (value: unknown): string =>
  JSON.stringify(value).replace(/</g, "\\u003c")

function renderSidebar(site: WikiSite): string {
  const decks = site.decks
    .map((deck) => {
      const links = deck.entryIds
        .map((id) => {
          const entry = site.byId.get(id)!
          // 題と ID に、デッキが frontmatter で名乗った語を足す（組み立ては site-index.ts）。
          // 題が比喩のスライドは、その名前を知らないと引けなかった
          const search = `${entry.title} ${entry.globalId} ${deck.searchWords ?? ""}`
            .trim()
            .toLowerCase()
          return `        <a class="toc-link" href="#${encodeURIComponent(id)}" data-id="${escapeAttr(id)}" data-search="${escapeAttr(search)}">${escapeHtml(entry.title)}</a>`
        })
        .join("\n")
      return `      <div class="deck-group">
        <div class="deck-title">${escapeHtml(deck.title)}</div>
${links}
      </div>`
    })
    .join("\n")

  const broken = site.broken.length
    ? `      <details class="broken-report">
        <summary>未解決リンク ${site.broken.length} 件</summary>
        <ul>
${site.broken.map((b) => `          <li>${escapeHtml(b.fromId)} → ${escapeHtml(b.href)}</li>`).join("\n")}
        </ul>
      </details>`
    : ""

  return `${decks}\n${broken}`
}

export function generateWikiHtml(
  site: WikiSite,
  slidesHtml: readonly string[],
  theme: Theme,
  options: WikiOptions = {}
): string {
  const siteTitle = options.siteTitle ?? "Slide Wiki"
  const deckBySlug = new Map(site.decks.map((d) => [d.slug, d]))
  // デッキ1本の事実はデッキ単位の表にする。entries に足すと、同じ短い語を
  // スライドの数だけ書き出すことになる（`resolve` と同じ形）。
  // ビューアへ渡すのと、下のバッジを描くのが同じ表を読む
  const deckShort: Record<string, string> = Object.fromEntries(
    site.decks.map((d) => [d.slug, d.short])
  )

  // ビューアに渡すのは「表示に要る最小限」だけ。スライド本体は DOM にあるので
  // ここで内容を二重に持たない（持つと表示とプレビューがずれうる）。
  const bootstrap = {
    entries: site.entries.map((e) => ({
      id: e.globalId,
      deck: e.deckSlug,
      deckTitle: deckBySlug.get(e.deckSlug)?.title ?? e.deckSlug,
      title: e.title,
      deckIndex: e.deckIndex,
    })),
    deckShort,
    resolve: options.resolveTable ?? {},
    backlinks: Object.fromEntries(site.backlinks),
    relations: options.relations ?? {},
  }

  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(siteTitle)}</title>
  <style>${wikiCss(theme)}</style>
</head>
<body>
  <div class="brand">${escapeHtml(siteTitle)}</div>

  <div class="topbar">
    <button class="menu-btn" id="menu-btn" aria-label="目次" aria-expanded="false">&#9776;</button>
    <button class="nav-btn" id="back-btn" aria-label="戻る">&larr; 戻る</button>
    <span class="crumb" id="crumb"></span>
  </div>

  <nav class="sidebar">
    <div class="filter-wrap"><input id="filter" type="search" placeholder="スライドを絞り込む" autocomplete="off"></div>
${renderSidebar(site)}
  </nav>

  <div class="scrim" id="scrim"></div>

  <main class="main">
    <!-- 1行に収める。折り返すと scaleStage() の CHROME_RESERVE の見積りが崩れる。 -->
    <div class="hint">
      <kbd>&larr;</kbd><kbd>&rarr;</kbd> またはスライドの左右端をクリックで送る（デッキの境界も越える）　リンクはホバーでプレビュー／クリックで移動　<kbd>Esc</kbd> 閉じる
    </div>

    <div class="stage-wrap" id="stage-wrap">
      <div class="stage-frame" id="stage-frame">
${site.entries
  .map(
    // バッジは `.slide` の**外**（兄弟）に置く。中に入れると renderSlide の出力が
    // 変わり、`--html` と DOM が割れる（この Wiki の前提。index.ts の説明を見よ）。
    // 置き場所を決めるのは styles.ts の `.deck-badge` で、ここは順序だけを持つ。
    (entry, i) => `        <div class="wiki-slide" data-wiki-id="${escapeAttr(entry.globalId)}" data-deck="${escapeAttr(entry.deckSlug)}">${slidesHtml[i]}<span class="deck-badge">${escapeHtml(deckShort[entry.deckSlug])}</span></div>`
  )
  .join("\n")}
      </div>
      <!-- 送りの目印。山括弧は CSS の ::after が描く（左右で字が違うため）。
           当たり判定は client-script が座標で持つ (pointer-events: none)。 -->
      <div class="edge-zone left" aria-hidden="true"></div>
      <div class="edge-zone right" aria-hidden="true"></div>
    </div>

    <!-- 帯は横に並べる。**縦に積むと下の帯がスライドに押し出される** — ステージは
         残りの高さいっぱいまで伸びるので、増えた帯のぶんはそのまま画面の外へ出る
         （show() が毎回 scrollTop を 0 に戻すので、送るたびに見えなくなる）。
         左が書き手の付けた型、右がリンクから導いた結果。
         どちらも .slide の外なので、--html と PPTX の DOM には現れない。 -->
    <div class="link-bands" id="link-bands">
      <section class="backlinks relations" id="relations" hidden>
        <h2>関係</h2>
        <div id="relations-body"></div>
      </section>

      <section class="backlinks">
        <h2>このスライドへのリンク</h2>
        <div id="backlinks-body"></div>
      </section>
    </div>
  </main>

  <div id="preview-layer"></div>

  <script>window.__WIKI__ = ${safeJson(bootstrap)};</script>
  <script>${wikiScript()}</script>
</body>
</html>`
}
