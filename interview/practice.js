(function () {
  const RUBRIC = [
    {
      key: "accuracy",
      label: "Accuracy",
      help: "0 wrong/unsafe · 1 mostly right · 2 correct with edge cases",
    },
    {
      key: "structure",
      label: "Structure",
      help: "0 rambling · 1 OK flow · 2 define → mechanism → mitigation",
    },
    {
      key: "depth",
      label: "Depth",
      help: "0 surface · 1 one trade-off · 2 trade-offs + verification",
    },
    {
      key: "time",
      label: "Time",
      help: "0 far over · 1 slightly over · 2 within about a minute",
    },
  ];

  function scoreLabel(total) {
    if (total <= 3) return "Weak";
    if (total <= 5) return "Developing";
    if (total <= 7) return "Strong";
    return "Interview-ready";
  }

  function nextAction(total) {
    if (total <= 3) return "Reread Comprehensive + Critical Clarification. Drill again in 48 hours.";
    if (total <= 5) return "Quick Reference daily for 3 days, then drill again.";
    if (total <= 7) return "Add adversarial follow-ups. Pair with an adjacent topic.";
    return "Keep it warm with spaced repetition. Teach it back once a month.";
  }

  function createPractice(host, api) {
    const state = {
      deck: null,
      index: 0,
      startedAt: null,
      timerId: null,
      remaining: 0,
      budget: 120,
      answered: false,
      revealed: false,
    };

    host.classList.add("practice-shell");
    host.innerHTML = `
      <div class="practice-layout">
        <header class="practice-bar">
          <div class="practice-bar-left">
            <label for="practiceTopicSelect">Topic</label>
            <select id="practiceTopicSelect"></select>
          </div>
          <div class="practice-bar-right">
            <span id="practiceProgress" class="kpi-sub"></span>
            <button type="button" id="practiceSkip" class="btn">Skip</button>
          </div>
        </header>
        <section class="practice-prompt card">
          <p id="practiceCluster" class="kpi-sub"></p>
          <h2 id="practiceQuestion">Pick a topic to start</h2>
          <div class="practice-timer-row">
            <div id="practiceTimer" class="practice-timer">2:00</div>
            <button type="button" id="practiceStart" class="btn btn-primary">Start timer</button>
            <button type="button" id="practiceStop" class="btn" disabled>Stop & score</button>
          </div>
          <label class="field-label" for="practiceNotes">Scratch notes (optional)</label>
          <textarea id="practiceNotes" rows="4" placeholder="Talk out loud. Jot only if it helps."></textarea>
        </section>
        <section id="practiceScoreCard" class="practice-score card hidden">
          <h3>Self-score (0-2 each)</h3>
          <div id="practiceRubric" class="practice-rubric"></div>
          <p id="practiceTotal" class="practice-total"></p>
          <p id="practiceAdvice" class="kpi-sub"></p>
          <div class="practice-actions">
            <button type="button" id="practiceReveal" class="btn">Show model answer</button>
            <button type="button" id="practiceSaveNext" class="btn btn-primary">Save & next</button>
          </div>
          <div id="practiceAnswer" class="practice-answer markdown-content hidden"></div>
        </section>
      </div>
    `;

    const topicSelect = host.querySelector("#practiceTopicSelect");
    const progressEl = host.querySelector("#practiceProgress");
    const clusterEl = host.querySelector("#practiceCluster");
    const questionEl = host.querySelector("#practiceQuestion");
    const timerEl = host.querySelector("#practiceTimer");
    const startBtn = host.querySelector("#practiceStart");
    const stopBtn = host.querySelector("#practiceStop");
    const skipBtn = host.querySelector("#practiceSkip");
    const notesEl = host.querySelector("#practiceNotes");
    const scoreCard = host.querySelector("#practiceScoreCard");
    const rubricEl = host.querySelector("#practiceRubric");
    const totalEl = host.querySelector("#practiceTotal");
    const adviceEl = host.querySelector("#practiceAdvice");
    const revealBtn = host.querySelector("#practiceReveal");
    const saveNextBtn = host.querySelector("#practiceSaveNext");
    const answerEl = host.querySelector("#practiceAnswer");

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

    function currentPrompt() {
      return state.deck?.prompts?.[state.index] || null;
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

    function paintPrompt() {
      const prompt = currentPrompt();
      clearTimer();
      state.answered = false;
      state.revealed = false;
      state.startedAt = null;
      scoreCard.classList.add("hidden");
      answerEl.classList.add("hidden");
      answerEl.innerHTML = "";
      notesEl.value = "";
      startBtn.disabled = !prompt;
      stopBtn.disabled = true;
      if (!prompt) {
        clusterEl.textContent = "";
        questionEl.textContent = state.deck
          ? "No prompts in this deck."
          : "Pick a topic to start";
        timerEl.textContent = "0:00";
        progressEl.textContent = "";
        return;
      }
      state.budget = prompt.seconds || 120;
      state.remaining = state.budget;
      timerEl.textContent = formatTime(state.remaining);
      timerEl.classList.remove("urgent");
      clusterEl.textContent = prompt.cluster || "Interview prompt";
      questionEl.textContent = prompt.title;
      progressEl.textContent = `${state.index + 1} / ${state.deck.prompts.length}`;
    }

    function tick() {
      state.remaining -= 1;
      timerEl.textContent = formatTime(state.remaining);
      timerEl.classList.toggle("urgent", state.remaining <= 15);
      if (state.remaining <= 0) {
        clearTimer();
        openScoring();
      }
    }

    function startTimer() {
      if (!currentPrompt() || state.timerId) return;
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
      // Auto-suggest time score from overrun
      const used = state.budget - state.remaining;
      const overrun = used - state.budget;
      const timeSel = rubricEl.querySelector('select[data-rubric="time"]');
      if (timeSel) {
        if (overrun <= 15) timeSel.value = "2";
        else if (overrun <= 45) timeSel.value = "1";
        else timeSel.value = "0";
        updateTotal();
      }
    }

    function revealAnswer() {
      const prompt = currentPrompt();
      if (!prompt) return;
      state.revealed = true;
      answerEl.classList.remove("hidden");
      if (typeof window.marked?.parse === "function") {
        answerEl.innerHTML = window.marked.parse(prompt.answerMarkdown || "");
        if (window.hljs) {
          answerEl.querySelectorAll("pre code").forEach((block) => window.hljs.highlightElement(block));
        }
      } else {
        answerEl.textContent = prompt.answerMarkdown || "";
      }
    }

    function saveAndNext() {
      const prompt = currentPrompt();
      if (!prompt || !state.deck) return;
      const { scores, total } = readScores();
      const used = Math.max(0, state.budget - state.remaining);
      api.saveAttempt({
        topicId: state.deck.topicId,
        promptId: prompt.id,
        title: prompt.title,
        scores,
        total,
        secondsUsed: used,
        secondsBudget: state.budget,
      });
      if (state.index < state.deck.prompts.length - 1) {
        state.index += 1;
        paintPrompt();
      } else {
        questionEl.textContent = "Deck finished. Pick another topic or reset by reloading this topic.";
        scoreCard.classList.add("hidden");
        progressEl.textContent = `${state.deck.prompts.length} / ${state.deck.prompts.length}`;
      }
    }

    function skipPrompt() {
      if (!state.deck?.prompts?.length) return;
      clearTimer();
      state.index = (state.index + 1) % state.deck.prompts.length;
      paintPrompt();
    }

    async function loadTopic(topicId) {
      clearTimer();
      state.deck = null;
      state.index = 0;
      paintPrompt();
      if (!topicId) return;
      try {
        const res = await fetch(api.toAbsolute(`Config/practice/${topicId}.json`));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        state.deck = await res.json();
        state.index = 0;
        paintPrompt();
      } catch {
        questionEl.textContent = "No practice deck for this topic yet.";
      }
    }

    function fillTopics(topics, preferredId) {
      topicSelect.innerHTML = `<option value="">Choose a topic</option>`;
      const practiceIds = new Set(api.practiceIndex.map((x) => x.id));
      for (const topic of topics) {
        if (!practiceIds.has(topic.id)) continue;
        const opt = document.createElement("option");
        opt.value = topic.id;
        opt.textContent = topic.name;
        topicSelect.appendChild(opt);
      }
      if (preferredId && practiceIds.has(preferredId)) {
        topicSelect.value = preferredId;
        loadTopic(preferredId);
      }
    }

    startBtn.addEventListener("click", startTimer);
    stopBtn.addEventListener("click", openScoring);
    skipBtn.addEventListener("click", skipPrompt);
    revealBtn.addEventListener("click", revealAnswer);
    saveNextBtn.addEventListener("click", saveAndNext);
    topicSelect.addEventListener("change", () => loadTopic(topicSelect.value));

    return {
      fillTopics,
      loadTopic,
      destroy() {
        clearTimer();
        host.classList.remove("practice-shell");
        host.innerHTML = "";
      },
    };
  }

  window.PracticeMode = { create: createPractice, scoreLabel, nextAction };
})();
