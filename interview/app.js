const state = {
  topics: [],
  filtered: [],
  selectedTopic: null,
  selectedFileKey: "",
  view: "topics",
};

const CHART = {
  track: "#181818",
  fill: "#ff8c00",
  label: "rgba(242, 240, 236, 0.68)",
};

const els = {
  search: document.getElementById("searchInput"),
  category: document.getElementById("categoryFilter"),
  topicList: document.getElementById("topicList"),
  topicTitle: document.getElementById("topicTitle"),
  fileTypeSelector: document.getElementById("fileTypeSelector"),
  markdownContent: document.getElementById("markdownContent"),

  completionCheckbox: document.getElementById("completionCheckbox"),

  navTopics: document.getElementById("navTopics"),
  navDashboard: document.getElementById("navDashboard"),
  topicsView: document.getElementById("topicsView"),
  dashboardView: document.getElementById("dashboardView"),
  resetProgress: document.getElementById("resetProgress"),

  overallPct: document.getElementById("overallPct"),
  overallCount: document.getElementById("overallCount"),
  overallChart: document.getElementById("overallChart"),
  categoryChart: document.getElementById("categoryChart"),
  topicProgressTable: document.getElementById("topicProgressTable"),
  copyrightYear: document.getElementById("copyrightYear"),
};

const STORAGE_KEY = "interview_prep_progress_v1";

const mqMobile = window.matchMedia("(max-width: 900px)");

function isMobileLayout() {
  return mqMobile.matches;
}

