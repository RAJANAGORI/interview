const state = {
  topics: [],
  filtered: [],
  selectedTopic: null,
  selectedFileKey: "",
  view: "topics",
  paths: [],
  topicMeta: {},
  searchDocs: null,
  searchLoading: null,
  contentHitTopicIds: null,
};

const CHART = {
  track: "#181818",
  fill: "#ff8c00",
  label: "rgba(242, 240, 236, 0.68)",
};

const els = {
  search: document.getElementById("searchInput"),
  searchHits: document.getElementById("searchHits"),
  category: document.getElementById("categoryFilter"),
  topicList: document.getElementById("topicList"),
  topicTitle: document.getElementById("topicTitle"),
  fileTypeSelector: document.getElementById("fileTypeSelector"),
  markdownContent: document.getElementById("markdownContent"),
  topicMetaBar: document.getElementById("topicMetaBar"),
  masteryBar: document.getElementById("masteryBar"),
  confidenceSelect: document.getElementById("confidenceSelect"),
  markReviewed: document.getElementById("markReviewed"),
  lastReviewedLabel: document.getElementById("lastReviewedLabel"),

  completionCheckbox: document.getElementById("completionCheckbox"),

  navTopics: document.getElementById("navTopics"),
  navDashboard: document.getElementById("navDashboard"),
  topicsView: document.getElementById("topicsView"),
  dashboardView: document.getElementById("dashboardView"),
  resetProgress: document.getElementById("resetProgress"),
  exportProgress: document.getElementById("exportProgress"),
  importProgress: document.getElementById("importProgress"),
  pathSelect: document.getElementById("pathSelect"),
  pathBlurb: document.getElementById("pathBlurb"),
  nextTopicCard: document.getElementById("nextTopicCard"),
  dueReviewTable: document.getElementById("dueReviewTable"),

  sidebar: document.getElementById("topicSidebar"),
  sidebarBackdrop: document.getElementById("sidebarBackdrop"),
  closeSidebar: document.getElementById("closeSidebar"),
  openTopicsCta: document.getElementById("openTopicsCta"),

  overallPct: document.getElementById("overallPct"),
  overallCount: document.getElementById("overallCount"),
  overallChart: document.getElementById("overallChart"),
  categoryChart: document.getElementById("categoryChart"),
  topicProgressTable: document.getElementById("topicProgressTable"),
  copyrightYear: document.getElementById("copyrightYear"),
};

const STORAGE_KEY = "interview_prep_progress_v2";
const LEGACY_STORAGE_KEY = "interview_prep_progress_v1";

const mqMobile = window.matchMedia("(max-width: 900px)");

function emptyProgress() {
  return {
    version: 2,
    modules: {},
    mastery: {},
    pathId: null,
  };
}

function normalizeProgress(raw) {
  if (!raw || typeof raw !== "object") return emptyProgress();
  if (raw.version === 2 && raw.modules && typeof raw.modules === "object") {
    return {
      version: 2,
      modules: raw.modules,
      mastery: raw.mastery && typeof raw.mastery === "object" ? raw.mastery : {},
      pathId: typeof raw.pathId === "string" ? raw.pathId : null,
    };
  }
  const modules = {};
  for (const [topicId, value] of Object.entries(raw)) {
    if (
      [
        "version",
        "modules",
        "mastery",
        "pathId",
        "practice",
        "scenarios",
        "otm",
        "diagnostic",
      ].includes(topicId)
    ) {
      continue;
    }
    if (value && typeof value === "object") modules[topicId] = value;
  }
  return {
    version: 2,
    modules,
    mastery: {},
    pathId: null,
  };
}

function loadProgress() {
  try {
    const rawV2 = localStorage.getItem(STORAGE_KEY);
    if (rawV2) return normalizeProgress(JSON.parse(rawV2));
    const rawV1 = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawV1) {
      const migrated = normalizeProgress(JSON.parse(rawV1));
      saveProgress(migrated);
      return migrated;
    }
  } catch {
    // ignore
  }
  return emptyProgress();
}

function saveProgress(progress) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeProgress(progress)));
  } catch {
    // ignore
  }
}

function setModuleComplete(topicId, fileKey, done) {
  const progress = loadProgress();
  progress.modules[topicId] =
    progress.modules[topicId] && typeof progress.modules[topicId] === "object"
      ? progress.modules[topicId]
      : {};
  progress.modules[topicId][fileKey] = !!done;
  saveProgress(progress);
}

