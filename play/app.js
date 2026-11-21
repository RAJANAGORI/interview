(function () {
  "use strict";

  const SD = window.SD;
  const $ = (sel, root = document) => root.querySelector(sel);
  const esc = (s) =>
    String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const ic = (name, size = 16, sw = 2) => {
    const body = (window.SD_ICONS || {})[name];
    return body
      ? `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
      : "";
  };

  const view = $("#view");
  const LESSONS = SD.LESSONS || {};
  const lessonIds = () => Object.keys(LESSONS);
  let DATA = { modules: [], topics: {}, quizzes: {}, flashcards: {}, cheatsheets: {} };

  /* ---------- progress ---------- */

  const STORE = "sd-play-v2";
  const RANKS = [
    [0, "Intern"],
    [120, "Analyst"],
    [350, "Engineer"],
    [800, "Senior"],
    [1500, "Staff"],
    [2600, "Principal"],
  ];
  const prog = (() => {
    try {
      return Object.assign({ xp: 0, seen: {}, done: {}, quiz: {}, cards: {} }, JSON.parse(localStorage.getItem(STORE) || "{}"));
    } catch (e) {
      return { xp: 0, seen: {}, done: {}, quiz: {}, cards: {} };
    }
  })();
  const save = () => {
    try {
      localStorage.setItem(STORE, JSON.stringify(prog));
    } catch (e) {
      /* private mode: progress lives for this tab only */
    }
  };
  const rankFor = (xp) => {
    let r = RANKS[0][1];
    for (const [min, name] of RANKS) if (xp >= min) r = name;
    return r;
  };
  let toastTimer = 0;
  function toast(text) {
    let el = $(".toast");
    if (!el) {
      el = document.createElement("div");
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.animation = "none";
    void el.offsetWidth;
    el.style.animation = "";
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.remove(), 1600);
  }
  function gain(xp, why) {
    const before = rankFor(prog.xp);
    prog.xp += xp;
    save();
    renderXp();
    const after = rankFor(prog.xp);
    toast(after !== before ? `Rank up: ${after}` : `+${xp} XP · ${why}`);
  }
  function renderXp() {
    const el = $("#xpChip");
    if (!el) return;
    el.innerHTML = `<span class="xp-num">${prog.xp}</span><span>XP</span><span class="rank">${rankFor(prog.xp)}</span>`;
  }
  function markSeen(id, idx) {
    const seen = (prog.seen[id] = prog.seen[id] || []);
    if (seen.includes(idx)) return;
    seen.push(idx);
    save();
    gain(10, "new step");
  }
  function markDone(id) {
    if (prog.done[id]) return;
    prog.done[id] = true;
    save();
    gain(50, "lesson complete");
  }

  /* ---------- helpers ---------- */

  const moduleOf = (topicId) => DATA.modules.find((m) => m.topics.includes(topicId)) || DATA.modules.find((m) => m.topics.some((t) => (LESSONS[t] && LESSONS[t].covers || []).includes(topicId)));
  const coveredBy = (topicId) => Object.keys(LESSONS).find((id) => (LESSONS[id].covers || []).includes(topicId));
  /* A topic with its own lesson is finished only when that lesson is finished.
     covers is for topics that live inside another lesson and have no file of their own. */
  const topicDone = (id) => {
    if (LESSONS[id]) return !!prog.done[id];
    const host = coveredBy(id);
    return !!(host && prog.done[host]);
  };
  const topicTitle = (id) => (LESSONS[id] && LESSONS[id].title) || (DATA.topics[id] && DATA.topics[id].title) || id;
  const guideHref = (id) => `../interview/?topic=${encodeURIComponent(id)}`;
  const hasPractice = (id) => !!(DATA.quizzes[id] && DATA.quizzes[id].length);
  const cleanSummary = (s) =>
    String(s || "")
      .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, "")
      .replace(/\s+/g, " ")
      .trim();
  const previewText = (s, n) => {
    const t = cleanSummary(s);
    if (t.length <= n) return t;
    const cut = t.slice(0, n);
    const sp = cut.lastIndexOf(" ");
    return (sp > n * 0.55 ? cut.slice(0, sp) : cut).replace(/[,:;.\s]+$/, "") + "...";
  };
  const lessonProgress = (id) => {
    const n = LESSONS[id].steps.length;
    const seen = (prog.seen[id] || []).length;
    return { n, seen: Math.min(seen, n), pct: Math.round((Math.min(seen, n) / n) * 100) };
  };

  const CHAPTER = {
    problem: "Problem",
    attack: "Attack",
    technique: "Technique",
    solution: "Solution",
    insight: "Insight",
    tradeoff: "Trade-off",
    setup: "Setup",
    recap: "Recap",
  };
  const CALLOUT_ICON = { warn: "alert", tip: "lightbulb", insight: "sparkles", next: "route" };
  const PACKET_LABEL = {
    req: "request",
    mine: "you",
    res: "response",
    poison: "attacker",
    empty: "encrypted",
    write: "write",
    secret: "secret",
    ping: "probe",
    slow: "slow",
  };

  /* ---------- drawer + palette ---------- */

  function renderDrawer(activeId) {
    const live = lessonIds()
      .map((id) => `<a href="#/${id}/1" class="${id === activeId ? "current" : ""}">${ic(prog.done[id] ? "checkCircle" : "zap", 15)}<span>${esc(LESSONS[id].title)}</span></a>`)
      .join("");
    const mods = DATA.modules
      .map(
        (m) => `<div class="drawer-mod"><h3>${m.num}. ${esc(m.title)}</h3>${m.topics
          .map((id) => {
            if (LESSONS[id]) return `<a href="#/${id}/1" class="${id === activeId ? "current" : ""}">${ic("zap", 14)}<span>${esc(topicTitle(id))}</span></a>`;
            return `<a href="#/practice/${id}/quiz" class="${id === activeId ? "current" : ""}">${ic("listChecks", 14)}<span>${esc(topicTitle(id))}</span></a>`;
          })
          .join("")}</div>`
      )
      .join("");
    $("#drawerNav").innerHTML = `<div class="drawer-mod"><h3>Animated lessons</h3>${live}</div>${mods}`;
  }
  function openDrawer(open) {
    $("#drawer").hidden = !open;
    $("#drawerBackdrop").hidden = !open;
    $("#menuBtn").setAttribute("aria-expanded", String(open));
  }

  let paletteIndex = [];
  let paletteSel = 0;
  function buildPaletteIndex() {
    paletteIndex = [];
    for (const id of lessonIds()) {
      const L = LESSONS[id];
      paletteIndex.push({ kind: "lesson", title: L.title, sub: L.summary, href: `#/${id}/1` });
      L.steps.forEach((s, i) =>
        paletteIndex.push({
          kind: `step ${i + 1}`,
          title: s.title,
          sub: L.title,
          href: `#/${id}/${i + 1}`,
          extra: (s.body || []).join(" ").replace(/<[^>]+>/g, " "),
        })
      );
    }
    for (const id of Object.keys(DATA.topics)) {
      if (LESSONS[id]) continue;
      const t = DATA.topics[id];
      paletteIndex.push({ kind: "practice", title: t.title, sub: (moduleOf(id) || {}).title || "", href: `#/practice/${id}/quiz` });
    }
    paletteIndex.forEach((r) => (r.hay = `${r.title} ${r.sub} ${r.extra || ""}`.toLowerCase()));
  }
  function renderPalette() {
    const q = $("#paletteInput").value.trim().toLowerCase();
    const words = q.split(/\s+/).filter(Boolean);
    const hits = (words.length ? paletteIndex.filter((r) => words.every((w) => r.hay.includes(w))) : paletteIndex.filter((r) => r.kind === "lesson" || r.kind.startsWith("step"))).slice(0, 40);
    paletteSel = Math.min(paletteSel, Math.max(0, hits.length - 1));
    $("#paletteResults").innerHTML = hits.length
      ? hits
          .map((r, i) => `<li><a href="${r.href}" class="${i === paletteSel ? "active" : ""}"><span class="kind">${esc(r.kind)}</span>${esc(r.title)}<span class="sub">${esc(r.sub)}</span></a></li>`)
          .join("")
      : `<li><span class="sub" style="padding:10px 12px;display:block">Nothing matches "${esc(q)}".</span></li>`;
  }
  function openPalette(open) {
    $("#palette").hidden = !open;
    if (open) {
      $("#paletteInput").value = "";
      paletteSel = 0;
      renderPalette();
      $("#paletteInput").focus();
    }
  }

  /* ---------- home ---------- */

  let heroStage = null;
  let heroTimer = 0;
  function teardownHome() {
    clearInterval(heroTimer);
    if (heroStage) heroStage.destroy();
    heroStage = null;
  }

  function curriculumLessonIds() {
    const ordered = [];
    const seen = new Set();
    for (const m of DATA.modules) {
      for (const id of m.topics) {
        if (!LESSONS[id] || seen.has(id)) continue;
        seen.add(id);
        ordered.push(id);
      }
    }
    for (const id of lessonIds()) {
      if (seen.has(id)) continue;
      ordered.push(id);
    }
    return ordered;
  }

  function resumeTarget() {
    const ids = curriculumLessonIds();
    for (const id of ids) {
      if (prog.done[id]) continue;
      const seen = prog.seen[id] || [];
      if (!seen.length) continue;
      const nextIdx = Math.min(LESSONS[id].steps.length - 1, Math.max(...seen) + 1);
      return { id, step: nextIdx + 1, kind: "continue", title: LESSONS[id].title, pct: lessonProgress(id).pct };
    }
    const fresh = ids.find((id) => !prog.done[id]) || ids[0];
    return fresh ? { id: fresh, step: 1, kind: "start", title: LESSONS[fresh].title, pct: 0 } : null;
  }

  function renderHome() {
    const ids = lessonIds();
    const totalSteps = ids.reduce((n, id) => n + LESSONS[id].steps.length, 0);
    const doneCount = ids.filter((id) => prog.done[id]).length;
    const resume = resumeTarget();
    const activeMod =
      DATA.modules.find((m) => m.topics.some((id) => LESSONS[id] && !prog.done[id] && (prog.seen[id] || []).length)) ||
      DATA.modules.find((m) => m.topics.some((id) => LESSONS[id] && !prog.done[id])) ||
      DATA.modules[0];

    const mods = DATA.modules
      .map((m) => {
        const live = m.topics.filter((id) => LESSONS[id] || coveredBy(id));
        const done = m.topics.filter((id) => topicDone(id)).length;
        const open = activeMod && activeMod.id === m.id;
        const rows = m.topics
          .map((id) => {
            if (LESSONS[id]) {
              const p = lessonProgress(id);
              const cls = prog.done[id] ? "done" : p.seen ? "live" : "live";
              const step = p.seen && !prog.done[id] ? Math.min(p.n, Math.max(...(prog.seen[id] || [0])) + 2) : 1;
              return `<li><a class="lesson-row ${cls}" href="#/${id}/${step}">
                <span class="dot" aria-hidden="true"></span>
                <span class="name"><span class="title">${esc(topicTitle(id))}</span><span class="tag">Watch</span></span>
                <span class="meta">${p.seen ? `${p.pct}%` : `${LESSONS[id].steps.length} steps`}</span>
              </a></li>`;
            }
            const host = coveredBy(id);
            if (host) {
              return `<li><a class="lesson-row ${prog.done[host] ? "done" : "live"}" href="#/${host}/1">
                <span class="dot" aria-hidden="true"></span>
                <span class="name"><span class="title">${esc(topicTitle(id))}</span><span class="tag soft">Inside ${esc(LESSONS[host].title)}</span></span>
                <span class="meta">covered</span>
              </a></li>`;
            }
            const q = prog.quiz[id];
            return `<li><div class="lesson-row static">
              <span class="dot" aria-hidden="true"></span>
              <span class="name"><span class="title">${esc(topicTitle(id))}</span></span>
              <span class="meta">${
                hasPractice(id) ? `<a href="#/practice/${id}/quiz">quiz${q ? ` ${q.best}/${q.total}` : ""}</a> · <a href="#/practice/${id}/cards">cards</a> · ` : ""
              }<a href="#/sheet/${id}">sheet</a></span>
            </div></li>`;
          })
          .join("");
        return `<section class="module mod-${esc(m.color)} ${open ? "open" : ""}" data-module="${esc(m.id)}">
          <button class="module-head" type="button" aria-expanded="${open ? "true" : "false"}">
            <span class="module-num">${String(m.num).padStart(2, "0")}</span>
            <span class="module-copy"><span class="module-title">${esc(m.title)}</span><span class="module-prog">${live.length} to watch · ${m.topics.length} topics · ${done} done</span></span>
            <span class="module-chevron" aria-hidden="true"></span>
          </button>
          <ol class="module-body">${rows}</ol>
        </section>`;
      })
      .join("");

    view.innerHTML = `
      <section class="home-hero reveal">
        <div class="hero-copy">
          <p class="brand-kicker">AppSec, <em>Animated</em></p>
          <h1>Watch the attack.<br>Then watch the fix.</h1>
          <p class="lead">One idea per lesson. Naive design, the break, the control, the interview trade-off.</p>
          <div class="hero-actions">
            ${
              resume
                ? `<a class="primary-btn" href="#/${resume.id}/${resume.step}">${
                    resume.kind === "continue" ? `Continue ${esc(resume.title)}` : `Start with ${esc(resume.title)}`
                  } ${ic("arrowRight", 15) || "→"}</a>`
                : ""
            }
            <a class="secondary-btn" href="#catalog">${ic("listChecks", 15)} Browse curriculum</a>
          </div>
        </div>
        <div class="hero-stage" id="heroStage" aria-hidden="true"></div>
        <div class="hero-rail" aria-label="Course snapshot">
          <div><b>${ids.length}</b><span>lessons</span></div>
          <div><b>${totalSteps}</b><span>steps</span></div>
          <div><b>${doneCount}</b><span>finished</span></div>
          <div><b>${prog.xp}</b><span>XP</span></div>
        </div>
      </section>

      ${
        resume && resume.kind === "continue"
          ? `<a class="resume-strip reveal" href="#/${resume.id}/${resume.step}">
              <span class="resume-label">Pick up where you left off</span>
              <span class="resume-title">${esc(resume.title)}</span>
              <span class="resume-meta">${resume.pct}% · press to continue ${ic("arrowRight", 14) || "→"}</span>
            </a>`
          : ""
      }

      <section class="catalog reveal" id="catalog">
        <div class="catalog-head">
          <div>
            <p class="eyebrow">Curriculum</p>
            <h2>Browse by module</h2>
          </div>
          <button class="secondary-btn" type="button" data-open-palette>${ic("search", 15)} Jump to any topic</button>
        </div>
        <div class="modules">${mods}</div>
      </section>`;

    view.querySelectorAll(".module-head").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mod = btn.closest(".module");
        const opening = !mod.classList.contains("open");
        view.querySelectorAll(".module.open").forEach((el) => {
          el.classList.remove("open");
          el.querySelector(".module-head").setAttribute("aria-expanded", "false");
        });
        if (opening) {
          mod.classList.add("open");
          btn.setAttribute("aria-expanded", "true");
        }
      });
    });

    if (ids.length) {
      const previewId = resume ? resume.id : ids[0];
      const L = LESSONS[previewId];
      heroStage = new SD.Stage($("#heroStage"));
      let i = Math.max(0, (resume && resume.step ? resume.step : 1) - 1) % L.steps.length;
      heroStage.show(L.steps[i].scene);
      heroTimer = setInterval(() => {
        i = (i + 1) % L.steps.length;
        heroStage.show(L.steps[i].scene);
      }, 4200);
    }
  }

  /* ---------- lesson ---------- */

  let cur = null;

  function teardownLesson() {
    if (cur && cur.stage) cur.stage.destroy();
    cur = null;
  }

  function metricValue(v) {
    if (Array.isArray(v)) return { text: v[0] == null ? "-" : String(v[0]), tone: v[1] || "" };
    if (v && typeof v === "object") return { text: v.text == null ? "-" : String(v.text), tone: v.tone || "" };
    return { text: v == null || v === "" ? "-" : String(v), tone: "" };
  }

  function buildLesson(id) {
    const L = LESSONS[id];
    const mod = moduleOf(id);
    const legend = (L.legend || [])
      .map((item) => {
        const [kind, label] = Array.isArray(item) ? item : [item, PACKET_LABEL[item] || item];
        return `<span>${SD.packetSwatch(kind)}${esc(label)}</span>`;
      })
      .join("");
    const metrics = (L.metrics || [])
      .map((m) => `<div class="metric" data-metric="${esc(m.id)}"><div class="m-label">${ic(m.icon, 12, 2.2)}${esc(m.label)}</div><div class="m-value">-</div></div>`)
      .join("");
    const steps = L.steps
      .map((s, i) => `<button class="step-dot" type="button" data-step="${i}" title="${esc(s.title)}"><span class="n">${i + 1}</span><span class="s">${esc(s.short)}</span></button>`)
      .join("");
    const practice = DATA.topics[id]
      ? `<div class="more-links">
          ${hasPractice(id) ? `<a class="ghost-btn" href="#/practice/${id}/quiz">${ic("listChecks", 15)} Quiz</a><a class="ghost-btn" href="#/practice/${id}/cards">${ic("layers", 15)} Flashcards</a>` : ""}
          <a class="ghost-btn" href="#/sheet/${id}">${ic("clipboard", 15)} Cheatsheet</a>
          <a class="ghost-btn" href="${guideHref(id)}">${ic("file", 15)} Full guide</a></div>`
      : "";

    view.innerHTML = `
      <div class="lesson reveal">
        <header class="lesson-bar">
          <div class="lesson-crumb"><a href="#/">Course</a>${mod ? `<span class="sep">/</span><span>${esc(mod.title)}</span>` : ""}</div>
          <div class="title-row">
            <h1>${esc(L.title)}</h1>
            <div class="meta-line">
              <span>${L.minutes} min</span>
              <span>${esc(L.level)}</span>
              <span>${L.steps.length} steps</span>
            </div>
          </div>
          <p class="lesson-summary">${esc(L.summary)}</p>
          <div class="lesson-progress" aria-hidden="true"><i id="lessonProgressFill"></i></div>
        </header>

        <div class="lesson-grid">
          <section class="stage-panel">
            <div class="stage-card">
              <div class="hud">${metrics}</div>
              <div class="stage-host" id="stageHost"></div>
              <div class="stage-foot">
                <div class="legend">${legend}</div>
                <div class="stage-ctrl">
                  <button type="button" id="replayBtn" title="Replay this step (R)" aria-label="Replay this step">${ic("refresh", 17, 2.2)}</button>
                  <button type="button" id="pauseBtn" title="Pause packets (Space)" aria-label="Pause packets"></button>
                </div>
              </div>
            </div>
            <nav class="stepper" aria-label="Lesson steps">
              <div class="stepper-head"><strong>Steps</strong><span id="stepperCount"></span></div>
              <div class="steps" id="steps">${steps}</div>
            </nav>
          </section>

          <aside class="lesson-side">
            <section class="step-card" id="stepCard"></section>
            <details class="learn-panel">
              <summary>What you'll learn</summary>
              <div id="goals"></div>
            </details>
            ${practice ? `<details class="learn-panel"><summary>Practice this topic</summary>${practice}</details>` : ""}
          </aside>
        </div>
      </div>`;

    const hud = $(".stage-card .hud");
    const foot = $(".stage-card .stage-foot");
    const stage = new SD.Stage($("#stageHost"), {
      inset: () => ({ top: hud.offsetTop + hud.offsetHeight + 6, bottom: foot.offsetHeight + 16 }),
    });
    cur = { id, L, stage, idx: -1, paused: false, metrics: {} };
    $("#replayBtn").onclick = () => stage.replay();
    $("#pauseBtn").onclick = () => togglePause();
    $("#steps").onclick = (e) => {
      const b = e.target.closest("[data-step]");
      if (b) go(id, +b.dataset.step);
    };
    renderPause();
    renderDrawer(id);
  }

  function renderPause() {
    const b = $("#pauseBtn");
    if (!b || !cur) return;
    b.innerHTML = cur.paused
      ? `<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><path d="M7 5v14l12-7z"/></svg>`
      : `<svg viewBox="0 0 24 24" width="17" height="17" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>`;
    b.setAttribute("aria-label", cur.paused ? "Resume packets" : "Pause packets");
  }
  function togglePause() {
    if (!cur) return;
    cur.paused = !cur.paused;
    cur.stage.setPaused(cur.paused);
    renderPause();
  }

  function go(id, idx) {
    location.hash = `#/${id}/${idx + 1}`;
  }

  function renderBody(body) {
    return (body || [])
      .map((b) => (/^\s*</.test(b) && !/^\s*<(b|code|span|i|em|a)\b/.test(b) ? b : `<p>${b}</p>`))
      .join("");
  }

  function showStep(idx) {
    const { id, L, stage } = cur;
    const step = L.steps[idx];
    const first = cur.idx < 0;
    cur.idx = idx;
    stage.show(step.scene, first ? {} : {});
    markSeen(id, idx);
    if (idx === L.steps.length - 1) markDone(id);

    const seen = new Set(prog.seen[id] || []);
    document.querySelectorAll("#steps .step-dot").forEach((el, i) => {
      el.classList.toggle("current", i === idx);
      el.classList.toggle("seen", i <= idx || seen.has(i));
    });
    const active = $(`#steps .step-dot[data-step="${idx}"]`);
    if (active) active.scrollIntoView({ block: "nearest", inline: "center", behavior: first ? "auto" : "smooth" });
    $("#stepperCount").textContent = `${idx + 1} of ${L.steps.length}`;
    const fill = $("#lessonProgressFill");
    if (fill) fill.style.width = `${Math.round(((idx + 1) / L.steps.length) * 100)}%`;

    for (const m of L.metrics || []) {
      const el = $(`.metric[data-metric="${m.id}"]`);
      if (!el) continue;
      const v = metricValue((step.metrics || {})[m.id]);
      const key = `${v.text}|${v.tone}`;
      el.className = `metric ${v.tone}`;
      el.querySelector(".m-value").textContent = v.text;
      if (cur.metrics[m.id] && cur.metrics[m.id] !== key) {
        void el.offsetWidth;
        el.classList.add("bump");
      }
      cur.metrics[m.id] = key;
    }

    const changes = (step.changes || [])
      .map((c) => {
        const cls = c[0] === "+" ? "add" : c[0] === "-" ? "del" : c[0] === "~" ? "mod" : "";
        return `<li class="${cls}">${esc(c)}</li>`;
      })
      .join("");
    const next = L.steps[idx + 1];
    const chapter = step.chapter || "insight";
    $("#stepCard").innerHTML = `
      <div class="step-top"><span class="count">Step ${idx + 1} of ${L.steps.length}</span><span class="badge ${esc(chapter)}">${esc(CHAPTER[chapter] || chapter)}</span></div>
      <h2 class="step-title">${esc(step.title)}</h2>
      <div class="step-scroll">
        <div class="step-body">${renderBody(step.body)}</div>
        ${step.callout ? `<div class="callout ${esc(step.callout.kind)}">${ic(CALLOUT_ICON[step.callout.kind] || "info", 16, 2.2)}<div>${step.callout.text}</div></div>` : ""}
        ${changes ? `<ul class="changes">${changes}</ul>` : ""}
      </div>
      <div class="step-nav">
        <button class="secondary-btn" type="button" id="backBtn" ${idx === 0 ? "disabled" : ""}>Back</button>
        ${
          next
            ? `<button class="primary-btn" type="button" id="nextBtn"><span>Next · ${esc(next.short)}</span><span aria-hidden="true">→</span></button>`
            : `<button class="primary-btn" type="button" id="nextBtn"><span>${nextLessonAfter(id) ? `Next lesson · ${esc(LESSONS[nextLessonAfter(id)].title)}` : "Back to course"}</span><span aria-hidden="true">→</span></button>`
        }
      </div>
      <p class="hints"><kbd>←</kbd> <kbd>→</kbd> steps · <kbd>R</kbd> replay · <kbd>Space</kbd> pause</p>`;
    const scroll = $("#stepCard .step-scroll");
    if (scroll) scroll.scrollTop = 0;
    const card = $("#stepCard");
    if (card) {
      card.classList.remove("step-enter");
      void card.offsetWidth;
      card.classList.add("step-enter");
    }
    $("#backBtn").onclick = () => idx > 0 && go(id, idx - 1);
    $("#nextBtn").onclick = () => {
      if (next) return go(id, idx + 1);
      const n = nextLessonAfter(id);
      location.hash = n ? `#/${n}/1` : "#/";
    };

    $("#goals").innerHTML = (L.goals || [])
      .map((g) => {
        const hit = seen.has(g.step);
        return `<div class="goal ${hit ? "hit" : ""}"><span class="box">${hit ? ic("check", 12, 3) : ""}</span><span>${esc(g.text)}</span></div>`;
      })
      .join("");
    document.title = `${step.title} · ${L.title} · AppSec, Animated`;
  }

  function nextLessonAfter(id) {
    const ids = lessonIds();
    const i = ids.indexOf(id);
    return i >= 0 && i < ids.length - 1 ? ids[i + 1] : null;
  }

  function renderLesson(id, n) {
    const L = LESSONS[id];
    const idx = Math.max(0, Math.min(L.steps.length - 1, (parseInt(n, 10) || 1) - 1));
    if (!cur || cur.id !== id) {
      teardownLesson();
      buildLesson(id);
      window.scrollTo(0, 0);
    }
    if (cur.idx !== idx) showStep(idx);
  }

  /* ---------- practice + sheets ---------- */

  const quizState = {};

  function practiceHead(id, tab) {
    const t = DATA.topics[id] || { title: id };
    const mod = moduleOf(id);
    return `<section class="card page-head">
      <div class="lesson-crumb"><a href="#/">Course</a>${mod ? `<span class="sep">›</span><span>${esc(mod.title)}</span>` : ""}</div>
      <h1>${esc(t.title)}</h1>
      <p>${esc(previewText(t.summary, 220))}</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
        <div class="tabs">
          ${hasPractice(id) ? `<button type="button" data-tab="quiz" class="${tab === "quiz" ? "active" : ""}">Quiz</button><button type="button" data-tab="cards" class="${tab === "cards" ? "active" : ""}">Flashcards</button>` : ""}
          <button type="button" data-tab="sheet" class="${tab === "sheet" ? "active" : ""}">Cheatsheet</button>
        </div>
        ${LESSONS[id] ? `<a class="primary-btn" style="margin-top:12px" href="#/${id}/1">${ic("zap", 15)} Animated lesson</a>` : ""}
        <a class="ghost-btn" style="margin-top:12px" href="${guideHref(id)}">${ic("file", 15)} Full guide</a>
      </div>
    </section>`;
  }
  function wireTabs(id) {
    view.querySelectorAll("[data-tab]").forEach((b) => {
      b.onclick = () => (location.hash = b.dataset.tab === "sheet" ? `#/sheet/${id}` : `#/practice/${id}/${b.dataset.tab}`);
    });
  }

  function renderQuiz(id) {
    const qs = DATA.quizzes[id] || [];
    const st = (quizState[id] = quizState[id] || { i: 0, picked: {}, score: 0 });
    const head = practiceHead(id, "quiz");
    if (!qs.length) {
      view.innerHTML = head + `<section class="card pane"><p>No quiz questions for this topic yet. Try the cheatsheet.</p></section>`;
      return wireTabs(id);
    }
    if (st.i >= qs.length) {
      const best = Math.max(st.score, (prog.quiz[id] || {}).best || 0);
      prog.quiz[id] = { best, total: qs.length };
      save();
      view.innerHTML =
        head +
        `<section class="card pane"><p class="eyebrow">Quiz complete</p><p class="quiz-q">${st.score} / ${qs.length} correct</p>
        <p style="color:var(--muted)">Best so far: ${best} / ${qs.length}. Missed ones are worth a second pass through the cheatsheet.</p>
        <div class="pane-nav"><button class="secondary-btn" type="button" id="retry">Retry quiz</button><a class="primary-btn" href="#/practice/${id}/cards">Flashcards →</a></div></section>`;
      $("#retry").onclick = () => {
        quizState[id] = { i: 0, picked: {}, score: 0 };
        renderQuiz(id);
      };
      return wireTabs(id);
    }
    const q = qs[st.i];
    const picked = st.picked[st.i];
    const opts = q.options
      .map((o, j) => {
        let cls = "";
        if (picked != null) cls = j === q.answer ? "correct" : j === picked ? "wrong" : "";
        return `<button type="button" class="quiz-opt ${cls}" data-opt="${j}" ${picked != null ? "disabled" : ""}>${String.fromCharCode(65 + j)}. ${esc(o)}</button>`;
      })
      .join("");
    view.innerHTML =
      head +
      `<section class="card pane">
        <p class="eyebrow">Question ${st.i + 1} of ${qs.length} · score ${st.score}</p>
        <p class="quiz-q">${esc(q.prompt)}</p>
        <div class="quiz-opts">${opts}</div>
        ${picked != null ? `<div class="quiz-explain"><b>${picked === q.answer ? "Correct." : "Not quite."}</b> ${esc(q.explain)}</div>` : ""}
        <div class="pane-nav">
          <button class="secondary-btn" type="button" id="qPrev" ${st.i === 0 ? "disabled" : ""}>← Previous</button>
          <button class="primary-btn" type="button" id="qNext" ${picked == null ? "disabled" : ""}>${st.i === qs.length - 1 ? "See score" : "Next question"} →</button>
        </div>
      </section>`;
    view.querySelectorAll("[data-opt]").forEach((b) => {
      b.onclick = () => {
        const j = +b.dataset.opt;
        st.picked[st.i] = j;
        if (j === q.answer) {
          st.score++;
          const key = `${id}:${q.id}`;
          prog.cards[key] = prog.cards[key] || 0;
          if (!prog.cards[key]) {
            prog.cards[key] = 1;
            gain(5, "correct answer");
          }
        }
        renderQuiz(id);
      };
    });
    $("#qPrev").onclick = () => {
      st.i--;
      renderQuiz(id);
    };
    $("#qNext").onclick = () => {
      st.i++;
      renderQuiz(id);
    };
    wireTabs(id);
  }

  const cardState = {};
  function renderCards(id) {
    const cards = DATA.flashcards[id] || [];
    const st = (cardState[id] = cardState[id] || { i: 0, flipped: false });
    const head = practiceHead(id, "cards");
    if (!cards.length) {
      view.innerHTML = head + `<section class="card pane"><p>No flashcards for this topic yet.</p></section>`;
      return wireTabs(id);
    }
    const c = cards[st.i % cards.length];
    view.innerHTML =
      head +
      `<section class="card pane">
        <p class="eyebrow">Card ${(st.i % cards.length) + 1} of ${cards.length} · click the card to flip</p>
        <div class="flash" id="flash" tabindex="0"><div><div class="side">${st.flipped ? "Answer" : "Prompt"}</div>${esc(st.flipped ? c.back : c.front)}</div></div>
        <div class="pane-nav">
          <button class="secondary-btn" type="button" id="cPrev">← Previous</button>
          <button class="primary-btn" type="button" id="cNext">Next card →</button>
        </div>
      </section>`;
    $("#flash").onclick = () => {
      st.flipped = !st.flipped;
      renderCards(id);
    };
    $("#cPrev").onclick = () => {
      st.i = (st.i - 1 + cards.length) % cards.length;
      st.flipped = false;
      renderCards(id);
    };
    $("#cNext").onclick = () => {
      st.i = (st.i + 1) % cards.length;
      st.flipped = false;
      renderCards(id);
    };
    wireTabs(id);
  }

  function renderSheet(id) {
    const s = DATA.cheatsheets[id];
    const head = practiceHead(id, "sheet");
    if (!s) {
      view.innerHTML = head + `<section class="card pane"><p>No cheatsheet for this topic yet. The <a href="${guideHref(id)}">full guide</a> has everything.</p></section>`;
      return wireTabs(id);
    }
    const list = (items, empty) => (items && items.length ? `<ul>${items.map((x) => `<li>${esc(cleanSummary(x))}</li>`).join("")}</ul>` : `<p style="color:var(--muted)">${empty}</p>`);
    view.innerHTML =
      head +
      `<section class="card pane" style="max-width:none">
        <div class="sheet-grid">
          <div><h3>Must know</h3>${list(s.mustKnow, "See the full guide.")}</div>
          <div><h3>Interview traps</h3>${list(s.traps, "No traps listed for this topic yet.")}</div>
        </div>
      </section>`;
    wireTabs(id);
  }

  /* ---------- router ---------- */

  function route() {
    const parts = location.hash.replace(/^#\/?/, "").split("/").filter(Boolean).map(decodeURIComponent);
    openDrawer(false);
    openPalette(false);
    const lessonRoute = parts[0] && LESSONS[parts[0]];
    if (!lessonRoute) teardownLesson();
    if (parts.length) teardownHome();

    if (!parts.length) {
      teardownHome();
      document.title = "AppSec, Animated · Security Interview Course";
      renderDrawer(null);
      renderHome();
      return;
    }
    if (lessonRoute) return renderLesson(parts[0], parts[1]);
    window.scrollTo(0, 0);
    if (parts[0] === "practice" && parts[1] && DATA.topics[parts[1]]) {
      renderDrawer(parts[1]);
      document.title = `${topicTitle(parts[1])} practice · AppSec, Animated`;
      return parts[2] === "cards" ? renderCards(parts[1]) : hasPractice(parts[1]) ? renderQuiz(parts[1]) : renderSheet(parts[1]);
    }
    if (parts[0] === "sheet" && parts[1] && DATA.topics[parts[1]]) {
      renderDrawer(parts[1]);
      document.title = `${topicTitle(parts[1])} cheatsheet · AppSec, Animated`;
      return renderSheet(parts[1]);
    }
    if (DATA.topics[parts[0]]) {
      location.replace(`#/practice/${parts[0]}/quiz`);
      return;
    }
    location.replace("#/");
  }

  /* ---------- keys + wiring ---------- */

  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      openPalette($("#palette").hidden);
      return;
    }
    if (!$("#palette").hidden) {
      const links = [...document.querySelectorAll("#paletteResults a")];
      if (e.key === "Escape") openPalette(false);
      else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        paletteSel = Math.max(0, Math.min(links.length - 1, paletteSel + (e.key === "ArrowDown" ? 1 : -1)));
        links.forEach((a, i) => a.classList.toggle("active", i === paletteSel));
        if (links[paletteSel]) links[paletteSel].scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter" && links[paletteSel]) {
        e.preventDefault();
        location.hash = links[paletteSel].getAttribute("href");
      }
      return;
    }
    if (e.key === "Escape") openDrawer(false);
    const tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea" || e.metaKey || e.ctrlKey || e.altKey) return;
    if (!cur) return;
    if (e.key === "ArrowRight" && cur.idx < cur.L.steps.length - 1) go(cur.id, cur.idx + 1);
    else if (e.key === "ArrowLeft" && cur.idx > 0) go(cur.id, cur.idx - 1);
    else if (e.key === "r" || e.key === "R") cur.stage.replay();
    else if (e.key === " ") {
      e.preventDefault();
      togglePause();
    }
  });

  const THEME_KEY = "sd-theme";
  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
  }
  function refreshThemeChrome() {
    const theme = currentTheme();
    const btn = $("#themeBtn");
    if (btn) {
      btn.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
      btn.title = theme === "dark" ? "Light theme" : "Dark theme";
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "light" ? "#f3f1ec" : "#141414");
    if (cur && cur.L) {
      const legend = (cur.L.legend || [])
        .map((item) => {
          const [kind, label] = Array.isArray(item) ? item : [item, PACKET_LABEL[item] || item];
          return `<span>${SD.packetSwatch(kind)}${esc(label)}</span>`;
        })
        .join("");
      const el = $(".legend");
      if (el) el.innerHTML = legend;
    }
  }
  function applyTheme(theme, { persist = true } = {}) {
    const next = theme === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    if (persist) {
      try {
        localStorage.setItem(THEME_KEY, next);
      } catch (e) {
        /* private mode */
      }
    }
    if (SD.setTheme) SD.setTheme(next);
    refreshThemeChrome();
    return next;
  }
  function toggleTheme() {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
  }

  $("#menuBtn").onclick = () => openDrawer($("#drawer").hidden);
  $("#drawerClose").onclick = () => openDrawer(false);
  $("#drawerBackdrop").onclick = () => openDrawer(false);
  $("#themeBtn").onclick = () => toggleTheme();
  $("#searchBtn").onclick = () => openPalette(true);
  $("#palette").addEventListener("click", (e) => {
    if (e.target.id === "palette") openPalette(false);
  });
  $("#paletteInput").addEventListener("input", () => {
    paletteSel = 0;
    renderPalette();
  });
  view.addEventListener("click", (e) => {
    if (e.target.closest("[data-open-palette]")) openPalette(true);
  });
  window.addEventListener("hashchange", route);

  function bootError(msg) {
    const el = $("#bootError");
    el.hidden = false;
    el.textContent = msg;
  }

  applyTheme(currentTheme(), { persist: false });
  renderXp();
  fetch("data/practice.json")
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .catch((err) => {
      bootError(`Practice data didn't load (${err.message}). Animated lessons still work.`);
      return null;
    })
    .then((d) => {
      if (d) DATA = d;
      buildPaletteIndex();
      route();
    });
})();
