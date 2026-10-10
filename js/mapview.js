/* mapview.js - canvas map: basemap tiles, rail lines, circles, heat layer, hover and click */
(function (M) {
  "use strict";
  const C = M.config, S = M.stations, N = M.N, st = M.state, $ = M.$;
  const cv = $("#cv"), ctx = cv.getContext("2d"), app = $("#app");
  let W = 0, Hh = 0, DPR = 1;
  const heatCv = document.createElement("canvas"), hctx = heatCv.getContext("2d", { willReadFrequently: true });
  const lut = document.createElement("canvas"); lut.width = 1; lut.height = 256; const lutCtx = lut.getContext("2d", { willReadFrequently: true });
  const view = { lat: 1.3521, lng: 103.8198, z: 11.4 }, HOME = { lat: 1.3521, lng: 103.8198, z: 11.4 };
  const Z0 = 9.5, Z1 = 17.5;
  M.view = view;

  /* Web Mercator */
  const wx = (lng, z) => 256 * Math.pow(2, z) * (lng + 180) / 360;
  const wy = (lat, z) => { const s = Math.sin(lat * Math.PI / 180); return 256 * Math.pow(2, z) * (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)); };
  const ix = (x, z) => x / (256 * Math.pow(2, z)) * 360 - 180;
  const iy = (y, z) => { const n = Math.PI - 2 * Math.PI * y / (256 * Math.pow(2, z)); return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))); };
  const project = (lat, lng) => [W / 2 + wx(lng, view.z) - wx(view.lng, view.z), Hh / 2 + wy(lat, view.z) - wy(view.lat, view.z)];
  function fitHome() {
    const b = [103.63, 1.25, 104.02, 1.46], padX = 30, padT = 30, padB = 60;
    for (let z = 16; z >= 9; z -= 0.05) if (wx(b[2], z) - wx(b[0], z) <= W - padX * 2 && wy(b[1], z) - wy(b[3], z) <= Hh - padT - padB) { HOME.z = z; break; }
    HOME.lng = (b[0] + b[2]) / 2; HOME.lat = (b[1] + b[3]) / 2;
  }
  function resize() {
    const r = app.getBoundingClientRect(); W = r.width; Hh = r.height; DPR = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = W * DPR; cv.height = Hh * DPR; heatCv.width = Math.ceil(W / 2); heatCv.height = Math.ceil(Hh / 2);
    const first = !resize.done; resize.done = true; fitHome();
    if (first) { view.lat = HOME.lat; view.lng = HOME.lng; view.z = HOME.z; }
    draw();
  }

  /* ---------- basemap ---------- */
  M.basemaps = () => Object.entries(C.basemap.providers).filter(([k, p]) => !p.needsKey || C.basemap.key).map(([k, p]) => ({ id: k, label: p.label }));
  M.providerId = () => { const id = M.S.basemap, p = C.basemap.providers[id]; return p && (!p.needsKey || C.basemap.key) ? id : (C.basemap.providers.osm ? "osm" : "none"); };
  M.provider = () => C.basemap.providers[M.providerId()];
  let tiles = new Map(), tileOK = 0, tileFail = 0, tilesDead = false, curProv = null;
  function tileUrl(p, z, x, y) { return p.url.replace("{s}", (p.subdomains || "abcd")[(x + y) % (p.subdomains || "abcd").length]).replace("{z}", z).replace("{x}", x).replace("{y}", y).replace("{key}", encodeURIComponent(C.basemap.key)); }
  function getTile(p, z, x, y) {
    const k = z + "/" + x + "/" + y; let t = tiles.get(k);
    if (!t) {
      t = { img: new Image(), ok: false };
      t.img.onload = () => { t.ok = true; tileOK++; schedule(); };
      t.img.onerror = () => { tileFail++; if (tileOK === 0 && tileFail >= 4) tilesFailed(); };
      t.img.src = tileUrl(p, z, x, y); tiles.set(k, t);
      if (tiles.size > 500) tiles.delete(tiles.keys().next().value);
    }
    return t;
  }
  function tilesFailed() {
    if (tilesDead || tileOK > 0) return; tilesDead = true;
    console.warn("Basemap tiles did not load."); M.basemapFailed = true; schedule();
  }
  setTimeout(() => { if (tileOK === 0 && M.providerId() !== "none") tilesFailed(); }, 9000);
  function drawTiles() {
    const id = M.providerId();
    if (id !== curProv) { curProv = id; tiles = new Map(); tileOK = tileFail = 0; tilesDead = false; M.basemapFailed = false; setTimeout(() => { if (tileOK === 0 && curProv === id && id !== "none") tilesFailed(); }, 9000); }
    const p = C.basemap.providers[id];
    if (!p.url || tilesDead) return;
    const tz = Math.min(18, Math.max(0, Math.round(view.z))), sc = Math.pow(2, view.z - tz), n = Math.pow(2, tz);
    const cx = wx(view.lng, tz), cy = wy(view.lat, tz);
    const x0 = Math.floor((cx - W / 2 / sc) / 256), x1 = Math.floor((cx + W / 2 / sc) / 256), y0 = Math.floor((cy - Hh / 2 / sc) / 256), y1 = Math.floor((cy + Hh / 2 / sc) / 256);
    let drew = false; ctx.globalAlpha = Math.min(1, Math.max(0.1, (M.S.basemapOpacity || 100) / 100));
    for (let x = x0; x <= x1; x++) for (let y = y0; y <= y1; y++) {
      if (y < 0 || y >= n) continue;
      const t = getTile(p, tz, ((x % n) + n) % n, y);
      if (t.ok) { ctx.drawImage(t.img, W / 2 + (x * 256 - cx) * sc, Hh / 2 + (y * 256 - cy) * sc, 256 * sc + 0.7, 256 * sc + 0.7); drew = true; }
    }
    ctx.globalAlpha = 1;
    if (drew) { ctx.fillStyle = "rgba(255,255,255," + (0.28 * (M.S.basemapOpacity || 100) / 100) + ")"; ctx.fillRect(0, 0, W, Hh); }
  }

  /* ---------- rail lines ---------- */
  const lineWidth = () => Math.max(1.4, (view.z - 9) * 0.42) * M.S.lineWidth;
  const lineColour = L => M.S.lineMode === "official" ? (C.lineColours[L.id] || L.colour) : C.lines.neutral;
  function tracePath(L, ox, oy, k) {
    ctx.beginPath();
    for (const part of L.parts) for (let i = 0; i < part.length; i++) {
      const x = ox + k * (part[i][0] + 180) / 360, s = Math.sin(part[i][1] * Math.PI / 180), y = oy + k * (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI));
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
  }
  function drawLines() {
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    const ox = W / 2 - wx(view.lng, view.z), oy = Hh / 2 - wy(view.lat, view.z), k = 256 * Math.pow(2, view.z), w = lineWidth();
    const act = M.lines.filter(L => st.lines.has(L.id));
    for (const L of act) {            /* white halo first so lines stay readable on the basemap */
      tracePath(L, ox, oy, k); ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = w + 2.4; ctx.stroke();
    }
    for (const L of act) {
      const hov = st.hoverLine === L.id;
      tracePath(L, ox, oy, k); ctx.globalAlpha = hov ? 1 : M.S.lineOpacity; ctx.strokeStyle = lineColour(L); ctx.lineWidth = hov ? w + 2.6 : w; ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  function distSeg(px, py, ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy; let t = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0; t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
  }
  function pickLine(mx, my) {
    const ox = W / 2 - wx(view.lng, view.z), oy = Hh / 2 - wy(view.lat, view.z), k = 256 * Math.pow(2, view.z), tol = Math.max(6, lineWidth() / 2 + 4);
    let best = null, bd = 1e9;
    const px = (lng) => ox + k * (lng + 180) / 360, py = (lat) => { const s = Math.sin(lat * Math.PI / 180); return oy + k * (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)); };
    for (const L of M.lines) {
      if (!st.lines.has(L.id)) continue;
      for (const part of L.parts) {
        let ax = px(part[0][0]), ay = py(part[0][1]);
        for (let i = 1; i < part.length; i++) {
          const bx = px(part[i][0]), by = py(part[i][1]);
          if (!((mx < Math.min(ax, bx) - tol) || (mx > Math.max(ax, bx) + tol) || (my < Math.min(ay, by) - tol) || (my > Math.max(ay, by) + tol))) {
            const d = distSeg(mx, my, ax, ay, bx, by); if (d < tol && d < bd) { bd = d; best = L; }
          }
          ax = bx; ay = by;
        }
      }
    }
    return best;
  }

  /* ---------- scale, size, colour ---------- */
  const AUTO_Z = () => C.scale.autoZoom;
  M.effScale = () => st.scale === "auto" ? (view.z >= AUTO_Z() ? "relative" : "fixed") : st.scale;
  const fracOf = (s, v, stt, eff) => { const den = eff === "fixed" ? stt.gmax : stt.peak[s]; return den > 0 ? Math.min(Math.abs(v) / den, 1) : 0; };
  const zf = () => Math.min(Math.max(0.8 + C.circles.zoomGrowth * (view.z - 11.4), 0.8), 2.0);
  const kindOf = () => C.measures[st.measure].kind;
  const radiusOf = f => (M.S.circleMin + (M.S.circleMax - M.S.circleMin) * Math.sqrt(f)) * zf() * (kindOf() === "div" ? M.S.netFactor : 1);
  const rampAt = (a, f) => { const x = Math.min(Math.max(f, 0), 1) * (a.length - 1), i = Math.min(Math.floor(x), a.length - 2); return M.mix(a[i], a[i + 1], x - i); };
  const divColor = f => { const D = M.derived(), end = f >= 0 ? D.pos : D.neg; return M.mix(D.mid, end, Math.min(Math.abs(f), 1)); };
  const seqKey = () => C.measures[st.measure].colour || "in";
  M.seqRamp = () => M.derived().ramps[seqKey()];

  /* heat layer: radial blobs, then a colour table. Colours follow the circles unless separate heat colours are on. */
  const lutCache = {};
  function heatStops() {
    if (M.S.heatSeparate) { const lo = M.hex(M.S.heatLow), hi = M.hex(M.S.heatHigh), gl = M.hex(M.S.heatGlow); return [gl, lo, M.mix(lo, hi, .5), hi]; }
    const a = M.seqRamp(); return [a[0], a[2], a[4], a[6]];
  }
  function buildLut() {
    const g = lutCtx, gr = g.createLinearGradient(0, 0, 0, 256), c = heatStops();
    gr.addColorStop(0, M.css(c[0], 0)); gr.addColorStop(.15, M.css(c[0], .55)); gr.addColorStop(.4, M.css(c[1], .8)); gr.addColorStop(.7, M.css(c[2], .9)); gr.addColorStop(1, M.css(c[3], .95));
    g.clearRect(0, 0, 1, 256); g.fillStyle = gr; g.fillRect(0, 0, 1, 256); return g.getImageData(0, 0, 1, 256).data;
  }
  function drawHeat(P, F) {
    const w = heatCv.width, h = heatCv.height; hctx.clearRect(0, 0, w, h); hctx.globalCompositeOperation = "lighter";
    const r = 14 * zf() * (M.S.circleMax / 15 * 0.5 + 0.5) + 4;
    for (let s = 0; s < N; s++) {
      const f = F[s]; if (f < 0.01 || !M.visible[s]) continue;
      const x = P[s][0] / 2, y = P[s][1] / 2; if (x < -r || y < -r || x > w + r || y > h + r) continue;
      const g = hctx.createRadialGradient(x, y, 0, x, y, r), a = Math.pow(f, 0.7);
      g.addColorStop(0, `rgba(0,0,0,${0.85 * a})`); g.addColorStop(1, "rgba(0,0,0,0)");
      hctx.fillStyle = g; hctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    hctx.globalCompositeOperation = "source-over";
    const img = hctx.getImageData(0, 0, w, h), d = img.data, k = [M.version, seqKey(), M.S.heatSeparate].join("|"), L = lutCache[k] || (lutCache[k] = buildLut());
    for (let i = 0; i < d.length; i += 4) { const a = d[i + 3]; if (a) { const j = Math.min(255, a) * 4; d[i] = L[j]; d[i + 1] = L[j + 1]; d[i + 2] = L[j + 2]; d[i + 3] = L[j + 3]; } }
    hctx.putImageData(img, 0, 0); ctx.drawImage(heatCv, 0, 0, w, h, 0, 0, W, Hh);
  }

  /* ---------- draw ---------- */
  let frame = null; const schedule = () => { if (!frame) frame = requestAnimationFrame(() => { frame = null; draw(); }); };
  M.redraw = schedule;
  let last = { P: null, F: null, V: null };
  const INK = "#13202b";
  function draw() {
    if (!W || !M.data()) return;
    const stt = M.stats(st.day, st.measure), eff = M.effScale(), kind = kindOf();
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.fillStyle = "#eef1f3"; ctx.fillRect(0, 0, W, Hh);
    drawTiles(); drawLines();
    const P = new Array(N), F = new Float64Array(N), V = new Float64Array(N);
    for (let s = 0; s < N; s++) { P[s] = project(S[s].lat, S[s].lng); V[s] = M.val(st.day, st.measure, s, st.t); F[s] = fracOf(s, V[s], stt, eff); }
    last = { P, F, V };
    const showHeat = kind === "seq" && (st.layer === "heat" || st.layer === "both"), showCirc = st.layer === "circles" || st.layer === "both" || kind === "div";
    if (showHeat) drawHeat(P, F);
    if (showCirc) {
      const D = M.derived(), order = [...Array(N).keys()].filter(s => M.visible[s]).sort((a, b) => F[b] - F[a]);
      for (const s of order) {
        const [x, y] = P[s]; if (x < -50 || y < -50 || x > W + 50 || y > Hh + 50) continue;
        const r = radiusOf(F[s]); let c;
        if (kind === "div") { const den = eff === "fixed" ? stt.gmax : (stt.peak[s] || 1), q = Math.min(Math.abs(V[s]) / den, 1); c = divColor(Math.sign(V[s]) * (0.3 + 0.7 * Math.pow(q, 0.6))); }
        else c = rampAt(D.ramps[seqKey()], 0.12 + 0.88 * Math.pow(F[s], 0.6));
        const on = s === st.sel || s === st.hover;
        ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832);
        ctx.fillStyle = M.css(c, kind === "div" ? 0.93 : (st.layer === "both" ? 0.68 : 0.85)); ctx.fill();
        ctx.lineWidth = on ? 2.6 : 1.2; ctx.strokeStyle = on ? INK : (kind === "div" ? "rgba(19,32,43,.45)" : "rgba(255,255,255,.95)"); ctx.stroke();
      }
    } else for (const s of [st.sel, st.hover]) { if (s < 0 || !M.visible[s]) continue; ctx.beginPath(); ctx.arc(P[s][0], P[s][1], 8, 0, 6.2832); ctx.lineWidth = 2.6; ctx.strokeStyle = INK; ctx.stroke(); }
    drawLabels(P, F, V);
    if (M.ui) M.ui.update(eff);
  }
  const FONT = getComputedStyle(document.body).fontFamily;
  function drawLabels(P, F, V) {
    ctx.font = "700 " + Math.round(11 * Math.min(zf(), 1.35)) + "px " + FONT; ctx.textBaseline = "middle";
    const vis = [...Array(N).keys()].filter(s => M.visible[s]), all = view.z >= 13.4;
    const idx = all ? vis : vis.sort((a, b) => Math.abs(V[b]) - Math.abs(V[a])).slice(0, 6);
    const placed = [], list = idx.filter(s => P[s][0] > 0 && P[s][0] < W && P[s][1] > 0 && P[s][1] < Hh);
    if (st.sel >= 0 && M.visible[st.sel] && !list.includes(st.sel)) list.push(st.sel);
    for (const s of list) {
      const t = S[s].name, w = ctx.measureText(t).width, x = P[s][0] + radiusOf(F[s]) + 4, y = P[s][1], box = [x - 2, y - 8, x + w + 2, y + 8];
      if (placed.some(b => !(box[2] < b[0] || box[0] > b[2] || box[3] < b[1] || box[1] > b[3])) && s !== st.sel) continue;
      placed.push(box); ctx.lineWidth = 3.5; ctx.strokeStyle = "rgba(255,255,255,.95)"; ctx.strokeText(t, x, y); ctx.fillStyle = INK; ctx.fillText(t, x, y);
    }
  }

  /* ---------- interaction ---------- */
  let drag = null; const tip = $("#tip");
  cv.addEventListener("pointerdown", e => { cv.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, lat: view.lat, lng: view.lng, moved: false }; cv.classList.add("drag"); });
  cv.addEventListener("pointermove", e => {
    const r = cv.getBoundingClientRect(), mx = e.clientX - r.left, my = e.clientY - r.top;
    if (drag) { const dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true; if (drag.moved) { view.lng = ix(wx(drag.lng, view.z) - dx, view.z); view.lat = iy(wy(drag.lat, view.z) - dy, view.z); tip.hidden = true; schedule(); } return; }
    hoverAt(mx, my);
  });
  cv.addEventListener("pointerup", e => { const r = cv.getBoundingClientRect(); if (drag && !drag.moved) M.select(pick(e.clientX - r.left, e.clientY - r.top)); drag = null; cv.classList.remove("drag"); });
  cv.addEventListener("pointerleave", () => { if (!drag) { st.hover = -1; st.hoverLine = null; tip.hidden = true; schedule(); } });
  cv.addEventListener("wheel", e => { e.preventDefault(); const r = cv.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, view.z - Math.sign(e.deltaY) * 0.35); }, { passive: false });
  cv.addEventListener("dblclick", e => { const r = cv.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, view.z + 1); });
  function zoomAt(mx, my, z) {
    z = Math.min(Z1, Math.max(Z0, z));
    const lng = ix(wx(view.lng, view.z) + (mx - W / 2), view.z), lat = iy(wy(view.lat, view.z) + (my - Hh / 2), view.z);
    view.z = z; view.lng = ix(wx(lng, z) - (mx - W / 2), z); view.lat = iy(wy(lat, z) - (my - Hh / 2), z); schedule();
  }
  $("#zin").onclick = () => zoomAt(W / 2, Hh / 2, view.z + 0.8);
  $("#zout").onclick = () => zoomAt(W / 2, Hh / 2, view.z - 0.8);
  $("#zreset").onclick = () => { view.lat = HOME.lat; view.lng = HOME.lng; view.z = HOME.z; schedule(); };
  function pick(mx, my) {
    const { P, F } = last; if (!P) return -1; let best = -1, bd = 1e9;
    for (let s = 0; s < N; s++) { if (!M.visible[s]) continue; const d = Math.hypot(P[s][0] - mx, P[s][1] - my), r = Math.max(radiusOf(F[s]), 8) + 3; if (d < r && d < bd) { bd = d; best = s; } }
    return best;
  }
  function placeTip(mx, my) { const tw = tip.offsetWidth, th = tip.offsetHeight; tip.style.left = Math.max(6, Math.min(mx + 14, W - tw - 8)) + "px"; tip.style.top = Math.max(6, Math.min(my + 14, Hh - th - 8)) + "px"; }
  function hoverAt(mx, my) {
    const s = pick(mx, my), line = s < 0 ? pickLine(mx, my) : null, lid = line ? line.id : null;
    if (s !== st.hover || lid !== st.hoverLine) { st.hover = s; st.hoverLine = lid; schedule(); }
    if (s >= 0) {
      cv.style.cursor = "pointer"; const t = st.t, vi = M.raw(M.data(), "in", st.day, s, t), vo = M.raw(M.data(), "out", st.day, s, t), stt = M.stats(st.day, st.measure);
      const own = stt.peak[s] ? Math.round(Math.abs(M.val(st.day, st.measure, s, t)) / stt.peak[s] * 100) : 0;
      tip.innerHTML = "<b>" + M.esc(S[s].name) + '</b> <span class="c">' + S[s].code + "</span>" +
        '<div class="r"><span class="c">Tap in</span><span>' + Math.round(vi).toLocaleString("en-SG") + "</span></div>" +
        '<div class="r"><span class="c">Tap out</span><span>' + Math.round(vo).toLocaleString("en-SG") + "</span></div>" +
        '<div class="r"><span class="c">Net</span><span>' + M.fmtSigned(Math.round(vi - vo)) + "</span></div>" +
        '<div class="r"><span class="c">Of own peak</span><span>' + own + "%</span></div>";
      tip.hidden = false; placeTip(mx, my);
    } else if (line) {
      cv.style.cursor = "pointer"; const f = M.lineFigures(line.id, st.day, st.t), h = Math.min(M.H1, Math.max(M.H0, Math.floor(st.t + 1e-6)));
      tip.innerHTML = '<b style="color:' + (M.S.lineMode === "official" ? (C.lineColours[line.id] || line.colour) : INK) + '">' + M.esc(line.name) + "</b>" +
        '<div class="r"><span class="c">Stations</span><span>' + f.n + "</span></div>" +
        '<div class="r"><span class="c">Tap in, ' + M.pad(h) + ':00</span><span>' + Math.round(f.vi).toLocaleString("en-SG") + "</span></div>" +
        '<div class="r"><span class="c">Tap out, ' + M.pad(h) + ':00</span><span>' + Math.round(f.vo).toLocaleString("en-SG") + "</span></div>" +
        '<div class="nt">Interchange stations count once for each line they serve.</div>';
      tip.hidden = false; placeTip(mx, my);
    } else { tip.hidden = true; cv.style.cursor = "grab"; }
  }
  M.map = { resize, schedule, radiusOf };
  new ResizeObserver(resize).observe(app);
})(window.MRT);