function scrollPanelIntoView(el) {
  if (!el || !isMobileLayout()) return;
  requestAnimationFrame(() => {
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

/** Logical-pixel canvas setup; drawing uses CSS pixel coordinates after setTransform(dpr). */
function prepareCanvas2D(canvas, logicalHeight) {
  const parent = canvas.closest(".card") || canvas.parentElement;
  const w = Math.max(200, Math.floor(parent?.clientWidth || canvas.clientWidth || 320));
  const h = Math.max(80, logicalHeight);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w, h };
}

function basePrefix() {
  const path = window.location.pathname;
  const marker = "/interview/";
  if (path.includes(marker)) return path.slice(0, path.indexOf(marker) + marker.length);
  return "/";
}

function toAbsolute(filePath) {
  const normalized = filePath.replace(/^\.?\//, "");
  const base = basePrefix();
  return `${base}${normalized}`;
}

function availableFileTypes(files) {
  const labels = {
    comprehensive: "Comprehensive Guide",
    mastery: "Mastery Track",
    questions: "Interview Questions",
    critical: "Critical Clarification",
    quickRef: "Quick Reference",
  };
  return Object.entries(labels)
    .filter(([key]) => files && files[key])
    .map(([value, label]) => ({ value, label }));
}

function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // ignore
  }
}

function setModuleComplete(topicId, fileKey, done) {
  const progress = loadProgress();
  progress[topicId] = progress[topicId] && typeof progress[topicId] === "object" ? progress[topicId] : {};
  progress[topicId][fileKey] = !!done;
  saveProgress(progress);
}

function isModuleComplete(topicId, fileKey) {
  const progress = loadProgress();
  return !!progress?.[topicId]?.[fileKey];
}

function topicModuleKeys(topic) {
  return ["comprehensive", "mastery", "questions", "critical", "quickRef"].filter((k) => topic?.files?.[k]);
}

function computeProgress() {
  const progress = loadProgress();
  let total = 0;
  let done = 0;
  const byCategory = {};
  const byTopic = {};

  for (const topic of state.topics) {
    const keys = topicModuleKeys(topic);
    const tTotal = keys.length;
    const tDone = keys.filter((k) => !!progress?.[topic.id]?.[k]).length;
    total += tTotal;
    done += tDone;

    byTopic[topic.id] = { done: tDone, total: tTotal };
    byCategory[topic.category] = byCategory[topic.category] || { done: 0, total: 0 };
    byCategory[topic.category].done += tDone;
    byCategory[topic.category].total += tTotal;
  }

  return { done, total, byCategory, byTopic };
}

function renderTopicList() {
  els.topicList.innerHTML = "";
  const stats = computeProgress();
  for (const topic of state.filtered) {
    const btn = document.createElement("button");
    btn.className = "topic-item";
    if (state.selectedTopic?.id === topic.id) btn.classList.add("active");
    const t = stats.byTopic[topic.id] || { done: 0, total: 0 };
    const pct = t.total ? Math.round((t.done / t.total) * 100) : 0;
    btn.innerHTML = `<strong>${topic.name}</strong><small>${topic.category} • ${pct}%</small>`;
    btn.addEventListener("click", () => selectTopic(topic));
    els.topicList.appendChild(btn);
  }
}

function applyFilters() {
  const q = els.search.value.trim().toLowerCase();
  const cat = els.category.value;
  state.filtered = state.topics.filter((topic) => {
    const catOk = cat === "all" || topic.category === cat;
    const text = `${topic.name} ${topic.category}`.toLowerCase();
    const searchOk = !q || text.includes(q);
    return catOk && searchOk;
  });
  renderTopicList();
}

function setContentTypes(topic) {
  const options = availableFileTypes(topic.files);
  els.fileTypeSelector.innerHTML = `<option value="">Choose content type</option>`;
  for (const option of options) {
    const el = document.createElement("option");
    el.value = option.value;
    el.textContent = option.label;
    els.fileTypeSelector.appendChild(el);
  }
  els.fileTypeSelector.disabled = options.length === 0;

  state.selectedFileKey = "";
  els.completionCheckbox.checked = false;
  els.completionCheckbox.disabled = true;
}

let scrollTopButton = null;
let scrollTopHandler = null;

function slugifyHeading(text) {
  const slug = text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
  return slug || "section";
}

function removeScrollTopButton() {
  if (scrollTopHandler) {
    window.removeEventListener("scroll", scrollTopHandler);
    scrollTopHandler = null;
  }
  if (scrollTopButton) {
    scrollTopButton.remove();
    scrollTopButton = null;
  }
}

function enhanceMarkdownDocument(container) {
  const h1 = container.querySelector("h1");
  if (!h1) return;

  if (!h1.id) {
    h1.id = "doc-top";
  }

  const usedIds = new Set([h1.id]);
  container.querySelectorAll("h2, h3").forEach((heading) => {
    let id = slugifyHeading(heading.textContent);
    const base = id;
    let n = 2;
    while (usedIds.has(id)) {
      id = `${base}-${n++}`;
    }
    heading.id = id;
    usedIds.add(id);
  });

  const h2s = container.querySelectorAll("h2");
  const tocHeadings = h2s.length ? { type: "h2", nodes: h2s } : { type: "h3", nodes: container.querySelectorAll("h3") };

  if (tocHeadings.nodes.length) {
    const toc = document.createElement("nav");
    toc.className = "doc-toc";
    toc.setAttribute("aria-label", "Table of contents");
    toc.innerHTML = `<p class="doc-toc-title">On this page</p><ol></ol>`;
    const ol = toc.querySelector("ol");

    if (tocHeadings.type === "h2") {
      h2s.forEach((h2) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `#${h2.id}`;
        a.textContent = h2.textContent.trim();
        li.appendChild(a);

        const h3s = [];
        let el = h2.nextElementSibling;
        while (el && el.tagName !== "H2") {
          if (el.tagName === "H3") h3s.push(el);
          el = el.nextElementSibling;
        }
        if (h3s.length) {
          const subOl = document.createElement("ol");
          h3s.forEach((h3) => {
            const subLi = document.createElement("li");
            const subA = document.createElement("a");
            subA.href = `#${h3.id}`;
            subA.textContent = h3.textContent.trim();
            subLi.appendChild(subA);
            subOl.appendChild(subLi);
          });
          li.appendChild(subOl);
        }
        ol.appendChild(li);
      });
    } else {
      tocHeadings.nodes.forEach((h3) => {
        const li = document.createElement("li");
        const a = document.createElement("a");
        a.href = `#${h3.id}`;
        a.textContent = h3.textContent.trim();
        li.appendChild(a);
        ol.appendChild(li);
      });
    }

    h1.insertAdjacentElement("afterend", toc);
  }

  removeScrollTopButton();
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "scroll-top-btn";
  btn.setAttribute("aria-label", "Back to title");
  btn.textContent = "↑ Top";
  btn.addEventListener("click", () => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    h1.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
  });
  document.body.appendChild(btn);
  scrollTopButton = btn;

  scrollTopHandler = () => {
    btn.classList.toggle("visible", window.scrollY > 400);
  };
  window.addEventListener("scroll", scrollTopHandler, { passive: true });
  scrollTopHandler();
}

