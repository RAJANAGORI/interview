(function () {
  const RUBRIC = [
    {
      key: "map",
      label: "Map",
      help: "0 vague system · 1 names parts · 2 uses zones, flows, assets from the model",
    },
    {
      key: "threats",
      label: "Threats",
      help: "0 generic list · 1 one solid threat · 2 risks tied to components/flows",
    },
    {
      key: "controls",
      label: "Controls",
      help: "0 slogans · 1 a mitigation · 2 control + how you verify it",
    },
    {
      key: "time",
      label: "Time",
      help: "0 far over · 1 slightly over · 2 within budget",
    },
  ];

  function scoreLabel(total) {
    if (total <= 3) return "Weak";
    if (total <= 5) return "Developing";
    if (total <= 7) return "Strong";
    return "Interview-ready";
  }

  function nextAction(total) {
    if (total <= 3) return "Re-read the model graph. Answer again naming one zone and one flow.";
    if (total <= 5) return "Tie every threat to a component id from the model.";
    if (total <= 7) return "Add residual risk and an owner for the top mitigation.";
    return "Keep sharp: invent one follow-up the interviewer might ask.";
  }

  function riskScore(threat) {
    const l = Number(threat?.risk?.likelihood) || 0;
    const i = Number(threat?.risk?.impact) || 0;
    return Math.round((l * i) / 100);
  }

  const MERMAID_SRC = "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.min.js";
  const MERMAID_SRI =
    "sha384-rbtjAdnIQE/aQJGEgXrVUlMibdfTSa4PQju4HDhN3sR2PmaKFzhEafuePsl9H/9I";

  let mermaidLoader = null;

  function loadMermaid() {
    if (window.mermaid) return Promise.resolve(window.mermaid);
    if (mermaidLoader) return mermaidLoader;
    mermaidLoader = new Promise((resolve, reject) => {
      const existing = document.querySelector(`script[data-otm-mermaid="1"]`);
      if (existing && window.mermaid) {
        resolve(window.mermaid);
        return;
      }
      const script = document.createElement("script");
      script.src = MERMAID_SRC;
      script.integrity = MERMAID_SRI;
      script.crossOrigin = "anonymous";
      script.dataset.otmMermaid = "1";
      script.onload = () => {
        if (!window.mermaid) {
          reject(new Error("Mermaid failed to load"));
          return;
        }
        window.mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "dark",
          themeVariables: {
            darkMode: true,
            background: "#101010",
            primaryColor: "#1c1c1c",
            primaryTextColor: "#f2f0ec",
            primaryBorderColor: "#ff8c00",
            lineColor: "#a89880",
            secondaryColor: "#181818",
            tertiaryColor: "#141414",
            fontFamily: "Source Sans 3, sans-serif",
          },
          flowchart: { curve: "basis", htmlLabels: false },
        });
        resolve(window.mermaid);
      };
      script.onerror = () => reject(new Error("Mermaid script error"));
      document.head.appendChild(script);
    }).catch((err) => {
      mermaidLoader = null;
      throw err;
    });
    return mermaidLoader;
  }

  function mermaidSafeId(id) {
    const raw = String(id || "node").replace(/[^a-zA-Z0-9_]/g, "_");
    return /^[A-Za-z]/.test(raw) ? raw : `n_${raw}`;
  }

  function mermaidLabel(text) {
    return String(text || "")
      .replace(/"/g, "'")
      .replace(/[\[\]{}|]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 48);
  }

  function componentShape(comp) {
    const label = mermaidLabel(comp.name || comp.id);
    const id = mermaidSafeId(comp.id);
    const type = (comp.type || "").toLowerCase();
    if (type === "data-store") return `${id}[("${label}")]`;
    if (type === "actor") return `${id}(("${label}"))`;
    if (type === "external") return `${id}[["${label}"]]`;
    return `${id}["${label}"]`;
  }

  function modelToMermaid(model) {
    const lines = ["flowchart LR"];
    const comps = model.components || [];
    const zones = model.trustZones || [];
    const placed = new Set();

    for (const zone of zones) {
      const zid = mermaidSafeId(zone.id);
      lines.push(`  subgraph ${zid}["${mermaidLabel(zone.name)}"]`);
      for (const comp of comps.filter((c) => c.trustZone === zone.id)) {
        lines.push(`    ${componentShape(comp)}`);
        placed.add(comp.id);
      }
      lines.push("  end");
    }

    for (const comp of comps) {
      if (placed.has(comp.id)) continue;
      lines.push(`  ${componentShape(comp)}`);
    }

    for (const flow of model.dataflows || []) {
      if (!flow.source || !flow.destination) continue;
      const src = mermaidSafeId(flow.source);
      const dst = mermaidSafeId(flow.destination);
      const edge = mermaidLabel(flow.name || flow.id || "flow");
      lines.push(`  ${src} -->|"${edge}"| ${dst}`);
    }
    return lines.join("\n");
  }

  function asciiGraph(model) {
    const zoneMap = Object.fromEntries((model.trustZones || []).map((z) => [z.id, z.name]));
    const lines = [];
    lines.push("Trust zones");
    for (const z of model.trustZones || []) {
      lines.push(`  [${z.id}] ${z.name} (risk: ${z.risk || "n/a"})`);
    }
    lines.push("");
    lines.push("Data flows");
    for (const f of model.dataflows || []) {
      const cross = (f.crosses || []).map((id) => zoneMap[id] || id).join(" -> ");
      lines.push(`  ${f.source} --${f.name}--> ${f.destination}`);
      if (cross) lines.push(`    crosses: ${cross}`);
      if (f.protocol) lines.push(`    protocol: ${f.protocol}`);
    }
    return lines.join("\n");
  }

  function createOtm(host, api) {
    const state = {
      index: [],
      model: null,
      promptIndex: 0,
      startedAt: null,
      timerId: null,
      remaining: 0,
      budget: 120,
      tab: "graph",
    };

    host.classList.add("otm-shell");
    host.innerHTML = `
      <div class="practice-layout otm-layout">
        <header class="practice-bar">
          <div class="practice-bar-left">
            <label for="otmModelSelect">Model</label>
            <select id="otmModelSelect"></select>
          </div>
          <div class="practice-bar-right">
            <a id="otmSpecLink" class="kpi-sub" href="#" target="_blank" rel="noopener noreferrer">OTM spec</a>
            <a id="otmExternalLink" class="kpi-sub hidden" href="#" target="_blank" rel="noopener noreferrer">Open external lab</a>
          </div>
        </header>

        <section class="card otm-intro">
          <p id="otmMeta" class="kpi-sub"></p>
          <h2 id="otmTitle">Pick a model</h2>
          <p id="otmBlurb" class="kpi-sub"></p>
          <div class="otm-tabs" role="tablist">
            <button type="button" class="btn otm-tab is-active" data-tab="graph">Graph</button>
            <button type="button" class="btn otm-tab" data-tab="threats">Threats</button>
            <button type="button" class="btn otm-tab" data-tab="json">JSON</button>
            <button type="button" class="btn otm-tab" data-tab="drill">Drill</button>
          </div>
        </section>

        <section id="otmPanelGraph" class="card otm-panel">
          <h3 class="scenario-subhead">Trust zones & flows</h3>
          <div id="otmMermaidStatus" class="kpi-sub">Loading diagram…</div>
          <div id="otmMermaid" class="otm-mermaid" aria-label="OTM flowchart"></div>
          <details class="otm-ascii">
            <summary>Text graph</summary>
            <pre id="otmGraph" class="otm-graph"></pre>
          </details>
          <div class="scenario-split">
            <div>
              <h3 class="scenario-subhead">Components</h3>
              <ul id="otmComponents" class="scenario-prompts"></ul>
            </div>
            <div>
              <h3 class="scenario-subhead">Assets</h3>
              <ul id="otmAssets" class="scenario-prompts"></ul>
            </div>
          </div>
        </section>

        <section id="otmPanelThreats" class="card otm-panel hidden">
          <div id="otmThreatList" class="otm-threat-list"></div>
        </section>

        <section id="otmPanelJson" class="card otm-panel hidden">
          <pre id="otmJson" class="otm-json"></pre>
        </section>

        <section id="otmPanelDrill" class="card otm-panel hidden">
          <p id="otmDrillProgress" class="kpi-sub"></p>
          <h3 id="otmDrillQuestion">Load a model to drill</h3>
          <div class="practice-timer-row">
            <div id="otmTimer" class="practice-timer">2:00</div>
            <button type="button" id="otmStart" class="btn btn-primary" disabled>Start timer</button>
            <button type="button" id="otmStop" class="btn" disabled>Stop & score</button>
            <button type="button" id="otmSkip" class="btn" disabled>Skip</button>
          </div>
          <label class="field-label" for="otmNotes">Scratch notes (optional)</label>
          <textarea id="otmNotes" rows="4" placeholder="Point at zones and flow ids while you talk."></textarea>
          <section id="otmScoreCard" class="practice-score hidden">
            <h3>Self-score (0-2 each)</h3>
            <div id="otmRubric" class="practice-rubric"></div>
            <p id="otmTotal" class="practice-total"></p>
            <p id="otmAdvice" class="kpi-sub"></p>
            <div class="practice-actions">
              <button type="button" id="otmReveal" class="btn">Show model answer</button>
              <button type="button" id="otmSaveNext" class="btn btn-primary">Save & next</button>
            </div>
            <div id="otmAnswer" class="practice-answer markdown-content hidden"></div>
          </section>
        </section>
      </div>
    `;

    const modelSelect = host.querySelector("#otmModelSelect");
    const specLink = host.querySelector("#otmSpecLink");
    const externalLink = host.querySelector("#otmExternalLink");
    const metaEl = host.querySelector("#otmMeta");
    const titleEl = host.querySelector("#otmTitle");
    const blurbEl = host.querySelector("#otmBlurb");
    const graphEl = host.querySelector("#otmGraph");
    const mermaidEl = host.querySelector("#otmMermaid");
    const mermaidStatus = host.querySelector("#otmMermaidStatus");
    const componentsEl = host.querySelector("#otmComponents");
    const assetsEl = host.querySelector("#otmAssets");
    const threatListEl = host.querySelector("#otmThreatList");
    const jsonEl = host.querySelector("#otmJson");
    const drillProgress = host.querySelector("#otmDrillProgress");
    const drillQuestion = host.querySelector("#otmDrillQuestion");
    const timerEl = host.querySelector("#otmTimer");
    const startBtn = host.querySelector("#otmStart");
    const stopBtn = host.querySelector("#otmStop");
    const skipBtn = host.querySelector("#otmSkip");
    const notesEl = host.querySelector("#otmNotes");
    const scoreCard = host.querySelector("#otmScoreCard");
    const rubricEl = host.querySelector("#otmRubric");
    const totalEl = host.querySelector("#otmTotal");
    const adviceEl = host.querySelector("#otmAdvice");
    const revealBtn = host.querySelector("#otmReveal");
    const saveNextBtn = host.querySelector("#otmSaveNext");
    const answerEl = host.querySelector("#otmAnswer");
    const panels = {
      graph: host.querySelector("#otmPanelGraph"),
      threats: host.querySelector("#otmPanelThreats"),
      json: host.querySelector("#otmPanelJson"),
      drill: host.querySelector("#otmPanelDrill"),
    };

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

    function nameOf(collection, id) {
      const row = (collection || []).find((x) => x.id === id);
      return row?.name || id;
    }

    function setTab(tab) {
      state.tab = tab;
      host.querySelectorAll(".otm-tab").forEach((btn) => {
        btn.classList.toggle("is-active", btn.dataset.tab === tab);
      });
      Object.entries(panels).forEach(([key, el]) => {
        el.classList.toggle("hidden", key !== tab);
      });
      if (tab === "graph" && state.model) {
        renderMermaid(state.model);
      }
    }

    async function renderMermaid(model) {
      if (!mermaidEl || !model) return;
      const source = modelToMermaid(model);
      mermaidStatus.textContent = "Rendering diagram…";
      mermaidEl.innerHTML = "";
      try {
        const mermaid = await loadMermaid();
        const renderId = `otm_${mermaidSafeId(model.id)}_${Date.now()}`;
        const { svg } = await mermaid.render(renderId, source);
        mermaidEl.innerHTML = svg;
        mermaidStatus.textContent = "Diagram from OTM components and dataflows.";
      } catch (err) {
        mermaidStatus.textContent =
          "Diagram unavailable (library or CSP). Use the text graph below.";
        mermaidEl.innerHTML = "";
        console.warn("OTM Mermaid render failed", err);
      }
    }

    function renderGraph(model) {
      const zoneMap = Object.fromEntries((model.trustZones || []).map((z) => [z.id, z.name]));
      graphEl.textContent = asciiGraph(model);
      renderMermaid(model);

      componentsEl.innerHTML = "";
      for (const c of model.components || []) {
        const li = document.createElement("li");
        li.textContent = `${c.name} (${c.type}) · ${zoneMap[c.trustZone] || c.trustZone || ""}`;
        componentsEl.appendChild(li);
      }
      assetsEl.innerHTML = "";
      for (const a of model.assets || []) {
        const li = document.createElement("li");
        const stores = (a.storedIn || []).map((id) => nameOf(model.components, id)).join(", ");
        li.textContent = `${a.name} · ${a.sensitivity || a.type}${stores ? ` · in ${stores}` : ""}`;
        assetsEl.appendChild(li);
      }
    }

    function renderThreats(model) {
      threatListEl.innerHTML = "";
      const ranked = [...(model.threats || [])].sort((a, b) => riskScore(b) - riskScore(a));
      for (const t of ranked) {
        const mits = (model.mitigations || []).filter((m) => (m.threats || []).includes(t.id));
        const div = document.createElement("div");
        div.className = "otm-threat-card";
        div.innerHTML = `
          <strong>${t.name}</strong>
          <small>score ${riskScore(t)} · L${t.risk?.likelihood ?? "?"} / I${t.risk?.impact ?? "?"} · ${(t.categories || []).join(", ")}</small>
          <p>${t.description || ""}</p>
          <p class="kpi-sub">Mitigations: ${
            mits.length ? mits.map((m) => m.name).join("; ") : "none linked"
          }</p>
        `;
        threatListEl.appendChild(div);
      }
    }

    function currentPrompt() {
      return state.model?.prompts?.[state.promptIndex] || null;
    }

    function paintDrill() {
      const prompt = currentPrompt();
      clearTimer();
      scoreCard.classList.add("hidden");
      answerEl.classList.add("hidden");
      answerEl.innerHTML = "";
      notesEl.value = "";
      startBtn.disabled = !prompt;
      stopBtn.disabled = true;
      skipBtn.disabled = !state.model?.prompts?.length;
      if (!prompt) {
        drillQuestion.textContent = "No prompts on this model.";
        drillProgress.textContent = "";
        timerEl.textContent = "0:00";
        return;
      }
      state.budget = prompt.seconds || 120;
      state.remaining = state.budget;
      timerEl.textContent = formatTime(state.remaining);
      timerEl.classList.remove("urgent");
      drillQuestion.textContent = prompt.title;
      drillProgress.textContent = `${state.promptIndex + 1} / ${state.model.prompts.length}`;
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
      stopBtn.disabled = true;
      startBtn.disabled = false;
      scoreCard.classList.remove("hidden");
      renderRubric();
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
      answerEl.classList.remove("hidden");
      if (typeof window.marked?.parse === "function") {
        answerEl.innerHTML = window.marked.parse(prompt.answerMarkdown || "");
      } else {
        answerEl.textContent = prompt.answerMarkdown || "";
      }
    }

    function saveAndNext() {
      const prompt = currentPrompt();
      if (!prompt || !state.model) return;
      const { scores, total } = readScores();
      const used = Math.max(0, state.budget - state.remaining);
      api.saveAttempt({
        modelId: state.model.id,
        promptId: prompt.id,
        title: prompt.title,
        relatedTopicIds: state.model.relatedTopicIds || [],
        scores,
        total,
        secondsUsed: used,
        secondsBudget: state.budget,
      });
      if (state.promptIndex < state.model.prompts.length - 1) {
        state.promptIndex += 1;
        paintDrill();
      } else {
        drillQuestion.textContent = "Drills finished for this model. Pick another model or review Threats.";
        scoreCard.classList.add("hidden");
        drillProgress.textContent = `${state.model.prompts.length} / ${state.model.prompts.length}`;
      }
    }

    function skipPrompt() {
      if (!state.model?.prompts?.length) return;
      clearTimer();
      state.promptIndex = (state.promptIndex + 1) % state.model.prompts.length;
      paintDrill();
    }

    function paintModel() {
      const model = state.model;
      if (!model) {
        metaEl.textContent = "";
        titleEl.textContent = "Pick a model";
        blurbEl.textContent = "";
        graphEl.textContent = "";
        if (mermaidEl) mermaidEl.innerHTML = "";
        if (mermaidStatus) mermaidStatus.textContent = "";
        componentsEl.innerHTML = "";
        assetsEl.innerHTML = "";
        threatListEl.innerHTML = "";
        jsonEl.textContent = "";
        paintDrill();
        return;
      }
      metaEl.textContent = `${model.difficulty} · ~${model.minutes} min · OTM ${model.otmVersion || ""}`;
      titleEl.textContent = model.title || model.project?.name || model.id;
      blurbEl.textContent = model.blurb || model.project?.description || "";
      renderGraph(model);
      renderThreats(model);
      jsonEl.textContent = JSON.stringify(model, null, 2);
      state.promptIndex = 0;
      paintDrill();
    }

    async function loadModel(modelId) {
      clearTimer();
      state.model = null;
      paintModel();
      if (!modelId) return;
      const entry = state.index.find((m) => m.id === modelId);
      const file = entry?.file || `${modelId}.json`;
      try {
        const res = await fetch(api.toAbsolute(`Config/otm/${file}`));
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        state.model = await res.json();
        paintModel();
      } catch {
        titleEl.textContent = "Could not load this model.";
      }
    }

    function loadCatalog(catalog, preferredId) {
      const models = Array.isArray(catalog?.models) ? catalog.models : [];
      state.index = models;
      if (catalog?.specUrl) {
        specLink.href = catalog.specUrl;
        specLink.classList.remove("hidden");
      }
      if (catalog?.externalLabUrl) {
        externalLink.href = catalog.externalLabUrl;
        externalLink.classList.remove("hidden");
      } else {
        externalLink.classList.add("hidden");
      }
      modelSelect.innerHTML = `<option value="">Choose a model</option>`;
      for (const m of models) {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = `${m.title} (${m.difficulty})`;
        modelSelect.appendChild(opt);
      }
      const pick = preferredId && models.some((m) => m.id === preferredId) ? preferredId : models[0]?.id || "";
      if (pick) {
        modelSelect.value = pick;
        loadModel(pick);
      }
    }

    function selectById(id) {
      if (!id) return;
      modelSelect.value = id;
      loadModel(id);
      setTab("graph");
    }

    host.querySelectorAll(".otm-tab").forEach((btn) => {
      btn.addEventListener("click", () => setTab(btn.dataset.tab));
    });
    modelSelect.addEventListener("change", () => loadModel(modelSelect.value));
    startBtn.addEventListener("click", startTimer);
    stopBtn.addEventListener("click", openScoring);
    skipBtn.addEventListener("click", skipPrompt);
    revealBtn.addEventListener("click", revealAnswer);
    saveNextBtn.addEventListener("click", saveAndNext);

    return {
      loadCatalog,
      selectById,
      destroy() {
        clearTimer();
        host.classList.remove("otm-shell");
        host.innerHTML = "";
      },
    };
  }

  window.OtmLab = {
    create: createOtm,
    scoreLabel,
    nextAction,
    modelToMermaid,
  };
})();
