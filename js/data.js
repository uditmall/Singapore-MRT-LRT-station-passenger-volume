/* data.js - stations, months, line filter, values and scale statistics */
(function (M) {
  "use strict";
  const C = M.config, H0 = M.H0, NH = M.NH;
  M.stations = window.MRT_STATIONS.map((r, i) => ({ i, code: r[0], name: r[1], lat: r[2], lng: r[3], lines: r[4] }));
  M.N = M.stations.length;
  M.lines = window.MRT_LINES;
  M.manifest = window.MRT_MANIFEST || [];
  M.monthData = {};
  M.registerMonth = (m, d) => { M.monthData[m] = d; };

  /* ---- state ---- */
  M.state = { month: null, t: 8, playing: false, speed: 1, sel: -1, hover: -1, hoverLine: null, lines: new Set(C.lineChips.map(c => c.id)) };
  for (const f of C.filters) M.state[f.key] = f.default;
  M.entry = () => M.manifest.find(m => m.month === M.state.month);
  M.data = () => M.monthData[M.state.month];

  /* ---- load a month by adding its script tag (works from file:// and from a server) ---- */
  M.loadMonth = (month, done, fail) => {
    if (M.monthData[month]) return done();
    const e = M.manifest.find(m => m.month === month);
    if (!e) return fail && fail("Month not in manifest");
    const s = document.createElement("script");
    s.src = e.file; s.onload = () => M.monthData[month] ? done() : fail && fail("File loaded but did not register " + month);
    s.onerror = () => fail && fail("Could not load " + e.file);
    document.head.appendChild(s);
  };

  /* ---- line filter ---- */
  const allOn = () => M.state.lines.size === C.lineChips.length;
  M.allLines = allOn;
  M.visible = new Uint8Array(M.N);
  M.recomputeVisible = () => {
    for (const s of M.stations) M.visible[s.i] = s.lines.some(l => M.state.lines.has(l)) ? 1 : 0;
    M.cacheClear();
  };
  M.activeKey = () => [...M.state.lines].sort().join(",");
  M.selectionLabel = () => {
    if (allOn()) return "Whole network";
    if (!M.state.lines.size) return "No lines selected";
    return "Selected: " + C.lineChips.filter(c => M.state.lines.has(c.id)).map(c => c.label).join(" · ");
  };
  M.lineStations = id => M.stations.filter(s => s.lines.includes(id));   // interchanges appear once per line

  /* ---- values ---- */
  const idx = (t) => { const x = Math.min(Math.max(t - H0, 0), NH - 1), a = Math.floor(x), b = Math.min(a + 1, NH - 1); return [a, b, x - a]; };
  const vAt = (meas, day, s, h) => C.measures[meas].fn(M.data(), day, s, h);
  M.vAt = vAt;
  M.val = (day, meas, s, t) => { const [a, b, f] = idx(t); return vAt(meas, day, s, a) * (1 - f) + vAt(meas, day, s, b) * f; };
  M.raw = (d, name, day, s, t) => { const [a, b, f] = idx(t); return d[name][day][s][a] * (1 - f) + d[name][day][s][b] * f; };

  /* ---- scale statistics (peak per station, global max) ---- */
  let cache = {};
  M.cacheClear = () => { cache = {}; };
  M.stats = (day, meas) => {
    const basis = M.S.fixedBasis === "selected" ? "selected" : "network";
    const k = [M.state.month, day, meas, basis, basis === "selected" ? M.activeKey() : ""].join("|");
    if (cache[k]) return cache[k];
    const N = M.N, peak = new Float64Array(N), use = s => basis === "network" || M.visible[s];
    let gmax = 0; const all = [];
    for (let s = 0; s < N; s++) {
      let p = 0;
      for (let h = 0; h < NH; h++) { const v = Math.abs(vAt(meas, day, s, h)); if (v > p) p = v; if (use(s)) all.push(v); }
      peak[s] = p; if (use(s) && p > gmax) gmax = p;
    }
    if (C.measures[meas].kind === "div") {            /* diverging: ignore the most extreme few so a handful of big stations do not wash out the rest */
      all.sort((a, b) => a - b);
      gmax = all[Math.min(all.length - 1, Math.floor(all.length * C.scale.netClipPercentile))] || 1;
    }
    return cache[k] = { gmax: gmax || 1, peak };
  };

  /* ---- totals over the visible stations (each station counted once) ---- */
  M.totals = (day, name) => {
    const d = M.data(), out = new Array(NH).fill(0);
    for (let s = 0; s < M.N; s++) if (M.visible[s]) for (let h = 0; h < NH; h++) out[h] += d[name][day][s][h];
    return out;
  };
  /* per-line figures for the line tooltip: stations counted once per line */
  M.lineFigures = (id, day, t) => {
    const d = M.data(); let n = 0, vi = 0, vo = 0;
    for (const s of M.stations) if (s.lines.includes(id)) { n++; vi += M.raw(d, "in", day, s.i, t); vo += M.raw(d, "out", day, s.i, t); }
    return { n, vi, vo };
  };
})(window.MRT);

