const state = {
  topics: [],
  filtered: [],
  selectedTopic: null,
  selectedFileKey: "",
  view: "topics",
  paths: [],
  topicMeta: {},
  practiceIndex: [],
  practiceUi: null,
  scenarioCatalog: [],
  scenarioUi: null,
  otmIndex: null,
  otmUi: null,
  diagnosticConfig: null,
  diagnosticUi: null,
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
  practiceTopicBtn: document.getElementById("practiceTopicBtn"),
  scenariosTopicBtn: document.getElementById("scenariosTopicBtn"),
  otmTopicBtn: document.getElementById("otmTopicBtn"),
  lastReviewedLabel: document.getElementById("lastReviewedLabel"),

  completionCheckbox: document.getElementById("completionCheckbox"),

  navTopics: document.getElementById("navTopics"),
  navStart: document.getElementById("navStart"),
  navPractice: document.getElementById("navPractice"),
  navScenarios: document.getElementById("navScenarios"),
  navOtm: document.getElementById("navOtm"),
  navDashboard: document.getElementById("navDashboard"),
  topicsView: document.getElementById("topicsView"),
  diagnosticView: document.getElementById("diagnosticView"),
  diagnosticRoot: document.getElementById("diagnosticRoot"),
  practiceView: document.getElementById("practiceView"),
  practiceRoot: document.getElementById("practiceRoot"),
  scenariosView: document.getElementById("scenariosView"),
  scenariosRoot: document.getElementById("scenariosRoot"),
  otmView: document.getElementById("otmView"),
  otmRoot: document.getElementById("otmRoot"),
  dashboardView: document.getElementById("dashboardView"),
  resetProgress: document.getElementById("resetProgress"),
  exportProgress: document.getElementById("exportProgress"),
  importProgress: document.getElementById("importProgress"),
  pathSelect: document.getElementById("pathSelect"),
  pathBlurb: document.getElementById("pathBlurb"),
  nextTopicCard: document.getElementById("nextTopicCard"),
  diagnosticCard: document.getElementById("diagnosticCard"),
  dueReviewTable: document.getElementById("dueReviewTable"),
  weakPracticeTable: document.getElementById("weakPracticeTable"),
  weakScenariosTable: document.getElementById("weakScenariosTable"),
  weakOtmTable: document.getElementById("weakOtmTable"),

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
    practice: {},
    scenarios: {},
    otm: {},
    diagnostic: null,
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
      practice: raw.practice && typeof raw.practice === "object" ? raw.practice : {},
      scenarios: raw.scenarios && typeof raw.scenarios === "object" ? raw.scenarios : {},
      otm: raw.otm && typeof raw.otm === "object" ? raw.otm : {},
      diagnostic: raw.diagnostic && typeof raw.diagnostic === "object" ? raw.diagnostic : null,
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
    practice: {},
    scenarios: {},
    otm: {},
    diagnostic: null,
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

function saveDiagnosticResult(result) {
  const progress = loadProgress();
  progress.diagnostic = {
    at: new Date().toISOString(),
    role: result.role,
    horizon: result.horizon,
    stack: result.stack,
    scores: result.scores || {},
    total: Number(result.total) || 0,
    pathId: result.pathId || null,
    gapTopicIds: Array.isArray(result.gapTopicIds) ? result.gapTopicIds : [],
    storiesReady: !!result.storiesReady,
    bandLabel: result.bandLabel || "",
  };
  if (result.pathId) progress.pathId = result.pathId;
  // Seed low confidence on gap topics
  for (const topicId of progress.diagnostic.gapTopicIds.slice(0, 8)) {
    const mastery =
      progress.mastery[topicId] && typeof progress.mastery[topicId] === "object"
        ? progress.mastery[topicId]
        : {};
    if (!mastery.confidence || mastery.confidence > 2) mastery.confidence = 2;
    mastery.lastReviewed = progress.diagnostic.at;
    progress.mastery[topicId] = mastery;
  }
  saveProgress(progress);
}

function savePracticeAttempt(attempt) {
  const progress = loadProgress();
  const topicId = attempt.topicId;
  const bucket =
    progress.practice[topicId] && typeof progress.practice[topicId] === "object"
      ? progress.practice[topicId]
      : { attempts: [] };
  const attempts = Array.isArray(bucket.attempts) ? bucket.attempts.slice() : [];
  attempts.push({
    at: new Date().toISOString(),
    promptId: attempt.promptId,
    title: attempt.title,
    scores: attempt.scores,
    total: attempt.total,
    secondsUsed: attempt.secondsUsed,
    secondsBudget: attempt.secondsBudget,
  });
  // keep last 40 attempts per topic
  bucket.attempts = attempts.slice(-40);
  progress.practice[topicId] = bucket;

  const mastery = progress.mastery[topicId] && typeof progress.mastery[topicId] === "object"
    ? progress.mastery[topicId]
    : {};
  mastery.lastReviewed = new Date().toISOString();
  // Map /8 total into rough 1-5 confidence
  const conf = attempt.total <= 3 ? 1 : attempt.total <= 5 ? 2 : attempt.total <= 6 ? 3 : attempt.total <= 7 ? 4 : 5;
  mastery.confidence = conf;
  progress.mastery[topicId] = mastery;
  saveProgress(progress);
}

function practiceStatsByTopic() {
  const progress = loadProgress();
  const out = {};
  for (const [topicId, bucket] of Object.entries(progress.practice || {})) {
    const attempts = Array.isArray(bucket?.attempts) ? bucket.attempts : [];
    if (!attempts.length) continue;
    const recent = attempts.slice(-5);
    const avg = recent.reduce((sum, a) => sum + (Number(a.total) || 0), 0) / recent.length;
    const last = attempts[attempts.length - 1];
    out[topicId] = {
      count: attempts.length,
      avg: Math.round(avg * 10) / 10,
      lastTotal: Number(last.total) || 0,
      lastAt: last.at || "",
    };
  }
  return out;
}

function saveScenarioAttempt(attempt) {
  const progress = loadProgress();
  const scenarioId = attempt.scenarioId;
  const bucket =
    progress.scenarios[scenarioId] && typeof progress.scenarios[scenarioId] === "object"
      ? progress.scenarios[scenarioId]
      : { attempts: [] };
  const attempts = Array.isArray(bucket.attempts) ? bucket.attempts.slice() : [];
  attempts.push({
    at: new Date().toISOString(),
    title: attempt.title,
    kind: attempt.kind,
    difficulty: attempt.difficulty,
    scores: attempt.scores,
    total: attempt.total,
    tasksChecked: attempt.tasksChecked,
    tasksTotal: attempt.tasksTotal,
    secondsUsed: attempt.secondsUsed,
    secondsBudget: attempt.secondsBudget,
  });
  bucket.attempts = attempts.slice(-30);
  progress.scenarios[scenarioId] = bucket;

  const related = Array.isArray(attempt.relatedTopicIds) ? attempt.relatedTopicIds : [];
  const conf =
    attempt.total <= 3 ? 1 : attempt.total <= 5 ? 2 : attempt.total <= 6 ? 3 : attempt.total <= 7 ? 4 : 5;
  for (const topicId of related.slice(0, 2)) {
    const mastery =
      progress.mastery[topicId] && typeof progress.mastery[topicId] === "object"
        ? progress.mastery[topicId]
        : {};
    mastery.lastReviewed = new Date().toISOString();
    mastery.confidence = conf;
    progress.mastery[topicId] = mastery;
  }
  saveProgress(progress);
}

function scenarioStats() {
  const progress = loadProgress();
  const byId = Object.fromEntries((state.scenarioCatalog || []).map((s) => [s.id, s]));
  const out = [];
  for (const [scenarioId, bucket] of Object.entries(progress.scenarios || {})) {
    const attempts = Array.isArray(bucket?.attempts) ? bucket.attempts : [];
    if (!attempts.length) continue;
    const recent = attempts.slice(-5);
    const avg = recent.reduce((sum, a) => sum + (Number(a.total) || 0), 0) / recent.length;
    const last = attempts[attempts.length - 1];
    const meta = byId[scenarioId] || {
      id: scenarioId,
      title: last?.title || scenarioId,
      kind: last?.kind || "",
      difficulty: last?.difficulty || "",
    };
    out.push({
      scenario: meta,
      avg: Math.round(avg * 10) / 10,
      count: attempts.length,
      lastTotal: Number(last?.total) || 0,
    });
  }
  return out;
}

function saveOtmAttempt(attempt) {
  const progress = loadProgress();
  const modelId = attempt.modelId;
  const bucket =
    progress.otm[modelId] && typeof progress.otm[modelId] === "object"
      ? progress.otm[modelId]
      : { attempts: [] };
  const attempts = Array.isArray(bucket.attempts) ? bucket.attempts.slice() : [];
  attempts.push({
    at: new Date().toISOString(),
    promptId: attempt.promptId,
    title: attempt.title,
    scores: attempt.scores,
    total: attempt.total,
    secondsUsed: attempt.secondsUsed,
    secondsBudget: attempt.secondsBudget,
  });
  bucket.attempts = attempts.slice(-30);
  progress.otm[modelId] = bucket;

  const related = Array.isArray(attempt.relatedTopicIds) ? attempt.relatedTopicIds : [];
  const conf =
    attempt.total <= 3 ? 1 : attempt.total <= 5 ? 2 : attempt.total <= 6 ? 3 : attempt.total <= 7 ? 4 : 5;
  for (const topicId of related.slice(0, 2)) {
    const mastery =
      progress.mastery[topicId] && typeof progress.mastery[topicId] === "object"
        ? progress.mastery[topicId]
        : {};
    mastery.lastReviewed = new Date().toISOString();
    mastery.confidence = conf;
    progress.mastery[topicId] = mastery;
  }
  saveProgress(progress);
}

function otmStats() {
  const progress = loadProgress();
  const models = state.otmIndex?.models || [];
  const byId = Object.fromEntries(models.map((m) => [m.id, m]));
  const out = [];
  for (const [modelId, bucket] of Object.entries(progress.otm || {})) {
    const attempts = Array.isArray(bucket?.attempts) ? bucket.attempts : [];
    if (!attempts.length) continue;
    const recent = attempts.slice(-5);
    const avg = recent.reduce((sum, a) => sum + (Number(a.total) || 0), 0) / recent.length;
    const last = attempts[attempts.length - 1];
    const meta = byId[modelId] || { id: modelId, title: last?.title || modelId };
    out.push({
      model: meta,
      avg: Math.round(avg * 10) / 10,
      count: attempts.length,
      lastTotal: Number(last?.total) || 0,
    });
  }
  return out;
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
  selectTopic(topic, { fromQuery: true });
  els.fileTypeSelector.value = fileKey;
  state.selectedFileKey = fileKey;
  syncCompletionCheckbox();
  const loader =
    fileKey === "mindMap"
      ? loadLogicChart(topic.id)
      : loadMarkdown(topic.files[fileKey]);
  Promise.resolve(loader).then(() => {
    updateTopicQuery();
    if (isMobileLayout()) {
      els.markdownContent.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  });
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
    if (els.practiceTopicBtn) els.practiceTopicBtn.disabled = true;
    if (els.scenariosTopicBtn) els.scenariosTopicBtn.disabled = true;
    if (els.otmTopicBtn) els.otmTopicBtn.disabled = true;
    return;
  }
  els.masteryBar.classList.remove("hidden");
  const mastery = getMastery(topic.id);
  if (els.confidenceSelect) {
    els.confidenceSelect.disabled = false;
    els.confidenceSelect.value = mastery.confidence ? String(mastery.confidence) : "";
  }
  if (els.markReviewed) els.markReviewed.disabled = false;
  if (els.practiceTopicBtn) {
    const hasDeck = state.practiceIndex.some((p) => p.id === topic.id);
    els.practiceTopicBtn.disabled = !hasDeck;
  }
  if (els.scenariosTopicBtn) {
    const hasScenario =
      topic.id === "product-security-real-world-scenarios" ||
      state.scenarioCatalog.some((s) => (s.relatedTopicIds || []).includes(topic.id));
    els.scenariosTopicBtn.disabled = !hasScenario;
  }
  if (els.otmTopicBtn) {
    const models = state.otmIndex?.models || [];
    const hasOtm =
      topic.id === "threat-modeling" ||
      models.some((m) => (m.relatedTopicIds || []).includes(topic.id));
    els.otmTopicBtn.disabled = !hasOtm;
  }
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

async function loadMarkdown(path) {
  removeScrollTopButton();
  clearLogicChart();
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

function clearLogicChart() {
  if (window.LogicChart) window.LogicChart.unmount();
  els.markdownContent.classList.remove("has-logic-chart");
}

async function loadLogicChart(topicId) {
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
    els.markdownContent.classList.add("has-logic-chart");
    els.markdownContent.innerHTML = `<p>Unable to load the logic chart for <code>${topicId}</code>.</p>`;
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
  if (fileKey === "mindMap" && topic.files?.mindMap) {
    els.fileTypeSelector.value = "mindMap";
    state.selectedFileKey = "mindMap";
    syncCompletionCheckbox();
    loadLogicChart(topic.id);
    return;
  }
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
  renderTopicMetaBar(topic);
  syncMasteryBar(topic);
  renderTopicList();
  if (isMobileLayout()) {
    closeSidebar();
  }
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
  if (key === "mindMap") {
    loadLogicChart(state.selectedTopic.id).then(() => {
      updateTopicQuery();
      if (isMobileLayout()) {
        els.markdownContent.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
    });
    return;
  }
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
  else renderNextTopic();
});

els.search.addEventListener("input", debounce(() => {
  applyFilters();
}, 180));
els.category.addEventListener("change", () => {
  applyFilters();
});

function setView(view) {
  state.view = view;
  const isTopics = view === "topics";
  const isDiagnostic = view === "diagnostic";
  const isPractice = view === "practice";
  const isScenarios = view === "scenarios";
  const isOtm = view === "otm";
  const isDashboard = view === "dashboard";
  els.topicsView.classList.toggle("hidden", !isTopics);
  if (els.diagnosticView) els.diagnosticView.classList.toggle("hidden", !isDiagnostic);
  if (els.practiceView) els.practiceView.classList.toggle("hidden", !isPractice);
  if (els.scenariosView) els.scenariosView.classList.toggle("hidden", !isScenarios);
  if (els.otmView) els.otmView.classList.toggle("hidden", !isOtm);
  els.dashboardView.classList.toggle("hidden", !isDashboard);

  if (isDiagnostic) {
    closeSidebar();
    removeScrollTopButton();
    ensureDiagnosticUi();
    scrollPanelIntoView(els.diagnosticView);
  } else if (isPractice) {
    closeSidebar();
    removeScrollTopButton();
    ensurePracticeUi();
    scrollPanelIntoView(els.practiceView);
  } else if (isScenarios) {
    closeSidebar();
    removeScrollTopButton();
    ensureScenarioUi();
    scrollPanelIntoView(els.scenariosView);
  } else if (isOtm) {
    closeSidebar();
    removeScrollTopButton();
    ensureOtmUi();
    scrollPanelIntoView(els.otmView);
  } else if (isDashboard) {
    closeSidebar();
    removeScrollTopButton();
    renderDashboard();
    scrollPanelIntoView(els.dashboardView);
  } else {
    scrollPanelIntoView(els.topicsView);
  }
}

function ensurePracticeUi() {
  if (!els.practiceRoot || !window.PracticeMode) return;
  if (!state.practiceUi) {
    state.practiceUi = window.PracticeMode.create(els.practiceRoot, {
      toAbsolute,
      practiceIndex: state.practiceIndex,
      saveAttempt: savePracticeAttempt,
    });
  }
  const preferred =
    state.selectedTopic?.id ||
    findNextTopic(loadProgress().pathId)?.id ||
    state.practiceIndex[0]?.id ||
    "";
  state.practiceUi.fillTopics(state.topics, preferred);
}

function ensureDiagnosticUi() {
  if (!els.diagnosticRoot || !window.DiagnosticMode) return;
  if (!state.diagnosticUi) {
    state.diagnosticUi = window.DiagnosticMode.create(els.diagnosticRoot, {
      topics: state.topics,
      paths: state.paths,
      saveDiagnostic: saveDiagnosticResult,
      applyPath(pathId) {
        setPathId(pathId);
        if (els.pathSelect) {
          els.pathSelect.value = pathId || "";
          updatePathBlurb(pathId || "");
        }
      },
      openTopic(topicId) {
        const topic = state.topics.find((t) => t.id === topicId);
        if (!topic) {
          setView("dashboard");
          return;
        }
        setView("topics");
        selectTopic(topic);
      },
      openPractice(topicId) {
        if (topicId) {
          const topic = state.topics.find((t) => t.id === topicId);
          if (topic) state.selectedTopic = topic;
        }
        setView("practice");
      },
      openDashboard() {
        setView("dashboard");
      },
    });
  }
  state.diagnosticUi.loadConfig(state.diagnosticConfig || {});
}

function ensureScenarioUi(preferredId) {
  if (!els.scenariosRoot || !window.ScenarioMode) return;
  if (!state.scenarioUi) {
    state.scenarioUi = window.ScenarioMode.create(els.scenariosRoot, {
      toAbsolute,
      saveAttempt: saveScenarioAttempt,
    });
  }
  state.scenarioUi.loadCatalog(state.scenarioCatalog, preferredId || "");
}

function ensureOtmUi(preferredId) {
  if (!els.otmRoot || !window.OtmLab) return;
  if (!state.otmUi) {
    state.otmUi = window.OtmLab.create(els.otmRoot, {
      toAbsolute,
      saveAttempt: saveOtmAttempt,
    });
  }
  state.otmUi.loadCatalog(state.otmIndex || { models: [] }, preferredId || "");
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

function renderDiagnosticCard() {
  if (!els.diagnosticCard) return;
  const diag = loadProgress().diagnostic;
  if (!diag) {
    els.diagnosticCard.innerHTML = `
      <p class="kpi-sub">Not run yet. Takes about 35-45 minutes and sets your path.</p>
      <button id="openDiagnostic" class="btn btn-primary" type="button">Run diagnostic</button>
    `;
  } else {
    const path = state.paths.find((p) => p.id === diag.pathId);
    const gaps = Array.isArray(diag.gapTopicIds) ? diag.gapTopicIds.length : 0;
    els.diagnosticCard.innerHTML = `
      <strong>${diag.total}/16 · ${diag.bandLabel || "Completed"}</strong>
      <p class="kpi-sub">${path?.name || diag.pathId || "path"} · ${gaps} gap topics · ${
        diag.at ? diag.at.slice(0, 10) : ""
      }</p>
      <button id="openDiagnostic" class="btn" type="button">Retake</button>
    `;
  }
  els.diagnosticCard.querySelector("#openDiagnostic")?.addEventListener("click", () => {
    setView("diagnostic");
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
  const gapSet = new Set(progress.diagnostic?.gapTopicIds || []);
  const rows = [];

  for (const topic of state.topics) {
    const mastery = getMastery(topic.id);
    const modules = progress.modules?.[topic.id];
    const hasModules = !!(modules && Object.values(modules).some(Boolean));
    const conf = Number(mastery.confidence) || 0;
    const last = mastery.lastReviewed || "";
    const isGap = gapSet.has(topic.id);

    if (!last && !conf && !hasModules && !isGap) continue;

    const interval = reviewIntervalDays(conf || (isGap ? 1 : 2));
    const age = last ? daysSinceIso(last) : Number.POSITIVE_INFINITY;
    const due = !last || age >= interval;
    if (!due) continue;

    const overdueDays = !last ? 0 : Math.max(0, Math.floor(age - interval));
    rows.push({
      topic,
      confidence: conf,
      lastReviewed: last,
      overdueDays,
      isGap,
      hasPractice: state.practiceIndex.some((p) => p.id === topic.id),
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
      `<p class="kpi-sub">Nothing due. Mark topics reviewed or raise confidence after drills; intervals grow from 1 day (shaky) to 14 days (teach it).</p>`;
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
    const gap = r.isGap ? " · diagnostic gap" : "";
    div.innerHTML = `
      <div>
        <strong>${r.topic.name}</strong>
        <small>${when} · ${conf}${gap}</small>
      </div>
      <div class="due-actions">
        <button type="button" class="btn" data-due-open="${r.topic.id}">Open</button>
        <button type="button" class="btn btn-primary" data-due-practice="${r.topic.id}" ${
          r.hasPractice ? "" : "disabled"
        }>Practice</button>
      </div>
    `;
    div.querySelector("[data-due-open]")?.addEventListener("click", () => {
      setView("topics");
      selectTopic(r.topic);
    });
    div.querySelector("[data-due-practice]")?.addEventListener("click", () => {
      if (!r.hasPractice) return;
      state.selectedTopic = r.topic;
      setView("practice");
    });
    els.dueReviewTable.appendChild(div);
  }
}

function renderWeakPractice() {
  if (!els.weakPracticeTable) return;
  const byId = Object.fromEntries(state.topics.map((t) => [t.id, t]));
  const stats = practiceStatsByTopic();
  const rows = Object.entries(stats)
    .map(([topicId, v]) => ({ topic: byId[topicId], ...v }))
    .filter((r) => r.topic && (r.avg <= 5 || r.lastTotal <= 5))
    .sort((a, b) => a.avg - b.avg || a.topic.name.localeCompare(b.topic.name));

  els.weakPracticeTable.innerHTML = "";
  if (!rows.length) {
    els.weakPracticeTable.innerHTML =
      `<p class="kpi-sub">No weak drills yet. Run Practice, self-score a few prompts, and averages under 5/8 show up here.</p>`;
    return;
  }
  for (const r of rows) {
    const div = document.createElement("div");
    div.className = "topic-progress-row";
    const label = window.PracticeMode?.scoreLabel?.(Math.round(r.avg)) || "";
    div.innerHTML = `
      <div>
        <strong>${r.topic.name}</strong>
        <small>avg ${r.avg}/8 · ${r.count} attempts · last ${r.lastTotal}/8${
          label ? ` · ${label}` : ""
        }</small>
      </div>
      <button type="button" class="btn" data-practice-topic="${r.topic.id}">Drill</button>
    `;
    div.querySelector("button")?.addEventListener("click", () => {
      state.selectedTopic = r.topic;
      setView("practice");
    });
    els.weakPracticeTable.appendChild(div);
  }
}

function renderWeakScenarios() {
  if (!els.weakScenariosTable) return;
  const rows = scenarioStats()
    .filter((r) => r.avg <= 5 || r.lastTotal <= 5)
    .sort((a, b) => a.avg - b.avg || a.scenario.title.localeCompare(b.scenario.title));

  els.weakScenariosTable.innerHTML = "";
  if (!rows.length) {
    els.weakScenariosTable.innerHTML =
      `<p class="kpi-sub">No weak scenarios yet. Run Scenarios, self-score, and averages under 5/8 show up here.</p>`;
    return;
  }
  for (const r of rows) {
    const div = document.createElement("div");
    div.className = "topic-progress-row";
    const label = window.ScenarioMode?.scoreLabel?.(Math.round(r.avg)) || "";
    div.innerHTML = `
      <div>
        <strong>${r.scenario.title}</strong>
        <small>${r.scenario.kind || "scenario"} · avg ${r.avg}/8 · ${r.count} attempts · last ${
          r.lastTotal
        }/8${label ? ` · ${label}` : ""}</small>
      </div>
      <button type="button" class="btn" data-scenario-id="${r.scenario.id}">Retry</button>
    `;
    div.querySelector("button")?.addEventListener("click", () => {
      setView("scenarios");
      state.scenarioUi?.selectById?.(r.scenario.id);
    });
    els.weakScenariosTable.appendChild(div);
  }
}

function renderWeakOtm() {
  if (!els.weakOtmTable) return;
  const rows = otmStats()
    .filter((r) => r.avg <= 5 || r.lastTotal <= 5)
    .sort((a, b) => a.avg - b.avg || (a.model.title || "").localeCompare(b.model.title || ""));

  els.weakOtmTable.innerHTML = "";
  if (!rows.length) {
    els.weakOtmTable.innerHTML =
      `<p class="kpi-sub">No weak OTM drills yet. Open OTM Lab, score a prompt, and averages under 5/8 show up here.</p>`;
    return;
  }
  for (const r of rows) {
    const div = document.createElement("div");
    div.className = "topic-progress-row";
    const label = window.OtmLab?.scoreLabel?.(Math.round(r.avg)) || "";
    div.innerHTML = `
      <div>
        <strong>${r.model.title || r.model.id}</strong>
        <small>avg ${r.avg}/8 · ${r.count} attempts · last ${r.lastTotal}/8${
          label ? ` · ${label}` : ""
        }</small>
      </div>
      <button type="button" class="btn" data-otm-id="${r.model.id}">Retry</button>
    `;
    div.querySelector("button")?.addEventListener("click", () => {
      setView("otm");
      state.otmUi?.selectById?.(r.model.id);
    });
    els.weakOtmTable.appendChild(div);
  }
}

function renderDashboard() {
  const stats = computeProgress();
  const pct = stats.total ? Math.round((stats.done / stats.total) * 100) : 0;
  els.overallPct.textContent = `${pct}%`;
  els.overallCount.textContent = `${stats.done} / ${stats.total} modules completed`;

  drawProgressBar(els.overallChart, pct);
  drawCategoryBars(els.categoryChart, stats.byCategory);
  renderDiagnosticCard();
  renderNextTopic();
  renderDueReview();
  renderWeakPractice();
  renderWeakScenarios();
  renderWeakOtm();

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
if (els.navStart) {
  els.navStart.addEventListener("click", () => setView("diagnostic"));
}
if (els.navPractice) {
  els.navPractice.addEventListener("click", () => setView("practice"));
}
if (els.navScenarios) {
  els.navScenarios.addEventListener("click", () => setView("scenarios"));
}
if (els.navOtm) {
  els.navOtm.addEventListener("click", () => setView("otm"));
}
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
if (els.practiceTopicBtn) {
  els.practiceTopicBtn.addEventListener("click", () => {
    if (!state.selectedTopic) return;
    setView("practice");
  });
}
if (els.scenariosTopicBtn) {
  els.scenariosTopicBtn.addEventListener("click", () => {
    if (!state.selectedTopic) return;
    const topicId = state.selectedTopic.id;
    const match =
      state.scenarioCatalog.find((s) => (s.relatedTopicIds || []).includes(topicId)) ||
      state.scenarioCatalog[0];
    setView("scenarios");
    if (match) state.scenarioUi?.selectById?.(match.id);
  });
}
if (els.otmTopicBtn) {
  els.otmTopicBtn.addEventListener("click", () => {
    if (!state.selectedTopic) return;
    const topicId = state.selectedTopic.id;
    const models = state.otmIndex?.models || [];
    const match =
      models.find((m) => (m.relatedTopicIds || []).includes(topicId)) || models[0];
    setView("otm");
    if (match) state.otmUi?.selectById?.(match.id);
  });
}

async function init() {
  if (els.copyrightYear) {
    els.copyrightYear.textContent = new Date().getFullYear();
  }

  setSidebarOpen(false);

  try {
    const [topicsRes, pathsRes, metaRes, practiceRes, scenariosRes, otmRes, diagRes] =
      await Promise.all([
        fetch(toAbsolute("Config/topics.json")),
        fetch(toAbsolute("Config/paths.json")),
        fetch(toAbsolute("Config/topic_meta.json")),
        fetch(toAbsolute("Config/practice/index.json")),
        fetch(toAbsolute("Config/scenarios/index.json")),
        fetch(toAbsolute("Config/otm/index.json")),
        fetch(toAbsolute("Config/diagnostic.json")),
      ]);
    if (!topicsRes.ok) throw new Error(`HTTP ${topicsRes.status}`);
    state.topics = await topicsRes.json();
    state.filtered = [...state.topics];
    state.paths = pathsRes.ok ? await pathsRes.json() : [];
    state.topicMeta = metaRes.ok ? await metaRes.json() : {};
    state.practiceIndex = practiceRes.ok ? await practiceRes.json() : [];
    if (scenariosRes.ok) {
      const payload = await scenariosRes.json();
      state.scenarioCatalog = Array.isArray(payload?.scenarios) ? payload.scenarios : [];
    } else {
      state.scenarioCatalog = [];
    }
    state.otmIndex = otmRes.ok ? await otmRes.json() : { models: [] };
    state.diagnosticConfig = diagRes.ok ? await diagRes.json() : null;
    populatePathSelect();
    renderTopicList();
    applyQueryParams();
    const params = new URLSearchParams(window.location.search);
    if (params.get("view") === "diagnostic" || params.get("view") === "start") {
      setView("diagnostic");
    }
    if (params.get("view") === "practice") setView("practice");
    if (params.get("view") === "scenarios") setView("scenarios");
    if (params.get("view") === "otm") setView("otm");
    if (params.get("view") === "dashboard") setView("dashboard");
    const scenarioId = params.get("scenario");
    if (scenarioId) {
      setView("scenarios");
      state.scenarioUi?.selectById?.(scenarioId);
    }
    const otmId = params.get("otm");
    if (otmId) {
      setView("otm");
      state.otmUi?.selectById?.(otmId);
    }
    // First visit: nudge Start if no path and no diagnostic yet
    const progress = loadProgress();
    if (
      !params.get("view") &&
      !params.get("topic") &&
      !progress.pathId &&
      !progress.diagnostic
    ) {
      // leave on topics; dashboard card + Start nav are enough
    }
  } catch (error) {
    els.markdownContent.innerHTML = "<p>Failed to load topics index.</p>";
  }
}

init();
