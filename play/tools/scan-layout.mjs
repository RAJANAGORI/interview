#!/usr/bin/env node
/* Headless layout scan for animated lessons.
   Needs the local server: python3 -m http.server 8765 (repo root).
   node play/tools/scan-layout.mjs            # all lessons
   node play/tools/scan-layout.mjs cors-and-sop jwt-json-web-token-
   Options: --base URL --wait ms --width N --height N --limit N */
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(name);
  if (i < 0) return def;
  const v = argv[i + 1];
  argv.splice(i, 2);
  return v;
};
const base = opt("--base", "http://127.0.0.1:8765/play/");
const wait = Number(opt("--wait", "950"));
const width = Number(opt("--width", "1440"));
const height = Number(opt("--height", "900"));
const limit = Number(opt("--limit", "0"));
const ids = argv;

const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const port = 9400 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(path.join(os.tmpdir(), "sdscan-"));
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`,
    `--window-size=${width},${height}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--hide-scrollbars",
    "--mute-audio",
    "about:blank",
  ],
  { stdio: "ignore" }
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cleanup = () => {
  try {
    chrome.kill("SIGKILL");
  } catch {}
  try {
    rmSync(profile, { recursive: true, force: true });
  } catch {}
};
process.on("exit", cleanup);

let target;
for (let i = 0; i < 80 && !target; i++) {
  await sleep(200);
  try {
    target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: "PUT" })).json();
  } catch {}
}
if (!target) {
  console.error("could not start headless Chrome");
  process.exit(2);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r, j) => {
  ws.onopen = r;
  ws.onerror = j;
});
let seq = 0;
const pending = new Map();
const errors = [];
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data);
  if (msg.id && pending.has(msg.id)) {
    const { res, rej } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? rej(new Error(msg.error.message)) : res(msg.result);
  } else if (msg.method === "Runtime.exceptionThrown") {
    const d = msg.params.exceptionDetails;
    errors.push((d.exception && d.exception.description) || d.text);
  }
};
const send = (method, params = {}) =>
  new Promise((res, rej) => {
    const id = ++seq;
    pending.set(id, { res, rej });
    ws.send(JSON.stringify({ id, method, params }));
  });
const evaluate = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) {
    throw new Error(r.exceptionDetails.exception ? r.exceptionDetails.exception.description : r.exceptionDetails.text);
  }
  return r.result.value;
};

await send("Page.enable");
await send("Runtime.enable");
await send("Network.enable");
await send("Network.setCacheDisabled", { cacheDisabled: true });
await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile: false });

const bootUrl = `${base}${base.includes("?") ? "&" : "?"}scan=${Date.now()}#/`;
await send("Page.navigate", { url: bootUrl });

let allIds = [];
let lastN = 0;
for (let i = 0; i < 200; i++) {
  await sleep(250);
  try {
    const info = await evaluate(`(() => ({
      n: Object.keys((window.SD && SD.LESSONS) || {}).length,
      kids: !!(document.getElementById("view") && document.getElementById("view").children.length),
      href: location.href
    }))()`);
    if (i < 4 || i % 20 === 0) console.log(`boot ${i}: lessons=${info.n} view=${info.kids} ${info.href}`);
    if (info.n >= 50 && info.kids) {
      if (info.n === lastN) {
        await sleep(1200);
        const stable = await evaluate(`(() => ({ n: Object.keys(SD.LESSONS).length, ids: Object.keys(SD.LESSONS).sort() }))()`);
        // Prefer a full curriculum (~100). Accept a stable count only after it stops growing.
        if (stable.n === lastN && (stable.n >= 95 || i > 60)) {
          allIds = stable.ids;
          break;
        }
        lastN = stable.n;
      } else {
        lastN = info.n;
      }
    }
  } catch (err) {
    if (i < 4 || i % 20 === 0) console.log(`boot ${i}: err ${err.message}`);
  }
}
if (!Array.isArray(allIds) || !allIds.length) {
  console.error("play app did not boot (SD.LESSONS empty). Is the server running at", base, "?");
  process.exit(2);
}
console.log(`booted ${allIds.length} lessons`);

const selected = ids.length ? ids.filter((id) => allIds.includes(id)) : allIds;
const missing = ids.filter((id) => !allIds.includes(id));
for (const id of missing) console.log(`${id}: not registered`);

