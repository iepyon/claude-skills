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
    var slideEl = a.closest(".wiki-slide");
    var deck = slideEl ? slideEl.dataset.deck : null;
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
  });

  // ---------------------------------------------------------- hover preview
  var OPEN_DELAY = 220, CLOSE_DELAY = 160, MAX_DEPTH = 3;
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

  function buildCard(entry, depth) {
    var source = slideEls[entry.id];
    if (!source) return null;
    var slide = source.querySelector(".slide");
    if (!slide) return null;

    var card = document.createElement("div");
    card.className = "preview-card";
    card.dataset.depth = String(depth);

    var head = document.createElement("div");
    head.className = "preview-head";
    head.innerHTML = '<span class="p-title">' + escapeHtml(entry.title) +
      '</span><span class="p-deck">' + escapeHtml(entry.deckTitle) + "</span>";

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
    else if (e.key === "Escape") { closeAllPreviews(); }
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
  function scaleStage() {
    var main = document.querySelector(".main");
    var frame = document.querySelector(".stage-frame");
    if (!main || !frame) return;
    var availW = main.clientWidth - 48;
    var scale = Math.min(availW / ${SLIDE_W_PX}, 1);
    frame.style.transform = "scale(" + scale + ")";
    // transform はレイアウト上の寸法を変えないので、下の要素が重ならないよう
    // 実効高さぶんのマージンを自分で作る
    frame.style.marginBottom = Math.round(${SLIDE_H_PX} * (scale - 1)) + "px";
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