function isModuleComplete(topicId, fileKey) {
  const progress = loadProgress();
  return !!progress.modules?.[topicId]?.[fileKey];
}

function getMastery(topicId) {
  const progress = loadProgress();
  const entry = progress.mastery?.[topicId];
  return entry && typeof entry === "object" ? entry : {};
}

function setMastery(topicId, patch) {
  const progress = loadProgress();
  progress.mastery[topicId] = { ...getMastery(topicId), ...patch };
  saveProgress(progress);
}

function setPathId(pathId) {
  const progress = loadProgress();
  progress.pathId = pathId || null;
  saveProgress(progress);
}

function topicMeta(topicId) {
  return state.topicMeta?.[topicId] || null;
}

function topicModuleKeys(topic) {
  return ["comprehensive", "mastery", "questions", "critical", "quickRef"].filter((k) => topic?.files?.[k]);
}

function topicIsDone(topic, progress) {
  const keys = topicModuleKeys(topic);
  if (!keys.length) return false;
  return keys.every((k) => !!progress.modules?.[topic.id]?.[k]);
}

function findNextTopic(pathId) {
  if (!pathId) return null;
  const path = state.paths.find((p) => p.id === pathId);
  if (!path?.topicIds?.length) return null;
  const progress = loadProgress();
  const byId = Object.fromEntries(state.topics.map((t) => [t.id, t]));
  for (const tid of path.topicIds) {
    const topic = byId[tid];
    if (!topic) continue;
    if (!topicIsDone(topic, progress)) return topic;
  }
  return null;
}

function isMobileLayout() {
  return mqMobile.matches;
}

function isSidebarOpen() {
  return document.body.classList.contains("sidebar-open");
}

function setSidebarOpen(open) {
  const shouldOpen = !!open && isMobileLayout();
  document.body.classList.toggle("sidebar-open", shouldOpen);

  if (els.navTopics) {
    els.navTopics.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
  }
  if (els.sidebar) {
    els.sidebar.setAttribute("aria-hidden", shouldOpen || !isMobileLayout() ? "false" : "true");
  }
  if (els.sidebarBackdrop) {
    els.sidebarBackdrop.setAttribute("aria-hidden", shouldOpen ? "false" : "true");
  }

  if (shouldOpen && els.search) {
    requestAnimationFrame(() => {
      try {
        els.search.focus({ preventScroll: true });
      } catch {
        els.search.focus();
      }
    });
  }
}

function openSidebar() {
  setSidebarOpen(true);
}

function closeSidebar() {
  setSidebarOpen(false);
}

function toggleSidebar() {
  setSidebarOpen(!isSidebarOpen());
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
    mindMap: "Logic Chart",
  };
  return Object.entries(labels)
    .filter(([key]) => files && files[key])
    .map(([value, label]) => ({ value, label }));
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
    const tDone = keys.filter((k) => !!progress.modules?.[topic.id]?.[k]).length;
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
    const meta = topicMeta(topic.id);
    const diff = meta?.difficulty ? ` · ${meta.difficulty}` : "";
    btn.innerHTML = `<strong>${topic.name}</strong><small>${topic.category}${diff} · ${pct}%</small>`;
    btn.addEventListener("click", () => selectTopic(topic));
    els.topicList.appendChild(btn);
  }
}

