/* ui.js - builds the panels from config, settings panel, legend, station card, credits */
(function (M) {
  "use strict";
  const C = M.config, st = M.state, $ = M.$, esc = M.esc, pad = M.pad, fmt = M.fmt;
  const set = (btn, body, onOpen) => btn.addEventListener("click", () => { const o = btn.getAttribute("aria-expanded") !== "true"; btn.setAttribute("aria-expanded", o); body.hidden = !o; if (o && onOpen) onOpen(); });
  const pressed = (box, v) => box.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v) === String(v) ? "true" : "false"));
  const monthLabel = () => { const e = M.entry(); return e ? e.label : ""; };

  /* ---------- Controls panel (built from config.filters) ---------- */
  function buildControls() {
    const body = $("#ctlBody"); let h = "";
    h += '<div class="grp"><span class="lab">Month</span><select id="monthSel" aria-label="Month">' + M.manifest.slice().reverse().map(m => '<option value="' + m.month + '">' + esc(m.label) + "</option>").join("") + "</select></div>";
    for (const f of C.filters) {
      const opts = f.options === "measures" ? Object.entries(C.measures).map(([v, m]) => ({ v, label: m.label })) : f.options;
      h += '<div class="grp"><span class="lab">' + esc(f.label) + '</span><div class="seg" data-key="' + f.key + '">' + opts.map(o => '<button data-v="' + esc(o.v) + '" aria-pressed="' + (st[f.key] === o.v) + '">' + esc(o.label) + "</button>").join("") + "</div></div>";
    }
    h += '<div class="grp"><span class="lab">Lines</span><div class="chips" id="chips"><button class="chip all" id="chipAll" aria-pressed="true">All</button>' +
      C.lineChips.map(c => '<button class="chip" data-id="' + c.id + '" style="--c:' + (C.lineColours[c.id] || "#888") + '" aria-pressed="true"><i></i>' + esc(c.label) + "</button>").join("") + "</div></div>";
    h += '<p class="note">Hour 8 means 08:00 to 08:59. Hours 0 to 4 are left out. Net flow is tap in minus tap out. Click a line to show only that line, click more to add them, All to reset. LRT combines the Bukit Panjang, Sengkang and Punggol systems.</p>';
    body.innerHTML = h;
    body.querySelectorAll(".seg").forEach(box => box.addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return; st[box.dataset.key] = b.dataset.v; pressed(box, b.dataset.v); M.redraw();
    }));
    $("#monthSel").value = st.month;
    $("#monthSel").addEventListener("change", e => M.setMonth(e.target.value));
    $("#chips").addEventListener("click", e => {
      const b = e.target.closest("button"); if (!b) return;
      if (b.id === "chipAll") C.lineChips.forEach(c => st.lines.add(c.id));
      else if (M.allLines()) { st.lines.clear(); st.lines.add(b.dataset.id); }          /* from "all", a click isolates that line */
      else if (st.lines.has(b.dataset.id)) st.lines.delete(b.dataset.id); else st.lines.add(b.dataset.id);
      syncChips(); M.recomputeVisible(); if (st.sel >= 0 && !M.visible[st.sel]) M.select(-1); M.redraw();
    });
  }
  function syncChips() {
    document.querySelectorAll("#chips .chip[data-id]").forEach(b => b.setAttribute("aria-pressed", st.lines.has(b.dataset.id)));
    $("#chipAll").setAttribute("aria-pressed", M.allLines());
  }

  /* ---------- Settings panel: colour pickers, sliders, basemap ---------- */
  const col = (label, key) => '<label class="fld">' + label + '<input type="color" data-k="' + key + '" value="' + M.S[key] + '"></label>';
  const rng = (label, key, min, max, step) => '<label class="fld">' + label + '<input type="range" data-k="' + key + '" min="' + min + '" max="' + max + '" step="' + step + '" value="' + M.S[key] + '"><output>' + M.S[key] + "</output></label>";
  function buildSettings() {
    const body = $("#setBody");
    const bm = M.basemaps().map(b => '<option value="' + b.id + '"' + (b.id === M.providerId() ? " selected" : "") + ">" + esc(b.label) + "</option>").join("");
    body.innerHTML =
      '<div class="sg">Tap in / tap out</div>' + col("Tap in colour", "inBase") + col("Tap out colour", "outBase") +
      '<div class="sg">Net flow</div>' + col("More tap in", "netPos") + col("More tap out", "netNeg") + col("Around zero", "netMid") +
      '<div class="sg">Heat layer</div><label class="fld">Separate heat colours<input type="checkbox" data-k="heatSeparate"' + (M.S.heatSeparate ? " checked" : "") + '></label>' +
      '<div id="heatCols"' + (M.S.heatSeparate ? "" : " hidden") + ">" + col("Low", "heatLow") + col("High", "heatHigh") + col("Glow", "heatGlow") + "</div>" +
      '<p class="note" id="heatNote"' + (M.S.heatSeparate ? " hidden" : "") + ">Heat follows the circle colours.</p>" +
      '<div class="sg">Rail lines</div><label class="fld">Colour<select data-k="lineMode"><option value="official">Official line colours</option><option value="neutral">Neutral grey</option></select></label>' +
      rng("Opacity", "lineOpacity", 0.2, 1, 0.05) + rng("Thickness", "lineWidth", 0.5, 2.5, 0.1) +
      '<div class="sg">Circles</div>' + rng("Smallest", "circleMin", 1, 10, 0.5) + rng("Largest", "circleMax", 6, 40, 1) + rng("Net flow size", "netFactor", 0.3, 1.2, 0.05) +
      '<div class="sg">Map and scale</div><label class="fld">Basemap<select data-k="basemap">' + bm + "</select></label>" +
      rng("Basemap opacity (%)", "basemapOpacity", 10, 100, 5) +
      '<label class="fld">Fixed scale based on<select data-k="fixedBasis"><option value="network">Whole network</option><option value="selected">Selected lines</option></select></label>' +
      '<div class="warn" id="lowC" hidden></div>' +
      '<div class="btnrow"><button class="btn" id="setReset">Reset</button><button class="btn" id="setDl">Download config</button><button class="btn" id="setImp">Import</button><input type="file" id="setFile" accept=".json,application/json" hidden></div>' +
      '<p class="note">Changes apply at once and are remembered in this browser.</p>';
    body.querySelector('[data-k=lineMode]').value = M.S.lineMode; body.querySelector('[data-k=fixedBasis]').value = M.S.fixedBasis;
    const apply = el => {
      const k = el.dataset.k, v = el.type === "checkbox" ? el.checked : el.type === "range" ? parseFloat(el.value) : el.value;
      if (el.type === "range") el.nextElementSibling.textContent = v;
      if (k === "heatSeparate") { $("#heatCols").hidden = !v; $("#heatNote").hidden = v; }
      if (k === "circleMin" && v > M.S.circleMax) return; if (k === "circleMax" && v < M.S.circleMin) return;
      M.setSetting(k, v); checkContrast();
    };
    body.addEventListener("input", e => { if (e.target.dataset.k && e.target.type !== "checkbox" && e.target.tagName !== "SELECT") apply(e.target); });
    body.addEventListener("change", e => { if (e.target.dataset.k && (e.target.type === "checkbox" || e.target.tagName === "SELECT")) apply(e.target); });
    $("#setReset").onclick = () => { M.resetSettings(); buildSettings(); checkContrast(); };
    $("#setDl").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([M.exportSettings()], { type: "application/json" })); a.download = "mrt-map-settings.json"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); };
    $("#setImp").onclick = () => $("#setFile").click();
    $("#setFile").onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => { try { M.importSettings(JSON.parse(t)); buildSettings(); checkContrast(); } catch (err) { alert("That file is not a valid settings file."); } }); };
    checkContrast();
  }
  function checkContrast() {
    const bg = [238, 241, 243], bad = [];
    [["Tap in", M.S.inBase], ["Tap out", M.S.outBase], ["More tap in", M.S.netPos], ["More tap out", M.S.netNeg]].forEach(([n, h]) => { if (M.contrast(M.hex(h), bg) < 2.2) bad.push(n); });
    const w = $("#lowC"); if (!w) return;
    w.hidden = !bad.length; w.textContent = bad.length ? "Low contrast: " + bad.join(", ") + " looks pale on the light map and may be hard to see on a projector." : "";
  }

  /* ---------- legend ---------- */
  function legendHTML(eff) {
    const meas = C.measures[st.measure], stt = M.stats(st.day, st.measure), D = M.derived(); let h = "";
    if (meas.kind === "div") {
      const top = eff === "fixed" ? fmt(stt.gmax) : "100%", g = "linear-gradient(90deg," + M.S.netNeg + "," + M.S.netMid + "," + M.S.netPos + ")";
      h += '<div class="ramp" style="background:' + g + '"></div><div class="ends"><span>More tap out (−' + top + ')</span><span>0</span><span>More tap in (+' + top + ')</span></div><div class="nt">Size shows the gap, per day. Colours stop at the scale ends' + (eff === "fixed" ? ", so the largest 3% of gaps are clipped." : ".") + "</div>";
      if (st.layer !== "circles") h += '<div class="nt">Heat covers tap in and tap out only, so circles are shown.</div>';
    } else {
      const a = D.ramps[meas.colour || "in"], stops = a.map((c, i) => M.css(c) + " " + (i / (a.length - 1) * 100) + "%").join(",");
      h += '<div class="ramp" style="background:linear-gradient(90deg,' + stops + ')"></div><div class="ends"><span>0</span><span>' + (eff === "fixed" ? fmt(stt.gmax) + " taps in the busiest station-hour" : "100% of the station’s own peak hour") + "</span></div>";
      if (st.layer !== "circles") h += '<div class="nt">Heat shows where riders concentrate.</div>';
    }
    if (M.S.fixedBasis === "selected" && eff === "fixed" && !M.allLines()) h += '<div class="nt">Fixed scale is based on the selected lines only.</div>';
    return h;
  }

  /* ---------- station card ---------- */
  M.select = s => { st.sel = s; $("#sc").hidden = s < 0; if (s >= 0) { cardKey = ""; drawCard(); $("#rt").scrollTop = 0; } M.redraw(); };
  let cardKey = "";
  function drawCard() {
    const s = st.sel; if (s < 0) return;
    const k = [s, st.day, st.month, Math.floor(st.t * 4), M.version].join("|"); if (k === cardKey) return; cardKey = k;
    const S = M.stations[s], d = M.data(), day = st.day, sum = x => x.reduce((p, c) => p + c, 0), ti = sum(d.in[day][s]), to = sum(d.out[day][s]), pk = a => a.indexOf(Math.max(...a)) + M.H0;
    const net = i => d.in[day][s][i] - d.out[day][s][i], am = [1, 2, 3, 4].reduce((p, i) => p + net(i), 0), pm = [12, 13, 14, 15].reduce((p, i) => p + net(i), 0), thr = 0.04 * (ti + to) / 2;
    let ch = "Mixed pattern across the day.";
    if (am > thr && pm < -thr) ch = "Riders start here in the morning and finish here in the evening. Typical of a residential area.";
    else if (am < -thr && pm > thr) ch = "Riders finish here in the morning and start here in the evening. Typical of a workplace or activity centre.";
    else if (ti + to < 3000) ch = "Very low volume, so the pattern is not distinct.";
    const other = day === "wd" ? "we" : "wd", nm = x => x === "wd" ? "Weekday" : "Weekend / holiday";
    const lineTxt = S.lines.map(l => l === "LRT" ? "LRT" : (C.lineChips.find(c => c.id === l) || { label: l }).label + " line").join(" · ");
    $("#scBody").innerHTML = "<h2>" + esc(S.name) + '</h2><div class="code">' + esc(S.code) + " · " + esc(lineTxt) + "</div>" +
      '<div class="kv"><div><small>Tap in / day</small><strong>' + fmt(ti) + "</strong></div><div><small>Tap out / day</small><strong>" + fmt(to) + "</strong></div><div><small>Peak tap in</small><strong>" + pad(pk(d.in[day][s])) + ":00</strong></div><div><small>Peak tap out</small><strong>" + pad(pk(d.out[day][s])) + ":00</strong></div></div>" +
      '<p class="char">' + ch + "</p><h3>" + nm(day) + "</h3>" + M.miniChart(s, day) + "<h3>" + nm(other) + "</h3>" + M.miniChart(s, other) +
      '<div class="lg2" style="margin-top:4px"><span class="cl"><i style="background:' + M.S.inBase + '"></i>Tap in</span><span class="cl"><i style="background:' + M.S.outBase + '"></i>Tap out</span><span>Same scale. Dashed line: current hour.</span></div>';
  }

  /* ---------- credits strip and info card ---------- */
  const cr = C.credits;
  const dmy = iso => { const d = new Date(iso + "T00:00:00"); return isNaN(d) ? iso : d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }); };
  const lnk = (u, t) => '<a href="' + u + '" target="_blank" rel="noopener">' + t + "</a>";
  function creditsHTML() {
    const p = M.provider(), bm = M.basemapFailed ? "Basemap could not be loaded" : (p.attribution || "");
    return lnk(cr.dataMallUrl, "LTA DataMall") + " \u00b7 " + lnk(cr.ltaLicenceUrl, "Singapore Open Data Licence v1.0") + (bm ? " \u00b7 " + bm : "") + " \u00b7 Independent student project. Not affiliated with or endorsed by LTA";
  }
  function infoHTML() {
    const e = M.entry(), mans = M.manifest.filter(m => m.accessed);
    const accessed = mans.slice().sort((a, b) => b.month.localeCompare(a.month)).map(m => esc(dmy(m.accessed)) + " (" + esc(m.label) + " data)");
    const accTxt = accessed.length > 1 ? accessed.slice(0, -1).join(", ") + " and " + accessed[accessed.length - 1] : (accessed[0] || "date not recorded");
    const bmTxt = Object.values(C.basemap.providers).filter(p => p.attribution && (!p.needsKey || C.basemap.key)).map(p => "<b>" + esc(p.label) + ":</b> " + p.attribution).join("<br>") + (M.basemapFailed ? "<br><i>The selected basemap could not be loaded.</i>" : "");
    return "<h2>Data, method and credits</h2>" +
      "<p>Average taps in and out of MRT and LRT stations by hour of day and day type, from " + lnk(cr.dataMallUrl, "LTA DataMall") + " (Passenger Volume by Train Stations). Monthly totals are divided by the number of days of each type to give average taps per day. Hours 0 to 4 are not shown.</p>" +
      (e ? "<p>Days counted in " + esc(e.label) + ": " + e.days.wd + " weekdays and " + e.days.we + " weekend / holiday days.</p>" : "") +
      "<p>Contains information from Passenger Volume by Train Stations accessed on " + accTxt + " from " + lnk(cr.dataMallUrl, "LTA DataMall") + " which is made available under the terms of the " + lnk(cr.ltaLicenceUrl, esc(cr.ltaLicenceName)) + ".</p>" +
      "<p>Rail lines were traced using the original " + lnk(cr.uraUrl, "Master Plan 2019 Rail Line layer") + ", Urban Redevelopment Authority (URA), accessed from data.gov.sg and made available under the " + lnk(cr.dataGovLicenceUrl, esc(cr.ltaLicenceName)) + ". Station locations were compiled by the author with the help of Claude AI. The MRT and LRT lines and stations shown on the map are indicative only.</p>" +
      "<p><b>Basemaps</b> (the map tiles you can choose in Settings)<br>" + bmTxt + "</p>" +
      "<p><b>Disclaimer:</b> Independent student project. Not affiliated with or endorsed by LTA.</p>" +
      '<h2 style="margin-top:16px">About</h2>' +
      "<p>Built by " + lnk("https://www.linkedin.com/in/udit-narayan-mall/", "Udit Narayan Mall") + ", a Master\u2019s student in Rail and Urban Transport at TUM Asia, to explore Singapore\u2019s urban rail ridership data. Spotted a mistake? Message me on " + lnk("https://www.linkedin.com/in/udit-narayan-mall/", "LinkedIn") + ".</p>";
  }

  /* ---------- per-frame update (cheap; only touches the DOM when something changed) ---------- */
  let legKey = "", credKey = "", chartKey = "", infoKey = "";
  M.ui = {
    update(eff) {
      const m = C.measures[st.measure], h = Math.min(M.H1, Math.max(M.H0, Math.floor(st.t + 1e-6)));
      const effTxt = (eff === "fixed" ? "Fixed" : "Own peak") + (st.scale === "auto" ? " (auto)" : ""), dayTxt = st.day === "wd" ? "Weekday" : "Weekend / holiday";
      $("#clockT").textContent = pad(h) + ":00";
      $("#clockD").textContent = dayTxt + " · " + m.label + " · " + effTxt + " scale";
      $("#ctlSum").textContent = (st.day === "wd" ? "Weekday" : "Weekend") + " · " + m.label;
      $("#lgSum").textContent = m.label + " · " + effTxt;
      const lk = [st.month, st.day, st.measure, st.layer, eff, M.version, M.activeKey()].join("|");
      if (lk !== legKey) { legKey = lk; $("#lgBody").innerHTML = legendHTML(eff); }
      const ck = [M.providerId(), st.month, M.basemapFailed].join("|");
      if (ck !== credKey) { credKey = ck; $("#credTxt").innerHTML = creditsHTML(); if (!$("#info").hidden) $("#info").innerHTML = infoHTML(); }
      if (!$("#cb").hidden) {
        const k = [st.month, st.day, st.measure, st.t.toFixed(2), M.activeKey(), M.version, innerWidth].join("|");
        if (k !== chartKey) { chartKey = k; M.drawNetwork($("#chart")); }
      }
      /* keep the legend 8px above whatever sits at the bottom: the chart card when it is open (CSS places it above the bar otherwise) */
      const lg = $("#lg"), cb = $("#cb"), want = cb.hidden ? "" : (cb.offsetHeight + 30 + 8) + "px";
      if (lg.style.bottom !== want) lg.style.bottom = want;
      drawCard();
    },
    refreshAll() { legKey = credKey = chartKey = ""; cardKey = ""; }
  };

  M.buildUI = () => {
    $("#h1").textContent = C.title;
    $("#swIn").style.background = M.S.inBase; $("#swOut").style.background = M.S.outBase;
    buildControls(); buildSettings();
    set($("#ctlBtn"), $("#ctlBody")); set($("#setBtn"), $("#setBody")); set($("#lgBtn"), $("#lgBody"));
    $("#infoBtn").addEventListener("click", () => { const o = $("#info").hidden; $("#info").hidden = !o; $("#infoBtn").setAttribute("aria-expanded", o); if (o) $("#info").innerHTML = infoHTML(); });
    $("#scX").onclick = () => M.select(-1);
    addEventListener("keydown", e => { if (e.key === "Escape") { M.select(-1); $("#info").hidden = true; $("#infoBtn").setAttribute("aria-expanded", false); } });
    $("#sgSpeed").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; st.speed = parseFloat(b.dataset.v); pressed($("#sgSpeed"), b.dataset.v); });
    /* Chart open: Play, speed and the Chart toggle move into the chart card's title row and the slider sits under the plot. Closed: they go back to the bottom bar. */
    const layoutControls = open => {
      const dock = $("#dock"), hd = $("#cb .hd"), row = $("#scrubRow"), play = $("#play"), sp = $("#sgSpeed"), tg = $("#chartTg"), sc = $("#scrub"), hrl = dock.querySelectorAll(".hrl");
      if (open) {
        let cl = $("#hdCtl"); if (!cl) { cl = document.createElement("span"); cl.id = "hdCtl"; hd.appendChild(cl); }
        cl.append(play, sp, tg); row.appendChild(sc);
      } else {
        dock.append(play, hrl[0], sc, hrl[1], sp, tg);
      }
    };
    $("#chartTg").addEventListener("click", () => { const o = $("#chartTg").getAttribute("aria-pressed") !== "true"; $("#chartTg").setAttribute("aria-pressed", o); $("#cb").hidden = !o; $("#app").classList.toggle("chartOn", o); layoutControls(o); chartKey = ""; M.redraw(); });
    /* chart title and swatches follow the selection and settings */
    const origUpdate = M.ui.update;
    M.ui.update = eff => { $("#swIn").style.background = M.S.inBase; $("#swOut").style.background = M.S.outBase;
      if (!$("#cb").hidden) { $("#cbTitle").textContent = M.selectionLabel() + ", average per day"; $("#cbNote").textContent = M.allLines() ? "" : "Stations on more than one selected line are counted once."; }
      origUpdate(eff); };
    /* hour animation */
    const scrub = $("#scrub"), playBtn = $("#play");
    const setT = (t, user) => { st.t = Math.min(M.H1, Math.max(M.H0, t)); if (user) scrub.value = Math.round(st.t); M.redraw(); };
    scrub.addEventListener("input", () => { stop(); setT(+scrub.value, false); });
    let lastTs = 0, raf = 0;
    function tick(ts) { if (!st.playing) return; const dt = Math.min((ts - lastTs) / 1000, 0.1); lastTs = ts; let t = st.t + dt * st.speed; if (t > M.H1) t = M.H0 + (t - M.H1); st.t = t; scrub.value = Math.round(t); M.redraw(); raf = requestAnimationFrame(tick); }
    function play() { if (st.playing) return; st.playing = true; playBtn.innerHTML = "&#10074;&#10074; Pause"; playBtn.setAttribute("aria-label", "Pause animation"); lastTs = performance.now(); raf = requestAnimationFrame(tick); }
    function stop() { st.playing = false; cancelAnimationFrame(raf); playBtn.innerHTML = "&#9654; Play"; playBtn.setAttribute("aria-label", "Play animation"); if (Math.abs(st.t - Math.round(st.t)) > 0.001) { st.t = Math.round(st.t); scrub.value = st.t; M.redraw(); } }
    playBtn.onclick = () => st.playing ? stop() : play();
    addEventListener("keydown", e => { if (e.code === "Space" && e.target === document.body) { e.preventDefault(); playBtn.click(); } });
    let cd = false; const svg = $("#chart");
    svg.addEventListener("pointerdown", e => { cd = true; svg.setPointerCapture(e.pointerId); stop(); setT(Math.round(svg._inv(e.clientX)), true); });
    svg.addEventListener("pointermove", e => { if (cd) setT(Math.round(svg._inv(e.clientX)), true); });
    svg.addEventListener("pointerup", () => { cd = false; });
    M.setT = setT;
  };
  M.monthTitle = () => { const e = M.entry(); return e ? "Average taps per day, " + e.label + " (" + e.days.wd + " weekdays, " + e.days.we + " weekend and holiday days)" : ""; };
})(window.MRT);

