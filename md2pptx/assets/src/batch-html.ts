#!/usr/bin/env npx tsx
/**
 * drafts/*.md → htmls/*.html 一括変換 + index.html 目次ページ生成
 *
 * Usage:
 *   cd skills/md2pptx/assets
 *   npx tsx src/batch-html.ts <drafts-dir> <htmls-dir>
 *
 * Example:
 *   npx tsx src/batch-html.ts ../../../pattern-language/drafts ../../../pattern-language/htmls
 */
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from "fs"
import { join, resolve } from "path"
import { Effect, Exit } from "effect"
import { md2html } from "./pipeline.js"
import { DEFAULT_THEME } from "./schema/index.js"

// -----------------------------------------------------------------
// Metadata extraction from <!--pattern-language-a--> block
// -----------------------------------------------------------------
interface PatternMeta {
  num: string
  name: string
  category: string
  stage: string
  file: string
}

function extractMeta(markdown: string, htmlFile: string): PatternMeta | null {
  const block = markdown.match(/<!--pattern-language-a-->([\s\S]*?)(?=\n###|\n<!--)/)
  if (!block) return null
  const text = block[1]
  const get = (key: string): string => {
    const m = text.match(new RegExp(`^${key}:\\s*"?([^"\\n]+)"?`, "m"))
    return m ? m[1].trim() : ""
  }
  const num = get("number")
  const name = get("name")
  const category = get("category")
  const stage = get("stage")
  if (!num || !name) return null
  return { num, name, category, stage, file: htmlFile }
}

// -----------------------------------------------------------------
// Index HTML generation
// -----------------------------------------------------------------
function generateIndexHtml(patterns: PatternMeta[]): string {
  const patternsJson = JSON.stringify(patterns, null, 2)

  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI\u958b\u767a\u30d1\u30bf\u30fc\u30f3\u30e9\u30f3\u30b2\u30fc\u30b8</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    font-family: "Hiragino Sans", "Noto Sans JP", sans-serif;
    background: #0f1724;
    color: #e0e0e0;
    min-height: 100vh;
  }

  /* ========== INDEX VIEW ========== */
  .index-view {
    max-width: 900px;
    margin: 0 auto;
    padding: 48px 24px 64px;
  }

  .index-view.hidden { display: none; }

  .index-header {
    text-align: center;
    margin-bottom: 48px;
  }

  .index-header h1 {
    font-size: 28px;
    font-weight: 700;
    color: #fff;
    letter-spacing: 0.02em;
    margin-bottom: 8px;
  }

  .index-header p {
    font-size: 14px;
    color: #8899aa;
  }

  .stage-group {
    margin-bottom: 32px;
  }

  .stage-label {
    display: inline-block;
    padding: 4px 14px;
    border-radius: 4px;
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 12px;
    letter-spacing: 0.04em;
  }

  .pattern-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
    gap: 10px;
  }

  .pattern-card {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px 16px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
    text-decoration: none;
    color: inherit;
  }

  .pattern-card:hover {
    background: rgba(255,255,255,0.08);
    border-color: rgba(255,255,255,0.18);
  }

  .pattern-num {
    font-size: 11px;
    font-weight: 700;
    color: rgba(255,255,255,0.4);
    min-width: 20px;
  }

  .pattern-name {
    font-size: 14px;
    font-weight: 500;
    color: #e8e8e8;
  }

  .play-all-btn {
    display: block;
    margin: 40px auto 0;
    padding: 14px 40px;
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    background: #1B5E20;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    transition: background 0.15s;
    letter-spacing: 0.02em;
  }

  .play-all-btn:hover { background: #2E7D32; }

  /* ========== PAGINATION ========== */
  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    margin-top: 32px;
  }

  .pagination button {
    padding: 6px 16px;
    font-size: 13px;
    font-weight: 500;
    color: #ccc;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .pagination button:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
  .pagination button:disabled { opacity: 0.3; cursor: default; }

  .pagination .page-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    font-size: 13px;
    color: #999;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s, color 0.15s;
  }

  .pagination .page-num:hover { background: rgba(255,255,255,0.06); }
  .pagination .page-num.active {
    background: #1B5E20;
    color: #fff;
    font-weight: 700;
  }

  .page-size-select {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 8px;
    margin-top: 12px;
    font-size: 12px;
    color: #667;
  }

  .page-size-select select {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    color: #ccc;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 12px;
  }

  /* ========== VIEWER ========== */
  .viewer {
    position: fixed;
    inset: 0;
    background: #0f1724;
    z-index: 100;
    display: flex;
    flex-direction: column;
  }

  .viewer.hidden { display: none; }

  .viewer-topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    padding: 0 16px;
    background: rgba(15,23,36,0.95);
    border-bottom: 1px solid rgba(255,255,255,0.08);
    flex-shrink: 0;
  }

  .viewer-close {
    background: none;
    border: 1px solid rgba(255,255,255,0.15);
    color: #ccc;
    font-size: 13px;
    padding: 4px 14px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .viewer-close:hover { background: rgba(255,255,255,0.08); }

  .viewer-info {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 13px;
    color: #aaa;
  }

  .viewer-title {
    font-weight: 600;
    color: #e0e0e0;
  }

  .viewer-counter {
    font-size: 12px;
    color: #777;
    font-variant-numeric: tabular-nums;
  }

  .viewer-nav {
    display: flex;
    gap: 6px;
  }

  .viewer-nav button {
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    color: #ccc;
    font-size: 14px;
    padding: 4px 16px;
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .viewer-nav button:hover:not(:disabled) { background: rgba(255,255,255,0.12); }
  .viewer-nav button:disabled { opacity: 0.3; cursor: default; }

  .viewer-body {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 24px 0 48px;
  }

  .viewer-body iframe {
    border: none;
    width: 960px;
    height: 1160px;
    border-radius: 8px;
    box-shadow: 0 4px 32px rgba(0,0,0,0.4);
    flex-shrink: 0;
  }

  /* ========== DRAWER ========== */
  .drawer-toggle {
    background: none;
    border: 1px solid rgba(255,255,255,0.15);
    color: #ccc;
    font-size: 13px;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 8px;
  }
  .drawer-toggle:hover { background: rgba(255,255,255,0.08); }

  .drawer {
    position: fixed;
    top: 44px;
    left: 0;
    bottom: 0;
    width: 280px;
    background: rgba(15,23,36,0.98);
    border-right: 1px solid rgba(255,255,255,0.1);
    overflow-y: auto;
    z-index: 110;
    padding: 16px 0;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
  }

  .drawer.open { transform: translateX(0); }

  .drawer-stage {
    padding: 8px 16px 4px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .drawer-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 16px;
    font-size: 13px;
    color: #bbb;
    cursor: pointer;
    transition: background 0.1s;
  }

  .drawer-item:hover { background: rgba(255,255,255,0.05); }
  .drawer-item.active { background: rgba(255,255,255,0.08); color: #fff; }

  .drawer-item .d-num {
    font-size: 11px;
    color: rgba(255,255,255,0.35);
    min-width: 20px;
  }

  /* Stage colors */
  .stage-hajime { background: #E8F5E9; color: #1B5E20; }
  .stage-kata { background: #E3F2FD; color: #0D47A1; }
  .stage-zenki { background: #F3E5F5; color: #4A148C; }
  .stage-kouki { background: #FBE9E7; color: #BF360C; }
  .stage-saijoi { background: #E0E3E8; color: #0f1724; }

  .ds-hajime { color: #81C784; }
  .ds-kata { color: #64B5F6; }
  .ds-zenki { color: #CE93D8; }
  .ds-kouki { color: #FF8A65; }
  .ds-saijoi { color: #90A4AE; }

  /* Keyboard hint */
  .kbd-hint {
    text-align: center;
    padding: 12px;
    font-size: 11px;
    color: #556;
  }

  .kbd-hint kbd {
    display: inline-block;
    padding: 1px 6px;
    border: 1px solid #445;
    border-radius: 3px;
    font-family: inherit;
    font-size: 11px;
    background: rgba(255,255,255,0.04);
  }
</style>
</head>
<body>

<!-- ==================== INDEX VIEW ==================== -->
<div class="index-view" id="indexView">
  <div class="index-header">
    <h1>AI\u958b\u767a\u30d1\u30bf\u30fc\u30f3\u30e9\u30f3\u30b2\u30fc\u30b8</h1>
    <p id="indexSubtitle"></p>
  </div>

  <div id="indexList"></div>

  <div class="pagination" id="pagination"></div>
  <div class="page-size-select">
    <label>\u8868\u793a\u4ef6\u6570:
      <select id="pageSizeSelect">
        <option value="6">6</option>
        <option value="12">12</option>
        <option value="0">\u3059\u3079\u3066</option>
      </select>
    </label>
  </div>

  <button class="play-all-btn" onclick="startViewer(0)">
    \u3059\u3079\u3066\u306e\u30b9\u30e9\u30a4\u30c9\u3092\u898b\u308b \u2192
  </button>

  <div class="kbd-hint" style="margin-top: 16px;">
    \u30ab\u30fc\u30c9\u3092\u30af\u30ea\u30c3\u30af\u3059\u308b\u3068\u305d\u306e\u30d1\u30bf\u30fc\u30f3\u304b\u3089\u958b\u59cb
  </div>
</div>

<!-- ==================== VIEWER ==================== -->
<div class="viewer hidden" id="viewer">
  <div class="viewer-topbar">
    <div style="display:flex;align-items:center">
      <button class="drawer-toggle" id="drawerToggle" title="\u30d1\u30bf\u30fc\u30f3\u4e00\u89a7">\u2630</button>
      <button class="viewer-close" onclick="closeViewer()">\u2190 \u4e00\u89a7\u306b\u623b\u308b</button>
    </div>
    <div class="viewer-info">
      <span class="viewer-title" id="viewerTitle"></span>
      <span class="viewer-counter" id="viewerCounter"></span>
    </div>
    <div class="viewer-nav">
      <button id="vPrev" onclick="viewerPrev()">\u2190 \u524d\u306e\u30d1\u30bf\u30fc\u30f3</button>
      <button id="vNext" onclick="viewerNext()">\u6b21\u306e\u30d1\u30bf\u30fc\u30f3 \u2192</button>
    </div>
  </div>

  <div class="drawer" id="drawer"></div>

  <div class="viewer-body">
    <iframe id="slideFrame" sandbox="allow-scripts allow-same-origin"></iframe>
  </div>

  <div class="kbd-hint">
    <kbd>\u2190</kbd> <kbd>\u2192</kbd> \u30d1\u30bf\u30fc\u30f3\u79fb\u52d5\u3000
    <kbd>Esc</kbd> \u4e00\u89a7\u306b\u623b\u308b
  </div>
</div>

<script>
// ============================================================
// Pattern data (auto-generated)
// ============================================================
const patterns = ${patternsJson};

const SLIDES_PER_PATTERN = 2;
const totalSlides = patterns.length * SLIDES_PER_PATTERN;

const stageInfo = {
  "\u306f\u3058\u3081\u306e\u4e00\u6b69":           { cls: "hajime", color: "#1B5E20" },
  "\u578b\u304c\u8eab\u306b\u3064\u304f\u9803":       { cls: "kata",   color: "#0D47A1" },
  "\u547c\u5438\u3059\u308b\u3088\u3046\u306b\uff08\u524d\u671f\uff09": { cls: "zenki",  color: "#4A148C" },
  "\u547c\u5438\u3059\u308b\u3088\u3046\u306b\uff08\u5f8c\u671f\uff09": { cls: "kouki",  color: "#BF360C" },
  "\u547c\u5438\u3059\u308b\u3088\u3046\u306b\uff08\u6700\u4e0a\u4f4d\uff09": { cls: "saijoi", color: "#0f1724" },
};

// ============================================================
// Pagination state
// ============================================================
let currentPage = 0;
let pageSize = 0; // 0 = show all

function getPagedPatterns() {
  if (pageSize === 0) return patterns;
  const start = currentPage * pageSize;
  return patterns.slice(start, start + pageSize);
}

function getTotalPages() {
  if (pageSize === 0) return 1;
  return Math.ceil(patterns.length / pageSize);
}

// ============================================================
// Build index view
// ============================================================
function buildIndex() {
  const container = document.getElementById("indexList");
  const subtitle = document.getElementById("indexSubtitle");
  const totalPages = getTotalPages();

  if (pageSize === 0) {
    subtitle.textContent = "\u30c1\u30fc\u30e0\u958b\u767a\u3067\u4f7f\u3048\u308bAI\u5354\u50cd\u306e" + patterns.length + "\u30d1\u30bf\u30fc\u30f3";
  } else {
    const start = currentPage * pageSize + 1;
    const end = Math.min((currentPage + 1) * pageSize, patterns.length);
    subtitle.textContent = patterns.length + "\u30d1\u30bf\u30fc\u30f3\u4e2d " + start + "\u2013" + end + " \u3092\u8868\u793a";
  }

  const visible = getPagedPatterns();
  const grouped = {};
  const stageOrder = Object.keys(stageInfo);
  stageOrder.forEach(s => grouped[s] = []);
  visible.forEach((p) => {
    const globalIdx = patterns.indexOf(p);
    if (grouped[p.stage]) grouped[p.stage].push({ ...p, idx: globalIdx });
  });

  let html = "";
  stageOrder.forEach(stage => {
    const pats = grouped[stage];
    if (!pats.length) return;
    const si = stageInfo[stage];
    html += '<div class="stage-group">';
    html += '<div class="stage-label stage-' + si.cls + '">' + stage + '</div>';
    html += '<div class="pattern-list">';
    pats.forEach(p => {
      html += '<a class="pattern-card" onclick="startViewer(' + p.idx + ')" title="' + p.category + '">';
      html += '<span class="pattern-num">' + p.num + '</span>';
      html += '<span class="pattern-name">' + p.name + '</span>';
      html += '</a>';
    });
    html += '</div></div>';
  });
  container.innerHTML = html;

  buildPagination();
}

function buildPagination() {
  const container = document.getElementById("pagination");
  const totalPages = getTotalPages();
  if (totalPages <= 1) {
    container.innerHTML = "";
    return;
  }

  let html = '<button onclick="goPage(' + (currentPage - 1) + ')"' +
    (currentPage === 0 ? ' disabled' : '') + '>\u2190 \u524d</button>';

  for (let i = 0; i < totalPages; i++) {
    html += '<span class="page-num' + (i === currentPage ? ' active' : '') +
      '" onclick="goPage(' + i + ')">' + (i + 1) + '</span>';
  }

  html += '<button onclick="goPage(' + (currentPage + 1) + ')"' +
    (currentPage >= totalPages - 1 ? ' disabled' : '') + '>\u6b21 \u2192</button>';

  container.innerHTML = html;
}

function goPage(page) {
  const totalPages = getTotalPages();
  if (page < 0 || page >= totalPages) return;
  currentPage = page;
  buildIndex();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Page size selector
document.getElementById("pageSizeSelect").addEventListener("change", (e) => {
  pageSize = parseInt(e.target.value);
  currentPage = 0;
  buildIndex();
});

// ============================================================
// Build drawer
// ============================================================
function buildDrawer() {
  const container = document.getElementById("drawer");
  let html = "";
  let lastStage = "";
  patterns.forEach((p, i) => {
    if (p.stage !== lastStage) {
      const si = stageInfo[p.stage];
      html += '<div class="drawer-stage ds-' + si.cls + '">' + p.stage + '</div>';
      lastStage = p.stage;
    }
    html += '<div class="drawer-item" data-idx="' + i + '" onclick="jumpToPattern(' + i + ')">';
    html += '<span class="d-num">' + p.num + '</span>' + p.name;
    html += '</div>';
  });
  container.innerHTML = html;
}

// ============================================================
// Viewer state (pattern-level navigation, both pages visible)
// ============================================================
let currentPattern = 0;
let drawerOpen = false;

function startViewer(patternIdx) {
  currentPattern = patternIdx;
  document.getElementById("indexView").classList.add("hidden");
  document.getElementById("viewer").classList.remove("hidden");
  loadPattern();
  scaleIframe();
}

function closeViewer() {
  document.getElementById("viewer").classList.add("hidden");
  document.getElementById("indexView").classList.remove("hidden");
  document.getElementById("slideFrame").src = "about:blank";
}

function viewerNext() {
  if (currentPattern < patterns.length - 1) {
    currentPattern++;
    loadPattern();
  }
}

function viewerPrev() {
  if (currentPattern > 0) {
    currentPattern--;
    loadPattern();
  }
}

function jumpToPattern(patternIdx) {
  currentPattern = patternIdx;
  loadPattern();
  toggleDrawer(false);
}

function loadPattern() {
  const pat = patterns[currentPattern];
  const frame = document.getElementById("slideFrame");

  document.getElementById("viewerTitle").textContent = pat.num + " " + pat.name;
  document.getElementById("viewerCounter").textContent =
    (currentPattern + 1) + " / " + patterns.length;

  document.getElementById("vPrev").disabled = currentPattern === 0;
  document.getElementById("vNext").disabled = currentPattern === patterns.length - 1;

  document.querySelectorAll(".drawer-item").forEach(el => {
    el.classList.toggle("active", parseInt(el.dataset.idx) === currentPattern);
  });

  // Scroll viewer body to top
  document.querySelector(".viewer-body").scrollTop = 0;

  const currentSrc = frame.getAttribute("data-pattern");
  if (currentSrc !== pat.file) {
    frame.setAttribute("data-pattern", pat.file);
    frame.src = pat.file;
  }
}

// ============================================================
// Drawer
// ============================================================
function toggleDrawer(force) {
  drawerOpen = force !== undefined ? force : !drawerOpen;
  document.getElementById("drawer").classList.toggle("open", drawerOpen);
}

document.getElementById("drawerToggle").addEventListener("click", () => toggleDrawer());

document.getElementById("viewer").addEventListener("click", (e) => {
  if (drawerOpen &&
      !e.target.closest(".drawer") &&
      !e.target.closest(".drawer-toggle")) {
    toggleDrawer(false);
  }
});

// ============================================================
// Keyboard navigation
// ============================================================
document.addEventListener("keydown", (e) => {
  const viewerVisible = !document.getElementById("viewer").classList.contains("hidden");
  if (!viewerVisible) return;

  if (e.key === "ArrowRight" || e.key === " ") {
    e.preventDefault();
    viewerNext();
  } else if (e.key === "ArrowLeft") {
    e.preventDefault();
    viewerPrev();
  } else if (e.key === "Escape") {
    e.preventDefault();
    if (drawerOpen) {
      toggleDrawer(false);
    } else {
      closeViewer();
    }
  }
});

// ============================================================
// Responsive iframe scaling (width-fit, height scrolls)
// ============================================================
function scaleIframe() {
  const frame = document.getElementById("slideFrame");
  if (!frame) return;
  const body = document.querySelector(".viewer-body");
  if (!body) return;
  const vw = body.clientWidth - 48;
  const scale = vw / 960;
  // Use zoom instead of transform: scale() to avoid subpixel blur on Retina
  frame.style.zoom = Math.min(scale, 1.0);
  frame.style.transform = "none";
}

window.addEventListener("resize", () => {
  if (!document.getElementById("viewer").classList.contains("hidden")) {
    scaleIframe();
  }
});

// ============================================================
// Init
// ============================================================
buildIndex();
buildDrawer();
</script>
</body>
</html>`
}

// -----------------------------------------------------------------
// Post-process: inject CSS/JS to show all slides stacked
// -----------------------------------------------------------------
function injectAllSlidesView(html: string): string {
  const overrideStyle = `
<style id="batch-stacked">
  .controls { display: none !important; }
  .slide-counter { display: none !important; }
  body {
    overflow: auto !important;
    min-height: 0 !important;
    height: auto !important;
    display: block !important;
  }
  .slide-wrapper {
    overflow: visible !important;
    width: auto !important;
    height: auto !important;
  }
  .presentation-container {
    position: relative !important;
    transform: none !important;
    width: 960px !important;
    height: auto !important;
    overflow: visible !important;
    margin: 0 auto;
  }
  .slide {
    display: block !important;
    position: relative !important;
    width: 10in !important;
    height: 5.625in !important;
  }
  .slide + .slide {
    margin-top: 24px !important;
  }
</style>
<style id="batch-page2">
  /* Activated via #page2 hash — show only 2nd slide */
</style>
<script>
  if (location.hash === "#page2") {
    document.getElementById("batch-page2").textContent =
      ".slide { display: none !important; }" +
      ".slide:nth-child(2) { display: block !important; }";
  }
</script>`
  return html.replace("</head>", overrideStyle + "\n</head>")
}

// -----------------------------------------------------------------
// Main
// -----------------------------------------------------------------
const args = process.argv.slice(2)
if (args.length < 2) {
  console.error("Usage: npx tsx src/batch-html.ts <drafts-dir> <htmls-dir>")
  process.exit(1)
}

const draftsDir = resolve(args[0])
const htmlsDir = resolve(args[1])

const program = Effect.gen(function* () {
  mkdirSync(htmlsDir, { recursive: true })

  const files = readdirSync(draftsDir)
    .filter((f) => f.endsWith(".md"))
    .sort()

  console.log(`Found ${files.length} markdown files in ${draftsDir}\n`)

  let success = 0
  let failed = 0
  const metas: PatternMeta[] = []

  for (const file of files) {
    const mdPath = join(draftsDir, file)
    const htmlFile = file.replace(/\.md$/, ".html")
    const htmlPath = join(htmlsDir, htmlFile)

    const markdown = readFileSync(mdPath, "utf-8")
    // 図解の `![…](….svg)` はその md からの相対で書かれている
    const result = yield* Effect.either(
      md2html(markdown, { theme: DEFAULT_THEME, baseDir: draftsDir })
    )

    if (result._tag === "Right") {
      writeFileSync(htmlPath, injectAllSlidesView(result.right), "utf-8")
      console.log(`  OK  ${file} → ${htmlFile}`)
      success++

      const meta = extractMeta(markdown, htmlFile)
      if (meta) metas.push(meta)
    } else {
      console.error(`  NG  ${file}: ${result.left}`)
      failed++
    }
  }

  // Generate index.html
  if (metas.length > 0) {
    const indexHtml = generateIndexHtml(metas)
    writeFileSync(join(htmlsDir, "index.html"), indexHtml, "utf-8")
    console.log(`\n  OK  index.html (${metas.length} patterns, with pagination)`)
  }

  console.log(`\nDone: ${success} succeeded, ${failed} failed`)
})

const exit = await Effect.runPromiseExit(program)

if (Exit.isFailure(exit)) {
  console.error("Fatal error:", exit.cause)
  process.exit(1)
}