function tokenizeQuery(q) {
  return q
    .toLowerCase()
    .split(/[^a-z0-9+]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

async function ensureSearchIndex() {
  if (Array.isArray(state.searchDocs)) return state.searchDocs;
  if (state.searchLoading) return state.searchLoading;
  state.searchLoading = (async () => {
    try {
      const res = await fetch(toAbsolute("Config/search-index.json"));
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = await res.json();
      state.searchDocs = Array.isArray(payload?.docs) ? payload.docs : [];
    } catch {
      state.searchDocs = [];
    } finally {
      state.searchLoading = null;
    }
    return state.searchDocs;
  })();
  return state.searchLoading;
}

function scoreSearchDoc(doc, terms, rawQ) {
  let score = 0;
  const topic = (doc.topic || "").toLowerCase();
  const heading = (doc.heading || "").toLowerCase();
  const text = doc.text || "";
  if (topic.includes(rawQ)) score += 40;
  if (heading.includes(rawQ)) score += 28;
  for (const term of terms) {
    if (topic.includes(term)) score += 12;
    if (heading.includes(term)) score += 8;
    if (text.includes(term)) score += 3;
    else return -1;
  }
  if (doc.fileKey === "comprehensive") score += 2;
  if (doc.fileKey === "questions") score += 1;
  return score;
}

function searchContent(q) {
  const terms = tokenizeQuery(q);
  if (!terms.length || !Array.isArray(state.searchDocs)) return [];
  const rawQ = q.toLowerCase().trim();
  const hits = [];
  for (const doc of state.searchDocs) {
    const score = scoreSearchDoc(doc, terms, rawQ);
    if (score < 0) continue;
    hits.push({ score, doc });
  }
  hits.sort((a, b) => b.score - a.score || a.doc.topic.localeCompare(b.doc.topic));
  const seen = new Set();
  const out = [];
  for (const hit of hits) {
    const key = `${hit.doc.topicId}|${hit.doc.fileKey}|${hit.doc.heading}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(hit);
    if (out.length >= 20) break;
  }
  return out;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderSearchHits(hits, q) {
  if (!els.searchHits) return;
  if (!q || q.trim().length < 2) {
    els.searchHits.classList.add("hidden");
    els.searchHits.innerHTML = "";
    return;
  }
  els.searchHits.classList.remove("hidden");
  if (!hits.length) {
    els.searchHits.innerHTML = `<p class="kpi-sub">No guide hits for "${escapeHtml(q.trim())}". Topic names still filter below.</p>`;
    return;
  }
  els.searchHits.innerHTML = `<p class="search-hits-label">${hits.length} guide hit${hits.length === 1 ? "" : "s"}</p>`;
  for (const { doc } of hits) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "search-hit";
    btn.innerHTML = `
      <strong>${escapeHtml(doc.heading)}</strong>
      <small>${escapeHtml(doc.topic)} · ${escapeHtml(doc.fileLabel)}</small>
      <span class="search-hit-snippet">${escapeHtml(doc.snippet || "")}</span>
    `;
    btn.addEventListener("click", () => openTopicFile(doc.topicId, doc.fileKey));
    els.searchHits.appendChild(btn);
  }
}

function openTopicFile(topicId, fileKey) {
  const topic = state.topics.find((t) => t.id === topicId);
  if (!topic || !topic.files?.[fileKey]) return;
  setView("topics");
  selectTopic(topic, { fileKey });
}

async function applyFilters() {
  const q = els.search.value.trim();
  const qLower = q.toLowerCase();
  const cat = els.category.value;
  let contentHits = [];
  state.contentHitTopicIds = null;

  if (q.length >= 2) {
    await ensureSearchIndex();
    contentHits = searchContent(q);
    state.contentHitTopicIds = new Set(contentHits.map((h) => h.doc.topicId));
  }
  renderSearchHits(contentHits, q);

  state.filtered = state.topics.filter((topic) => {
    const catOk = cat === "all" || topic.category === cat;
    if (!catOk) return false;
    if (!qLower) return true;
    const meta = topicMeta(topic.id);
    const hay = [
      topic.name,
      topic.category,
      meta?.difficulty || "",
      ...(meta?.roles || []),
      ...(meta?.rounds || []),
    ]
      .join(" ")
      .toLowerCase();
    if (hay.includes(qLower)) return true;
    const terms = tokenizeQuery(q);
    if (terms.length && terms.every((t) => hay.includes(t))) return true;
    return !!(state.contentHitTopicIds && state.contentHitTopicIds.has(topic.id));
  });
  renderTopicList();
}

function renderTopicMetaBar(topic) {
  if (!els.topicMetaBar) return;
  const meta = topicMeta(topic?.id);
  if (!meta) {
    els.topicMetaBar.classList.add("hidden");
    els.topicMetaBar.innerHTML = "";
    return;
  }
  const bits = [
    meta.difficulty,
    meta.minutes ? `~${meta.minutes} min` : null,
    (meta.rounds || []).join(", "),
    (meta.roles || []).join(", "),
  ].filter(Boolean);
  els.topicMetaBar.classList.remove("hidden");
  els.topicMetaBar.innerHTML = bits.map((b) => `<span class="meta-chip">${b}</span>`).join("");
}

function syncMasteryBar(topic) {
  if (!els.masteryBar) return;
  if (!topic) {
    els.masteryBar.classList.add("hidden");
    return;
  }
  els.masteryBar.classList.remove("hidden");
  const mastery = getMastery(topic.id);
  if (els.confidenceSelect) {
    els.confidenceSelect.disabled = false;
    els.confidenceSelect.value = mastery.confidence ? String(mastery.confidence) : "";
  }
  if (els.markReviewed) els.markReviewed.disabled = false;
  if (els.lastReviewedLabel) {
    els.lastReviewedLabel.textContent = mastery.lastReviewed
      ? `Last reviewed ${mastery.lastReviewed.slice(0, 10)}`
      : "Not reviewed yet";
  }
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

function tocLabel(text) {
  return text
    .trim()
    .replace(/^Q\d+:\s*/i, "")
    .replace(/^\d+[\).]\s+/, "");
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
        a.textContent = tocLabel(h2.textContent);
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
            subA.textContent = tocLabel(h3.textContent);
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
        a.textContent = tocLabel(h3.textContent);
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

const CODE_LANG_KEY = "interview_code_lang";
const CODE_LAB_TABS = [
  { id: "python", label: "Python" },
  { id: "go", label: "Go" },
  { id: "javascript", label: "Node.js" },
  { id: "c", label: "C" },
];
const CODE_LAB_ALIASES = { py: "python", golang: "go", js: "javascript", node: "javascript" };
const CODE_VARIANTS = { vulnerable: "Vulnerable", fixed: "Fixed" };

// Fences tagged ```<highlight-lang> vulnerable|fixed [tab-lang] become code lab panes.
marked.use({
  renderer: {
    code({ text, lang }) {
      const [hl = "", variant = "", tab = hl] = (lang || "").trim().split(/\s+/);
      if (!CODE_VARIANTS[variant]) return false;
      const tabId = CODE_LAB_ALIASES[tab] || tab;
      const hlLang = window.hljs?.getLanguage(hl) ? hl : "plaintext";
      return `<pre class="code-variant" data-variant="${variant}" data-tab="${escapeHtml(tabId)}"><code class="language-${escapeHtml(hlLang)}">${escapeHtml(text)}</code></pre>\n`;
    },
  },
});

function codeTabRank(tab) {
  const i = CODE_LAB_TABS.findIndex((t) => t.id === tab);
  return i === -1 ? CODE_LAB_TABS.length : i;
}

function codeTabLabel(tab) {
  return CODE_LAB_TABS.find((t) => t.id === tab)?.label || tab;
}

function preferredCodeTab() {
  try {
    return localStorage.getItem(CODE_LANG_KEY) || CODE_LAB_TABS[0].id;
  } catch {
    return CODE_LAB_TABS[0].id;
  }
}

function selectCodeLabTab(lab, tab) {
  lab.querySelectorAll(".code-lab-tab").forEach((btn) => {
    const on = btn.dataset.tab === tab;
    btn.setAttribute("aria-selected", String(on));
    btn.tabIndex = on ? 0 : -1;
  });
  lab.querySelectorAll(".code-lab-panel").forEach((panel) => {
    panel.hidden = panel.dataset.tab !== tab;
  });
}

function activateCodeTab(tab, anchor) {
  const before = anchor.getBoundingClientRect().top;
  try {
    localStorage.setItem(CODE_LANG_KEY, tab);
  } catch {
    /* private mode */
  }
  els.markdownContent.querySelectorAll(".code-lab").forEach((lab) => {
    if (lab.querySelector(`.code-lab-tab[data-tab="${tab}"]`)) selectCodeLabTab(lab, tab);
  });
  // Switching every lab changes heights above the clicked one; keep it under the pointer.
  const shift = anchor.getBoundingClientRect().top - before;
  if (shift) window.scrollBy(0, shift);
}

function onCodeLabKeydown(event) {
  const tabs = [...event.currentTarget.querySelectorAll(".code-lab-tab")];
  const i = tabs.indexOf(document.activeElement);
  if (i === -1) return;
  const next = {
    ArrowRight: tabs[(i + 1) % tabs.length],
    ArrowLeft: tabs[(i - 1 + tabs.length) % tabs.length],
    Home: tabs[0],
    End: tabs[tabs.length - 1],
  }[event.key];
  if (!next) return;
  event.preventDefault();
  next.focus();
  activateCodeTab(next.dataset.tab, next);
}

function buildCodeLabs(container) {
  const groups = [];
  container.querySelectorAll("pre.code-variant").forEach((pre) => {
    const last = groups[groups.length - 1];
    if (last && last[last.length - 1].nextElementSibling === pre) last.push(pre);
    else groups.push([pre]);
  });

  const preferred = preferredCodeTab();
  groups.forEach((group, gi) => {
    const byTab = new Map();
    group.forEach((pre) => {
      if (!byTab.has(pre.dataset.tab)) byTab.set(pre.dataset.tab, {});
      byTab.get(pre.dataset.tab)[pre.dataset.variant] = pre;
    });
    const order = [...byTab.keys()].sort((a, b) => codeTabRank(a) - codeTabRank(b));

    const lab = document.createElement("div");
    lab.className = "code-lab";
    group[0].before(lab);

    const tablist = document.createElement("div");
    tablist.className = "code-lab-tabs";
    tablist.setAttribute("role", "tablist");
    tablist.setAttribute("aria-label", "Code language");
    tablist.addEventListener("keydown", onCodeLabKeydown);
    lab.appendChild(tablist);

    order.forEach((tab) => {
      const panelId = `code-lab-${gi}-${tab}`;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "code-lab-tab";
      btn.id = `${panelId}-tab`;
      btn.dataset.tab = tab;
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-controls", panelId);
      btn.textContent = codeTabLabel(tab);
      btn.addEventListener("click", () => activateCodeTab(tab, btn));
      tablist.appendChild(btn);

      const panel = document.createElement("div");
      panel.className = "code-lab-panel";
      panel.id = panelId;
      panel.dataset.tab = tab;
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", btn.id);
      Object.keys(CODE_VARIANTS).forEach((variant) => {
        const pre = byTab.get(tab)[variant];
        if (!pre) return;
        const pane = document.createElement("figure");
        pane.className = `code-pane code-pane--${variant}`;
        const caption = document.createElement("figcaption");
        caption.textContent = CODE_VARIANTS[variant];
        pane.append(caption, pre);
        panel.appendChild(pane);
      });
      lab.appendChild(panel);
    });

    selectCodeLabTab(lab, order.includes(preferred) ? preferred : order[0]);
  });
}

let topicLoadToken = 0;

function defaultFileKey(topic) {
  if (topic?.files?.comprehensive) return "comprehensive";
  return availableFileTypes(topic?.files)[0]?.value || "";
}

async function loadMarkdown(path, token) {
  removeScrollTopButton();
  clearLogicChart();
  try {
    const response = await fetch(toAbsolute(path));
    if (token !== topicLoadToken) return;
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const markdown = await response.text();
    if (token !== topicLoadToken) return;
    els.markdownContent.innerHTML = marked.parse(markdown);
    document.querySelectorAll("#markdownContent pre code").forEach((block) => hljs.highlightElement(block));
    buildCodeLabs(els.markdownContent);
    enhanceMarkdownDocument(els.markdownContent);
  } catch (error) {
    if (token !== topicLoadToken) return;
    els.markdownContent.innerHTML = `<p>Unable to load content from <code>${path}</code>.</p>`;
  }
}

function clearLogicChart() {
  if (window.LogicChart) window.LogicChart.unmount();
  els.markdownContent.classList.remove("has-logic-chart");
}

async function loadLogicChart(topicId, token) {
  removeScrollTopButton();
  if (window.LogicChart) window.LogicChart.unmount();
  els.markdownContent.classList.add("has-logic-chart");
  els.markdownContent.innerHTML = "";
  if (!window.LogicChart) {
    els.markdownContent.innerHTML = "<p>Logic chart script did not load.</p>";
    return;
  }
  try {
    await window.LogicChart.mount(els.markdownContent, {
      topicId,
      jsonUrl: toAbsolute(`Config/mindmaps/${topicId}.json`),
      xmindUrl: toAbsolute(`mindmaps/${topicId}.xmind`),
    });
  } catch (error) {
    if (token !== topicLoadToken) return;
    els.markdownContent.classList.add("has-logic-chart");
    els.markdownContent.innerHTML = `<p>Unable to load the logic chart for <code>${topicId}</code>.</p>`;
  }
}

function showTopicFile(topic, fileKey) {
  if (!topic || !fileKey || !topic.files?.[fileKey]) return;
  const token = ++topicLoadToken;
  els.fileTypeSelector.value = fileKey;
  state.selectedFileKey = fileKey;
  syncCompletionCheckbox();
  els.markdownContent.innerHTML = `<p class="kpi-sub">Loading…</p>`;
  const loader =
    fileKey === "mindMap" ? loadLogicChart(topic.id, token) : loadMarkdown(topic.files[fileKey], token);
  Promise.resolve(loader).then(() => {
    if (token !== topicLoadToken) return;
    updateTopicQuery();
    if (isMobileLayout()) {
      els.markdownContent.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });
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
  const fileKey = params.get("file");
  selectTopic(topic, {
    fromQuery: true,
    fileKey: fileKey && topic.files?.[fileKey] ? fileKey : "",
  });
}

function selectTopic(topic, opts = {}) {
  state.selectedTopic = topic;
  els.topicTitle.textContent = topic.name;
  setContentTypes(topic);
  renderTopicMetaBar(topic);
  syncMasteryBar(topic);
  renderTopicList();
  if (isMobileLayout()) {
    closeSidebar();
  }
  scrollPanelIntoView(els.topicsView);
  const fileKey =
    opts.fileKey && topic.files?.[opts.fileKey] ? opts.fileKey : defaultFileKey(topic);
  if (fileKey) showTopicFile(topic, fileKey);
  else if (!opts.fromQuery) updateTopicQuery();
}

els.fileTypeSelector.addEventListener("change", (event) => {
  const key = event.target.value;
  if (!key || !state.selectedTopic?.files?.[key]) return;
  showTopicFile(state.selectedTopic, key);
});

els.completionCheckbox.addEventListener("change", (event) => {
  const topicId = state.selectedTopic?.id;
  const fileKey = state.selectedFileKey;
  if (!topicId || !fileKey) return;
  setModuleComplete(topicId, fileKey, event.target.checked);
  renderTopicList();
  if (state.view === "dashboard") renderDashboard();
  else renderNextTopic();
});

els.search.addEventListener("input", debounce(() => {
  applyFilters();
}, 180));
els.category.addEventListener("change", () => {
  applyFilters();
});

function setView(view) {
  const isDashboard = view === "dashboard";
  state.view = isDashboard ? "dashboard" : "topics";
  els.topicsView.classList.toggle("hidden", state.view !== "topics");
  els.dashboardView.classList.toggle("hidden", !isDashboard);

  if (isDashboard) {
    closeSidebar();
    removeScrollTopButton();
    renderDashboard();
    scrollPanelIntoView(els.dashboardView);
  } else {
    scrollPanelIntoView(els.topicsView);
  }
}

function onTopicsNavClick() {
  if (state.view !== "topics") {
    setView("topics");
  }
  if (isMobileLayout()) {
    toggleSidebar();
  } else {
    closeSidebar();
  }
}

function onMobileBreakpointChange() {
  if (!isMobileLayout()) {
    closeSidebar();
  } else {
    setSidebarOpen(false);
  }
  if (state.view === "dashboard") renderDashboard();
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

function populatePathSelect() {
  if (!els.pathSelect) return;
  const current = loadProgress().pathId || "";
  els.pathSelect.innerHTML = `<option value="">No path (browse freely)</option>`;
  for (const path of state.paths) {
    const opt = document.createElement("option");
    opt.value = path.id;
    opt.textContent = `${path.name} (${path.weeks} wk)`;
    els.pathSelect.appendChild(opt);
  }
  els.pathSelect.value = current;
  updatePathBlurb(current);
}

function updatePathBlurb(pathId) {
  if (!els.pathBlurb) return;
  const path = state.paths.find((p) => p.id === pathId);
  els.pathBlurb.textContent = path
    ? `${path.blurb} ${path.topicIds.length} topics in order.`
    : "Choose a path to unlock Next recommended.";
}

function renderNextTopic() {
  if (!els.nextTopicCard) return;
  const pathId = loadProgress().pathId;
  const next = findNextTopic(pathId);
  if (!pathId) {
    els.nextTopicCard.innerHTML =
      `<p class="kpi-sub">Pick a study path to get an ordered next topic.</p>`;
    return;
  }
  if (!next) {
    els.nextTopicCard.innerHTML =
      `<p class="kpi-sub">Path complete. Every topic in this path is marked done. Nice work.</p>`;
    return;
  }
  const meta = topicMeta(next.id);
  const stats = computeProgress().byTopic[next.id] || { done: 0, total: 0 };
  els.nextTopicCard.innerHTML = `
    <strong>${next.name}</strong>
    <p class="kpi-sub">${meta?.difficulty || next.category}${
      meta?.minutes ? ` · ~${meta.minutes} min` : ""
    } · ${stats.done}/${stats.total} modules</p>
    <button id="openNextTopic" class="btn btn-primary" type="button">Open topic</button>
  `;
  els.nextTopicCard.querySelector("#openNextTopic")?.addEventListener("click", () => {
    setView("topics");
    selectTopic(next);
  });
}

function reviewIntervalDays(confidence) {
  const c = Number(confidence) || 0;
  if (c >= 5) return 14;
  if (c === 4) return 7;
  if (c === 3) return 4;
  if (c === 2) return 2;
  if (c === 1) return 1;
  return 2;
}

function daysSinceIso(iso) {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return Number.POSITIVE_INFINITY;
  return (Date.now() - t) / 86400000;
}

function dueReviewRows() {
  const progress = loadProgress();
  const rows = [];

  for (const topic of state.topics) {
    const mastery = getMastery(topic.id);
    const modules = progress.modules?.[topic.id];
    const hasModules = !!(modules && Object.values(modules).some(Boolean));
    const conf = Number(mastery.confidence) || 0;
    const last = mastery.lastReviewed || "";

    if (!last && !conf && !hasModules) continue;

    const interval = reviewIntervalDays(conf || 2);
    const age = last ? daysSinceIso(last) : Number.POSITIVE_INFINITY;
    const due = !last || age >= interval;
    if (!due) continue;

    const overdueDays = !last ? 0 : Math.max(0, Math.floor(age - interval));
    rows.push({
      topic,
      confidence: conf,
      lastReviewed: last,
      overdueDays,
    });
  }

  rows.sort(
    (a, b) =>
      b.overdueDays - a.overdueDays ||
      a.confidence - b.confidence ||
      a.topic.name.localeCompare(b.topic.name)
  );
  return rows.slice(0, 12);
}

function renderDueReview() {
  if (!els.dueReviewTable) return;
  const rows = dueReviewRows();
  els.dueReviewTable.innerHTML = "";
  if (!rows.length) {
    els.dueReviewTable.innerHTML =
      `<p class="kpi-sub">Nothing due. Mark topics reviewed or set confidence; intervals grow from 1 day (shaky) to 14 days (teach it).</p>`;
    return;
  }
  for (const r of rows) {
    const div = document.createElement("div");
    div.className = "topic-progress-row";
    const when = r.lastReviewed
      ? r.overdueDays
        ? `${r.overdueDays}d overdue`
        : "due today"
      : "never reviewed";
    const conf = r.confidence ? `conf ${r.confidence}/5` : "no confidence";
    div.innerHTML = `
      <div>
        <strong>${r.topic.name}</strong>
        <small>${when} · ${conf}</small>
      </div>
      <button type="button" class="btn" data-due-open="${r.topic.id}">Open</button>
    `;
    div.querySelector("[data-due-open]")?.addEventListener("click", () => {
      setView("topics");
      selectTopic(r.topic);
    });
    els.dueReviewTable.appendChild(div);
  }
}

function renderDashboard() {
  const stats = computeProgress();
  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  els.overallPct.textContent = `${pct}%`;
  els.overallCount.textContent = `${stats.done} / ${stats.total} modules completed`;

  drawProgressBar(els.overallChart, pct);
  drawCategoryBars(els.categoryChart, stats.byCategory);
  renderNextTopic();
  renderDueReview();

  const rows = [...state.topics]
    .map((t) => {
      const v = stats.byTopic[t.id] || { done: 0, total: 0 };
      const p = v.total ? Math.round((v.done / v.total) * 100) : 0;
      const mastery = getMastery(t.id);
      return {
        topic: t,
        pct: p,
        done: v.done,
        total: v.total,
        confidence: mastery.confidence || 0,
        lastReviewed: mastery.lastReviewed || "",
      };
    })
    .filter((r) => r.done > 0 || r.confidence || r.lastReviewed)
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
    const conf = r.confidence ? ` · conf ${r.confidence}/5` : "";
    const reviewed = r.lastReviewed ? ` · reviewed ${r.lastReviewed.slice(0, 10)}` : "";
    div.innerHTML = `
      <div>
        <strong>${r.topic.name}</strong>
        <small>${r.topic.category} · ${r.done}/${r.total} modules${conf}${reviewed}</small>
      </div>
      <span class="pill">${r.pct}%</span>
    `;
    els.topicProgressTable.appendChild(div);
  }
}

function exportProgressFile() {
  const blob = new Blob([JSON.stringify(loadProgress(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `interview-prep-progress-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importProgressFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result || ""));
      const normalized = normalizeProgress(parsed);
      saveProgress(normalized);
      if (els.pathSelect) els.pathSelect.value = normalized.pathId || "";
      updatePathBlurb(normalized.pathId || "");
      syncCompletionCheckbox();
      syncMasteryBar(state.selectedTopic);
      renderTopicList();
      renderDashboard();
    } catch {
      window.alert("Could not import that file. Use a JSON export from this site.");
    }
  };
  reader.readAsText(file);
}

const onResizeCharts = debounce(() => {
  if (state.view === "dashboard") renderDashboard();
}, 150);

window.addEventListener("resize", onResizeCharts);
if (typeof mqMobile.addEventListener === "function") {
  mqMobile.addEventListener("change", onMobileBreakpointChange);
} else if (typeof mqMobile.addListener === "function") {
  mqMobile.addListener(onMobileBreakpointChange);
}

els.navTopics.addEventListener("click", onTopicsNavClick);
els.navDashboard.addEventListener("click", () => setView("dashboard"));

if (els.closeSidebar) {
  els.closeSidebar.addEventListener("click", closeSidebar);
}
if (els.sidebarBackdrop) {
  els.sidebarBackdrop.addEventListener("click", closeSidebar);
}
if (els.openTopicsCta) {
  els.openTopicsCta.addEventListener("click", () => {
    if (state.view !== "topics") setView("topics");
    if (isMobileLayout()) {
      openSidebar();
    } else if (els.search) {
      try {
        els.search.focus({ preventScroll: true });
      } catch {
        els.search.focus();
      }
    }
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && isSidebarOpen()) {
    closeSidebar();
  }
});

els.resetProgress.addEventListener("click", () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // ignore
  }
  if (els.pathSelect) els.pathSelect.value = "";
  updatePathBlurb("");
  syncCompletionCheckbox();
  syncMasteryBar(state.selectedTopic);
  renderTopicList();
  renderDashboard();
});

if (els.exportProgress) {
  els.exportProgress.addEventListener("click", exportProgressFile);
}
if (els.importProgress) {
  els.importProgress.addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (file) importProgressFile(file);
    event.target.value = "";
  });
}
if (els.pathSelect) {
  els.pathSelect.addEventListener("change", (event) => {
    setPathId(event.target.value || null);
    updatePathBlurb(event.target.value || "");
    renderNextTopic();
  });
}
if (els.confidenceSelect) {
  els.confidenceSelect.addEventListener("change", (event) => {
    const topicId = state.selectedTopic?.id;
    if (!topicId) return;
    const value = Number(event.target.value);
    if (value >= 1 && value <= 5) setMastery(topicId, { confidence: value });
    else setMastery(topicId, { confidence: null });
    if (state.view === "dashboard") renderDashboard();
  });
}
if (els.markReviewed) {
  els.markReviewed.addEventListener("click", () => {
    const topicId = state.selectedTopic?.id;
    if (!topicId) return;
    setMastery(topicId, { lastReviewed: new Date().toISOString() });
    syncMasteryBar(state.selectedTopic);
    if (state.view === "dashboard") renderDashboard();
  });
}

async function init() {
  if (els.copyrightYear) {
    els.copyrightYear.textContent = new Date().getFullYear();
  }

  setSidebarOpen(false);

  try {
    const [topicsRes, pathsRes, metaRes] = await Promise.all([
      fetch(toAbsolute("Config/topics.json")),
      fetch(toAbsolute("Config/paths.json")),
      fetch(toAbsolute("Config/topic_meta.json")),
    ]);
    if (!topicsRes.ok) throw new Error(`HTTP ${topicsRes.status}`);
    state.topics = await topicsRes.json();
    state.filtered = [...state.topics];
    state.paths = pathsRes.ok ? await pathsRes.json() : [];
    state.topicMeta = metaRes.ok ? await metaRes.json() : {};
    populatePathSelect();
    renderTopicList();
    const params = new URLSearchParams(window.location.search);
    const view = params.get("view");
    const removedViews = new Set(["start", "diagnostic", "practice", "scenarios", "otm"]);
    if (removedViews.has(view) || params.has("scenario") || params.has("otm")) {
      if (removedViews.has(view)) params.delete("view");
      params.delete("scenario");
      params.delete("otm");
      const url = new URL(window.location.href);
      const next = params.toString();
      url.search = next ? `?${next}` : "";
      history.replaceState(null, "", url);
    }
    applyQueryParams();
    if (view === "dashboard") setView("dashboard");
  } catch (error) {
    els.markdownContent.innerHTML = "<p>Failed to load topics index.</p>";
  }
}

init();
