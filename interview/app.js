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
  return ["comprehensive", "questions", "critical", "quickRef"].filter((k) => topic?.files?.[k]);
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

async function loadMarkdown(path) {
  try {
    const response = await fetch(toAbsolute(path));
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const markdown = await response.text();
    els.markdownContent.innerHTML = marked.parse(markdown);
    document.querySelectorAll("pre code").forEach((block) => hljs.highlightElement(block));
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

function selectTopic(topic) {
  state.selectedTopic = topic;
  els.topicTitle.textContent = topic.name;
  setContentTypes(topic);
  renderTopicList();
  scrollPanelIntoView(els.topicsView);
}

els.fileTypeSelector.addEventListener("change", (event) => {
  const key = event.target.value;
  if (!key || !state.selectedTopic?.files?.[key]) return;
  state.selectedFileKey = key;
  syncCompletionCheckbox();
  loadMarkdown(state.selectedTopic.files[key]).then(() => {
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
    .sort((a, b) => b.pct - a.pct || a.topic.name.localeCompare(b.topic.name));

  els.topicProgressTable.innerHTML = "";
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
  } catch (error) {
    els.markdownContent.innerHTML = "<p>Failed to load topics index.</p>";
  }
}

init();
