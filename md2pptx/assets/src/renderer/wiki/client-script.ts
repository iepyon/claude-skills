import { SLIDE_WIDTH, SLIDE_HEIGHT } from "../../constants.js"

const SLIDE_W_PX = SLIDE_WIDTH * 96
const SLIDE_H_PX = SLIDE_HEIGHT * 96

/**
 * Wiki ビューアのクライアントスクリプト。
 *
 * 前提: 全スライドが最初から DOM にある（`--html` と同じ構造）。
 * だからホバープレビューは対象ノードを cloneNode するだけで作れる。
 * レイアウトエンジンをブラウザに持ち込む必要も、スライドを JSON で
 * 二重に持つ必要もない — 表示とプレビューが食い違いようがない。
 */
export function wikiScript(): string {
  return `
(function () {
  "use strict";

  var ENTRIES   = window.__WIKI__.entries;    // [{id, deck, deckTitle, title, deckIndex}]
  var RESOLVE   = window.__WIKI__.resolve;    // { deckSlug: { ref: globalId } }
  var BACKLINKS = window.__WIKI__.backlinks;  // { globalId: [globalId] }

  var byId = {};
  ENTRIES.forEach(function (e, i) { e.index = i; byId[e.id] = e; });

  var slideEls = {};
  Array.prototype.forEach.call(document.querySelectorAll(".wiki-slide"), function (el) {
    slideEls[el.dataset.wikiId] = el;
  });

  var current = null;

  // ---------------------------------------------------------------- routing
  function idFromHash() {
    var raw = decodeURIComponent((location.hash || "").replace(/^#/, ""));
    return byId[raw] ? raw : (ENTRIES.length ? ENTRIES[0].id : null);
  }

  function show(id) {
    var entry = byId[id];
    if (!entry || id === current) { if (entry) scaleStage(); return; }

    if (current && slideEls[current]) slideEls[current].classList.remove("active");
    slideEls[id].classList.add("active");
    current = id;

    document.getElementById("crumb").innerHTML =
      escapeHtml(entry.deckTitle) + " &rsaquo; <b>" + escapeHtml(entry.title) + "</b>";

    Array.prototype.forEach.call(document.querySelectorAll(".toc-link"), function (a) {
      if (a.dataset.id === id) a.setAttribute("aria-current", "true");
      else a.removeAttribute("aria-current");
    });
    var active = document.querySelector('.toc-link[aria-current="true"]');
    if (active && active.scrollIntoView) active.scrollIntoView({ block: "nearest" });

    renderBacklinks(id);
    updateNavButtons(entry);
    document.querySelector(".main").scrollTop = 0;
    scaleStage();
  }

  function go(id) {
    // location.hash への代入が history にエントリを積むので、
    // pushState は使わない。ブラウザの戻る/進むがそのまま「来た道」になる。
    if (byId[id]) location.hash = "#" + encodeURIComponent(id);
  }

  window.addEventListener("hashchange", function () { show(idFromHash()); });

  // ------------------------------------------------------------- backlinks
  function renderBacklinks(id) {
    var inbound = BACKLINKS[id] || [];
    var host = document.getElementById("backlinks-body");
    if (!inbound.length) {
      host.innerHTML = '<span class="none">まだどこからもリンクされていません</span>';
      return;
    }
    host.innerHTML = "<ul>" + inbound.map(function (from) {
      var e = byId[from];
      return '<li><a class="wikilink" href="#" data-goto="' + escapeAttr(from) + '">' +
        escapeHtml(e ? e.title : from) + "</a></li>";
    }).join("") + "</ul>";
  }

  // ------------------------------------------------------------ navigation
  function neighbour(entry, delta, crossDeck) {
    var target = entry.index + delta;
    if (target < 0 || target >= ENTRIES.length) return null;
    if (!crossDeck && ENTRIES[target].deck !== entry.deck) return null;
    return ENTRIES[target].id;
  }

  function updateNavButtons(entry) {
    document.getElementById("prev-btn").disabled = !neighbour(entry, -1, true);
    document.getElementById("next-btn").disabled = !neighbour(entry, 1, true);
  }

  document.getElementById("prev-btn").addEventListener("click", function () { step(-1, true); });
  document.getElementById("next-btn").addEventListener("click", function () { step(1, true); });

  function step(delta, crossDeck) {
    var entry = byId[current];
    if (!entry) return;
    var next = neighbour(entry, delta, crossDeck);
    if (next) go(next);
  }

  // --------------------------------------------------------- link handling
  // リンク先の解決はビルド時に済ませてある（RESOLVE）。
  // 解決できなかったものには .broken を付けて、遷移させない。
  function targetOf(a) {
    if (a.dataset.goto) return a.dataset.goto;
    var ref = a.dataset.wikilink;
    if (!ref) return null;
    // 参照はデッキごとに解決する。プレビューカードは .slide だけを clone するので
    // data-deck を持つ .wiki-slide が祖先に居ない — カード自身が deck を名乗り直す。
    // このフォールバックは *切り離されたカード* の上でも効く必要がある。下の click
    // ハンドラが targetOf より先に closeAllPreviews() を呼んで removeChild するため
    // （closest は木が document に繋がっていなくても祖先を辿る）。
    var scope = a.closest(".wiki-slide") || a.closest(".preview-card");
    var deck = scope ? scope.dataset.deck : null;
    var perDeck = (deck && RESOLVE[deck]) || {};
    return perDeck[ref] || (byId[ref] ? ref : null);
  }

  function markBrokenLinks() {
    Array.prototype.forEach.call(document.querySelectorAll("a.wikilink[data-wikilink]"), function (a) {
      if (!targetOf(a)) {
        a.classList.add("broken");
        a.setAttribute("title", "リンク先が見つかりません: " + a.dataset.wikilink);
      }
    });
  }

  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a.wikilink") : null;
    if (!a) return;
    e.preventDefault();
    closeAllPreviews();
    var target = targetOf(a);
    if (target) go(target);
  });

  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest(".toc-link") : null;
    if (!a) return;
    e.preventDefault();
    go(a.dataset.id);
    closeDrawer();   // 狭い画面では選んだら引っ込める
  });

  // プレビューは「見るだけ」ではなく、そのままそのスライドへの入口にする。
  // リンクの除外は closest 1つで行う。e.defaultPrevented を併用すると
  // 「上のハンドラが先に走る」という登録順を前提にしてしまい、並べ替えで壊れる。
  function onPreviewClick(e) {
    if (!e.target.closest) return;
    if (e.target.closest("a.wikilink")) return;   // リンクは上のハンドラの担当
    var card = e.target.closest(".preview-card");
    if (!card || !card.dataset.target) return;
    // 文字を選択しただけで飛ばされると、プレビューから引用できない
    if (window.getSelection && String(window.getSelection()).length) return;
    closeAllPreviews();
    go(card.dataset.target);
  }
  document.addEventListener("click", onPreviewClick);

  // ------------------------------------------------------------- drawer
  // 画面が狭いときサイドバーは引き出しになる。以前は入力デバイスが
  // タッチかどうかで目次ごと消していたが、それではタッチ対応の
  // ノートPCでも目次に到達できなくなる。
  var sidebar = document.querySelector(".sidebar");
  var scrim = document.getElementById("scrim");
  var menuBtn = document.getElementById("menu-btn");

  function setDrawer(open) {
    sidebar.classList.toggle("open", open);
    scrim.classList.toggle("open", open);
    menuBtn.setAttribute("aria-expanded", open ? "true" : "false");
  }
  function closeDrawer() { setDrawer(false); }

  menuBtn.addEventListener("click", function () {
    setDrawer(!sidebar.classList.contains("open"));
  });
  scrim.addEventListener("click", closeDrawer);

  // ---------------------------------------------------------- hover preview
  var OPEN_DELAY = 220, CLOSE_DELAY = 160, MAX_DEPTH = 3;
  // プレビューの倍率。0.5 では中身が読めないので大きく出す。入れ子は段ごとに
  // 縮めて、下に重なった親カードの縁が見えるようにする（同寸だと完全に隠れる）。
  var PREVIEW_MAX_SCALE = 1, PREVIEW_MIN_SCALE = 0.3, PREVIEW_DEPTH_SHRINK = 0.85;
  var stack = [];            // [{card, anchor, depth}]
  var openTimer = null, closeTimer = null;
  var layer = document.getElementById("preview-layer");
  var canHover = window.matchMedia("(hover: hover) and (pointer: fine)");

  function closeFrom(depth) {
    while (stack.length > depth) {
      var top = stack.pop();
      if (top.card.parentNode) top.card.parentNode.removeChild(top.card);
    }
  }
  function closeAllPreviews() { closeFrom(0); }

  // 開くたびに画面サイズから決める。カード自身に載せるので resize 監視は要らない
  // （resize では closeAllPreviews するため、次に開くときの値が必ず最新になる）。
  function previewScale(depth) {
    var s = Math.min(
      PREVIEW_MAX_SCALE,
      (window.innerWidth - 32) / ${SLIDE_W_PX},
      (window.innerHeight - 160) / ${SLIDE_H_PX}
    ) * Math.pow(PREVIEW_DEPTH_SHRINK, depth);
    return Math.max(PREVIEW_MIN_SCALE, s);
  }

  function buildCard(entry, depth) {
    var source = slideEls[entry.id];
    if (!source) return null;
    var slide = source.querySelector(".slide");
    if (!slide) return null;

    var card = document.createElement("div");
    card.className = "preview-card";
    card.dataset.depth = String(depth);
    card.dataset.deck = entry.deck;      // カード内のリンクを解決する足場 (targetOf)
    card.dataset.target = entry.id;      // カード自体をクリックしたときの行き先
    // append より前に置く。positionCard が offsetWidth を読むので、後だと
    // 初回だけ既定倍率の寸法で位置が決まり、1フレーム小さく点滅する。
    card.style.setProperty("--preview-scale", String(previewScale(depth)));

    var head = document.createElement("div");
    head.className = "preview-head";
    head.innerHTML = '<span class="p-title">' + escapeHtml(entry.title) +
      '</span><span class="p-deck">' + escapeHtml(entry.deckTitle) +
      '</span><span class="p-open">クリックで開く</span>';

    var viewport = document.createElement("div");
    viewport.className = "preview-viewport";
    var scaler = document.createElement("div");
    scaler.className = "preview-scale";
    scaler.appendChild(slide.cloneNode(true));
    viewport.appendChild(scaler);

    card.appendChild(head);
    card.appendChild(viewport);
    return card;
  }

  function positionCard(card, anchor, depth) {
    var r = anchor.getBoundingClientRect();
    var w = card.offsetWidth, h = card.offsetHeight;
    var pad = 8, offset = depth * 16;

    var x = Math.min(Math.max(r.left + offset, pad), Math.max(pad, window.innerWidth - w - pad));
    var y = r.bottom + 10 + offset;
    if (y + h + pad > window.innerHeight) y = r.top - h - 10;   // 下に入らなければ上へ
    if (y < pad) y = Math.max(pad, (window.innerHeight - h) / 2);

    card.style.left = Math.round(x) + "px";
    card.style.top = Math.round(y) + "px";
  }

  function openPreview(anchor) {
    if (!canHover.matches) return;
    var target = targetOf(anchor);
    if (!target || !byId[target]) return;

    var inCard = anchor.closest(".preview-card");
    var depth = inCard ? Number(inCard.dataset.depth) + 1 : 0;
    if (depth > MAX_DEPTH) return;

    closeFrom(depth);
    var card = buildCard(byId[target], depth);
    if (!card) return;

    layer.appendChild(card);
    positionCard(card, anchor, depth);
    stack.push({ card: card, anchor: anchor, depth: depth });
    requestAnimationFrame(function () { card.classList.add("shown"); });
  }

  document.addEventListener("mouseover", function (e) {
    if (!e.target.closest) return;
    var a = e.target.closest("a.wikilink[data-wikilink], a.wikilink[data-goto]");
    var card = e.target.closest(".preview-card");
    if (card) clearTimeout(closeTimer);          // カード上に居る間は閉じない
    if (!a) return;
    clearTimeout(closeTimer);
    clearTimeout(openTimer);
    openTimer = setTimeout(function () { openPreview(a); }, OPEN_DELAY);
  });

  document.addEventListener("mouseout", function (e) {
    if (!e.target.closest) return;
    if (!e.target.closest("a.wikilink") && !e.target.closest(".preview-card")) return;
    clearTimeout(openTimer);
    clearTimeout(closeTimer);
    // リンクとカードの隙間をポインタが通過できるよう、閉じるのを少し遅らせる
    closeTimer = setTimeout(closeAllPreviews, CLOSE_DELAY);
  });

  window.addEventListener("scroll", closeAllPreviews, true);
  window.addEventListener("resize", function () { closeAllPreviews(); scaleStage(); });

  // ------------------------------------------------------------- keyboard
  document.addEventListener("keydown", function (e) {
    if (e.target && (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); step(1, e.shiftKey); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); step(-1, e.shiftKey); }
    else if (e.key === "Escape") { closeAllPreviews(); closeDrawer(); }
  });

  // -------------------------------------------------------- sidebar filter
  var filter = document.getElementById("filter");
  filter.addEventListener("input", function () {
    var q = filter.value.trim().toLowerCase();
    Array.prototype.forEach.call(document.querySelectorAll(".toc-link"), function (a) {
      var hit = !q || a.dataset.search.indexOf(q) >= 0;
      a.classList.toggle("hidden", !hit);
    });
    Array.prototype.forEach.call(document.querySelectorAll(".deck-group"), function (g) {
      var anyVisible = g.querySelector(".toc-link:not(.hidden)");
      g.style.display = anyVisible ? "" : "none";
    });
  });

  // --------------------------------------------------------------- scaling
  // バックリンク欄とキーヒントのぶん、縦に残しておく余白。
  // 実際に要るのは 115px ほどだが、そこまで確保するとスライドが目に見えて縮む。
  // 下端の手がかりだけ覗かせ、残りは .main のスクロールに逃がす。
  var CHROME_RESERVE = 64;
  // 暴走よけであって、制限ではない。中身はベクタの文字と SVG なので拡大で劣化しない。
  // 常に下の contain（幅と高さの小さいほう）が効くよう、十分高く取る。
  var MAX_STAGE_SCALE = 4;

  function scaleStage() {
    var main = document.querySelector(".main");
    var wrap = document.getElementById("stage-wrap");
    var frame = document.getElementById("stage-frame");
    if (!main || !wrap || !frame) return;

    var pad = parseFloat(getComputedStyle(main).paddingLeft) || 0;
    var availW = main.clientWidth - pad * 2;
    var availH = Math.max(200, main.clientHeight - pad * 2 - CHROME_RESERVE);

    // 幅と高さの両方に収める。横だけで決めると、背の低い画面で
    // スライドの下が切れる。本文領域はスライドより横長なのが普通なので、
    // 実際に効くのはたいてい高さのほう。
    var scale = Math.min(availW / ${SLIDE_W_PX}, availH / ${SLIDE_H_PX}, MAX_STAGE_SCALE);

    frame.style.transform = "scale(" + scale + ")";
    // 外箱に「縮小後の実寸」を持たせる。transform はレイアウト寸法を
    // 変えないので、これをやらないと 960px の箱がはみ出して左が見切れる。
    wrap.style.width = Math.round(${SLIDE_W_PX} * scale) + "px";
    wrap.style.height = Math.round(${SLIDE_H_PX} * scale) + "px";

    var bl = document.querySelector(".backlinks");
    if (bl) bl.style.width = Math.round(${SLIDE_W_PX} * scale) + "px";
  }

  // ----------------------------------------------------------- utilities
  function escapeHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function escapeAttr(s) { return escapeHtml(s).replace(/"/g, "&quot;"); }

  // ---------------------------------------------------------------- init
  markBrokenLinks();
  var start = idFromHash();
  if (start) {
    if (!location.hash) history.replaceState(null, "", "#" + encodeURIComponent(start));
    show(start);
  }
})();
`
}
