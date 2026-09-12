(function () {
  function createDiagnostic(host, api) {
    const state = {
      config: null,
      step: "intro", // intro | profile | drill | stories | result
      role: "",
      horizon: "",
      stack: "",
      index: 0,
      scores: {},
      timerId: null,
      remaining: 90,
      budget: 90,
      storiesReady: false,
    };

    host.classList.add("diagnostic-shell");
    host.innerHTML = `
      <div class="practice-layout diagnostic-layout">
        <section id="diagIntro" class="card">
          <h2>Baseline diagnostic</h2>
          <p id="diagBlurb" class="kpi-sub"></p>
          <ol class="diag-steps">
            <li>Role and timeline (about 5 min)</li>
            <li>Eight spoken prompts, 90 seconds each (about 20 min)</li>
            <li>Quick story inventory (about 10 min)</li>
            <li>Path + gap list saved to your dashboard</li>
          </ol>
          <button type="button" id="diagBegin" class="btn btn-primary">Begin</button>
        </section>

        <section id="diagProfile" class="card hidden">
          <h2>Role and timeline</h2>
          <label class="field-label" for="diagRole">Target role</label>
          <select id="diagRole"></select>
          <label class="field-label" for="diagHorizon">Interview horizon</label>
          <select id="diagHorizon"></select>
          <label class="field-label" for="diagStack">Primary stack</label>
          <select id="diagStack"></select>
          <div class="practice-actions">
            <button type="button" id="diagProfileNext" class="btn btn-primary">Start knowledge check</button>
          </div>
        </section>

        <section id="diagDrill" class="card hidden">
          <p id="diagDrillMeta" class="kpi-sub"></p>
          <h2 id="diagQuestion">Prompt</h2>
          <div class="practice-timer-row">
            <div id="diagTimer" class="practice-timer">1:30</div>
            <button type="button" id="diagStart" class="btn btn-primary">Start 90s</button>
            <button type="button" id="diagStop" class="btn" disabled>Stop & score</button>
          </div>
          <p class="kpi-sub">Talk out loud. No notes. Score honestly after.</p>
          <section id="diagScoreBox" class="hidden">
            <h3>Self-score</h3>
            <div class="diag-score-row">
              <button type="button" class="btn" data-score="0">0 blank</button>
              <button type="button" class="btn" data-score="1">1 partial</button>
              <button type="button" class="btn btn-primary" data-score="2">2 crisp</button>
            </div>
          </section>
        </section>

        <section id="diagStories" class="card hidden">
          <h2>Experience inventory</h2>
          <p class="kpi-sub">Can you name three real situations with constraint → action → outcome?</p>
          <label class="checkbox">
            <input id="diagStoriesCheck" type="checkbox" />
            <span>Yes - I have at least three workable stories</span>
          </label>
          <p class="kpi-sub">If not, plan Story Library work in parallel with technical study.</p>
          <div class="practice-actions">
            <button type="button" id="diagStoriesNext" class="btn btn-primary">See my plan</button>
          </div>
        </section>

        <section id="diagResult" class="card hidden">
          <h2>Your routing</h2>
          <p id="diagResultSummary" class="practice-total"></p>
          <p id="diagResultAdvice" class="kpi-sub"></p>
          <p id="diagResultPath" class="kpi-sub"></p>
          <h3 class="scenario-subhead">Gap topics (from 0-1 scores)</h3>
          <ul id="diagGaps" class="scenario-prompts"></ul>
          <div class="practice-actions">
            <button type="button" id="diagApply" class="btn btn-primary">Save path & open next topic</button>
            <button type="button" id="diagPractice" class="btn">Practice a gap</button>
            <button type="button" id="diagRestart" class="btn">Retake</button>
          </div>
        </section>
      </div>
    `;

    const intro = host.querySelector("#diagIntro");
    const profile = host.querySelector("#diagProfile");
    const drill = host.querySelector("#diagDrill");
    const stories = host.querySelector("#diagStories");
    const result = host.querySelector("#diagResult");
    const blurb = host.querySelector("#diagBlurb");
    const roleSel = host.querySelector("#diagRole");
    const horizonSel = host.querySelector("#diagHorizon");
    const stackSel = host.querySelector("#diagStack");
    const drillMeta = host.querySelector("#diagDrillMeta");
    const questionEl = host.querySelector("#diagQuestion");
    const timerEl = host.querySelector("#diagTimer");
    const startBtn = host.querySelector("#diagStart");
    const stopBtn = host.querySelector("#diagStop");
    const scoreBox = host.querySelector("#diagScoreBox");
    const storiesCheck = host.querySelector("#diagStoriesCheck");
    const resultSummary = host.querySelector("#diagResultSummary");
    const resultAdvice = host.querySelector("#diagResultAdvice");
    const resultPath = host.querySelector("#diagResultPath");
    const gapsEl = host.querySelector("#diagGaps");

    function show(step) {
      state.step = step;
      intro.classList.toggle("hidden", step !== "intro");
      profile.classList.toggle("hidden", step !== "profile");
      drill.classList.toggle("hidden", step !== "drill");
      stories.classList.toggle("hidden", step !== "stories");
      result.classList.toggle("hidden", step !== "result");
    }

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

    function fillSelects(config) {
      roleSel.innerHTML = "";
      for (const r of config.roles || []) {
        const opt = document.createElement("option");
        opt.value = r.id;
        opt.textContent = r.label;
        roleSel.appendChild(opt);
      }
      horizonSel.innerHTML = "";
      for (const h of config.horizons || []) {
        const opt = document.createElement("option");
        opt.value = h.id;
        opt.textContent = h.label;
        horizonSel.appendChild(opt);
      }
      stackSel.innerHTML = "";
      for (const s of config.stacks || []) {
        const opt = document.createElement("option");
        opt.value = s.id;
        opt.textContent = s.label;
        stackSel.appendChild(opt);
      }
    }

    function currentPrompt() {
      return state.config?.prompts?.[state.index] || null;
    }

    function paintDrill() {
      const prompt = currentPrompt();
      clearTimer();
      scoreBox.classList.add("hidden");
      startBtn.disabled = !prompt;
      stopBtn.disabled = true;
      if (!prompt) return;
      state.budget = prompt.seconds || 90;
      state.remaining = state.budget;
      timerEl.textContent = formatTime(state.remaining);
      timerEl.classList.remove("urgent");
      questionEl.textContent = prompt.title;
      drillMeta.textContent = `Prompt ${state.index + 1} / ${state.config.prompts.length}`;
    }

    function tick() {
      state.remaining -= 1;
      timerEl.textContent = formatTime(state.remaining);
      timerEl.classList.toggle("urgent", state.remaining <= 15);
      if (state.remaining <= 0) {
        clearTimer();
        openScore();
      }
    }

    function startTimer() {
      if (!currentPrompt() || state.timerId) return;
      state.remaining = state.budget;
      startBtn.disabled = true;
      stopBtn.disabled = false;
      state.timerId = setInterval(tick, 1000);
    }

    function openScore() {
      clearTimer();
      stopBtn.disabled = true;
      startBtn.disabled = false;
      scoreBox.classList.remove("hidden");
    }

    function recordScore(score) {
      const prompt = currentPrompt();
      if (!prompt) return;
      state.scores[prompt.id] = Number(score);
      if (state.index < state.config.prompts.length - 1) {
        state.index += 1;
        paintDrill();
      } else {
        show("stories");
      }
    }

    function totalScore() {
      return Object.values(state.scores).reduce((sum, v) => sum + (Number(v) || 0), 0);
    }

    function gapTopicIds() {
      const ids = [];
      for (const prompt of state.config.prompts || []) {
        const s = state.scores[prompt.id];
        if (s === 0 || s === 1) {
          for (const tid of prompt.topicIds || []) {
            if (!ids.includes(tid)) ids.push(tid);
          }
        }
      }
      return ids.slice(0, 8);
    }

    function recommendPathId() {
      const horizon = (state.config.horizons || []).find((h) => h.id === state.horizon);
      if (horizon?.pathOverride) return horizon.pathOverride;
      const role = (state.config.roles || []).find((r) => r.id === state.role);
      return role?.pathId || "product-security";
    }

    function scoreBand(total) {
      const bands = state.config.scoreBands || [];
      for (const band of bands) {
        if (total <= band.max) return band;
      }
      return bands[bands.length - 1] || { label: "", advice: "" };
    }

    function paintResult() {
      const total = totalScore();
      const band = scoreBand(total);
      const pathId = recommendPathId();
      const path = (api.paths || []).find((p) => p.id === pathId);
      const gaps = gapTopicIds();
      resultSummary.textContent = `${total} / 16 · ${band.label || "Scored"}`;
      resultAdvice.textContent = band.advice || "";
      resultPath.textContent = path
        ? `Recommended path: ${path.name} (${path.weeks} weeks). ${path.blurb || ""}`
        : `Recommended path id: ${pathId}`;
      if (!state.storiesReady) {
        resultAdvice.textContent +=
          " Also block time for Story Library - you marked fewer than three solid stories.";
      }
      gapsEl.innerHTML = "";
      if (!gaps.length) {
        const li = document.createElement("li");
        li.textContent = "No hard gaps from 0-1 scores. Keep path order and add Scenarios.";
        gapsEl.appendChild(li);
      } else {
        for (const tid of gaps) {
          const topic = (api.topics || []).find((t) => t.id === tid);
          const li = document.createElement("li");
          li.textContent = topic?.name || tid;
          gapsEl.appendChild(li);
        }
      }
      state._result = { total, pathId, gaps, band };
    }

    function saveAndContinue() {
      const payload = state._result || {
        total: totalScore(),
        pathId: recommendPathId(),
        gaps: gapTopicIds(),
        band: scoreBand(totalScore()),
      };
      api.saveDiagnostic({
        role: state.role,
        horizon: state.horizon,
        stack: state.stack,
        scores: { ...state.scores },
        total: payload.total,
        pathId: payload.pathId,
        gapTopicIds: payload.gaps,
        storiesReady: state.storiesReady,
        bandLabel: payload.band?.label || "",
      });
      api.applyPath(payload.pathId);
      const firstGap = payload.gaps[0];
      if (firstGap) api.openTopic(firstGap);
      else api.openDashboard();
    }

    function practiceGap() {
      const gaps = state._result?.gaps || gapTopicIds();
      const first = gaps[0];
      if (first) {
        api.saveDiagnostic({
          role: state.role,
          horizon: state.horizon,
          stack: state.stack,
          scores: { ...state.scores },
          total: totalScore(),
          pathId: recommendPathId(),
          gapTopicIds: gaps,
          storiesReady: state.storiesReady,
          bandLabel: scoreBand(totalScore())?.label || "",
        });
        api.applyPath(recommendPathId());
        api.openPractice(first);
      } else {
        api.openPractice();
      }
    }

    function restart() {
      clearTimer();
      state.index = 0;
      state.scores = {};
      state.storiesReady = false;
      storiesCheck.checked = false;
      show("intro");
    }

    host.querySelector("#diagBegin").addEventListener("click", () => show("profile"));
    host.querySelector("#diagProfileNext").addEventListener("click", () => {
      state.role = roleSel.value;
      state.horizon = horizonSel.value;
      state.stack = stackSel.value;
      state.index = 0;
      state.scores = {};
      show("drill");
      paintDrill();
    });
    startBtn.addEventListener("click", startTimer);
    stopBtn.addEventListener("click", openScore);
    scoreBox.querySelectorAll("[data-score]").forEach((btn) => {
      btn.addEventListener("click", () => recordScore(btn.getAttribute("data-score")));
    });
    host.querySelector("#diagStoriesNext").addEventListener("click", () => {
      state.storiesReady = !!storiesCheck.checked;
      paintResult();
      show("result");
    });
    host.querySelector("#diagApply").addEventListener("click", saveAndContinue);
    host.querySelector("#diagPractice").addEventListener("click", practiceGap);
    host.querySelector("#diagRestart").addEventListener("click", restart);

    function loadConfig(config) {
      state.config = config || { prompts: [], roles: [], horizons: [], stacks: [] };
      blurb.textContent = state.config.blurb || "";
      fillSelects(state.config);
      show("intro");
    }

    return {
      loadConfig,
      destroy() {
        clearTimer();
        host.classList.remove("diagnostic-shell");
        host.innerHTML = "";
      },
    };
  }

  window.DiagnosticMode = { create: createDiagnostic };
})();
