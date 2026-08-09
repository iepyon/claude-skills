import { Theme } from "../../schema/index.js"
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "../../constants.js"
import { slideBaseCss } from "../html/slide-css.js"

const SLIDE_W_PX = SLIDE_WIDTH * 96
const SLIDE_H_PX = SLIDE_HEIGHT * 96

// プレビューカードの縮小率のフォールバック。実際の値は client-script の
// previewScale() が画面サイズと入れ子の深さから決め、--preview-scale に入れる。
// ここに残すのは、スクリプトが走る前でもカードが潰れないようにするため。
const PREVIEW_SCALE = 0.5

/**
 * Wiki サイトのシェル CSS。
 * スライド1枚の見た目は slideBaseCss（`--html` と共有）に任せ、
 * ここには「サイトの外枠」だけを書く。
 */
export function wikiCss(theme: Theme): string {
  return `
${slideBaseCss(theme)}

    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg: #0f1724;
      --panel: #141b2b;
      --line: rgba(255,255,255,0.10);
      --text: #d7dee9;
      --muted: #8496ad;
      --accent: #7aa2f7;
      --preview-scale: ${PREVIEW_SCALE};
    }

    body {
      font-family: ${theme.fonts.body}, "Hiragino Sans", sans-serif;
      background: var(--bg);
      color: var(--text);
      height: 100vh;
      overflow: hidden;
      display: grid;
      grid-template-columns: 264px 1fr;
      grid-template-rows: 48px 1fr;
      grid-template-areas: "brand topbar" "sidebar main";
    }

    /* ---------- brand + topbar ---------- */
    .brand {
      grid-area: brand;
      display: flex; align-items: center; gap: 8px;
      padding: 0 16px;
      border-right: 1px solid var(--line);
      border-bottom: 1px solid var(--line);
      font-size: 13px; font-weight: 700; letter-spacing: .02em;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .topbar {
      grid-area: topbar;
      display: flex; align-items: center; gap: 12px;
      padding: 0 16px;
      border-bottom: 1px solid var(--line);
      overflow: hidden;
    }

    /* パンくずは折り返さず省略する。折り返すと 48px のトップバーから
       はみ出してボタンに重なる。 */
    .crumb {
      font-size: 12px; color: var(--muted);
      min-width: 0; flex: 0 1 auto;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .crumb b { color: var(--text); font-weight: 600; }
    .spacer { flex: 1 0 0; }

    .nav-btn {
      background: rgba(255,255,255,.05);
      border: 1px solid var(--line);
      color: var(--text);
      font: inherit; font-size: 12px;
      padding: 4px 12px; border-radius: 6px; cursor: pointer;
      white-space: nowrap; flex-shrink: 0;
    }
    .nav-btn:hover:not(:disabled) { background: rgba(255,255,255,.12); }
    .nav-btn:disabled { opacity: .3; cursor: default; }

    /* ---------- sidebar ---------- */
    .sidebar {
      grid-area: sidebar;
      border-right: 1px solid var(--line);
      overflow-y: auto;
      padding: 12px 0 32px;
    }

    .filter-wrap { padding: 0 12px 12px; }
    .filter-wrap input {
      width: 100%;
      background: rgba(255,255,255,.05);
      border: 1px solid var(--line);
      color: var(--text);
      font: inherit; font-size: 12px;
      padding: 6px 10px; border-radius: 6px;
    }
    .filter-wrap input::placeholder { color: var(--muted); }

    .deck-title {
      padding: 10px 16px 4px;
      font-size: 10px; font-weight: 700;
      text-transform: uppercase; letter-spacing: .08em;
      color: var(--muted);
    }

    .toc-link {
      display: block;
      padding: 6px 16px 6px 22px;
      font-size: 12.5px;
      color: var(--text); text-decoration: none;
      border-left: 2px solid transparent;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .toc-link:hover { background: rgba(255,255,255,.05); }
    .toc-link[aria-current="true"] {
      background: rgba(122,162,247,.12);
      border-left-color: var(--accent);
      color: #fff;
    }
    .toc-link.hidden { display: none; }

    .broken-report { margin-top: 16px; padding: 0 16px; font-size: 11px; color: var(--muted); }
    .broken-report summary { cursor: pointer; color: #e57373; }
    .broken-report li { margin: 4px 0 0 14px; word-break: break-all; }

    /* ---------- main ---------- */
    .main {
      grid-area: main;
      overflow-y: auto;
      padding: 16px;
      display: flex; flex-direction: column; align-items: center;
      /* 幅が制約になる縦長のウィンドウでは「拡大 → 縦が溢れる → スクロールバーが出る
         → clientWidth が減る → 縮小 → スクロールバーが消える」で振動しうる。
         溝を常に空けておけば clientWidth が動かない。macOS のオーバーレイ
         スクロールバーでは再現しないので、手元で見えなくても外さないこと。 */
      scrollbar-gutter: stable;
    }

    /* transform: scale() は描画だけを縮め、レイアウト上の寸法は変えない。
       この外箱が「縮小後の実寸」を持つことで、狭いコンテナでも
       はみ出し（＝左が見切れる）が起きない。実寸は scaleStage() が入れる。 */
    .stage-wrap {
      width: ${SLIDE_W_PX}px; height: ${SLIDE_H_PX}px;
      flex-shrink: 0;
    }

    .stage-frame {
      width: ${SLIDE_W_PX}px; height: ${SLIDE_H_PX}px;
      transform-origin: top left;
      border-radius: 10px; overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,.5);
      position: relative;
    }
    /* Wiki では表示中の1枚だけを stage に出す。
       .slide.active の規則は slideBaseCss 側と共有している。 */
    .wiki-slide { display: none; }
    .wiki-slide.active { display: block; }
    .wiki-slide .slide { display: block; }

    /* 幅は scaleStage() が縮小後のステージに合わせて入れる。ここで max-width を
       持つと、拡大したときインラインの width に勝ってしまい、ステージだけ広がって
       この帯が 960px に取り残される。 */
    .backlinks {
      margin-top: 20px;
      width: 100%;
      border-top: 1px solid var(--line);
      padding-top: 14px;
      font-size: 12.5px;
    }
    .backlinks h2 {
      font-size: 11px; font-weight: 700; letter-spacing: .06em;
      text-transform: uppercase; color: var(--muted);
      margin-bottom: 8px;
    }
    .backlinks ul { list-style: none; display: flex; flex-wrap: wrap; gap: 8px; }
    .backlinks a {
      display: inline-block;
      padding: 4px 10px;
      background: rgba(255,255,255,.05);
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--text); text-decoration: none;
    }
    .backlinks a:hover { background: rgba(122,162,247,.18); border-color: var(--accent); }
    .backlinks .none { color: var(--muted); }

    .hint { margin-top: 18px; font-size: 11px; color: var(--muted); text-align: center; }
    .hint kbd {
      display: inline-block; padding: 1px 6px; margin: 0 1px;
      border: 1px solid #3a4560; border-radius: 3px;
      background: rgba(255,255,255,.04); font-family: inherit; font-size: 11px;
    }

    /* ---------- hover preview ---------- */
    #preview-layer { position: fixed; inset: 0; pointer-events: none; z-index: 9000; }

    /* 寸法は --preview-scale で決まる。カード自身にこの変数が載るので
       （client-script の buildCard）、入れ子のカードは各自の倍率を持つ。 */
    .preview-card {
      position: fixed; pointer-events: auto;
      width: calc(${SLIDE_W_PX}px * var(--preview-scale) + 4px);
      max-width: calc(100vw - 16px);
      cursor: pointer;   /* カードごとクリックでそのスライドへ移動する */
      background: var(--panel);
      border: 1px solid rgba(255,255,255,.16);
      border-radius: 10px;
      box-shadow: 0 12px 40px rgba(0,0,0,.6);
      overflow: hidden;
      opacity: 0; transition: opacity .12s ease;
    }
    .preview-card.shown { opacity: 1; }

    .preview-head {
      display: flex; align-items: baseline; gap: 8px;
      padding: 6px 10px;
      border-bottom: 1px solid var(--line);
      font-size: 11px;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    /* min-width:0 が無いと、flex アイテムは内容幅より縮まない。長い見出しが
       「クリックで開く」を枠の外へ押し出して、そのまま切り落とす。 */
    .preview-head .p-title,
    .preview-head .p-deck { min-width: 0; overflow: hidden; text-overflow: ellipsis; }
    .preview-head .p-title { font-weight: 700; color: #fff; }
    .preview-head .p-deck { color: var(--muted); }
    .preview-head .p-open { margin-left: auto; color: var(--muted); flex-shrink: 0; }

    /* viewport が縮小後のサイズを持ち、中身をクリップする。
       scale した子は依然 960x540 でレイアウトされるので overflow:hidden は必須。 */
    .preview-viewport {
      width: calc(${SLIDE_W_PX}px * var(--preview-scale));
      height: calc(${SLIDE_H_PX}px * var(--preview-scale));
      overflow: hidden;
    }
    .preview-scale {
      width: ${SLIDE_W_PX}px; height: ${SLIDE_H_PX}px;
      transform: scale(var(--preview-scale));
      transform-origin: top left;
    }
    .preview-scale .slide { display: block !important; position: absolute; inset: 0; }

    /* ホバーできない端末ではプレビューを出さない（タップは遷移になる）。
       ここで判定するのは *入力デバイスの能力* だけ。レイアウトには手を出さない
       — タッチ対応のノートPCでも目次が消えてしまうため。 */
    @media (hover: none), (pointer: coarse) {
      .preview-card { display: none; }
    }

    /* ---------- 画面が狭いとき: サイドバーをドロワーにする ---------- */
    .menu-btn {
      display: none;
      background: rgba(255,255,255,.05);
      border: 1px solid var(--line);
      color: var(--text);
      font: inherit; font-size: 15px; line-height: 1;
      padding: 6px 10px; border-radius: 6px; cursor: pointer;
      flex-shrink: 0;
    }
    .menu-btn:hover { background: rgba(255,255,255,.12); }

    .scrim { display: none; }

    @media (max-width: 860px) {
      body {
        grid-template-columns: 1fr;
        grid-template-areas: "topbar" "main";
      }
      .brand { display: none; }
      .menu-btn { display: inline-block; }

      /* 消すのではなく引き出しにする。狭い画面でも目次には必ず到達できる。 */
      .sidebar {
        position: fixed;
        top: 48px; left: 0; bottom: 0;
        width: 264px;
        background: var(--panel);
        z-index: 200;
        transform: translateX(-100%);
        transition: transform .2s ease;
      }
      .sidebar.open { transform: translateX(0); }

      .scrim {
        display: block;
        position: fixed; inset: 48px 0 0 0;
        background: rgba(0,0,0,.5);
        z-index: 150;
        opacity: 0; pointer-events: none;
        transition: opacity .2s ease;
      }
      .scrim.open { opacity: 1; pointer-events: auto; }

      .main { padding: 16px; }
    }
`
}

export const PREVIEW_SCALE_VALUE = PREVIEW_SCALE
