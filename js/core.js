/* core.js - namespace, helpers, settings store */
window.MRT = window.MRT || {};
(function (M) {
  "use strict";
  const C = M.config = window.MRT_CONFIG;
  M.$ = s => document.querySelector(s);
  M.pad = n => String(n).padStart(2, "0");
  M.fmt = v => Math.abs(v) >= 10000 ? (v / 1000).toFixed(Math.abs(v) >= 100000 ? 0 : 1) + "k" : Math.round(v).toLocaleString("en-SG");
  M.fmtSigned = v => (v > 0 ? "+" : v < 0 ? "−" : "") + M.fmt(Math.abs(v));
  M.esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  M.H0 = 5; M.H1 = 23; M.NH = 19;

  /* colour helpers */
  M.hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  M.toHex = c => "#" + c.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");
  M.css = (c, a = 1) => `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},${a})`;
  M.mix = (a, b, t) => [0, 1, 2].map(k => a[k] + (b[k] - a[k]) * t);
  M.lum = c => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
  M.contrast = (a, b) => { const x = M.lum(a), y = M.lum(b), hi = Math.max(x, y), lo = Math.min(x, y); return (hi + .05) / (lo + .05); };
  /* 7-step ramp from one base colour: base is the middle step; lighter steps mix to white (up to 82%), darker to black (up to 62%) */
  M.rampFromBase = hex => {
    const b = M.hex(hex), out = [];
    for (let i = 0; i < 7; i++) out.push(i < 3 ? M.mix(b, [255, 255, 255], (3 - i) / 3 * 0.82) : i === 3 ? b : M.mix(b, [0, 0, 0], (i - 3) / 3 * 0.62));
    return out;
  };

  /* settings: defaults come from config, user changes are saved in this browser (never a private tile key) */
  const KEY = "mrtmap.settings.v1";
  M.defaults = () => ({
    inBase: C.colours.in, outBase: C.colours.out, netPos: C.colours.netPos, netNeg: C.colours.netNeg, netMid: C.colours.netMid,
    heatSeparate: C.heat.separate, heatLow: C.heat.low, heatHigh: C.heat.high, heatGlow: C.heat.glow,
    lineMode: C.lines.mode, lineOpacity: C.lines.opacity, lineWidth: C.lines.width,
    circleMin: C.circles.min, circleMax: C.circles.max, netFactor: C.circles.netFactor,
    basemap: C.basemap.default, basemapOpacity: 100, fixedBasis: C.scale.fixedBasis
  });
  M.S = M.defaults();
  try { Object.assign(M.S, JSON.parse(localStorage.getItem(KEY) || "{}")); } catch (e) {}
  M.version = 0;
  const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(M.S)); } catch (e) {} };
  M.setSetting = (k, v) => { M.S[k] = v; M.version++; persist(); M.cacheClear(); M.redraw(); };
  M.resetSettings = () => { M.S = M.defaults(); M.version++; try { localStorage.removeItem(KEY); } catch (e) {} M.cacheClear(); M.redraw(); };
  M.importSettings = obj => { const d = M.defaults(); for (const k in d) if (k in obj) M.S[k] = obj[k]; M.version++; persist(); M.cacheClear(); M.redraw(); };
  M.exportSettings = () => JSON.stringify(M.S, null, 2);

  /* derived colours, cached until a setting changes */
  let dc = null, dcv = -1;
  M.derived = () => {
    if (dc && dcv === M.version) return dc;
    dcv = M.version;
    const ramps = { in: M.rampFromBase(M.S.inBase), out: M.rampFromBase(M.S.outBase) };
    dc = { ramps, pos: M.hex(M.S.netPos), neg: M.hex(M.S.netNeg), mid: M.hex(M.S.netMid) };
    return dc;
  };
  M.redraw = () => {};          /* replaced by mapview */
  M.cacheClear = () => {};      /* replaced by data */
})(window.MRT);

