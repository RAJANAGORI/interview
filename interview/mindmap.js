(function () {
  const FONT_STACK = '"Source Sans 3", system-ui, sans-serif';
  const DESKTOP_MQ = "(min-width: 821px)";

  let measureCtx = null;

  function isDesktop() {
    return window.matchMedia(DESKTOP_MQ).matches;
  }

  function isCoarsePointer() {
    return window.matchMedia("(pointer: coarse)").matches;
  }

  function layoutMetrics() {
    const desktop = isDesktop();
    const coarse = isCoarsePointer();
    return {
      desktop,
      coarse,
      NODE_W: desktop ? 268 : 232,
      NODE_H: desktop ? 44 : 48,
      GAP_X: desktop ? 56 : 44,
      GAP_Y: desktop ? 16 : 14,
      PAD_X: 14,
      PAD_Y: desktop ? 11 : 12,
      LINE_H: desktop ? 16 : 17,
      BLURB_H: 14,
      DOT_RESERVE: 18,
      MAX_LINES: desktop ? 4 : 3,
      MAX_BLURB_LINES: desktop ? 2 : 1,
      PLUS_R: coarse ? 12 : 9,
      PLUS_HIT: coarse ? 22 : 14,
    };
  }

  function textWidth(text, font) {
    if (!measureCtx) measureCtx = document.createElement("canvas").getContext("2d");
    measureCtx.font = font;
    return measureCtx.measureText(text).width;
  }

  function nodeFont(depth, desktop) {
    if (depth === 0) return `${desktop ? 13 : 14}px ${FONT_STACK}`;
    if (depth === 1) return `${desktop ? 12 : 13}px ${FONT_STACK}`;
    return `12px ${FONT_STACK}`;
  }

  function blurbFont() {
    return `11px ${FONT_STACK}`;
  }

  function splitToken(token, textMax) {
    if (textWidth(token, `12px ${FONT_STACK}`) <= textMax) return [token];
    const parts = token.split(/(?=[/?&=._-])/).filter(Boolean);
    return parts.length > 1 ? parts : [token];
  }

  function hardWrap(text, font, textMax) {
    if (textWidth(text, font) <= textMax) return [text];
    const out = [];
    let buf = "";
    for (const ch of text) {
      if (buf && textWidth(buf + ch, font) > textMax) {
        out.push(buf);
        buf = ch;
      } else {
        buf += ch;
      }
    }
    if (buf) out.push(buf);
    return out;
  }

  function wrapTitle(title, font, textMax, maxLines) {
    const tokens = String(title || "")
      .trim()
      .split(/\s+/)
      .flatMap((t) => splitToken(t, textMax));
    const lines = [];
    let line = "";
    for (const w of tokens) {
      const next = line ? `${line} ${w}` : w;
      if (line && textWidth(next, font) > textMax) {
        lines.push(...hardWrap(line, font, textMax));
        line = w;
      } else {
        line = next;
      }
    }
    if (line) lines.push(...hardWrap(line, font, textMax));
    return lines.slice(0, maxLines);
  }

  const TEMPLATE = `
    <div class="xm-main">
      <header class="xm-bar">
        <div class="xm-tools">
          <button type="button" id="toolUndo" title="Undo collapse" aria-label="Undo">Undo</button>
          <button type="button" id="toolRedo" title="Redo" aria-label="Redo">Redo</button>
          <span class="xm-sep xm-desk-only" aria-hidden="true"></span>
          <button type="button" id="toolHand" class="on xm-desk-only" title="Pan the map">Hand</button>
          <button type="button" id="toolPointer" class="xm-desk-only" title="Select nodes">Pointer</button>
          <span class="xm-sep" aria-hidden="true"></span>
          <button type="button" id="outlinerBtn" title="Browse the outline">Outline</button>
          <button type="button" id="notesBtn" class="xm-mobile-only" title="Open notes">Notes</button>
          <div class="xm-zoom">
            <button type="button" id="zoomOut" aria-label="Zoom out">-</button>
            <span id="zoomLabel">100%</span>
            <button type="button" id="zoomIn" aria-label="Zoom in">+</button>
          </div>
        </div>
        <a id="xmindDownload" class="xm-dl" download>Open in Xmind</a>
      </header>
      <p class="xm-hint" id="mapHint">
        <strong>Map first.</strong> Select a branch to read the guide.
        <span class="xm-hint-extra"> Drag to pan · scroll or pinch to zoom · + expands a branch.</span>
      </p>
      <div id="canvasWrap" class="xm-canvas" role="application" aria-label="Logic chart canvas">
        <svg id="mapSvg" xmlns="http://www.w3.org/2000/svg"></svg>
        <aside id="outliner" class="xm-outliner" hidden>
          <header>
            <h2>Outline</h2>
            <button type="button" id="closeOutliner">Close</button>
          </header>
          <div id="outlinerList"></div>
        </aside>
      </div>
      <section id="noteDock" class="xm-note-dock is-peek" aria-live="polite">
        <div class="xm-dock-handle" aria-hidden="true"></div>
        <div class="xm-dock-head">
          <div class="xm-dock-head-text">
            <p class="xm-note-kicker">From the guide</p>
            <h2 id="noteDockTitle">Select a branch</h2>
            <p id="notePath" class="xm-path" hidden></p>
            <span id="contextChip" class="xm-chip" hidden></span>
          </div>
          <button type="button" id="dockToggle" class="xm-dock-toggle" aria-expanded="false" title="Expand or collapse notes">Expand</button>
        </div>
        <div class="xm-note-scroll">
          <div id="noteDockBody" class="xm-note-body"></div>
          <div id="chatLog" class="xm-chat" hidden></div>
          <form id="askForm" class="xm-ask">
            <div class="xm-ask-box">
              <textarea id="askInput" rows="2" placeholder="Search this chart" autocomplete="off"></textarea>
              <div class="xm-ask-row">
                <select id="askMode" aria-label="Search style">
                  <option value="balanced">Find nodes</option>
                  <option value="notes">Explain</option>
                  <option value="short">Titles only</option>
                </select>
                <button type="submit" class="xm-send">Find</button>
              </div>
            </div>
          </form>
        </div>
      </section>
    </div>
  `;

  let active = null;

  function freshState() {
    return {
      tree: null,
      selectedId: null,
      tool: "hand",
      scale: 1,
      tx: 48,
      ty: 40,
      dragging: false,
      lastX: 0,
      lastY: 0,
      history: [],
      future: [],
      dockOpen: false,
      pinch: null,
    };
  }

  function findNode(state, id, node = state.tree) {
    if (!node) return null;
    if (node.id === id) return node;
    for (const child of node.children || []) {
      const hit = findNode(state, id, child);
      if (hit) return hit;
    }
    return null;
  }

  function findPath(root, id, trail = []) {
    if (!root) return null;
    const next = trail.concat(root);
    if (root.id === id) return next;
    for (const child of root.children || []) {
      const hit = findPath(child, id, next);
      if (hit) return hit;
    }
    return null;
  }

  function expandMap(node, acc = {}) {
    acc[node.id] = !!node.expanded;
    for (const child of node.children || []) expandMap(child, acc);
    return acc;
  }

  function applyExpand(node, map) {
    if (Object.prototype.hasOwnProperty.call(map, node.id)) node.expanded = map[node.id];
    for (const child of node.children || []) applyExpand(child, map);
  }

  function measure(node, depth, m) {
    const textMax = m.NODE_W - m.PAD_X - m.DOT_RESERVE;
    const showBlurb =
      !!String(node.blurb || "").trim() &&
      (depth <= 1 || (m.desktop && depth <= 2));
    node._lines = wrapTitle(
      node.title,
      nodeFont(depth, m.desktop),
      textMax,
      m.MAX_LINES
    );
    node._blurbLines = showBlurb
      ? wrapTitle(String(node.blurb || "").trim(), blurbFont(), textMax, m.MAX_BLURB_LINES)
      : [];
    const titleH = node._lines.length * m.LINE_H;
    const blurbBlock = node._blurbLines.length
      ? 4 + node._blurbLines.length * m.BLURB_H
      : 0;
    node._boxH = Math.max(m.NODE_H, m.PAD_Y * 2 + titleH + blurbBlock);
    const kids = node.expanded ? node.children || [] : [];
    if (!kids.length) {
      node._h = node._boxH;
      return node._h;
    }
    let h = 0;
    kids.forEach((child, i) => {
      h += measure(child, depth + 1, m);
      if (i < kids.length - 1) h += m.GAP_Y;
    });
    node._h = Math.max(node._boxH, h);
    return node._h;
  }

  function place(node, x, y, m) {
    const kids = node.expanded ? node.children || [] : [];
    node._x = x;
    if (!kids.length) {
      node._y = y;
      return;
    }
    let cy = y;
    kids.forEach((child, i) => {
      place(child, x + m.NODE_W + m.GAP_X, cy, m);
      cy += child._h + (i < kids.length - 1 ? m.GAP_Y : 0);
    });
    const first = kids[0];
    const last = kids[kids.length - 1];
    node._y = (first._y + last._y) / 2;
  }

  function nodeClass(node, depth) {
    if (node.kind === "note") return "node-note";
    if (depth === 0) return "node-root";
    if (depth === 1) return "node-main";
    if (depth >= 3) return "node-leaf";
    return "node-sub";
  }

  function curve(x1, y1, x2, y2) {
    const mx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
  }

  function renderNotes(node, body) {
    body.replaceChildren();
    let raw = (node.markdown || node.notes || "").trim();
    if (!raw) {
      const titles = (node.children || [])
        .map((c) => (c.title || "").trim())
        .filter(Boolean);
      if (!titles.length) {
        const p = document.createElement("p");
        p.className = "xm-empty-note";
        p.textContent = "This branch is a folder. Expand it on the map, or pick a child in Outline.";
        body.appendChild(p);
        return false;
      }
      raw = titles.map((t) => `- ${t}`).join("\n");
    }
    if (typeof window.marked?.parse === "function") {
      body.innerHTML = window.marked.parse(raw);
      if (window.hljs) {
        body.querySelectorAll("pre code").forEach((block) => window.hljs.highlightElement(block));
      }
      return true;
    }
    const p = document.createElement("p");
    p.textContent = raw;
    body.appendChild(p);
    return true;
  }

  function createChart(host, opts) {
    const state = freshState();
    const ac = new AbortController();
    const on = (el, ev, fn, extra) => {
      if (!el) return;
      el.addEventListener(ev, fn, { ...(extra || {}), signal: ac.signal });
    };

    host.classList.add("logic-shell");
    host.innerHTML = TEMPLATE;

    const svg = host.querySelector("#mapSvg");
    const wrap = host.querySelector("#canvasWrap");
    const chatLog = host.querySelector("#chatLog");
    const chip = host.querySelector("#contextChip");
    const pathEl = host.querySelector("#notePath");
    const xmindDownload = host.querySelector("#xmindDownload");
    const zoomLabel = host.querySelector("#zoomLabel");
    const outliner = host.querySelector("#outliner");
    const outlinerList = host.querySelector("#outlinerList");
    const noteDock = host.querySelector("#noteDock");
    const dockToggle = host.querySelector("#dockToggle");
    const mapHint = host.querySelector("#mapHint");

    function syncHint() {
      if (!mapHint) return;
      if (isDesktop()) {
        mapHint.innerHTML =
          "<strong>Map first.</strong> Select a branch to read the guide." +
          '<span class="xm-hint-extra"> Drag to pan · scroll to zoom · + expands a branch.</span>';
      } else {
        mapHint.innerHTML =
          "<strong>Map first.</strong> Tap a branch to open notes." +
          '<span class="xm-hint-extra"> Drag to pan · pinch to zoom.</span>';
      }
    }

    function setDockOpen(open) {
      state.dockOpen = !!open;
      if (!noteDock) return;
      noteDock.classList.toggle("is-open", state.dockOpen);
      noteDock.classList.toggle("is-peek", !state.dockOpen);
      if (dockToggle) {
        dockToggle.textContent = state.dockOpen ? "Collapse" : "Expand";
        dockToggle.setAttribute("aria-expanded", state.dockOpen ? "true" : "false");
      }
    }

    function snapshot() {
      if (!state.tree) return;
      state.history.push(JSON.stringify(expandMap(state.tree)));
      if (state.history.length > 40) state.history.shift();
      state.future = [];
    }

    function fillNoteDock(node) {
      const title = host.querySelector("#noteDockTitle");
      const body = host.querySelector("#noteDockBody");
      if (!title || !body) return;
      title.textContent = node.title;
      const trail = findPath(state.tree, node.id) || [];
      if (pathEl) {
        if (trail.length > 1) {
          pathEl.hidden = false;
          pathEl.textContent = trail.map((n) => n.title).join(" › ");
        } else {
          pathEl.hidden = true;
          pathEl.textContent = "";
        }
      }
      renderNotes(node, body);
    }

    function focusNode(node, m) {
      if (!wrap || !node) return;
      const vw = wrap.clientWidth || 1;
      const vh = wrap.clientHeight || 1;
      const dockReserve = !isDesktop() && state.dockOpen ? Math.min(vh * 0.45, 320) : 0;
      const usableH = Math.max(120, vh - dockReserve);
      const cx = node._x * state.scale + state.tx + (m.NODE_W * state.scale) / 2;
      const cy = node._y * state.scale + state.ty + ((node._boxH || m.NODE_H) * state.scale) / 2;
      const targetX = vw * 0.38;
      const targetY = usableH * 0.42;
      state.tx += targetX - cx;
      state.ty += targetY - cy;
    }

    function renderOutliner() {
      if (!outlinerList || !state.tree) return;
      outlinerList.replaceChildren();
      function add(node, depth) {
        const b = document.createElement("button");
        b.className = "ol-item" + (state.selectedId === node.id ? " is-sel" : "");
        b.style.paddingLeft = `${8 + depth * 14}px`;
        b.textContent = node.title;
        b.addEventListener("click", () => {
          selectNode(node, { openDock: true, focus: true });
          outliner.hidden = true;
        });
        outlinerList.appendChild(b);
        if (node.expanded) (node.children || []).forEach((c) => add(c, depth + 1));
      }
      add(state.tree, 0);
    }

    function render() {
      if (!state.tree) return;
      const m = layoutMetrics();
      measure(state.tree, 0, m);
      place(state.tree, 20, 20, m);
      const ns = "http://www.w3.org/2000/svg";
      svg.replaceChildren();
      const g = document.createElementNS(ns, "g");
      g.setAttribute("transform", `translate(${state.tx} ${state.ty}) scale(${state.scale})`);
      svg.appendChild(g);
      const links = document.createElementNS(ns, "g");
      const nodes = document.createElementNS(ns, "g");
      g.append(links, nodes);

      function linkTo(parent, node) {
        const path = document.createElementNS(ns, "path");
        path.setAttribute("class", "link");
        const y1 = parent._y + (parent._boxH || m.NODE_H) / 2;
        const y2 = node._y + (node._boxH || m.NODE_H) / 2;
        path.setAttribute("d", curve(parent._x + m.NODE_W, y1, node._x, y2));
        links.appendChild(path);
      }

      function draw(node, depth) {
        const gNode = document.createElementNS(ns, "g");
        gNode.setAttribute(
          "class",
          `${nodeClass(node, depth)}${state.selectedId === node.id ? " node-sel" : ""}`
        );
        gNode.setAttribute("transform", `translate(${node._x} ${node._y})`);
        gNode.style.cursor = "pointer";
        const lines = node._lines || [];
        const blurbLines = node._blurbLines || [];
        const h = node._boxH || m.NODE_H;
        const rect = document.createElementNS(ns, "rect");
        rect.setAttribute("width", m.NODE_W);
        rect.setAttribute("height", h);
        rect.setAttribute("rx", depth === 0 ? 12 : 10);
        gNode.appendChild(rect);
        lines.forEach((line, i) => {
          const t = document.createElementNS(ns, "text");
          t.setAttribute("x", m.PAD_X);
          t.setAttribute("y", m.PAD_Y + m.LINE_H / 2 + i * m.LINE_H);
          t.setAttribute("dominant-baseline", "middle");
          t.setAttribute("font-size", depth === 0 ? (m.desktop ? "13" : "14") : "12");
          t.setAttribute("font-family", "Source Sans 3, system-ui, sans-serif");
          t.setAttribute("font-weight", depth <= 1 ? "600" : "500");
          t.textContent = line;
          gNode.appendChild(t);
        });
        blurbLines.forEach((line, i) => {
          const t = document.createElementNS(ns, "text");
          t.setAttribute("class", "node-blurb");
          t.setAttribute("x", m.PAD_X);
          t.setAttribute(
            "y",
            m.PAD_Y + lines.length * m.LINE_H + 4 + m.BLURB_H / 2 + i * m.BLURB_H
          );
          t.setAttribute("dominant-baseline", "middle");
          t.setAttribute("font-size", "11");
          t.setAttribute("font-family", "Source Sans 3, system-ui, sans-serif");
          t.textContent = line;
          gNode.appendChild(t);
        });
        if ((node.markdown || node.notes || "").trim()) {
          const dot = document.createElementNS(ns, "circle");
          dot.setAttribute("class", "note-dot");
          dot.setAttribute("cx", m.NODE_W - 10);
          dot.setAttribute("cy", 10);
          dot.setAttribute("r", 4);
          gNode.appendChild(dot);
        }
        gNode.addEventListener("click", (ev) => {
          ev.stopPropagation();
          selectNode(node, { openDock: true, focus: true });
        });
        nodes.appendChild(gNode);

        const kids = node.children || [];
        if (kids.length) {
          const cx = node._x + m.NODE_W + 12;
          const cy = node._y + h / 2;
          const hit = document.createElementNS(ns, "circle");
          hit.setAttribute("class", "plus-hit");
          hit.setAttribute("cx", cx);
          hit.setAttribute("cy", cy);
          hit.setAttribute("r", m.PLUS_HIT);
          hit.addEventListener("click", (ev) => {
            ev.stopPropagation();
            snapshot();
            node.expanded = !node.expanded;
            render();
          });
          nodes.appendChild(hit);
          const plus = document.createElementNS(ns, "circle");
          plus.setAttribute("class", "plus");
          plus.setAttribute("cx", cx);
          plus.setAttribute("cy", cy);
          plus.setAttribute("r", m.PLUS_R);
          plus.style.pointerEvents = "none";
          nodes.appendChild(plus);
          const mark = document.createElementNS(ns, "text");
          mark.setAttribute("class", "plus-fg");
          mark.setAttribute("x", cx);
          mark.setAttribute("y", cy + 1);
          mark.setAttribute("text-anchor", "middle");
          mark.setAttribute("dominant-baseline", "middle");
          mark.textContent = node.expanded ? "-" : "+";
          nodes.appendChild(mark);
        }
        if (node.expanded) {
          for (const child of kids) {
            linkTo(node, child);
            draw(child, depth + 1);
          }
        }
      }

      draw(state.tree, 0);
      if (zoomLabel) zoomLabel.textContent = `${Math.round(state.scale * 100)}%`;
      renderOutliner();
    }

    function selectNode(node, optsSel = {}) {
      state.selectedId = node.id;
      if (chip) {
        chip.hidden = false;
        chip.textContent = node.title;
      }
      fillNoteDock(node);
      if (optsSel.openDock && !isDesktop()) setDockOpen(true);
      const m = layoutMetrics();
      if (optsSel.focus) {
        measure(state.tree, 0, m);
        place(state.tree, 20, 20, m);
        focusNode(node, m);
      }
      render();
    }

    function bot(text) {
      if (!chatLog) return;
      chatLog.hidden = false;
      const div = document.createElement("div");
      div.className = "msg bot";
      div.textContent = text;
      chatLog.appendChild(div);
      chatLog.scrollTop = chatLog.scrollHeight;
    }

    function collect(node, acc = []) {
      acc.push(node);
      for (const child of node.children || []) collect(child, acc);
      return acc;
    }

    function searchNodes(q) {
      const needle = q.toLowerCase();
      return collect(state.tree).filter((n) => {
        const blob = `${n.title}\n${n.notes || ""}\n${n.markdown || ""}`.toLowerCase();
        return blob.includes(needle);
      });
    }

    function answer(q) {
      const mode = host.querySelector("#askMode")?.value || "balanced";
      const hits = searchNodes(q);
      if (!hits.length) {
        bot(`No node matched "${q}". Try a heading word from the map.`);
        return;
      }
      const first = hits[0];
      first.expanded = true;
      selectNode(first, { openDock: true, focus: true });
      if (mode === "short") {
        bot(hits.slice(0, 8).map((h) => h.title).join("\n"));
        return;
      }
      if (mode === "notes") {
        const withNotes = hits.filter((h) => h.notes).slice(0, 2);
        bot(withNotes.map((h) => `${h.title}\n\n${h.notes}`).join("\n\n---\n\n") || first.title);
        return;
      }
      bot(
        `Found ${hits.length} matches. Opened "${first.title}".\n` +
          hits.slice(0, 8).map((h) => `- ${h.title}`).join("\n")
      );
    }

    function setTool(name) {
      state.tool = name;
      host.querySelector("#toolHand")?.classList.toggle("on", name === "hand");
      host.querySelector("#toolPointer")?.classList.toggle("on", name === "pointer");
      wrap.classList.toggle("pointer", name === "pointer");
    }

    function canPan(ev) {
      if (!isDesktop()) return true;
      if (state.tool !== "hand") return false;
      const cls = ev.target.getAttribute?.("class") || "";
      if (cls.includes("plus")) return false;
      return true;
    }

    on(wrap, "pointerdown", (ev) => {
      if (ev.pointerType === "touch" && wrap._activePointers) {
        wrap._activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
        if (wrap._activePointers.size === 2) {
          const pts = [...wrap._activePointers.values()];
          const dx = pts[0].x - pts[1].x;
          const dy = pts[0].y - pts[1].y;
          state.pinch = {
            dist: Math.hypot(dx, dy),
            scale: state.scale,
          };
          state.dragging = false;
          return;
        }
      } else if (ev.pointerType === "touch") {
        wrap._activePointers = new Map([[ev.pointerId, { x: ev.clientX, y: ev.clientY }]]);
      }

      if (!canPan(ev)) return;
      state.dragging = true;
      state.lastX = ev.clientX;
      state.lastY = ev.clientY;
      wrap.classList.add("panning");
      try {
        wrap.setPointerCapture(ev.pointerId);
      } catch (_) {
        /* ignore */
      }
    });

    on(wrap, "pointermove", (ev) => {
      if (wrap._activePointers?.has(ev.pointerId)) {
        wrap._activePointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      }
      if (state.pinch && wrap._activePointers && wrap._activePointers.size >= 2) {
        const pts = [...wrap._activePointers.values()];
        const dx = pts[0].x - pts[1].x;
        const dy = pts[0].y - pts[1].y;
        const dist = Math.hypot(dx, dy) || 1;
        const next = state.pinch.scale * (dist / (state.pinch.dist || dist));
        state.scale = Math.min(2.4, Math.max(0.32, next));
        render();
        return;
      }
      if (!state.dragging) return;
      state.tx += ev.clientX - state.lastX;
      state.ty += ev.clientY - state.lastY;
      state.lastX = ev.clientX;
      state.lastY = ev.clientY;
      render();
    });

    function endPointer(ev) {
      wrap._activePointers?.delete(ev.pointerId);
      if (!wrap._activePointers || wrap._activePointers.size < 2) state.pinch = null;
      state.dragging = false;
      wrap.classList.remove("panning");
    }
    on(wrap, "pointerup", endPointer);
    on(wrap, "pointercancel", endPointer);

    on(
      wrap,
      "wheel",
      (ev) => {
        ev.preventDefault();
        const next = ev.deltaY < 0 ? state.scale * 1.08 : state.scale / 1.08;
        state.scale = Math.min(2.4, Math.max(0.32, next));
        render();
      },
      { passive: false }
    );

    on(host.querySelector("#toolHand"), "click", () => setTool("hand"));
    on(host.querySelector("#toolPointer"), "click", () => setTool("pointer"));
    on(host.querySelector("#zoomIn"), "click", () => {
      state.scale = Math.min(2.4, state.scale * 1.12);
      render();
    });
    on(host.querySelector("#zoomOut"), "click", () => {
      state.scale = Math.max(0.32, state.scale / 1.12);
      render();
    });
    on(host.querySelector("#toolUndo"), "click", () => {
      const prev = state.history.pop();
      if (!prev || !state.tree) return;
      state.future.push(JSON.stringify(expandMap(state.tree)));
      applyExpand(state.tree, JSON.parse(prev));
      render();
    });
    on(host.querySelector("#toolRedo"), "click", () => {
      const next = state.future.pop();
      if (!next || !state.tree) return;
      state.history.push(JSON.stringify(expandMap(state.tree)));
      applyExpand(state.tree, JSON.parse(next));
      render();
    });
    on(host.querySelector("#outlinerBtn"), "click", () => {
      outliner.hidden = !outliner.hidden;
    });
    on(host.querySelector("#closeOutliner"), "click", () => {
      outliner.hidden = true;
    });
    on(host.querySelector("#notesBtn"), "click", () => {
      setDockOpen(!state.dockOpen);
    });
    on(dockToggle, "click", () => setDockOpen(!state.dockOpen));
    on(noteDock?.querySelector(".xm-dock-handle"), "click", () => setDockOpen(!state.dockOpen));
    on(host.querySelector("#askForm"), "submit", (ev) => {
      ev.preventDefault();
      const q = host.querySelector("#askInput")?.value.trim();
      if (!q) return;
      host.querySelector("#askInput").value = "";
      if (!isDesktop()) setDockOpen(true);
      answer(q);
    });

    const mq = window.matchMedia(DESKTOP_MQ);
    const onMq = () => {
      syncHint();
      if (isDesktop()) {
        noteDock?.classList.remove("is-peek", "is-open");
        state.dockOpen = true;
      } else {
        setDockOpen(!!state.selectedId && state.selectedId !== state.tree?.id);
      }
      render();
    };
    if (mq.addEventListener) on(mq, "change", onMq);
    else mq.addListener(onMq);

    const ro = new ResizeObserver(() => render());
    ro.observe(wrap);

    if (opts.xmindUrl) {
      xmindDownload.href = opts.xmindUrl;
      xmindDownload.setAttribute("download", `${opts.topicId || "topic"}.xmind`);
    } else {
      xmindDownload.hidden = true;
    }

    syncHint();
    if (isDesktop()) {
      noteDock?.classList.remove("is-peek", "is-open");
    } else {
      setDockOpen(false);
    }

    async function load() {
      const res = await fetch(opts.jsonUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      state.tree = await res.json();
      state.selectedId = state.tree.id;
      if (chip) {
        chip.hidden = false;
        chip.textContent = state.tree.title;
      }
      fillNoteDock(state.tree);
      render();
      // Center root on first paint
      const m = layoutMetrics();
      measure(state.tree, 0, m);
      place(state.tree, 20, 20, m);
      focusNode(state.tree, m);
      render();
    }

    return {
      load,
      unmount() {
        ac.abort();
        ro.disconnect();
        host.classList.remove("logic-shell");
      },
    };
  }

  window.LogicChart = {
    async mount(host, opts) {
      this.unmount();
      const chart = createChart(host, opts || {});
      active = chart;
      try {
        await chart.load();
      } catch (err) {
        host.innerHTML = `<p class="xm-error">Could not load this logic chart. ${err.message}</p>`;
        throw err;
      }
      return chart;
    },
    unmount() {
      if (!active) return;
      active.unmount();
      active = null;
    },
  };
})();