async function loadMarkdown(path) {
  removeScrollTopButton();
  try {
    const response = await fetch(toAbsolute(path));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const markdown = await response.text();
    els.markdownContent.innerHTML = marked.parse(markdown);
    document.querySelectorAll("#markdownContent pre code").forEach((block) => hljs.highlightElement(block));
    enhanceMarkdownDocument(els.markdownContent);
  } catch (error) {
    els.markdownContent.innerHTML = `<p>Unable to load content from <code>${path}</code>.</p>`;
  }
}

function syncCompletionCheckbox() {
  const topicId = state.selectedTopic?.id;
  const fileKey = state.selectedFileKey;
  if (!topicId || !fileKey) {
    els.completionCheckbox.checked = false;
    els.completionCheckbox.disabled = true;
    return;
  }
  els.completionCheckbox.disabled = false;
  els.completionCheckbox.checked = isModuleComplete(topicId, fileKey);
}

function updateTopicQuery() {
  if (!state.selectedTopic) return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.set("topic", state.selectedTopic.id);
    if (state.selectedFileKey) {
      url.searchParams.set("file", state.selectedFileKey);
    } else {
      url.searchParams.delete("file");
    }
    history.replaceState(null, "", url);
  } catch {
    // ignore invalid base URLs (e.g. file://)
  }
}

function applyQueryParams() {
  const params = new URLSearchParams(window.location.search);
  const topicId = params.get("topic");
  if (!topicId) return;
  const topic = state.topics.find((t) => t.id === topicId);
  if (!topic) return;
  selectTopic(topic, { fromQuery: true });
  const fileKey = params.get("file");
  if (fileKey && topic.files?.[fileKey]) {
    els.fileTypeSelector.value = fileKey;
    state.selectedFileKey = fileKey;
    syncCompletionCheckbox();
    loadMarkdown(topic.files[fileKey]);
  }
}

function selectTopic(topic, opts = {}) {
  state.selectedTopic = topic;
  els.topicTitle.textContent = topic.name;
  setContentTypes(topic);
  renderTopicList();
  scrollPanelIntoView(els.topicsView);
  if (!opts.fromQuery) {
    updateTopicQuery();
  }
}

