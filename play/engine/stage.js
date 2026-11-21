/* Isometric stage for the security course.
 * Scenes are plain objects: { entities: {id: ent}, links: {id: link}, flows: [flow] }.
 * Grid (x, y) projects to screen as [14(x + y), 7(x - y) - z]: +y runs up-right, +x runs down-right.
 */
(function (global) {
  "use strict";

  const NS = "http://www.w3.org/2000/svg";
  const ICONS = global.SD_ICONS || {};
  const STAGES = new Set();

  const THEMES = {
    dark: {
      ink: "#f2f0ec",
      shade: "#000000",
      colors: {
        blue: { top: ["#d7e6f8", "#9dbde6"], side: ["#7aa0d4", "#4f74ad"] },
        orange: { top: ["#ffd7a8", "#ff8c00"], side: ["#e67a00", "#b35f00"] },
        green: { top: ["#d4f0c4", "#8fd07a"], side: ["#6fbf5a", "#458a38"] },
        purple: { top: ["#e4d8f8", "#b9a3e6"], side: ["#9680d0", "#6f5aa8"] },
        yellow: { top: ["#ffe7a8", "#f0c44a"], side: ["#d9a82e", "#a87e18"] },
        red: { top: ["#f8c8c0", "#e88878"], side: ["#d06050", "#a04038"] },
        teal: { top: ["#c8eee6", "#7ecfc0"], side: ["#55b0a0", "#3a887c"] },
        slab: { top: ["#3a3a3a", "#2a2a2a"], side: ["#222222", "#181818"] },
        gray: { top: ["#454545", "#333333"], side: ["#2c2c2c", "#1f1f1f"] },
        dark: { top: ["#2a2a2a", "#1a1a1a"], side: ["#151515", "#0f0f0f"] },
      },
      packets: {
        req: { fill: "#8eb4e8", shape: "dot" },
        mine: { fill: "#b8a0e8", shape: "dot" },
        res: { fill: "#8fd07a", shape: "dot" },
        poison: { fill: "#f87171", shape: "square" },
        empty: { fill: "#2a2a2a", shape: "dot" },
        write: { fill: "#ff8c00", shape: "square" },
        secret: { fill: "#f6cd70", shape: "diamond" },
        ping: { fill: "#6ec8e6", shape: "small" },
        slow: { fill: "#f3b47f", shape: "dot" },
      },
      screen: { violet: "#b9a3e6", red: "#e88878", green: "#8fd07a", blue: "#8eb4e8", dark: "#1a1a1a" },
      link: { red: "#f87171", green: "#4ade80", muted: "rgba(242,240,236,0.35)" },
      bar: { green: "#4ade80", amber: "#ff8c00", red: "#f87171", gray: "rgba(242,240,236,0.35)", violet: "#c4b5fd", blue: "#93c5fd" },
      ui: {
        dim: "#141414",
        card: "#1c1c1c",
        cardStroke: "rgba(255,255,255,0.14)",
        track: "#1a1a1a",
        divider: "rgba(255,255,255,0.1)",
        mutedText: "rgba(242,240,236,0.68)",
        subText: "rgba(242,240,236,0.62)",
        softText: "rgba(242,240,236,0.55)",
        bodyText: "#f2f0ec",
        titleMuted: "rgba(242,240,236,0.68)",
        accent: "#ff8c00",
        goodBg: "rgba(74,222,128,0.18)",
        goodFg: "#4ade80",
        badBg: "rgba(248,113,113,0.2)",
        badFg: "#f87171",
        dead: "#555555",
        person: "#3a3a3a",
        crowdStroke: "#1a1a1a",
        keycap: "#2a2a2a",
        pad: "#333333",
        laptopBack: "#0f0f0f",
        laptopBezel: "#252525",
        grid: "#ff8c00",
        gridOpacity: ".16",
        zoneGrayFill: "rgba(255,255,255,0.06)",
        zoneGrayStroke: "rgba(242,240,236,0.35)",
        zoneGrayText: "rgba(242,240,236,0.68)",
        paperBg: "#252525",
        paperFg: "#f2f0ec",
        toneRedBg: "rgba(248,113,113,0.18)", toneRedFg: "#f87171",
        toneGreenBg: "rgba(74,222,128,0.18)", toneGreenFg: "#4ade80",
        toneAmberBg: "rgba(255,140,0,0.18)", toneAmberFg: "#ff8c00",
        toneVioletBg: "rgba(196,181,253,0.18)", toneVioletFg: "#c4b5fd",
        toneGrayBg: "rgba(255,255,255,0.08)", toneGrayFg: "rgba(242,240,236,0.78)",
        toneBlueBg: "rgba(147,197,253,0.18)", toneBlueFg: "#93c5fd",
      },
    },
    light: {
      ink: "#1f1b16",
      shade: "#5b4630",
      colors: {
        blue: { top: ["#e3edf9", "#bcd2ee"], side: ["#a3c0e6", "#7d9fcf"] },
        orange: { top: ["#fde2c4", "#f7c08e"], side: ["#f2a96b", "#d9874a"] },
        green: { top: ["#e2f1d6", "#bfe0ab"], side: ["#a6d18f", "#84b56f"] },
        purple: { top: ["#ece3f8", "#cdbdea"], side: ["#b4a0df", "#9580c7"] },
        yellow: { top: ["#fcedc2", "#f5d585"], side: ["#efc466", "#d6a443"] },
        red: { top: ["#fadcd5", "#f1b2a6"], side: ["#e8907f", "#cc6a5c"] },
        teal: { top: ["#d9f1ec", "#ade0d5"], side: ["#88cbbd", "#64ad9f"] },
        slab: { top: ["#fdf9f2", "#eee5d6"], side: ["#e3d7c5", "#cbbca6"] },
        gray: { top: ["#f0ece6", "#dbd4ca"], side: ["#c8c0b4", "#aea495"] },
        dark: { top: ["#6a6259", "#4f4841"], side: ["#433d37", "#2f2a25"] },
      },
      packets: {
        req: { fill: "#a9c5e8", shape: "dot" },
        mine: { fill: "#c9b8ea", shape: "dot" },
        res: { fill: "#b5d9a1", shape: "dot" },
        poison: { fill: "#e5574d", shape: "square" },
        empty: { fill: "#b7aea3", shape: "dot" },
        write: { fill: "#f0b445", shape: "square" },
        secret: { fill: "#f6cd70", shape: "diamond" },
        ping: { fill: "#8fd0e6", shape: "small" },
        slow: { fill: "#f3b47f", shape: "dot" },
      },
      screen: { violet: "#d8ccf2", red: "#f4c1b8", green: "#cfe8c2", blue: "#cfe0f5", dark: "#4a443d" },
      link: { red: "#c0392b", green: "#3d7a33", muted: "#a59c90" },
      bar: { green: "#9fd28f", amber: "#efb041", red: "#e5534b", gray: "#b5ab9e", violet: "#cbbae6", blue: "#a9c5e8" },
      ui: {
        dim: "#f6efe4",
        card: "#fcf9f3",
        cardStroke: "#2b2621",
        track: "#f1e8db",
        divider: "#e6ddd0",
        mutedText: "#6f6961",
        subText: "#4f4840",
        softText: "#8b847a",
        bodyText: "#34302b",
        titleMuted: "#6f6961",
        accent: "#e67a00",
        goodBg: "#ddefd3",
        goodFg: "#25501d",
        badBg: "#f9d7d0",
        badFg: "#8c2a21",
        dead: "#b9b2a8",
        person: "#fdf6ec",
        crowdStroke: "#3b3631",
        keycap: "#7b736a",
        pad: "#8a8178",
        laptopBack: "#1f1b17",
        laptopBezel: "#3a352f",
        grid: "#ae9672",
        gridOpacity: ".28",
        zoneGrayFill: "#fffaf2",
        zoneGrayStroke: "#2b2621",
        zoneGrayText: "#6f6961",
        paperBg: "#fcf8f1",
        paperFg: "#2b2621",
        toneRedBg: "#f9d7d0", toneRedFg: "#8c2a21",
        toneGreenBg: "#ddefd3", toneGreenFg: "#25501d",
        toneAmberBg: "#fbe6bf", toneAmberFg: "#6b480d",
        toneVioletBg: "#e8def5", toneVioletFg: "#45306c",
        toneGrayBg: "#ece6dd", toneGrayFg: "#5d564e",
        toneBlueBg: "#dce8f7", toneBlueFg: "#1f3d6b",
      },
    },
  };

  let themeName = "dark";
  let INK = THEMES.dark.ink;
  let SHADE = THEMES.dark.shade;
  let COLORS = THEMES.dark.colors;
  let PACKETS = THEMES.dark.packets;
  let SCREEN = THEMES.dark.screen;
  let LINK_TONE = { ink: THEMES.dark.ink, ...THEMES.dark.link };
  let BAR_TONES = { ...THEMES.dark.bar };
  let UI = THEMES.dark.ui;
  let TONES = {
    paper: { bg: UI.paperBg, fg: UI.paperFg },
    red: { bg: UI.toneRedBg, fg: UI.toneRedFg },
    green: { bg: UI.toneGreenBg, fg: UI.toneGreenFg },
    amber: { bg: UI.toneAmberBg, fg: UI.toneAmberFg },
    violet: { bg: UI.toneVioletBg, fg: UI.toneVioletFg },
    gray: { bg: UI.toneGrayBg, fg: UI.toneGrayFg },
    blue: { bg: UI.toneBlueBg, fg: UI.toneBlueFg },
  };

  function syncThemeRefs(name) {
    const t = THEMES[name] || THEMES.dark;
    themeName = THEMES[name] ? name : "dark";
    INK = t.ink;
    SHADE = t.shade;
    COLORS = t.colors;
    PACKETS = t.packets;
    SCREEN = t.screen;
    LINK_TONE.ink = t.ink;
    LINK_TONE.red = t.link.red;
    LINK_TONE.green = t.link.green;
    LINK_TONE.muted = t.link.muted;
    Object.assign(BAR_TONES, t.bar);
    UI = t.ui;
    TONES.paper = { bg: UI.paperBg, fg: UI.paperFg };
    TONES.red = { bg: UI.toneRedBg, fg: UI.toneRedFg };
    TONES.green = { bg: UI.toneGreenBg, fg: UI.toneGreenFg };
    TONES.amber = { bg: UI.toneAmberBg, fg: UI.toneAmberFg };
    TONES.violet = { bg: UI.toneVioletBg, fg: UI.toneVioletFg };
    TONES.gray = { bg: UI.toneGrayBg, fg: UI.toneGrayFg };
    TONES.blue = { bg: UI.toneBlueBg, fg: UI.toneBlueFg };
  }

  function setTheme(name) {
    syncThemeRefs(name);
    if (global.SD) global.SD.PACKETS = PACKETS;
    for (const stage of [...STAGES]) stage.applyTheme();
    return themeName;
  }

  const P = (x, y, z = 0) => [14 * (x + y), 7 * (x - y) - z];
  const n1 = (v) => Math.round(v * 10) / 10;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const esc = (s) =>
    String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  const textW = (s, size) => String(s).length * size * 0.6;

  const DEFAULTS = {
    block: { s: 4, h: 46, color: "blue", glyph: "server", label: [], sub: "", heat: 0, dead: 0, dim: 0, opacity: 1, lift: 0, tags: [], pills: "above" },
    device: { w: 6, d: 6, form: "laptop", color: "slab", screen: "violet", label: "", labelIcon: "user", heat: 0, dim: 0, opacity: 1, lift: 0, tags: [] },
    db: { r: 2, h: 42, color: "purple", glyph: "database", label: "", heat: 0, dead: 0, dim: 0, opacity: 1, lift: 0, tags: [] },
    crowd: { count: 0, label: "", labelIcon: "users", color: "slab", opacity: 1, lift: 0, tags: [] },
    ghost: { s: 4, h: 46, label: "", opacity: 1, lift: 0 },
    zone: { label: "", tone: "gray", opacity: 1, lift: 0 },
    card: { z: 0, dx: 0, dy: 0, w: 0, title: "", icon: "sparkles", lines: [], bars: [], opacity: 1, lift: 0 },
  };

  const NUMERIC = ["x", "y", "z", "s", "h", "r", "w", "d", "x0", "x1", "y0", "y1", "dx", "dy", "heat", "dead", "dim", "opacity", "lift", "count"];

  function normalize(e) {
    const base = DEFAULTS[e.type] || {};
    const out = Object.assign({}, base, e);
    if (e.type === "block" && typeof out.label === "string") out.label = out.label ? [out.label] : [];
    out.tags = (out.tags || []).map((t) => (typeof t === "string" ? { text: t } : t));
    return out;
  }

  /* ---------- drawing primitives ---------- */

  function roundPoly(pts, rad) {
    const n = pts.length;
    let d = "";
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const a = pts[(i - 1 + n) % n];
      const b = pts[(i + 1) % n];
      const r = Array.isArray(rad) ? rad[i] : rad;
      const da = Math.hypot(a[0] - p[0], a[1] - p[1]) || 1;
      const db = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1;
      const ra = Math.min(r, da / 2);
      const rb = Math.min(r, db / 2);
      const p1 = [p[0] + ((a[0] - p[0]) * ra) / da, p[1] + ((a[1] - p[1]) * ra) / da];
      const p2 = [p[0] + ((b[0] - p[0]) * rb) / db, p[1] + ((b[1] - p[1]) * rb) / db];
      d += `${i ? "L" : "M"}${n1(p1[0])},${n1(p1[1])} Q${n1(p[0])},${n1(p[1])} ${n1(p2[0])},${n1(p2[1])} `;
    }
    return d + "Z";
  }

  function roundLine(pts, r = 9) {
    if (pts.length < 2) return "";
    let d = `M${n1(pts[0][0])},${n1(pts[0][1])}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const p = pts[i];
      const a = pts[i - 1];
      const b = pts[i + 1];
      const da = Math.hypot(a[0] - p[0], a[1] - p[1]) || 1;
      const db = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1;
      const ra = Math.min(r, da / 2);
      const rb = Math.min(r, db / 2);
      const p1 = [p[0] + ((a[0] - p[0]) * ra) / da, p[1] + ((a[1] - p[1]) * ra) / da];
      const p2 = [p[0] + ((b[0] - p[0]) * rb) / db, p[1] + ((b[1] - p[1]) * rb) / db];
      d += ` L${n1(p1[0])},${n1(p1[1])} Q${n1(p[0])},${n1(p[1])} ${n1(p2[0])},${n1(p2[1])}`;
    }
    const last = pts[pts.length - 1];
    return d + ` L${n1(last[0])},${n1(last[1])}`;
  }

  function icon(name, cx, cy, size, opt = {}) {
    const body = ICONS[name];
    if (!body) return "";
    const k = size / 24;
    const sw = (opt.stroke || 2) / k;
    return `<g transform="translate(${n1(cx - size / 2)} ${n1(cy - size / 2)}) scale(${n1(k * 1000) / 1000})" fill="none" stroke="${opt.color || INK}" stroke-width="${n1(sw * 100) / 100}" stroke-linecap="round" stroke-linejoin="round">${body}</g>`;
  }

  function pill(cx, cy, text, opt = {}) {
    const tone = TONES[opt.tone] || TONES.paper;
    const size = opt.size || 13;
    const ic = opt.icon ? 16 : 0;
    const tw = textW(text, size);
    const w = tw + 20 + ic;
    const h = Math.max(26, size + 14);
    const x = cx - w / 2;
    const y = cy - h / 2;
    const svg = `<g class="pill">
      <rect x="${n1(x)}" y="${n1(y + 2)}" width="${n1(w)}" height="${h}" rx="${n1(h / 2)}" fill="${SHADE}" opacity=".16"/>
      <rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${h}" rx="${n1(h / 2)}" fill="${tone.bg}" stroke="${INK}" stroke-width="1.3"/>
      ${opt.icon ? icon(opt.icon, x + 9 + 6, cy, 12, { stroke: 2.2, color: tone.fg }) : ""}
      <text x="${n1(x + 9 + ic + tw / 2)}" y="${n1(cy + size * 0.36)}" text-anchor="middle" font-size="${size}" font-weight="700" fill="${tone.fg}">${esc(text)}</text>
    </g>`;
    return { svg, w, h, box: [x, y, x + w, y + h] };
  }

  function boxGeo(x0, x1, y0, y1, zb, zt, radius = 9) {
    const T = P(x0, y1, zt), R = P(x1, y1, zt), B = P(x1, y0, zt), L = P(x0, y0, zt);
    const Rd = P(x1, y1, zb), Bd = P(x1, y0, zb), Ld = P(x0, y0, zb);
    const hgt = zt - zb;
    const rs = Math.max(1, Math.min(radius - 2, hgt / 2 - 0.5));
    return {
      T, R, B, L, Rd, Bd, Ld,
      outline: [T, R, Rd, Bd, Ld, L],
      sil: roundPoly([T, R, Rd, Bd, Ld, L], [radius + 1, rs, rs, radius + 2, rs, rs]),
      top: roundPoly([T, R, B, L], [radius + 1, rs, 6, rs]),
      right: roundPoly([B, R, Rd, Bd], [6, rs, rs, radius + 2]),
      edge: `M${n1(L[0])},${n1(L[1])} L${n1(B[0])},${n1(B[1])} L${n1(R[0])},${n1(R[1])}`,
      vert: `M${n1(B[0])},${n1(B[1] + 4)} L${n1(Bd[0])},${n1(Bd[1] - 4)}`,
    };
  }

  function boxFaces(g, color, opt = {}) {
    const c = COLORS[color] ? color : "blue";
    return `
      <path d="${g.sil}" fill="url(#sd-${c}-side)"/>
      <path d="${g.right}" fill="#000" opacity=".07"/>
      <path d="${g.top}" fill="url(#sd-${c}-top)"/>
      <path d="${g.edge}" transform="translate(0 1.6)" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.5" stroke-linecap="round"/>
      <path d="${g.edge}" fill="none" stroke="${INK}" stroke-opacity=".75" stroke-width="1.2" stroke-linejoin="round"/>
      <path d="${g.vert}" fill="none" stroke="${INK}" stroke-opacity=".35" stroke-width="1.1"/>
      <path d="${g.sil}" fill="none" stroke="${opt.stroke || INK}" stroke-width="${opt.sw || 1.9}" stroke-linejoin="round"/>`;
  }

  function floorShadow(g, h, lift, strength) {
    const off = Math.min(9, 3 + h * 0.15) + lift;
    const fade = 1 - Math.min(1, lift / 140) * 0.85;
    return `<path d="${g.sil}" transform="translate(0 ${n1(off)})" fill="${SHADE}" opacity="${n1(Math.min(0.55, strength * 1.35) * fade * 100) / 100}" filter="url(#sd-blur-l)"/>`;
  }

  function stackPills(tags, cx, startY, dir, fade) {
    let svg = "";
    let y = startY;
    let maxW = 0;
    for (const t of tags || []) {
      const raw = t && typeof t === "object" ? t.text : t;
      const text = typeof raw === "string" || typeof raw === "number" ? String(raw) : "";
      if (!text) continue;
      const p = pill(cx, y, text, t && typeof t === "object" ? t : {});
      svg += `<g opacity="${n1(fade * 100) / 100}">${p.svg}</g>`;
      maxW = Math.max(maxW, p.w);
      y += dir * 36;
    }
    return { svg, maxW, endY: y };
  }

  function bbox(pts, pad = [0, 0, 0, 0]) {
    const xs = pts.map((p) => p[0]);
    const ys = pts.map((p) => p[1]);
    return [Math.min(...xs) - pad[0], Math.min(...ys) - pad[1], Math.max(...xs) + pad[2], Math.max(...ys) + pad[3]];
  }

  function widen(b, cx, halfW) {
    return halfW ? [Math.min(b[0], cx - halfW - 4), b[1], Math.max(b[2], cx + halfW + 4), b[3]] : b;
  }

  /* ---------- entity renderers: each returns { body, over, polys, bounds } ---------- */

  function drawBlock(e) {
    const t = e.s / 2;
    const g = boxGeo(e.x - t, e.x + t, e.y - t, e.y + t, 0, e.h);
    const lift = e.lift;
    const cx = g.T[0];
    const ty = P(e.x, e.y, e.h)[1];
    const label = e.label || [];
    const ly = ty + (e.s * 7 + e.h) * 0.42;
    const lf = e.labelFade == null ? 1 : e.labelFade;
    const text = (y, s, size, weight, fill) =>
      `<text x="${n1(cx)}" y="${n1(y)}" text-anchor="middle" font-size="${size}" font-weight="${weight}" fill="${fill || INK}">${esc(s)}</text>`;
    let labelSvg = "";
    if (label.length === 1) {
      labelSvg = text(ly + 4, label[0], 16, 800) + (e.sub ? text(ly + 22, e.sub, 12, 600, UI.subText) : "");
    } else if (label.length >= 2) {
      labelSvg = text(ly - 6, label[0], 16, 800) + text(ly + 14, label[1], 16, 800) + (e.sub ? text(ly + 30, e.sub, 12, 600, UI.subText) : "");
    }
    const scale = e.s >= 6 ? 1.15 : e.s < 3.5 ? 0.8 : 1;
    const glyph = e.glyph && e.dead < 0.5 ? icon(e.glyph, cx, label.length ? ty - 1 : ty + 2, 24 * scale, { stroke: 1.9 }) : "";
    const alpha = 1 - e.dead * 0.5 - e.dim * 0.35;
    const body = `<g opacity="${n1(e.opacity * 100) / 100}">
      ${floorShadow(g, e.h, lift, 0.26)}
      <g transform="translate(0 ${n1(-lift)})">
        ${e.heat > 0.01 ? `<g class="sd-pulse"><path d="${g.sil}" fill="#f0552f" opacity="${n1(e.heat * 70) / 100}" filter="url(#sd-glow)"/></g>` : ""}
        ${boxFaces(g, e.color)}
        ${e.heat > 0.01 ? `<path d="${g.sil}" fill="#f0552f" opacity="${n1(e.heat * 28) / 100}"/>` : ""}
        ${e.dead > 0.01 ? `<path d="${g.sil}" fill="${UI.dead}" opacity="${n1(e.dead * 62) / 100}"/><path d="${g.sil}" fill="none" stroke="${INK}" stroke-width="1.9"/>` : ""}
        ${e.dim > 0.01 ? `<path d="${g.sil}" fill="${UI.dim}" opacity="${n1(e.dim * 55) / 100}"/>` : ""}
        <g opacity="${n1(alpha * 100) / 100}">${glyph}<g opacity="${n1(lf * 100) / 100}">${labelSvg}</g></g>
        ${e.dead > 0.01 ? `<g opacity="${n1(e.dead * 100) / 100}" stroke="${UI.badFg}" stroke-width="3.2" stroke-linecap="round"><path d="M${n1(cx - 9)},${n1(ty - 10)} L${n1(cx + 9)},${n1(ty + 8)} M${n1(cx + 9)},${n1(ty - 10)} L${n1(cx - 9)},${n1(ty + 8)}"/></g>` : ""}
      </g></g>`;
    const below = e.pills === "below";
    const startY = below ? g.Bd[1] - lift + 20 : g.T[1] - lift - 17;
    const st = stackPills(e.tags, cx, startY, below ? 1 : -1, e.tagFade == null ? 1 : e.tagFade);
    const over = st.svg ? `<g opacity="${n1(e.opacity * 100) / 100}">${st.svg}</g>` : "";
    const n = (e.tags || []).length;
    const bounds = widen(bbox(g.outline, [8, 8 + (below ? 0 : n * 36), 8, 14 + (below ? n * 36 : 0)]), cx, st.maxW / 2);
    bounds[1] -= lift;
    return { body, over, polys: [g.outline.map(([x, y]) => [x, y - lift])], bounds };
  }

  function drawDevice(e) {
    const hd = e.d / 2;
    const hw = e.w / 2;
    const x0 = e.x - hd, x1 = e.x + hd, y0 = e.y - hw, y1 = e.y + hw;
    const lift = e.lift;
    const slabH = e.form === "phone" ? 10 : 12;
    const slab = boxGeo(x0, x1, y0, y1, 0, slabH, 8);
    let gadget = "";
    let polys = [slab.outline];
    const scr = SCREEN[e.screen] || SCREEN.violet;
    if (e.form === "phone") {
      const px0 = e.x - hd * 0.42, px1 = e.x + hd * 0.42, py0 = e.y - hw * 0.62, py1 = e.y + hw * 0.62;
      const ph = boxGeo(px0, px1, py0, py1, slabH, slabH + 3, 5);
      const inner = [P(px0 + 0.25, py1 - 0.35, slabH + 3), P(px1 - 0.25, py1 - 0.35, slabH + 3), P(px1 - 0.25, py0 + 0.35, slabH + 3), P(px0 + 0.25, py0 + 0.35, slabH + 3)];
      gadget = `${boxFaces(ph, "dark", { sw: 1.5 })}<path d="${roundPoly(inner, 3)}" fill="${scr}" stroke="${INK}" stroke-width="1"/>`;
    } else {
      const dx0 = x0 + 1.1, dx1 = x1 - 0.7, dy0 = y0 + 0.8, dy1 = y1 - 0.8;
      const deck = boxGeo(dx0, dx1, dy0, dy1, slabH, slabH + 3.5, 5);
      const z = slabH + 3.5;
      const kx0 = dx0 + 1.6, kx1 = dx0 + (dx1 - dx0) * 0.62, ky0 = dy0 + 0.5, ky1 = dy1 - 0.5;
      const keys = [P(kx0, ky1, z), P(kx1, ky1, z), P(kx1, ky0, z), P(kx0, ky0, z)];
      const tpx0 = kx1 + 0.45, tpx1 = dx1 - 0.45, tpy0 = e.y - hw * 0.28, tpy1 = e.y + hw * 0.28;
      const pad = [P(tpx0, tpy1, z), P(tpx1, tpy1, z), P(tpx1, tpy0, z), P(tpx0, tpy0, z)];
      const sx = dx0 + 0.35;
      const lean = 0.9;
      const sh = 30 * Math.min(1.25, e.w / 6);
      const ya = dy0 + 0.25, yb = dy1 - 0.25;
      const b0 = P(sx, ya, z), b1 = P(sx, yb, z), t1 = P(sx - lean, yb, z + sh), t0 = P(sx - lean, ya, z + sh);
      const q = (u, v) => [lerp(lerp(b0[0], b1[0], u), lerp(t0[0], t1[0], u), v), lerp(lerp(b0[1], b1[1], u), lerp(t0[1], t1[1], u), v)];
      const inner = [q(0.07, 0.9), q(0.93, 0.9), q(0.93, 0.1), q(0.07, 0.1)];
      let lines = "";
      [0.74, 0.6, 0.46, 0.32].forEach((v, i) => {
        const a = q(0.16, v), b = q(i % 2 ? 0.62 : 0.82, v);
        lines += `<path d="M${n1(a[0])},${n1(a[1])} L${n1(b[0])},${n1(b[1])}" stroke="#fff" stroke-opacity=".75" stroke-width="2.6" stroke-linecap="round"/>`;
      });
      const back = [t0, t1, b1, b0].map(([x, y]) => [x - 2.2, y + 1.1]);
      gadget = `${boxFaces(deck, "dark", { sw: 1.5 })}
        <path d="${roundPoly(keys, 2)}" fill="${UI.keycap}" stroke="${INK}" stroke-opacity=".35" stroke-width=".8"/>
        <path d="${roundPoly(pad, 2)}" fill="${UI.pad}" stroke="${INK}" stroke-opacity=".35" stroke-width=".8"/>
        <path d="${roundPoly(back, 4)}" fill="${UI.laptopBack}"/>
        <path d="${roundPoly([t0, t1, b1, b0], 4)}" fill="${UI.laptopBezel}" stroke="${INK}" stroke-width="1.6" stroke-linejoin="round"/>
        <path d="${roundPoly(inner, 2.5)}" fill="${scr}"/>
        ${lines}`;
      polys.push([t0, t1, b1, b0]);
    }
    const body = `<g opacity="${n1(e.opacity * 100) / 100}">
      ${floorShadow(slab, slabH, lift, 0.22)}
      <g transform="translate(0 ${n1(-lift)})">
        ${e.heat > 0.01 ? `<g class="sd-pulse"><path d="${slab.sil}" fill="#f0552f" opacity="${n1(e.heat * 70) / 100}" filter="url(#sd-glow)"/></g>` : ""}
        ${boxFaces(slab, e.color, { sw: 1.7 })}
        ${gadget}
        ${e.dim > 0.01 ? `<path d="${slab.sil}" fill="${UI.dim}" opacity="${n1(e.dim * 55) / 100}"/>` : ""}
      </g></g>`;
    const topY = Math.min(...polys.flat().map((p) => p[1]));
    const cx = P(e.x, e.y)[0];
    const st = stackPills(e.tags, cx, topY - lift - 15, -1, e.tagFade == null ? 1 : e.tagFade);
    let over = st.svg;
    let lw = 0;
    if (e.label) {
      const lp = pill(slab.Bd[0], slab.Bd[1] - lift + 22, e.label, { icon: e.labelIcon });
      over += `<g opacity="${n1((e.labelFade == null ? 1 : e.labelFade) * 100) / 100}">${lp.svg}</g>`;
      lw = lp.w;
    }
    over = over ? `<g opacity="${n1(e.opacity * 100) / 100}">${over}</g>` : "";
    const all = polys.flat();
    let b = bbox(all, [8, 8 + (e.tags || []).length * 36, 8, e.label ? 40 : 12]);
    b = widen(widen(b, cx, st.maxW / 2), slab.Bd[0], lw / 2);
    b[1] -= lift;
    return { body, over, polys: polys.map((pp) => pp.map(([x, y]) => [x, y - lift])), bounds: b };
  }

  function drawDb(e) {
    const rx = Math.SQRT2 * 14 * e.r;
    const ry = rx / 2;
    const [cx, cy] = P(e.x, e.y, 0);
    const lift = e.lift;
    const base = cy - lift;
    const topY = base - e.h;
    const c = COLORS[e.color] ? e.color : "purple";
    const sil = `M${n1(cx - rx)},${n1(topY)} V${n1(base)} A${n1(rx)},${n1(ry)} 0 0 0 ${n1(cx + rx)},${n1(base)} V${n1(topY)} Z`;
    const open = `M${n1(cx - rx)},${n1(topY)} V${n1(base)} A${n1(rx)},${n1(ry)} 0 0 0 ${n1(cx + rx)},${n1(base)} V${n1(topY)}`;
    const fade = 1 - Math.min(1, lift / 140) * 0.85;
    const alpha = 1 - e.dead * 0.5 - e.dim * 0.35;
    const body = `<g opacity="${n1(e.opacity * 100) / 100}">
      <ellipse cx="${n1(cx)}" cy="${n1(cy + 5)}" rx="${n1(rx + 3)}" ry="${n1(ry + 1)}" fill="${SHADE}" opacity="${n1(22 * fade) / 100}" filter="url(#sd-blur-m)"/>
      ${e.heat > 0.01 ? `<g class="sd-pulse"><path d="${sil}" fill="#f0552f" opacity="${n1(e.heat * 70) / 100}" filter="url(#sd-glow)"/></g>` : ""}
      <path d="${sil}" fill="url(#sd-${c}-side)"/>
      <path d="${sil}" fill="url(#sd-cyl-sheen)"/>
      <ellipse cx="${n1(cx)}" cy="${n1(topY)}" rx="${n1(rx)}" ry="${n1(ry)}" fill="url(#sd-${c}-top)"/>
      <path d="M${n1(cx - rx + 3)},${n1(topY + 2.5)} A${n1(rx - 3)},${n1(ry - 2)} 0 0 0 ${n1(cx + rx - 3)},${n1(topY + 2.5)}" fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="1.4"/>
      ${e.heat > 0.01 ? `<path d="${sil}" fill="#f0552f" opacity="${n1(e.heat * 28) / 100}"/>` : ""}
      ${e.dim > 0.01 ? `<path d="${sil}" fill="${UI.dim}" opacity="${n1(e.dim * 55) / 100}"/>` : ""}
      ${e.dead > 0.01 ? `<path d="${sil}" fill="${UI.dead}" opacity="${n1(e.dead * 62) / 100}"/>` : ""}
      <path d="${open}" fill="none" stroke="${INK}" stroke-width="1.9" stroke-linejoin="round"/>
      <ellipse cx="${n1(cx)}" cy="${n1(topY)}" rx="${n1(rx)}" ry="${n1(ry)}" fill="none" stroke="${INK}" stroke-width="1.9"/>
      <g opacity="${n1(alpha * 100) / 100}">${icon(e.glyph, cx, topY + ry + e.h / 2 - 4, 19, { stroke: 1.8 })}</g>
    </g>`;
    let over = "";
    let lw = 0;
    if (e.label) {
      const lp = pill(0, 0, e.label, { icon: "database" });
      lw = lp.w;
      const p2 = pill(cx + rx + 10 + lw / 2, base - e.h * 0.35, e.label, { icon: e.labelIcon || "database" });
      over += `<g opacity="${n1((e.labelFade == null ? 1 : e.labelFade) * 100) / 100}">${p2.svg}</g>`;
    }
    const st = stackPills(e.tags, cx, topY - ry - 15, -1, e.tagFade == null ? 1 : e.tagFade);
    over += st.svg;
    over = over ? `<g opacity="${n1(e.opacity * 100) / 100}">${over}</g>` : "";
    const poly = [];
    for (let i = 0; i <= 8; i++) poly.push([cx - rx * Math.cos((Math.PI * i) / 8), topY - ry * Math.sin((Math.PI * i) / 8)]);
    for (let i = 0; i <= 8; i++) poly.push([cx + rx * Math.cos((Math.PI * i) / 8), base + ry * Math.sin((Math.PI * i) / 8)]);
    const n = (e.tags || []).length;
    const b = widen([cx - rx - 8, topY - ry - 12 - n * 36, cx + rx + (e.label ? lw + 18 : 8), base + ry + 10], cx, st.maxW / 2);
    return { body, over, polys: [poly], bounds: b };
  }

  const PEOPLE = ["#f3b47f", "#a9c5e8", "#b3d79f", "#cbbae6", "#f6cd82"];
  function person(x, y, z, a, color) {
    const [px, py] = P(x, y, z);
    const s = (0.35 + 0.65 * a) * 1.3;
    return `<g opacity="${n1(a * 100) / 100}" transform="translate(${n1(px)} ${n1(py - (1 - a) * 10)}) scale(${n1(s * 100) / 100})">
      <ellipse cx="0" cy="0" rx="5.6" ry="2.8" fill="${SHADE}" opacity=".18"/>
      <path d="M-5.2,0 V-9 A5.2,5.2 0 0 1 5.2,-9 V0 A5.2,2.4 0 0 1 -5.2,0 Z" fill="${color}" stroke="${INK}" stroke-width="1.25"/>
      <circle cx="0" cy="-17.6" r="4.3" fill="${UI.person}" stroke="${INK}" stroke-width="1.25"/>
    </g>`;
  }

  function drawCrowd(e) {
    const g = boxGeo(e.x0, e.x1, e.y0, e.y1, 0, 10, 8);
    const cxg = (e.x0 + e.x1) / 2, cyg = (e.y0 + e.y1) / 2;
    const gap = 1.75;
    const ni = Math.floor(((e.x1 - e.x0) / 2 - 0.85) / gap);
    const nj = Math.floor(((e.y1 - e.y0) / 2 - 0.85) / gap);
    const cells = [];
    for (let i = -ni; i <= ni; i++) for (let j = -nj; j <= nj; j++) cells.push({ i, j, k: Math.abs(i) + Math.abs(j) * 0.7 + ((i * 7 + j * 13) % 5) * 0.11 });
    cells.sort((a, b) => a.k - b.k);
    const people = cells
      .map((c, idx) => Object.assign(c, { a: clamp01(e.count - idx) }))
      .filter((c) => c.a > 0.01)
      .sort((a, b) => a.i - a.j - (b.i - b.j))
      .map((c) => person(cxg + c.i * gap, cyg + c.j * gap, 10, c.a, e.tone === "red" ? "#e8907f" : PEOPLE[Math.abs(c.i * 3 + c.j * 7) % PEOPLE.length]))
      .join("");
    const lift = e.lift;
    const body = `<g opacity="${n1(e.opacity * 100) / 100}">${floorShadow(g, 10, lift, 0.2)}<g transform="translate(0 ${n1(-lift)})">${boxFaces(g, e.color, { stroke: UI.crowdStroke, sw: 1.5 })}${people}</g></g>`;
    let over = "";
    if (e.label) {
      const [fx, fy] = P(e.x1, e.y0, 0);
      over = `<g opacity="${n1(e.opacity * 100) / 100}">${pill(fx, fy + 22 - lift, e.label, { icon: e.labelIcon, tone: e.labelTone }).svg}</g>`;
    }
    const st = stackPills(e.tags, g.T[0], g.T[1] - 34 - lift, -1, 1);
    over += st.svg;
    return { body, over, polys: [g.outline], bounds: bbox(g.outline, [8, 34 + (e.tags || []).length * 36, 8, 40]) };
  }

  function drawGhost(e) {
    const t = e.s / 2;
    const x0 = e.x - t, x1 = e.x + t, y0 = e.y - t, y1 = e.y + t;
    const top = [P(x0, y0, e.h), P(x0, y1, e.h), P(x1, y1, e.h), P(x1, y0, e.h)];
    const bot = [P(x0, y0, 0), P(x0, y1, 0), P(x1, y1, 0), P(x1, y0, 0)];
    const seg = (a, b, faint) => `<path d="M${n1(a[0])},${n1(a[1])} L${n1(b[0])},${n1(b[1])}" stroke="${INK}" stroke-opacity="${faint ? 0.22 : 0.55}" stroke-width="1.4" stroke-dasharray="5 4" fill="none"/>`;
    const lines = [seg(top[0], top[1]), seg(top[1], top[2]), seg(top[2], top[3]), seg(top[3], top[0]), seg(bot[0], bot[3]), seg(bot[3], bot[2]), seg(top[0], bot[0]), seg(top[2], bot[2]), seg(top[3], bot[3]), seg(bot[0], bot[1], 1), seg(bot[1], bot[2], 1), seg(top[1], bot[1], 1)].join("");
    let over = "";
    let b = bbox([...top, ...bot], [8, 8, 8, 8]);
    if (e.label) {
      const [ux, uy] = top[2];
      const w = textW(e.label, 13) + 40;
      over = `<g opacity="${n1(e.opacity * 100) / 100}">${pill(ux + 14 + w / 2, uy + 18, e.label, { tone: "gray", icon: e.labelIcon || "alert" }).svg}</g>`;
      b = [b[0], b[1], Math.max(b[2], ux + 22 + w), b[3]];
    }
    return { body: `<g opacity="${n1(e.opacity * 100) / 100}">${lines}</g>`, over, polys: [], bounds: b };
  }

  function zoneTones() {
    return {
      gray: { fill: UI.zoneGrayFill, stroke: UI.zoneGrayStroke, text: UI.zoneGrayText },
      red: { fill: UI.badBg, stroke: UI.badFg, text: UI.badFg },
      green: { fill: UI.goodBg, stroke: UI.goodFg, text: UI.goodFg },
      blue: { fill: TONES.blue.bg, stroke: TONES.blue.fg, text: TONES.blue.fg },
      amber: { fill: UI.toneAmberBg, stroke: UI.accent, text: UI.accent },
      purple: { fill: UI.toneVioletBg, stroke: UI.toneVioletFg, text: UI.toneVioletFg },
      violet: { fill: UI.toneVioletBg, stroke: UI.toneVioletFg, text: UI.toneVioletFg },
    };
  }
  function drawZone(e) {
    const pts = [P(e.x0, e.y0), P(e.x0, e.y1), P(e.x1, e.y1), P(e.x1, e.y0)];
    const tone = zoneTones()[e.tone] || zoneTones().gray;
    const [lx, ly] = P(e.x1, e.y0);
    const label = e.label
      ? `<text x="${n1(lx - 10)}" y="${n1(ly - 9)}" text-anchor="end" font-size="13" font-weight="800" letter-spacing="1.2" fill="${tone.text}">${esc(String(e.label).toUpperCase())}</text>`
      : "";
    return {
      body: `<g opacity="${n1(e.opacity * 100) / 100}"><path d="${roundPoly(pts, 10)}" fill="${tone.fill}" fill-opacity=".62" stroke="${tone.stroke}" stroke-opacity=".6" stroke-width="1.6" stroke-dasharray="7 5"/>${label}</g>`,
      over: "",
      polys: [],
      bounds: bbox(pts, [6, 6, 6, 6]),
    };
  }

  const richText = (s) => esc(s).split("**").map((part, i) => (i % 2 ? `<tspan font-weight="800" fill="${INK}">${part}</tspan>` : part)).join("");

  function drawCard(e) {
    const [ax, ay] = P(e.x, e.y, e.z);
    const lines = e.lines || [];
    const bars = e.bars || [];
    const clean = (l) => l.replace(/\*\*/g, "").replace(/^[=#!] /, "");
    const lineH = 22;
    const head = 42;
    const contentW = Math.max(textW(String(e.title).toUpperCase(), 13) + 56, ...lines.map((l) => textW(clean(l), 14) + 36), bars.length ? 340 : 0);
    const w = Math.max(e.w || 0, contentW);
    const h = head + lines.length * lineH + (bars.length ? bars.length * 24 + 12 : 0) + 8;
    const x = ax + e.dx;
    const y = ay + e.dy - e.lift;
    let body = "";
    lines.forEach((l, i) => {
      const ly = y + head + i * lineH + 16;
      if (l.startsWith("= ")) {
        body += `<rect x="${n1(x + 10)}" y="${n1(ly - 16)}" width="${n1(w - 20)}" height="22" rx="6" fill="${UI.goodBg}"/><text x="${n1(x + 16)}" y="${n1(ly)}" font-size="14" font-weight="800" fill="${UI.goodFg}" xml:space="preserve">${richText(l.slice(2))}</text>`;
      } else if (l.startsWith("! ")) {
        body += `<rect x="${n1(x + 10)}" y="${n1(ly - 16)}" width="${n1(w - 20)}" height="22" rx="6" fill="${UI.badBg}"/><text x="${n1(x + 16)}" y="${n1(ly)}" font-size="14" font-weight="800" fill="${UI.badFg}" xml:space="preserve">${richText(l.slice(2))}</text>`;
      } else if (l.startsWith("# ")) {
        body += `<text x="${n1(x + 16)}" y="${n1(ly)}" font-size="13" font-weight="500" fill="${UI.softText}" xml:space="preserve">${richText(l.slice(2))}</text>`;
      } else {
        body += `<text x="${n1(x + 16)}" y="${n1(ly)}" font-size="14" font-weight="500" fill="${UI.bodyText}" xml:space="preserve">${richText(l)}</text>`;
      }
    });
    if (bars.length) {
      const by = y + head + lines.length * lineH + 8;
      const labelW = Math.max(...bars.map((b) => textW(b.label, 13))) + 16;
      const trackX = x + 16 + labelW;
      const trackW = w - 36 - labelW - 56;
      bars.forEach((b, i) => {
        const yy = by + i * 24;
        const bw = Math.max(3, clamp01(b.to == null ? 1 : b.to) * trackW);
        body += `<text x="${n1(x + 16)}" y="${n1(yy + 14)}" font-size="13" font-weight="${b.bold ? 800 : 500}" fill="${UI.bodyText}">${esc(b.label)}</text>
          <rect x="${n1(trackX)}" y="${n1(yy + 3)}" width="${n1(trackW)}" height="13" rx="4" fill="${UI.track}"/>
          <rect x="${n1(trackX)}" y="${n1(yy + 3)}" width="${n1(bw)}" height="13" rx="4" fill="${BAR_TONES[b.tone || "gray"]}" stroke="${INK}" stroke-opacity=".55" stroke-width="1"/>
          <text x="${n1(trackX + bw + 6)}" y="${n1(yy + 14)}" font-size="12" font-weight="800" fill="${INK}">${esc(b.note || "")}</text>`;
      });
    }
    const fade = e.fade == null ? 1 : e.fade;
    const over = `<g opacity="${n1(e.opacity * 100) / 100}">
      <rect x="${n1(x)}" y="${n1(y + 2.5)}" width="${n1(w)}" height="${n1(h)}" rx="12" fill="${SHADE}" opacity=".16"/>
      <rect x="${n1(x)}" y="${n1(y)}" width="${n1(w)}" height="${n1(h)}" rx="12" fill="${UI.card}" stroke="${UI.cardStroke}" stroke-width="1.4"/>
      <path d="M${n1(x + 14)},${n1(y + 36)} H${n1(x + w - 14)}" stroke="${UI.divider}" stroke-width="1"/>
      <g opacity="${n1(fade * 100) / 100}">
        ${icon(e.icon, x + 22, y + 22, 16, { stroke: 2.1, color: UI.accent })}
        <text x="${n1(x + 38)}" y="${n1(y + 26)}" font-size="13" font-weight="800" letter-spacing=".6" fill="${UI.titleMuted}">${esc(String(e.title).toUpperCase())}</text>
        ${body}
      </g></g>`;
    return { body: "", over, polys: [], bounds: [x - 6, y - 6, x + w + 6, y + h + 10] };
  }

  const DRAW = { block: drawBlock, device: drawDevice, db: drawDb, crowd: drawCrowd, ghost: drawGhost, zone: drawZone, card: drawCard };

  function cardSize(e) {
    const lines = e.lines || [];
    const bars = e.bars || [];
    const clean = (l) => l.replace(/\*\*/g, "").replace(/^[=#!] /, "");
    const widths = [textW(String(e.title || "").toUpperCase(), 13) + 56, bars.length ? 340 : 0];
    for (const l of lines) widths.push(textW(clean(l), 14) + 36);
    const w = Math.max(e.w || 0, ...widths);
    const h = 42 + lines.length * 22 + (bars.length ? bars.length * 24 + 12 : 0) + 8;
    return [w, h];
  }

  function boxOverlap(a, b) {
    const w = Math.min(a[2], b[2]) - Math.max(a[0], b[0]);
    const h = Math.min(a[3], b[3]) - Math.max(a[1], b[1]);
    return w > 0 && h > 0 ? w * h : 0;
  }

  /* Push info cards off entities/labels so scenes stay readable without per-lesson tuning. */
  function separateCards(ents, links) {
    const obstacles = [];
    for (const e of Object.values(ents)) {
      if (e.type === "card" || e.type === "zone") continue;
      const fn = DRAW[e.type];
      if (!fn) continue;
      const b = fn(Object.assign({}, e, { lift: 0, opacity: 1, labelFade: 1, tagFade: 1 })).bounds;
      if (b) obstacles.push([b[0] - 8, b[1] - 8, b[2] + 8, b[3] + 8]);
    }
    for (const spec of Object.values(links || {})) {
      const pts = (spec.pts || [spec.from, spec.to]).map((p) => {
        try {
          return P(...resolvePoint(p, ents), 0);
        } catch {
          return null;
        }
      }).filter(Boolean);
      if (!pts.length) continue;
      obstacles.push(bbox(pts, [12, 16, 12, 16]));
      if (spec.label) {
        const at = pointAt(pts, polyLen(pts) * (spec.labelAt == null ? 0.5 : spec.labelAt));
        const w = textW(spec.label, 13) + 40;
        const off = spec.labelSide === "below" ? 20 : -20;
        obstacles.push([at.x - w / 2, at.y + off - 16, at.x + w / 2, at.y + off + 16]);
      }
    }

    const cards = Object.values(ents).filter((e) => e.type === "card");
    const placed = [];
    const deltas = [
      [0, 0],
      [-36, -130],
      [48, -130],
      [-210, -30],
      [180, -30],
      [-210, 90],
      [180, 90],
      [-300, -170],
      [250, -170],
      [-140, 160],
      [100, 160],
      [-340, 20],
      [280, 20],
      [-260, -220],
      [220, -220],
      [0, -180],
      [0, 170],
      [-380, -80],
      [320, -80],
      [-380, 120],
      [320, 120],
      [-160, -260],
      [140, -260],
      [-420, -200],
      [360, -200],
    ];
    for (const card of cards) {
      if (card.pin) {
        const [w, h] = cardSize(card);
        const [ax, ay] = P(card.x, card.y, card.z || 0);
        placed.push([ax + (card.dx || 0), ay + (card.dy || 0), ax + (card.dx || 0) + w, ay + (card.dy || 0) + h]);
        continue;
      }
      const [w, h] = cardSize(card);
      const [ax, ay] = P(card.x, card.y, card.z || 0);
      const baseDx = card.dx || 0;
      const baseDy = card.dy || 0;
      let best = { dx: baseDx, dy: baseDy, score: Infinity };
      for (const [ox, oy] of deltas) {
        const dx = baseDx + ox;
        const dy = baseDy + oy;
        const box = [ax + dx - 4, ay + dy - 4, ax + dx + w + 4, ay + dy + h + 4];
        let score = 0;
        for (const o of obstacles) score += boxOverlap(box, o);
        for (const o of placed) score += boxOverlap(box, o) * 1.25;
        // soft preference for staying near the authored spot
        score += (Math.abs(ox) + Math.abs(oy)) * 0.015;
        if (score < best.score) best = { dx, dy, score };
        if (score < 40) break;
      }
      card.dx = best.dx;
      card.dy = best.dy;
      placed.push([ax + best.dx, ay + best.dy, ax + best.dx + w, ay + best.dy + h]);
    }
  }

  function center(e) {
    if (!e) return [0, 0];
    if (e.type === "crowd" || e.type === "zone") return [(e.x0 + e.x1) / 2, (e.y0 + e.y1) / 2];
    return [e.x, e.y];
  }

  function depth(e) {
    if (e.type === "zone") return -1e4;
    if (e.type === "card") return 1e4;
    const [x, y] = center(e);
    return x - y - (e.type === "ghost" ? 0.5 : 0);
  }

  function inPoly(x, y, poly) {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i];
      const [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    return inside;
  }

  /* ---------- links ---------- */

  function resolvePoint(p, ents) {
    const coord = (v, axis) => {
      if (typeof v === "number") return v;
      const m = /^([\w-]+?)([+-][\d.]+)?$/.exec(v);
      const ent = m && ents[m[1]];
      if (!ent) return 0;
      return center(ent)[axis] + (m[2] ? parseFloat(m[2]) : 0);
    };
    if (typeof p === "string") return [coord(p, 0), coord(p, 1)];
    return [coord(p[0], 0), coord(p[1], 1)];
  }

  function clipEnd(grid, endIdx, nextIdx, ent, polys) {
    if (!ent || !polys || !polys.length) return grid[endIdx];
    const a = grid[endIdx];
    const b = grid[nextIdx];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 0.01) return a;
    const ux = (b[0] - a[0]) / len;
    const uy = (b[1] - a[1]) / len;
    let t = 0;
    const step = 0.08;
    while (t < len - 0.2) {
      const [sx, sy] = P(a[0] + ux * t, a[1] + uy * t, 0);
      if (!polys.some((poly) => inPoly(sx, sy, poly))) break;
      t += step;
    }
    t = Math.min(len - 0.2, t + 0.3);
    return [a[0] + ux * t, a[1] + uy * t];
  }

  function polyLen(pts) {
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return L;
  }

  function pointAt(pts, dist) {
    for (let i = 1; i < pts.length; i++) {
      const seg = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      if (dist <= seg || i === pts.length - 1) {
        const r = seg ? Math.min(1, Math.max(0, dist / seg)) : 0;
        return {
          x: lerp(pts[i - 1][0], pts[i][0], r),
          y: lerp(pts[i - 1][1], pts[i][1], r),
          dx: (pts[i][0] - pts[i - 1][0]) / (seg || 1),
          dy: (pts[i][1] - pts[i - 1][1]) / (seg || 1),
        };
      }
      dist -= seg;
    }
    const p = pts[pts.length - 1] || [0, 0];
    return { x: p[0], y: p[1], dx: 1, dy: 0 };
  }


  /* ---------- the stage ---------- */

  class Stage {
    /* opts.inset: () => ({ top, bottom }) in CSS pixels kept clear for overlays like a metric HUD. */
    constructor(host, opts = {}) {
      this.host = host;
      this.inset = opts.inset || (() => ({ top: 0, bottom: 0 }));
      this.svg = document.createElementNS(NS, "svg");
      this.svg.setAttribute("class", "sd-stage");
      this.svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
      this.svg.setAttribute("role", "img");
      this.svg.innerHTML = this._defs();
      this.layers = {};
      ["floor", "links", "packets", "ents", "over", "hud"].forEach((k) => {
        const g = document.createElementNS(NS, "g");
        g.setAttribute("class", `sd-${k}`);
        this.svg.appendChild(g);
        this.layers[k] = g;
      });
      const grid = document.createElementNS(NS, "rect");
      grid.setAttribute("x", "-3000");
      grid.setAttribute("y", "-2000");
      grid.setAttribute("width", "6000");
      grid.setAttribute("height", "4000");
      grid.setAttribute("fill", "url(#sd-grid)");
      this.layers.floor.appendChild(grid);
      host.appendChild(this.svg);
      STAGES.add(this);
      this.ents = new Map();
      this.links = new Map();
      this.flows = [];
      this.packets = [];
      this.bursts = [];
      this.paused = false;
      this.time = 0;
      this.last = 0;
      this.view = null;
      this.viewFrom = null;
      this.viewTo = null;
      this.viewStart = 0;
      this.scene = null;
      this.flowStart = 0;
      this._tick = this._tick.bind(this);
      this.raf = requestAnimationFrame(this._tick);
      if (global.ResizeObserver) {
        this.ro = new ResizeObserver(() => this.refit());
        this.ro.observe(host);
      }
    }

    refit() {
      if (!this.fit) return;
      const v = this._fitView(this.fit.ents, this.fit.links);
      this.viewFrom = v;
      this.viewTo = v;
      this.view = v;
    }

    _defs() {
      let grads = "";
      for (const [name, c] of Object.entries(COLORS)) {
        grads += `<linearGradient id="sd-${name}-top" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.top[0]}"/><stop offset="1" stop-color="${c.top[1]}"/></linearGradient>
          <linearGradient id="sd-${name}-side" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${c.side[0]}"/><stop offset="1" stop-color="${c.side[1]}"/></linearGradient>`;
      }
      const marker = (id, color) =>
        `<marker id="${id}" viewBox="0 0 10 10" refX="8.6" refY="5" markerWidth="5.2" markerHeight="5.2" orient="auto-start-reverse" markerUnits="strokeWidth"><path d="M1,1.2 L9,5 L1,8.8 Z" fill="${color}" stroke="${color}" stroke-width="1" stroke-linejoin="round"/></marker>`;
      return `<defs>${grads}
        <linearGradient id="sd-cyl-sheen" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity=".0"/><stop offset=".28" stop-color="#fff" stop-opacity=".32"/><stop offset=".55" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".12"/></linearGradient>
        <filter id="sd-blur-l" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
        <filter id="sd-blur-m" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3"/></filter>
        <filter id="sd-glow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="7"/></filter>
        ${marker("sd-arrow-ink", INK)}${marker("sd-arrow-red", LINK_TONE.red)}${marker("sd-arrow-green", LINK_TONE.green)}${marker("sd-arrow-muted", LINK_TONE.muted)}
        <pattern id="sd-grid" patternUnits="userSpaceOnUse" x="0" y="-7" width="28" height="14"><path d="M0 7 L14 0 L28 7 L14 14 Z" fill="none" stroke="${UI.grid}" stroke-opacity="${UI.gridOpacity}" stroke-width=".8"/></pattern>
      </defs>`;
    }

    /* Show a scene. opts.instant skips transitions; opts.replay re-enters everything. */
    show(scene, opts = {}) {
      const now = this.time;
      const fresh = opts.replay || !this.scene;
      this.scene = scene;
      const next = {};
      for (const [id, raw] of Object.entries(scene.entities || {})) next[id] = normalize(raw);
      try {
        separateCards(next, scene.links || {});
      } catch (err) {
        /* keep authored card spots if auto-layout fails */
      }

      if (fresh) {
        for (const ent of this.ents.values()) this._removeEnt(ent);
        this.ents.clear();
      }

      for (const [id, ent] of this.ents) {
        if (!next[id] && ent.mode !== "exit") {
          ent.from = Object.assign({}, ent.cur);
          ent.to = Object.assign({}, ent.cur, { opacity: 0, lift: (ent.cur.lift || 0) + (ent.cur.type === "card" ? -8 : 16) });
          ent.start = now;
          ent.dur = 420;
          ent.mode = "exit";
        }
      }

      const entering = [];
      for (const [id, target] of Object.entries(next)) {
        const ent = this.ents.get(id);
        if (ent && ent.mode !== "exit" && ent.cur.type === target.type) {
          const swaps = this._swaps(ent.cur, target);
          // Cards with new copy should re-enter so title/size don't morph over entities.
          if (target.type === "card" && swaps.card) {
            this._removeEnt(ent);
            this.ents.delete(id);
            entering.push([id, target]);
          } else {
            ent.from = Object.assign({}, ent.cur);
            ent.to = target;
            ent.start = now + (fresh ? 0 : 160);
            ent.dur = 820;
            ent.mode = "move";
            ent.swap = swaps;
          }
        } else {
          if (ent) this._removeEnt(ent);
          entering.push([id, target]);
        }
      }
      entering.sort((a, b) => depth(a[1]) - depth(b[1]));
      entering.forEach(([id, target], i) => {
        const startState = Object.assign({}, target, { opacity: 0, lift: target.type === "card" ? -10 : target.type === "zone" ? 0 : 34 });
        const ent = this._makeEnt(id, startState);
        ent.from = startState;
        ent.to = target;
        ent.start = now + (fresh ? 0 : 380) + i * 90;
        ent.dur = 680;
        ent.mode = "enter";
        this.ents.set(id, ent);
      });
      this._order(next);

      const nextLinks = scene.links || {};
      for (const [id, l] of this.links) {
        if (!nextLinks[id] || fresh) {
          l.mode = "exit";
          l.start = now;
          l.dur = fresh ? 1 : 320;
        }
      }
      const linkDelay = fresh ? 300 + entering.length * 90 : 520;
      for (const [id, spec] of Object.entries(nextLinks)) {
        const l = this.links.get(id);
        if (l && l.mode !== "exit" && !fresh) {
          l.spec = spec;
          this._styleLink(l);
        } else {
          if (l) this._removeLink(l);
          const nl = this._makeLink(id, spec);
          nl.mode = "enter";
          nl.start = now + linkDelay;
          nl.dur = 560;
          this.links.set(id, nl);
        }
      }

      this.packets.forEach((p) => {
        p.dying = now;
      });
      this.flows = (scene.flows || []).map((f) => Object.assign({ kind: "req", rate: 1, speed: 1, bounce: false, back: "res" }, f, { acc: 0 }));
      this.flowStart = now + (fresh ? linkDelay + 400 : 900);

      this.fit = { ents: next, links: nextLinks };
      const target = this._fitView(next, nextLinks);
      this.viewFrom = this.view || target;
      this.viewTo = target;
      this.viewStart = now;
      if (opts.instant || !this.view) {
        this.view = target;
        this.viewFrom = target;
      }
    }

    replay() {
      if (this.scene) this.show(this.scene, { replay: true });
    }

    setPaused(p) {
      this.paused = !!p;
    }

    applyTheme() {
      const defs = this.svg.querySelector("defs");
      if (defs) {
        const tmp = document.createElementNS(NS, "svg");
        tmp.innerHTML = this._defs();
        defs.replaceWith(tmp.querySelector("defs"));
      }
      if (this.scene) this.show(this.scene, { instant: true, replay: true });
    }

    destroy() {
      STAGES.delete(this);
      cancelAnimationFrame(this.raf);
      if (this.ro) this.ro.disconnect();
      this.svg.remove();
    }

    _swaps(a, b) {
      const same = (x, y) => JSON.stringify(x == null ? null : x) === JSON.stringify(y == null ? null : y);
      return {
        tags: !same(a.tags, b.tags),
        label: !same(a.label, b.label) || (a.sub || "") !== (b.sub || ""),
        card: a.type === "card" && (!same(a.lines, b.lines) || a.title !== b.title || !same(a.bars, b.bars)),
      };
    }

    _makeEnt(id, state) {
      const body = document.createElementNS(NS, "g");
      const over = document.createElementNS(NS, "g");
      const layer = state.type === "zone" ? this.layers.floor : this.layers.ents;
      layer.appendChild(body);
      (state.type === "card" ? this.layers.hud : this.layers.over).appendChild(over);
      return { id, cur: Object.assign({}, state), body, over, polys: [], bounds: null, dirty: true };
    }

    _removeEnt(ent) {
      ent.body.remove();
      ent.over.remove();
    }

    _order(next) {
      const items = [...this.ents.values()].filter((e) => e.cur.type !== "zone");
      items.sort((a, b) => depth(next[a.id] || a.cur) - depth(next[b.id] || b.cur));
      items.forEach((e) => this.layers.ents.appendChild(e.body));
    }

    _render(ent) {
      const fn = DRAW[ent.cur.type];
      if (!fn) return;
      const out = fn(ent.cur);
      ent.body.innerHTML = out.body;
      ent.over.innerHTML = out.over;
      ent.polys = out.polys;
      ent.bounds = out.bounds;
    }

    _tween(ent, now) {
      if (!ent.mode) return false;
      const raw = (now - ent.start) / ent.dur;
      if (raw < 0) {
        if (ent.mode === "enter" && ent.dirty) {
          ent.cur = Object.assign({}, ent.from);
          this._render(ent);
          ent.dirty = false;
        }
        return true;
      }
      const p = clamp01(raw);
      const k = ent.mode === "enter" ? easeOut(p) : easeInOut(p);
      const from = ent.from;
      const to = ent.to;
      const cur = Object.assign({}, p < 0.5 ? from : to);
      for (const key of NUMERIC) {
        if (typeof from[key] === "number" && typeof to[key] === "number") cur[key] = lerp(from[key], to[key], k);
      }
      const sw = ent.swap || {};
      const fade = p < 0.5 ? 1 - p * 2 : p * 2 - 1;
      if (sw.tags) {
        cur.tags = p < 0.5 ? from.tags : to.tags;
        cur.tagFade = fade;
      }
      if (sw.label) {
        cur.label = p < 0.5 ? from.label : to.label;
        cur.sub = p < 0.5 ? from.sub : to.sub;
        cur.labelFade = fade;
      }
      if (sw.card) {
        cur.lines = p < 0.5 ? from.lines : to.lines;
        cur.title = p < 0.5 ? from.title : to.title;
        cur.icon = p < 0.5 ? from.icon : to.icon;
        cur.bars = p < 0.5 ? from.bars : to.bars;
        cur.fade = fade;
      }
      ent.cur = cur;
      this._render(ent);
      if (p >= 1) {
        if (ent.mode === "exit") {
          this._removeEnt(ent);
          this.ents.delete(ent.id);
        } else {
          ent.cur = Object.assign({}, to);
          this._render(ent);
        }
        ent.mode = null;
        ent.swap = null;
      }
      return true;
    }

    _makeLink(id, spec) {
      const g = document.createElementNS(NS, "g");
      const path = document.createElementNS(NS, "path");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke-linecap", "round");
      path.setAttribute("stroke-linejoin", "round");
      g.appendChild(path);
      const deco = document.createElementNS(NS, "g");
      g.appendChild(deco);
      this.layers.links.appendChild(g);
      const label = document.createElementNS(NS, "g");
      this.layers.over.insertBefore(label, this.layers.over.firstChild);
      const l = { id, spec, g, path, deco, label, pts: [], len: 0 };
      this._styleLink(l);
      return l;
    }

    _styleLink(l) {
      const s = l.spec;
      const tone = s.tone || (s.labelTone === "red" && s.style === "dashed" ? "red" : "ink");
      const off = s.style === "off";
      const color = off ? LINK_TONE.muted : LINK_TONE[tone] || INK;
      l.path.setAttribute("stroke", color);
      l.path.setAttribute("stroke-width", off ? "1.4" : "1.8");
      l.path.setAttribute("opacity", off ? ".55" : ".9");
      l.dash = s.style === "dashed" ? "6 5" : off ? "2 5" : "";
      if (l.dash) l.path.setAttribute("stroke-dasharray", l.dash);
      else l.path.removeAttribute("stroke-dasharray");
      const marker = `url(#sd-arrow-${off ? "muted" : tone === "ink" ? "ink" : tone})`;
      const heads = off ? "none" : s.heads || "end";
      if (heads === "end" || heads === "both") l.path.setAttribute("marker-end", marker);
      else l.path.removeAttribute("marker-end");
      if (heads === "both" || heads === "start") l.path.setAttribute("marker-start", marker);
      else l.path.removeAttribute("marker-start");
      l.layoutKey = null;
    }

    _removeLink(l) {
      l.g.remove();
      l.label.remove();
    }

    _entPolysFor(id) {
      const ent = this.ents.get(id);
      return ent && ent.mode !== "exit" ? ent.polys : null;
    }

    _entsView() {
      const out = {};
      for (const [id, ent] of this.ents) out[id] = ent.mode === "exit" ? ent.cur : ent.cur;
      return out;
    }

    _layoutLink(l, ents) {
      const s = l.spec;
      const raw = s.pts || [s.from, s.to];
      const grid = raw.map((p) => resolvePoint(p, ents));
      if (grid.length >= 2) {
        const first = raw[0];
        const last = raw[raw.length - 1];
        if (typeof first === "string" && ents[first]) grid[0] = clipEnd(grid, 0, 1, ents[first], this._entPolysFor(first));
        if (typeof last === "string" && ents[last]) grid[grid.length - 1] = clipEnd(grid, grid.length - 1, grid.length - 2, ents[last], this._entPolysFor(last));
      }
      const z = s.z || 0;
      l.pts = grid.map(([x, y]) => P(x, y, z));
      l.len = polyLen(l.pts);
      const key = l.pts.map((p) => `${n1(p[0])},${n1(p[1])}`).join(" ") + `|${s.label || ""}|${s.fail}|${s.shield}|${s.labelTone || ""}|${s.labelAt}`;
      if (key === l.layoutKey) return;
      l.layoutKey = key;
      l.path.setAttribute("d", roundLine(l.pts, 10));

      let deco = "";
      if (s.fail != null && s.fail !== false) {
        const at = pointAt(l.pts, l.len * (s.fail === true ? 0.82 : s.fail));
        deco += `<g transform="translate(${n1(at.x)} ${n1(at.y)})"><circle r="9" fill="${UI.badBg}" stroke="${UI.badFg}" stroke-width="1.8"/><path d="M-3.6,-3.6 L3.6,3.6 M3.6,-3.6 L-3.6,3.6" stroke="${UI.badFg}" stroke-width="2.4" stroke-linecap="round"/></g>`;
      }
      if (s.shield != null) {
        const at = pointAt(l.pts, l.len * s.shield);
        deco += `<g transform="translate(${n1(at.x)} ${n1(at.y)})"><circle r="10" fill="${UI.goodBg}" stroke="${UI.goodFg}" stroke-width="1.8"/>${icon("shield", 0, 0, 12, { stroke: 2.4, color: UI.goodFg })}</g>`;
      }
      l.deco.innerHTML = deco;

      if (s.label) {
        const prefer = s.labelAt == null ? 0.5 : s.labelAt;
        const ats = [prefer, prefer - 0.18, prefer + 0.18, prefer - 0.32, prefer + 0.32]
          .map((t) => Math.max(0.12, Math.min(0.88, t)))
          .filter((t, i, a) => a.indexOf(t) === i);
        const prefSide = s.labelSide === "below" ? -15 : s.labelSide === "above" ? 15 : null;
        const sides = prefSide != null ? [prefSide, -prefSide, prefSide * 2, -prefSide * 2, 34, -34] : [15, -15, 28, -28, 40, -40];
        let best = null;
        for (const t of ats) {
          const at = pointAt(l.pts, l.len * t);
          let nx = -at.dy;
          let ny = at.dx;
          const len = Math.hypot(nx, ny) || 1;
          nx /= len;
          ny /= len;
          if (ny > 0) {
            nx = -nx;
            ny = -ny;
          }
          for (const off of sides) {
            const p = pill(at.x + nx * off, at.y + ny * off, s.label, { tone: s.labelTone, icon: s.labelIcon, size: 13 });
            const box = [p.box[0], p.box[1], p.box[2], p.box[3]];
            let hit = 0;
            for (const ent of this.ents.values()) {
              if (!ent.bounds || ent.cur.type === "card" || ent.cur.type === "zone") continue;
              hit += boxOverlap(box, ent.bounds);
            }
            for (const other of this.links.values()) {
              if (other === l || !other.labelBox) continue;
              hit += boxOverlap(box, other.labelBox) * 1.4;
            }
            if (!best || hit < best.hit) best = { p, hit, box };
            if (hit < 20) break;
          }
          if (best && best.hit < 20) break;
        }
        if (best) {
          l.label.innerHTML = best.p.svg;
          l.labelBox = best.box;
        } else {
          l.label.innerHTML = "";
          l.labelBox = null;
        }
      } else {
        l.label.innerHTML = "";
        l.labelBox = null;
      }
    }

    _linkAnim(l, now) {
      if (!l.mode) return;
      const p = clamp01((now - l.start) / l.dur);
      if (l.mode === "enter") {
        if (now < l.start) {
          l.g.setAttribute("opacity", "0");
          l.label.setAttribute("opacity", "0");
          return;
        }
        const k = easeOut(p);
        if (!l.dash) {
          l.path.setAttribute("pathLength", "100");
          l.path.setAttribute("stroke-dasharray", "100 100");
          l.path.setAttribute("stroke-dashoffset", n1(100 * (1 - k)));
          l.g.setAttribute("opacity", "1");
        } else {
          l.g.setAttribute("opacity", n1(k * 100) / 100);
        }
        l.label.setAttribute("opacity", n1(clamp01((p - 0.5) * 2) * 100) / 100);
        if (p >= 1) {
          l.path.removeAttribute("pathLength");
          l.path.removeAttribute("stroke-dashoffset");
          if (!l.dash) l.path.removeAttribute("stroke-dasharray");
          l.g.setAttribute("opacity", "1");
          l.label.setAttribute("opacity", "1");
          l.mode = null;
        }
      } else if (l.mode === "exit") {
        l.g.setAttribute("opacity", n1((1 - p) * 100) / 100);
        l.label.setAttribute("opacity", n1((1 - p) * 100) / 100);
        if (p >= 1) {
          this._removeLink(l);
          this.links.delete(l.id);
        }
      }
    }

    _routeOf(flow) {
      const segs = [];
      const route = flow.route || [];
      for (let i = 0; i < route.length; i++) {
        const l = this.links.get(route[i]);
        if (!l || l.mode === "exit" || l.pts.length < 2) return null;
        let pts = l.pts;
        if (segs.length) {
          const prev = segs[segs.length - 1].pts;
          const end = prev[prev.length - 1];
          const dA = Math.hypot(pts[0][0] - end[0], pts[0][1] - end[1]);
          const dB = Math.hypot(pts[pts.length - 1][0] - end[0], pts[pts.length - 1][1] - end[1]);
          if (dB < dA) pts = pts.slice().reverse();
        } else if (route.length > 1) {
          const nxt = this.links.get(route[1]);
          if (nxt && nxt.pts.length) {
            const s0 = pts[0], s1 = pts[pts.length - 1];
            const near = (p) => Math.min(Math.hypot(p[0] - nxt.pts[0][0], p[1] - nxt.pts[0][1]), Math.hypot(p[0] - nxt.pts[nxt.pts.length - 1][0], p[1] - nxt.pts[nxt.pts.length - 1][1]));
            if (near(s0) < near(s1)) pts = pts.slice().reverse();
          }
        } else if (flow.reverse) {
          pts = pts.slice().reverse();
        }
        const fail = l.spec.fail;
        segs.push({ pts, len: polyLen(pts), fail: fail == null || fail === false ? null : fail === true ? 0.82 : fail, reversed: pts !== l.pts && pts[0] !== l.pts[0] });
      }
      return segs;
    }

    _spawn(flow, now) {
      const segs = this._routeOf(flow);
      if (!segs) return;
      let total = 0;
      let stopAt = null;
      for (const s of segs) {
        if (s.fail != null && stopAt == null) {
          const f = s.reversed ? 1 - s.fail : s.fail;
          stopAt = total + s.len * f;
        }
        total += s.len;
      }
      if (flow.blocked && stopAt == null) stopAt = total - 2;
      const el = document.createElementNS(NS, "g");
      el.innerHTML = this._packetSvg(flow.kind);
      this.layers.packets.appendChild(el);
      this.packets.push({ flow, el, dist: 0, back: false, kind: flow.kind, stopAt, born: now });
    }

    _packetSvg(kind) {
      const k = PACKETS[kind] || PACKETS.req;
      if (k.shape === "square") return `<rect x="-4.8" y="-4.8" width="9.6" height="9.6" rx="2.4" fill="${k.fill}" stroke="${INK}" stroke-width="1.5"/>`;
      if (k.shape === "diamond") return `<path d="M0,-6 L6,0 L0,6 L-6,0 Z" fill="${k.fill}" stroke="${INK}" stroke-width="1.5" stroke-linejoin="round"/>`;
      if (k.shape === "small") return `<circle r="3.2" fill="${k.fill}" stroke="${INK}" stroke-width="1.3"/>`;
      return `<circle r="4.6" fill="${k.fill}" stroke="${INK}" stroke-width="1.5"/>`;
    }

    _burst(x, y) {
      const el = document.createElementNS(NS, "g");
      el.setAttribute("transform", `translate(${n1(x)} ${n1(y)})`);
      el.innerHTML = `<circle r="5" fill="none" stroke="#c0392b" stroke-width="2"/>`;
      this.layers.packets.appendChild(el);
      this.bursts.push({ el, born: this.time });
    }

    _stepPackets(now, dt) {
      const flowsLive = now >= this.flowStart && !this.paused;
      if (flowsLive) {
        for (const f of this.flows) {
          if (f.delay && now < this.flowStart + f.delay * 1000) continue;
          f.acc += (dt / 1000) * f.rate;
          if (f.first == null) {
            f.first = true;
            f.acc = 1;
          }
          while (f.acc >= 1) {
            f.acc -= 1;
            this._spawn(f, now);
          }
        }
      }
      const speed = 150;
      const alive = [];
      for (const p of this.packets) {
        if (p.dying != null) {
          const a = 1 - clamp01((now - p.dying) / 250);
          p.el.setAttribute("opacity", n1(a * 100) / 100);
          if (a <= 0) {
            p.el.remove();
            continue;
          }
          alive.push(p);
          continue;
        }
        const segs = this._routeOf(p.flow);
        if (!segs) {
          p.el.remove();
          continue;
        }
        const pts = [].concat(...segs.map((s, i) => (i ? s.pts.slice(1) : s.pts)));
        const total = polyLen(pts);
        if (!this.paused) p.dist += (dt / 1000) * speed * (p.flow.speed || 1);
        let d = p.back ? total - p.dist : p.dist;
        if (!p.back && p.stopAt != null && p.dist >= p.stopAt) {
          const at = pointAt(pts, p.stopAt);
          this._burst(at.x, at.y - 5);
          p.el.remove();
          continue;
        }
        if (p.dist >= total) {
          if (p.flow.bounce && !p.back) {
            p.back = true;
            p.dist = 0;
            p.el.innerHTML = this._packetSvg(p.flow.back || "res");
            d = total;
          } else {
            p.el.remove();
            continue;
          }
        }
        const at = pointAt(pts, Math.max(0, d));
        p.el.setAttribute("transform", `translate(${n1(at.x)} ${n1(at.y - 5)})`);
        alive.push(p);
      }
      this.packets = alive;
      this.bursts = this.bursts.filter((b) => {
        const t = clamp01((now - b.born) / 420);
        if (t >= 1) {
          b.el.remove();
          return false;
        }
        b.el.firstChild.setAttribute("r", n1(5 + t * 12));
        b.el.setAttribute("opacity", n1((1 - t) * 100) / 100);
        return true;
      });
    }

    _fitView(nextEnts, nextLinks) {
      const boxes = [];
      for (const raw of Object.values(nextEnts)) {
        const fn = DRAW[raw.type];
        if (fn) boxes.push(fn(Object.assign({}, raw, { lift: 0, opacity: 1 })).bounds);
      }
      for (const spec of Object.values(nextLinks)) {
        const pts = (spec.pts || [spec.from, spec.to]).map((p) => P(...resolvePoint(p, nextEnts)));
        if (pts.length) boxes.push(bbox(pts, [10, 24, 10, 10]));
        if (spec.label && pts.length) {
          const at = pointAt(pts, polyLen(pts) * (spec.labelAt == null ? 0.5 : spec.labelAt));
          const w = textW(spec.label, 13) + 40;
          boxes.push([at.x - w / 2, at.y - 30, at.x + w / 2, at.y + 30]);
        }
      }
      if (!boxes.length) return [-300, -180, 600, 360];
      let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
      for (const b of boxes) {
        x0 = Math.min(x0, b[0]);
        y0 = Math.min(y0, b[1]);
        x1 = Math.max(x1, b[2]);
        y1 = Math.max(y1, b[3]);
      }
      const pad = 26;
      x0 -= pad;
      y0 -= pad;
      x1 += pad;
      y1 += pad;
      const minW = 560;
      const minH = 320;
      if (x1 - x0 < minW) {
        const c = (x0 + x1) / 2;
        x0 = c - minW / 2;
        x1 = c + minW / 2;
      }
      if (y1 - y0 < minH) {
        const c = (y0 + y1) / 2;
        y0 = c - minH / 2;
        y1 = c + minH / 2;
      }
      const cw = x1 - x0;
      const ch = y1 - y0;
      const rect = this.host.getBoundingClientRect();
      if (!rect.width || !rect.height) return [x0, y0, cw, ch];
      const inset = this.inset() || {};
      const top = inset.top || 0;
      const availH = Math.max(80, rect.height - top - (inset.bottom || 0));
      const s = Math.min(rect.width / cw, availH / ch);
      const vw = rect.width / s;
      const vh = rect.height / s;
      return [x0 - (vw - cw) / 2, y0 - top / s - (availH / s - ch) / 2, vw, vh];
    }

    _tick(ts) {
      const dt = this.last ? Math.min(64, ts - this.last) : 16;
      this.last = ts;
      this.time += dt;
      const now = this.time;

      for (const ent of [...this.ents.values()]) this._tween(ent, now);

      const ents = this._entsView();
      const linkList = [...this.links.values()];
      for (const l of linkList) l.labelBox = null;
      for (let pass = 0; pass < 2; pass++) {
        for (const l of linkList) this._layoutLink(l, ents);
      }
      for (const l of linkList) this._linkAnim(l, now);

      if (this.viewTo) {
        const p = clamp01((now - this.viewStart) / 820);
        const k = easeInOut(p);
        const v = this.viewFrom.map((a, i) => lerp(a, this.viewTo[i], k));
        this.view = v;
        this.svg.setAttribute("viewBox", v.map((n) => n1(n)).join(" "));
      }

      this._stepPackets(now, dt);
      this.raf = requestAnimationFrame(this._tick);
    }
  }

  function packetSwatch(kind) {
    const k = PACKETS[kind] || PACKETS.req;
    const shape =
      k.shape === "square"
        ? `<rect x="2.2" y="2.2" width="9.6" height="9.6" rx="2.4" fill="${k.fill}" stroke="${INK}" stroke-width="1.4"/>`
        : k.shape === "diamond"
          ? `<path d="M7,1 L13,7 L7,13 L1,7 Z" fill="${k.fill}" stroke="${INK}" stroke-width="1.4"/>`
          : `<circle cx="7" cy="7" r="${k.shape === "small" ? 3.4 : 4.6}" fill="${k.fill}" stroke="${INK}" stroke-width="1.4"/>`;
    return `<svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">${shape}</svg>`;
  }

  global.SD = Object.assign(global.SD || {}, { Stage, icon, packetSwatch, PACKETS, setTheme, getTheme: () => themeName });
})(window);