const MEASURE = `(() => {
  const inter = (a, b) => {
    const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
    const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
    return w > 0 && h > 0 ? w * h : 0;
  };
  const shrink = (r, k) => ({ left: r.left + k, right: r.right - k, top: r.top + k, bottom: r.bottom - k });
  const svg = document.querySelector('#stageHost svg');
  if (!svg) return ['no stage on the page'];
  const host = document.querySelector('#stageHost').getBoundingClientRect();
  if (host.width < 40 || host.height < 40) return ['stage host has no size'];
  const label = (el, pre) => pre + el.textContent.trim().replace(/\\s+/g, ' ').slice(0, 36);
  const pills = [...svg.querySelectorAll('.sd-over .pill, .sd-links .pill')].map((p) => ({ r: p.getBoundingClientRect(), t: label(p, '') })).filter((p) => p.r.width > 0);
  const zones = [...svg.querySelectorAll('.sd-floor text')].map((p) => ({ r: p.getBoundingClientRect(), t: label(p, 'zone: ') }));
  const cards = [...svg.querySelectorAll('.sd-hud > g')].filter((g) => g.getBoundingClientRect().width > 0).map((g) => ({ r: g.getBoundingClientRect(), t: 'card "' + ((g.querySelector('text') || {}).textContent || '').trim().slice(0, 28) + '"' }));
  const bodies = [...svg.querySelectorAll('.sd-ents > g')].map((g) => ({ r: shrink(g.getBoundingClientRect(), 10) }));
  const ui = [...document.querySelectorAll('.stage-card .metric, .stage-card .legend, .stage-card .stage-ctrl')].map((e) => ({ r: e.getBoundingClientRect(), t: e.classList.contains('metric') ? 'metric chip' : e.classList.contains('legend') ? 'legend' : 'replay/pause buttons' }));
  const out = [];
  const items = pills.concat(cards, zones);
  for (let a = 0; a < items.length; a++) {
    for (let b = a + 1; b < items.length; b++) {
      const ov = inter(items[a].r, items[b].r);
      if (ov > 60) out.push('overlap: "' + items[a].t + '" and "' + items[b].t + '" (' + Math.round(ov) + 'px2)');
    }
    for (const o of ui) if (inter(items[a].r, o.r) > 30) out.push('"' + items[a].t + '" is under the ' + o.t);
    const r = items[a].r;
    if (r.left < host.left - 2 || r.right > host.right + 2 || r.top < host.top - 2 || r.bottom > host.bottom + 2) {
      out.push('"' + items[a].t + '" is outside the stage');
    }
  }
  for (const c of cards) for (const e of bodies) {
    const ov = inter(c.r, e.r);
    if (ov > 200) out.push(c.t + ' covers an entity (' + Math.round(ov) + 'px2)');
  }
  return out;
})()`;

async function gotoStep(id, step) {
  errors.length = 0;
  await evaluate(`location.hash = ${JSON.stringify(`#/${id}/${step}`)}`);
  for (let i = 0; i < 40; i++) {
    const ok = await evaluate(`!!(document.querySelector('#stageHost svg') && location.hash.indexOf(${JSON.stringify(id)}) >= 0)`);
    if (ok) break;
    await sleep(120);
  }
  await sleep(wait);
}

let total = 0;
const report = [];
const todo = limit > 0 ? selected.slice(0, limit) : selected;
console.log(`scanning ${todo.length} lessons at ${width}x${height}`);

for (const id of todo) {
  const n = await evaluate(`SD.LESSONS[${JSON.stringify(id)}].steps.length`);
  const lessonHits = [];
  for (let s = 1; s <= n; s++) {
    await gotoStep(id, s);
    const issues = await evaluate(MEASURE);
    issues.push(...errors.map((e) => "script error: " + String(e).split("\n")[0]));
    if (!issues.length) continue;
    const short = await evaluate(`SD.LESSONS[${JSON.stringify(id)}].steps[${s - 1}].short`);
    total += issues.length;
    lessonHits.push({ step: s, short, issues });
  }
  if (lessonHits.length) {
    console.log(`${id}: ${lessonHits.length}/${n} steps with issues`);
    for (const hit of lessonHits) {
      console.log(`  step ${hit.step} ${hit.short}:`);
      for (const i of hit.issues) console.log(`    - ${i}`);
    }
    report.push({ id, hits: lessonHits });
  } else {
    console.log(`${id}: clean (${n})`);
  }
}

const outPath = path.join(os.tmpdir(), "play-overlap-report.json");
writeFileSync(outPath, JSON.stringify({ total, lessons: report }, null, 2));
console.log(total ? `${total} issue(s)` : "all clean");
console.log(`report: ${outPath}`);
ws.close();
cleanup();
process.exit(total || missing.length ? 1 : 0);
