(function () {
  const RUBRIC = [
    {
      key: "clarify",
      label: "Clarify",
      help: "0 jumped in · 1 some constraints · 2 scope, assets, assumptions named",
    },
    {
      key: "prioritize",
      label: "Prioritize",
      help: "0 flat list · 1 rough ranking · 2 risk-ordered with why",
    },
    {
      key: "controls",
      label: "Controls",
      help: "0 vague · 1 a few fixes · 2 concrete controls + verification",
    },
    {
      key: "communicate",
      label: "Communicate",
      help: "0 solo hero · 1 one stakeholder · 2 owners, trade-offs, next update",
    },
  ];

  const KINDS = [
    { id: "all", label: "All kinds" },
    { id: "architecture", label: "Architecture" },
    { id: "incident", label: "Incident response" },
    { id: "threat-model", label: "Threat model" },
    { id: "assessment", label: "Assessment" },
    { id: "appsec", label: "AppSec" },
    { id: "design", label: "Design" },
  ];

  function scoreLabel(total) {
    if (total <= 3) return "Weak";
    if (total <= 5) return "Developing";
    if (total <= 7) return "Strong";
    return "Interview-ready";
  }

  function nextAction(total) {
    if (total <= 3) return "Reread the related guides. Redo this scenario in 48 hours with a timer.";
    if (total <= 5) return "Tighten the first-hour plan. Practice saying priorities out loud.";
    if (total <= 7) return "Add adversarial follow-ups (deadline, outage, legal pressure).";
    return "Keep it warm. Teach this scenario to a peer once a month.";
  }

  function createScenarios(host, api) {
    const state = {
      catalog: [],
      filtered: [],
      index: 0,
      startedAt: null,
      timerId: null,
      remaining: 0,
      budget: 720,
      answered: false,
      revealed: false,
    };

    host.classList.add("scenarios-shell");
    host.innerHTML = `
      <div class="practice-layout scenarios-layout">
        <header class="practice-bar">
          <div class="practice-bar-left">
            <label for="scenarioKindFilter">Kind</label>
            <select id="scenarioKindFilter"></select>
            <label for="scenarioDiffFilter">Difficulty</label>
            <select id="scenarioDiffFilter">
              <option value="all">All</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
            <label for="scenarioSelect">Scenario</label>
            <select id="scenarioSelect"></select>
          </div>
          <div class="practice-bar-right">
            <span id="scenarioProgress" class="kpi-sub"></span>
            <button type="button" id="scenarioSkip" class="btn">Next</button>
          </div>
        </header>

        <section class="practice-prompt card">
          <p id="scenarioMeta" class="kpi-sub"></p>
          <h2 id="scenarioTitle">Pick a scenario</h2>
          <div id="scenarioBrief" class="scenario-brief markdown-content"></div>
          <div class="scenario-split">
            <div>
              <h3 class="scenario-subhead">Your tasks</h3>
              <ul id="scenarioTasks" class="scenario-checklist"></ul>
            </div>
            <div>
              <h3 class="scenario-subhead">Warm-up prompts</h3>
              <ul id="scenarioPrompts" class="scenario-prompts"></ul>
            </div>
          </div>
          <div class="practice-timer-row">
            <div id="scenarioTimer" class="practice-timer">12:00</div>
            <button type="button" id="scenarioStart" class="btn btn-primary">Start timer</button>
            <button type="button" id="scenarioStop" class="btn" disabled>Stop & score</button>
          </div>
          <label class="field-label" for="scenarioNotes">Scratch notes (optional)</label>
          <textarea id="scenarioNotes" rows="5" placeholder="Talk the plan out loud. Jot owners, first hour, and top risks."></textarea>
        </section>

        <section id="scenarioScoreCard" class="practice-score card hidden">
          <h3>Self-score (0-2 each)</h3>
          <div id="scenarioRubric" class="practice-rubric"></div>
          <p id="scenarioTotal" class="practice-total"></p>
          <p id="scenarioAdvice" class="kpi-sub"></p>
          <div class="practice-actions">
            <button type="button" id="scenarioReveal" class="btn">Show model framework</button>
            <button type="button" id="scenarioSaveNext" class="btn btn-primary">Save & next</button>
          </div>
          <div id="scenarioAnswer" class="practice-answer markdown-content hidden"></div>
        </section>
      </div>
    `;

    const kindFilter = host.querySelector("#scenarioKindFilter");
    const diffFilter = host.querySelector("#scenarioDiffFilter");
    const selectEl = host.querySelector("#scenarioSelect");
    const progressEl = host.querySelector("#scenarioProgress");
    const metaEl = host.querySelector("#scenarioMeta");
    const titleEl = host.querySelector("#scenarioTitle");
    const briefEl = host.querySelector("#scenarioBrief");
    const tasksEl = host.querySelector("#scenarioTasks");
    const promptsEl = host.querySelector("#scenarioPrompts");
    const timerEl = host.querySelector("#scenarioTimer");
    const startBtn = host.querySelector("#scenarioStart");
    const stopBtn = host.querySelector("#scenarioStop");
    const skipBtn = host.querySelector("#scenarioSkip");
    const notesEl = host.querySelector("#scenarioNotes");
    const scoreCard = host.querySelector("#scenarioScoreCard");
    const rubricEl = host.querySelector("#scenarioRubric");
    const totalEl = host.querySelector("#scenarioTotal");
    const adviceEl = host.querySelector("#scenarioAdvice");
    const revealBtn = host.querySelector("#scenarioReveal");
    const saveNextBtn = host.querySelector("#scenarioSaveNext");
    const answerEl = host.querySelector("#scenarioAnswer");

    KINDS.forEach((k) => {
      const opt = document.createElement("option");
      opt.value = k.id;
      opt.textContent = k.label;
      kindFilter.appendChild(opt);
    });

    function formatTime(sec) {
      const s = Math.max(0, Math.floor(sec));
      const m = Math.floor(s / 60);
      const r = s % 60;
      return `${m}:${String(r).padStart(2, "0")}`;
    }

    function clearTimer() {
      if (state.timerId) {
        clearInterval(state.timerId);
        state.timerId = null;
      }
    }

    function current() {
      return state.filtered[state.index] || null;
    }

    function renderMarkdown(el, md) {
      if (typeof window.marked?.parse === "function") {
        el.innerHTML = window.marked.parse(md || "");
        if (window.hljs) {
          el.querySelectorAll("pre code").forEach((block) => window.hljs.highlightElement(block));
        }
      } else {
        el.textContent = md || "";
      }
    }

    function applyFilters() {
      const kind = kindFilter.value;
      const diff = diffFilter.value;
      state.filtered = state.catalog.filter((s) => {
        if (kind !== "all" && s.kind !== kind) return false;
        if (diff !== "all" && s.difficulty !== diff) return false;
        return true;
      });
      const prevId = selectEl.value;
      selectEl.innerHTML = "";
      if (!state.filtered.length) {
        const opt = document.createElement("option");
        opt.value = "";
        opt.textContent = "No scenarios match";
        selectEl.appendChild(opt);
        state.index = 0;
        paint();
        return;
      }
      state.filtered.forEach((s, i) => {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = `${s.title} (${s.difficulty})`;
        selectEl.appendChild(opt);
        if (s.id === prevId) state.index = i;
      });
      if (state.index >= state.filtered.length) state.index = 0;
      selectEl.value = state.filtered[state.index].id;
      paint();
    }

    function paint() {
      const s = current();
      clearTimer();
      state.answered = false;
      state.revealed = false;
      state.startedAt = null;
      scoreCard.classList.add("hidden");
      answerEl.classList.add("hidden");
      answerEl.innerHTML = "";
      notesEl.value = "";
      startBtn.disabled = !s;
      stopBtn.disabled = true;
      if (!s) {
        metaEl.textContent = "";
        titleEl.textContent = "No scenario selected";
        briefEl.innerHTML = "";
        tasksEl.innerHTML = "";
        promptsEl.innerHTML = "";
        timerEl.textContent = "0:00";
        progressEl.textContent = "";
        return;
      }
      state.budget = Math.max(300, (Number(s.minutes) || 12) * 60);
      state.remaining = state.budget;
      timerEl.textContent = formatTime(state.remaining);
      timerEl.classList.remove("urgent");
      metaEl.textContent = `${s.kind} · ${s.difficulty} · ~${s.minutes} min · ${s.collection}`;
      titleEl.textContent = s.title;
      renderMarkdown(briefEl, s.briefMarkdown || "");
      tasksEl.innerHTML = "";
      (s.tasks || []).forEach((task, i) => {
        const li = document.createElement("li");
        li.innerHTML = `<label><input type="checkbox" data-task="${i}" /> <span>${escapeHtml(task)}</span></label>`;
        tasksEl.appendChild(li);
      });
      promptsEl.innerHTML = "";
      (s.prompts || []).forEach((q) => {
        const li = document.createElement("li");
        li.textContent = q;
        promptsEl.appendChild(li);
      });
      progressEl.textContent = `${state.index + 1} / ${state.filtered.length}`;
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function renderRubric() {
      rubricEl.innerHTML = "";
      RUBRIC.forEach((row) => {
        const wrap = document.createElement("div");
        wrap.className = "rubric-row";
        wrap.innerHTML = `
          <div>
            <strong>${row.label}</strong>
            <small>${row.help}</small>
          </div>
          <select data-rubric="${row.key}" aria-label="${row.label} score">
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2" selected>2</option>
          </select>
        `;
        rubricEl.appendChild(wrap);
      });
      rubricEl.querySelectorAll("select").forEach((sel) => {
        sel.addEventListener("change", updateTotal);
      });
      updateTotal();
    }

    function readScores() {
      const scores = {};
      let total = 0;
      RUBRIC.forEach((row) => {
        const sel = rubricEl.querySelector(`select[data-rubric="${row.key}"]`);
        const val = Number(sel?.value || 0);
        scores[row.key] = val;
        total += val;
      });
      return { scores, total };
    }

    function updateTotal() {
      const { total } = readScores();
      totalEl.textContent = `${total} / 8 · ${scoreLabel(total)}`;
      adviceEl.textContent = nextAction(total);
    }

    function tick() {
      state.remaining -= 1;
      timerEl.textContent = formatTime(state.remaining);
      timerEl.classList.toggle("urgent", state.remaining <= 60);
      if (state.remaining <= 0) {
        clearTimer();
        openScoring();
      }
    }

    function startTimer() {
      if (!current() || state.timerId) return;
      state.startedAt = Date.now();
      state.remaining = state.budget;
      startBtn.disabled = true;
      stopBtn.disabled = false;
      state.timerId = setInterval(tick, 1000);
    }

    function openScoring() {
      clearTimer();
      state.answered = true;
      stopBtn.disabled = true;
      startBtn.disabled = false;
      scoreCard.classList.remove("hidden");
      renderRubric();
      const used = state.budget - state.remaining;
      const overrun = used - state.budget;
      // Map overrun onto communicate as a soft time cue only if they finish early/late? Skip auto.
      void overrun;
      updateTotal();
    }

    function revealAnswer() {
      const s = current();
      if (!s) return;
      state.revealed = true;
      answerEl.classList.remove("hidden");
      renderMarkdown(answerEl, s.answerMarkdown || "");
    }

    function saveAndNext() {
      const s = current();
      if (!s) return;
      const { scores, total } = readScores();
      const used = Math.max(0, state.budget - state.remaining);
      const checked = [...tasksEl.querySelectorAll("input[type=checkbox]:checked")].length;
      api.saveAttempt({
        scenarioId: s.id,
        title: s.title,
        kind: s.kind,
        difficulty: s.difficulty,
        relatedTopicIds: s.relatedTopicIds || [],
        scores,
        total,
        tasksChecked: checked,
        tasksTotal: (s.tasks || []).length,
        secondsUsed: used,
        secondsBudget: state.budget,
      });
      if (state.index < state.filtered.length - 1) {
        state.index += 1;
        selectEl.value = state.filtered[state.index].id;
        paint();
      } else {
        titleEl.textContent = "Filter finished. Change filters or pick another scenario.";
        scoreCard.classList.add("hidden");
        progressEl.textContent = `${state.filtered.length} / ${state.filtered.length}`;
      }
    }

    function skipScenario() {
      if (!state.filtered.length) return;
      clearTimer();
      state.index = (state.index + 1) % state.filtered.length;
      selectEl.value = state.filtered[state.index].id;
      paint();
    }

    function loadCatalog(catalog, preferredId) {
      state.catalog = Array.isArray(catalog) ? catalog.slice() : [];
      applyFilters();
      if (preferredId) {
        const idx = state.filtered.findIndex((s) => s.id === preferredId);
        if (idx >= 0) {
          state.index = idx;
          selectEl.value = preferredId;
          paint();
        } else {
          // preferred may be filtered out; try showing all
          kindFilter.value = "all";
          diffFilter.value = "all";
          applyFilters();
          const idx2 = state.filtered.findIndex((s) => s.id === preferredId);
          if (idx2 >= 0) {
            state.index = idx2;
            selectEl.value = preferredId;
            paint();
          }
        }
      }
    }

    function selectById(id) {
      if (!id) return;
      kindFilter.value = "all";
      diffFilter.value = "all";
      applyFilters();
      const idx = state.filtered.findIndex((s) => s.id === id);
      if (idx < 0) return;
      state.index = idx;
      selectEl.value = id;
      paint();
    }

    startBtn.addEventListener("click", startTimer);
    stopBtn.addEventListener("click", openScoring);
    skipBtn.addEventListener("click", skipScenario);
    revealBtn.addEventListener("click", revealAnswer);
    saveNextBtn.addEventListener("click", saveAndNext);
    kindFilter.addEventListener("change", applyFilters);
    diffFilter.addEventListener("change", applyFilters);
    selectEl.addEventListener("change", () => {
      const idx = state.filtered.findIndex((s) => s.id === selectEl.value);
      if (idx >= 0) {
        state.index = idx;
        paint();
      }
    });

    return {
      loadCatalog,
      selectById,
      destroy() {
        clearTimer();
        host.classList.remove("scenarios-shell");
        host.innerHTML = "";
      },
    };
  }

  window.ScenarioMode = { create: createScenarios, scoreLabel, nextAction };
})();