els.fileTypeSelector.addEventListener("change", (event) => {
  const key = event.target.value;
  if (!key || !state.selectedTopic?.files?.[key]) return;
  state.selectedFileKey = key;
  syncCompletionCheckbox();
  loadMarkdown(state.selectedTopic.files[key]).then(() => {
    updateTopicQuery();
    if (isMobileLayout()) {
      els.markdownContent.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });
});

els.completionCheckbox.addEventListener("change", (event) => {
  const topicId = state.selectedTopic?.id;
  const fileKey = state.selectedFileKey;
  if (!topicId || !fileKey) return;
  setModuleComplete(topicId, fileKey, event.target.checked);
  renderTopicList();
  if (state.view === "dashboard") renderDashboard();
});

els.search.addEventListener("input", applyFilters);
els.category.addEventListener("change", applyFilters);

function setView(view) {
  state.view = view;
  const isTopics = view === "topics";
  els.topicsView.classList.toggle("hidden", !isTopics);
  els.dashboardView.classList.toggle("hidden", isTopics);
  if (!isTopics) {
    removeScrollTopButton();
    renderDashboard();
    scrollPanelIntoView(els.dashboardView);
  } else {
    scrollPanelIntoView(els.topicsView);
  }
}

function drawProgressBar(canvas, pct) {
  const pad = 14;
  const barH = 18;
  const logicalH = 160;
  const { ctx, w, h } = prepareCanvas2D(canvas, logicalH);
  const y = Math.round(h / 2 - barH / 2);
  const radius = 10;

  function roundRect(x, y0, rw, rh, r) {
    const rr = Math.min(r, rw / 2, rh / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y0);
    ctx.arcTo(x + rw, y0, x + rw, y0 + rh, rr);
    ctx.arcTo(x + rw, y0 + rh, x, y0 + rh, rr);
    ctx.arcTo(x, y0 + rh, x, y0, rr);
    ctx.arcTo(x, y0, x + rw, y0, rr);
    ctx.closePath();
  }

  ctx.fillStyle = CHART.track;
  roundRect(pad, y, w - pad * 2, barH, radius);
  ctx.fill();

  const fillW = Math.round(((w - pad * 2) * Math.max(0, Math.min(100, pct))) / 100);
  ctx.fillStyle = CHART.fill;
  roundRect(pad, y, fillW, barH, radius);
  ctx.fill();
}

function drawCategoryBars(canvas, byCategory) {
  const entries = Object.entries(byCategory);
  const pad = 14;
  const barH = 18;
  const rowH = barH + 22;
  const logicalH = Math.max(120, pad * 2 + Math.max(1, entries.length) * rowH);

  const { ctx, w, h } = prepareCanvas2D(canvas, logicalH);

  ctx.font = "12px system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif";
  ctx.fillStyle = CHART.label;

  entries.forEach(([cat, v], idx) => {
    const y = pad + idx * rowH;
    const label = cat;
    const pct = v.total ? Math.round((v.done / v.total) * 100) : 0;

    ctx.fillText(`${label.toUpperCase()}  ${pct}%`, pad, y + 12);

    const barY = y + 18;
    const barW = w - pad * 2;

    ctx.fillStyle = CHART.track;
    ctx.fillRect(pad, barY, barW, barH);

    ctx.fillStyle = CHART.fill;
    ctx.fillRect(pad, barY, Math.round((barW * pct) / 100), barH);

    ctx.fillStyle = CHART.label;
    ctx.fillText(`${v.done}/${v.total}`, w - pad - 44, y + 12);
  });
}

function renderDashboard() {
  const stats = computeProgress();
  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  els.overallPct.textContent = `${pct}%`;
  els.overallCount.textContent = `${stats.done} / ${stats.total} modules completed`;

  drawProgressBar(els.overallChart, pct);
  drawCategoryBars(els.categoryChart, stats.byCategory);

  const rows = [...state.topics]
    .map((t) => {
      const v = stats.byTopic[t.id] || { done: 0, total: 0 };
      const p = v.total ? Math.round((v.done / v.total) * 100) : 0;
      return { topic: t, pct: p, done: v.done, total: v.total };
    })
    .filter((r) => r.done > 0)
    .sort((a, b) => b.pct - a.pct || a.topic.name.localeCompare(b.topic.name));

  els.topicProgressTable.innerHTML = "";
  if (!rows.length) {
    els.topicProgressTable.innerHTML =
      `<p class="kpi-sub">No progress yet. Mark a module complete while studying to see it here.</p>`;
    return;
  }
  for (const r of rows) {
    const div = document.createElement("div");
    div.className = "topic-progress-row";
    div.innerHTML = `
      <div>
        <strong>${r.topic.name}</strong>
        <small>${r.topic.category} • ${r.done}/${r.total} modules</small>
      </div>
      <span class="pill">${r.pct}%</span>
    `;
    els.topicProgressTable.appendChild(div);
  }
}

const onResizeCharts = debounce(() => {
  if (state.view === "dashboard") renderDashboard();
}, 150);

window.addEventListener("resize", onResizeCharts);
if (typeof mqMobile.addEventListener === "function") {
  mqMobile.addEventListener("change", onResizeCharts);
} else if (typeof mqMobile.addListener === "function") {
  mqMobile.addListener(onResizeCharts);
}

els.navTopics.addEventListener("click", () => setView("topics"));
els.navDashboard.addEventListener("click", () => setView("dashboard"));

els.resetProgress.addEventListener("click", () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
  syncCompletionCheckbox();
  renderTopicList();
  renderDashboard();
});

async function init() {
  if (els.copyrightYear) {
    els.copyrightYear.textContent = new Date().getFullYear();
  }

  try {
    const response = await fetch(toAbsolute("Config/topics.json"));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.topics = await response.json();
    state.filtered = [...state.topics];
    renderTopicList();
    applyQueryParams();
  } catch (error) {
    els.markdownContent.innerHTML = "<p>Failed to load topics index.</p>";
  }
}

init();
