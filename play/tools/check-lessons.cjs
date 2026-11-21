#!/usr/bin/env node
/* Static checks for animated lessons.
   node play/tools/check-lessons.cjs                 every lesson listed in index.html
   node play/tools/check-lessons.cjs lessons/jwt.js  only the given files (paths relative to play/ or absolute) */
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
global.window = global;
const load = (file) => (0, eval)(fs.readFileSync(file, "utf8"));
load(path.join(root, "engine/icons.js"));
load(path.join(root, "engine/dsl.js"));

const data = JSON.parse(fs.readFileSync(path.join(root, "data/practice.json"), "utf8"));
const TOPICS = new Set(Object.keys(data.topics));
const ICONS = new Set(Object.keys(window.SD_ICONS));
const PACKETS = new Set(["req", "mine", "res", "poison", "empty", "write", "secret", "ping", "slow"]);
const CHAPTERS = new Set(["problem", "attack", "technique", "solution", "insight", "tradeoff", "setup", "recap"]);
const CALLOUTS = new Set(["warn", "tip", "insight", "next"]);
const TYPES = new Set(["block", "device", "db", "crowd", "ghost", "zone", "card"]);
const BANNED_CHARS = /[\u2013\u2014\u2018\u2019\u201c\u201d\u200b-\u200f\ufeff\u202a-\u202e]/g;
const BANNED_WORDS = /\b(delve|tapestry|game-changer|let's dive|in conclusion|at its core|it's important to note|landscape)\b/gi;

const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const listed = [...html.matchAll(/src="(lessons\/[^"]+)"/g)].map((m) => m[1]);
const args = process.argv.slice(2);
const files = (args.length ? args : listed).map((f) => (path.isAbsolute(f) ? f : path.join(root, f.replace(/^play\//, ""))));

let problems = 0;
const bad = (msg) => {
  problems++;
  console.log("  ! " + msg);
};

for (const file of files) {
  if (!fs.existsSync(file)) {
    console.log(`- ${path.relative(root, file)}: not written yet, skipped`);
    continue;
  }
  const before = new Set(Object.keys(SD.LESSONS));
  const src = fs.readFileSync(file, "utf8");
  try {
    load(file);
  } catch (e) {
    console.log(`${path.relative(root, file)}`);
    bad(`script error: ${e.message}`);
    continue;
  }
  const added = Object.keys(SD.LESSONS).filter((id) => !before.has(id));
  if (added.length !== 1) {
    console.log(`${path.relative(root, file)}`);
    bad(`expected exactly one SD.lesson() call, found ${added.length}`);
    continue;
  }
  const id = added[0];
  const L = SD.LESSONS[id];
  console.log(`${id}: ${L.steps.length} steps (${path.relative(root, file)})`);

  const m = src.match(BANNED_CHARS);
  if (m) bad(`banned characters: ${[...new Set(m)].map((c) => "U+" + c.charCodeAt(0).toString(16).padStart(4, "0")).join(", ")}`);
  const w = src.match(BANNED_WORDS);
  if (w) bad(`filler words: ${[...new Set(w.map((x) => x.toLowerCase()))].join(", ")}`);

  if (!TOPICS.has(id)) bad(`lesson id "${id}" is not a topic id in data/practice.json`);
  for (const c of L.covers || []) if (!TOPICS.has(c)) bad(`covers "${c}" is not a topic id`);
  for (const k of ["title", "summary", "minutes", "level", "metrics", "legend", "goals", "steps"]) if (L[k] == null) bad(`missing ${k}`);
  if (L.steps.length < 8 || L.steps.length > 13) bad(`${L.steps.length} steps; aim for 9 to 12`);

  const icon = (where, name) => name && !ICONS.has(name) && bad(`${where}: unknown icon "${name}"`);
  (L.metrics || []).forEach((mt) => icon(`metric ${mt.id}`, mt.icon));
  (L.legend || []).forEach((it) => {
    const k = Array.isArray(it) ? it[0] : it;
    if (!PACKETS.has(k)) bad(`legend kind "${k}"`);
  });
  (L.goals || []).forEach((g) => {
    if (!(g.step >= 0 && g.step < L.steps.length)) bad(`goal step out of range: ${g.step}`);
  });

  L.steps.forEach((s, i) => {
    const where = `step ${i + 1} (${s.short})`;
    for (const k of ["short", "chapter", "title", "body", "metrics", "scene"]) if (s[k] == null) bad(`${where}: missing ${k}`);
    if (!CHAPTERS.has(s.chapter)) bad(`${where}: chapter "${s.chapter}"`);
    if (!s.callout) bad(`${where}: no callout`);
    else if (!CALLOUTS.has(s.callout.kind)) bad(`${where}: callout kind "${s.callout.kind}"`);
    if (!Array.isArray(s.body) || s.body.length < 2) bad(`${where}: body needs 2 paragraphs`);
    if (s.short && s.short.length > 16) bad(`${where}: short label over 16 chars`);
    if (i > 0 && i < L.steps.length - 1 && !(s.changes && s.changes.length)) bad(`${where}: no changes list`);
    for (const mt of L.metrics || []) if (!s.metrics || !(mt.id in s.metrics)) bad(`${where}: missing metric "${mt.id}"`);
    const sc = s.scene || {};
    const ents = sc.entities || {};
    for (const [eid, e] of Object.entries(ents)) {
      if (!TYPES.has(e.type)) bad(`${where}: entity ${eid} has type "${e.type}"`);
      icon(`${where} ${eid}.glyph`, e.glyph);
      icon(`${where} ${eid}.labelIcon`, e.labelIcon);
      if (e.type === "card") icon(`${where} ${eid}.icon`, e.icon);
      (e.tags || []).forEach((t) => icon(`${where} ${eid} tag "${t.text}"`, t.icon));
      if ((e.tags || []).length > 2) bad(`${where}: ${eid} has ${e.tags.length} tags; keep it to 1 or 2`);
    }
    const links = sc.links || {};
    const labels = new Set(Object.values(links).map((l) => l.label).filter(Boolean));
    for (const [eid, e] of Object.entries(ents)) for (const t of e.tags || []) if (labels.has(t.text)) bad(`${where}: tag on ${eid} repeats a link label: "${t.text}"`);
    for (const [lid, l] of Object.entries(links)) {
      for (const p of l.pts || []) {
        const parts = typeof p === "string" ? [p] : p.filter((v) => typeof v === "string");
        for (const part of parts) {
          const base = (/^([\w-]+?)([+-][\d.]+)?$/.exec(part) || [])[1] || part;
          if (!ents[base]) bad(`${where}: link ${lid} points at missing entity "${base}"`);
        }
      }
      icon(`${where} link ${lid}`, l.labelIcon);
    }
    for (const f of sc.flows || []) {
      if (!PACKETS.has(f.kind)) bad(`${where}: flow kind "${f.kind}"`);
      if (f.back && !PACKETS.has(f.back)) bad(`${where}: flow back "${f.back}"`);
      for (const r of f.route) if (!links[r]) bad(`${where}: flow uses missing link "${r}"`);
    }
  });
  const last = L.steps[L.steps.length - 1];
  if (last && last.chapter !== "recap") bad("last step should be the recap");
  if (last && !(last.body || []).some((b) => /class="compare"/.test(b))) bad("recap should include a table.compare");
}
console.log(problems ? `${problems} problem(s)` : "OK");
process.exit(problems ? 1 : 0);
