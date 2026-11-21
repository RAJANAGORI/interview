/* Authoring helpers for lessons. Lessons call SD.lesson({...}) to register. */
(function (global) {
  "use strict";
  const SD = (global.SD = global.SD || {});
  SD.LESSONS = SD.LESSONS || {};

  SD.block = (x, y, o = {}) => Object.assign({ type: "block", x, y }, o);
  SD.device = (x, y, o = {}) => Object.assign({ type: "device", x, y }, o);
  SD.phone = (x, y, o = {}) => Object.assign({ type: "device", x, y, form: "phone", w: 5, d: 5 }, o);
  SD.db = (x, y, o = {}) => Object.assign({ type: "db", x, y }, o);
  SD.crowd = (box, count, label, o = {}) => Object.assign({ type: "crowd", x0: box[0], x1: box[1], y0: box[2], y1: box[3], count, label }, o);
  SD.ghost = (x, y, label, o = {}) => Object.assign({ type: "ghost", x, y, label }, o);
  SD.zone = (box, label, tone = "gray", o = {}) => Object.assign({ type: "zone", x0: box[0], x1: box[1], y0: box[2], y1: box[3], label, tone }, o);
  SD.card = (at, title, lines, o = {}) => Object.assign({ type: "card", x: at.x, y: at.y, z: at.z || 0, dx: at.dx || 0, dy: at.dy || 0, title, lines }, o);

  /* link(from, to, { via: [...waypoints], heads, label, style, tone, fail, shield }) */
  SD.link = (from, to, o = {}) => {
    const via = o.via || [];
    const out = Object.assign({ from, to, heads: "end" }, o, { pts: o.pts || [from, ...via, to] });
    delete out.via;
    return out;
  };
  SD.both = (from, to, o = {}) => SD.link(from, to, Object.assign({ heads: "both" }, o));

  SD.tag = (text, tone, icon) => ({ text, tone, icon });
  SD.red = (text, icon = "alert") => ({ text, tone: "red", icon });
  SD.green = (text, icon = "check") => ({ text, tone: "green", icon });
  SD.amber = (text, icon) => ({ text, tone: "amber", icon });
  SD.violet = (text, icon) => ({ text, tone: "violet", icon });
  SD.gray = (text, icon) => ({ text, tone: "gray", icon });
  SD.note = (text, icon) => ({ text, icon });

  /* flow(route, kind, opts): packets along link ids */
  SD.flow = (route, kind = "req", o = {}) => Object.assign({ route: Array.isArray(route) ? route : [route], kind }, o);
  SD.rt = (route, kind = "mine", o = {}) => SD.flow(route, kind, Object.assign({ bounce: true }, o));

  /* metric value helpers */
  SD.bad = (v) => [v, "bad"];
  SD.good = (v) => [v, "good"];
  SD.warn = (v) => [v, "warn"];

  SD.lesson = (def) => {
    SD.LESSONS[def.id] = def;
    return def;
  };

  /* Merge helper so steps can extend a base scene: scene(base, {entities:{...}, links:{...}, flows:[...]}) */
  SD.scene = (base, extra = {}) => ({
    entities: Object.assign({}, base.entities || {}, extra.entities || {}),
    links: Object.assign({}, extra.replaceLinks ? {} : base.links || {}, extra.links || {}),
    flows: extra.flows || base.flows || [],
  });

  SD.without = (obj, ...keys) => {
    const out = Object.assign({}, obj);
    keys.forEach((k) => delete out[k]);
    return out;
  };
})(window);
