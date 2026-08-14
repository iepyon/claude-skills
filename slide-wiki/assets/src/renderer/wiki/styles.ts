import { Theme } from "../../schema/index.js"
import { SLIDE_WIDTH, SLIDE_HEIGHT } from "../../constants.js"
import { slideBaseCss } from "../html/slide-css.js"
import { EDGE_RATIO } from "./client-script.js"

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
      /* スライドの上に重ねる小片の座布団。スライドの地色は白にも濃色にもなるので、
         字の色をどう選んでも「地に近い一方」では沈む — 座布団ごと置けば地に依らない。
         送りの山括弧とデッキのバッジが同じ判断をしているので、値は1組だけ持つ。 */
      --on-slide-bg: rgba(12,18,30,.66);
      --on-slide-line: rgba(255,255,255,.45);
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

    .nav-btn {
      background: rgba(255,255,255,.05);
      border: 1px solid var(--line);
      color: var(--text);
      font: inherit; font-size: 12px;
      padding: 4px 12px; border-radius: 6px; cursor: pointer;
      white-space: nowrap; flex-shrink: 0;
    }
    .nav-btn:hover { background: rgba(255,255,255,.12); }

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
      position: relative;   /* 送りの目印の足場 */
    }

    /* 前/次ボタンの代わりに、スライドの左右端そのものを送りの当たり判定にする。
       ただし判定は client-script が EDGE_RATIO と座標で持ち、この帯は
       pointer-events: none の目印にとどめる。帯にクリックを受けさせると、
       端まで届いているリンク（箇条書きの行頭や図の中の参照）が押せなくなる。 */
    .edge-zone {
      position: absolute; top: 0; bottom: 0; width: ${(EDGE_RATIO * 100).toFixed(2)}%;
      pointer-events: none;
      z-index: 5;
      display: flex; align-items: center;
      opacity: 0; transition: opacity .15s ease;
    }
    /* 山括弧は自前の丸い座布団に載せる（色は --on-slide-* の説明を見よ） */
    .edge-zone::after {
      display: flex; align-items: center; justify-content: center;
      width: 30px; height: 30px; border-radius: 50%;
      background: var(--on-slide-bg);
      border: 1px solid var(--on-slide-line);
      box-shadow: 0 2px 8px rgba(0,0,0,.4);
      color: #fff; font-size: 19px; line-height: 1;
      /* 山括弧は字面が上寄りなので、光学的な中心に落とす */
      padding-bottom: 3px;
    }
    /* 角丸はステージ枠に合わせる。帯は枠の外側に居るので、揃えないと角が四角く出る。
       座布団は帯の中央ではなく外端に寄せる（送りの手がかりは縁にあるほうが探しやすい）。 */
    .edge-zone.left {
      left: 0; justify-content: flex-start; padding-left: 6px;
      border-radius: 10px 0 0 10px;
      background: linear-gradient(to right, rgba(0,0,0,.15), transparent);
    }
    .edge-zone.right {
      right: 0; justify-content: flex-end; padding-right: 6px;
      border-radius: 0 10px 10px 0;
      background: linear-gradient(to left, rgba(0,0,0,.15), transparent);
    }
    .edge-zone.left::after  { content: "\\2039"; padding-right: 2px; }
    .edge-zone.right::after { content: "\\203A"; padding-left: 2px; }
    /* data-edge は mousemove が入れる。touch では付かないので目印も出ないが、
       タップは click として同じ判定を通る。 */
    .stage-wrap[data-edge="left"], .stage-wrap[data-edge="right"] { cursor: pointer; }
    .stage-wrap[data-edge="left"] .edge-zone.left,
    .stage-wrap[data-edge="right"] .edge-zone.right { opacity: 1; }

    .stage-frame {
      width: ${SLIDE_W_PX}px; height: ${SLIDE_H_PX}px;
      transform-origin: top left;
      border-radius: 10px; overflow: hidden;
      box-shadow: 0 8px 40px rgba(0,0,0,.5);
      position: relative;
    }
    /* デッキの短い呼び名。**どのパターン集を見ているか**をスライドの中で名乗る。
       題は上のパンくずにあるが、読んでいる最中に目を上げないと分からない。

       足場は position: relative の .stage-frame（.wiki-slide には position を
       持たせない — .slide の absolute の基準がそちらへ移ってしまう）。だから
       scaleStage() の transform に乗り、どの倍率でもスライドに対する比が変わらない。
       枠の overflow: hidden が角丸に沿って切る。

       座布団は送りの山括弧と同じ1組の色で置く（--on-slide-* の説明を見よ）。
       pointer-events: none は必須 — バッジは右端 8% の送りゾーンの中に居るので、
       クリックを飲むと「端を押して送る」に穴が空く（tooltip も置けない）。 */
    .deck-badge {
      position: absolute; top: 10px; right: 12px; z-index: 3;
      max-width: 22%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      padding: 2px 9px; border-radius: 999px;
      background: var(--on-slide-bg);
      border: 1px solid var(--on-slide-line);
      color: #fff; font-size: 12px; line-height: 1.6; letter-spacing: .04em;
      pointer-events: none;
    }

    /* デッキをまたぐリンクにだけ、行き先の短い名を添える。付いていること自体が
       「またぐ」の合図なので、デッキ内のリンクには何も足さない。

       ここに置くのは、これが Wiki だけの概念だから — 1枚 HTML はデッキが1つで、
       「またぐ」に指すものが無い（.broken が slideBaseCss 側に居るのとはそこが違う）。
       節点ではなく属性 + ::after なのは client-script の annotateLinks を見よ。
       inline-block にすると親の下線が渡らない（原子インラインには伝播しない）ので、
       補足が下線の続きに見えず、リンクの語との切れ目が保たれる。 */
    a.wikilink[data-cross-deck]::after {
      content: attr(data-cross-deck);
      display: inline-block;
      margin-left: .18em;
      font-size: .68em; vertical-align: .35em;
      opacity: .75; letter-spacing: .02em; white-space: nowrap;
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

    /* 型つきの関係。型の名前を左に立て、相手をその右に並べる。
       型は1語（上位・対・検算…）なので、幅を固定すると行頭が揃って読む単位が切れる。 */
    .relations .rel-row {
      display: flex; align-items: baseline; gap: 10px;
      margin-bottom: 6px;
    }
    .relations .rel-type {
      flex: 0 0 4.5em;
      font-size: 11px; font-weight: 700; letter-spacing: .04em;
      color: var(--accent);
    }

    /* ステージの上に置く。読み方の説明は、読み始める前に目に入らないと意味がない。 */
    .hint {
      margin-bottom: 12px; flex-shrink: 0;
      font-size: 11px; color: var(--muted); text-align: center;
    }
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
