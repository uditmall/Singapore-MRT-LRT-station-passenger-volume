/* top.js - "Top stations" panel: ranks the visible stations for the current month, day type, measure and hour.
   Follows the line chips (only selected lines are ranked) and the Controls panel. Click a row to open the station card;
   hover a row to ring that station on the map. Bars use the same colours as the map circles. */
(function (M) {
  "use strict";
  const C = M.config, st = M.state, $ = M.$, esc = M.esc, pad = M.pad, fmt = M.fmt;
  st.topN = 10; st.topMode = "hour";                    /* 10 or 20; "hour" or "day" */
  let key = "", rows = [];

  function rank() {
    const meas = st.measure, day = st.day, kind = C.measures[meas].kind, h = Math.min(M.H1, Math.max(M.H0, Math.floor(st.t + 1e-6))) - M.H0;
    const out = [];
    for (let s = 0; s < M.N; s++) {
      if (!M.visible[s]) continue;
      let v = 0;
      if (st.topMode === "hour") v = M.vAt(meas, day, s, h);
      else for (let k = 0; k < M.NH; k++) v += M.vAt(meas, day, s, k);
      out.push([s, v]);
    }
    const f = kind === "div" ? (a, b) => Math.abs(b[1]) - Math.abs(a[1]) : (a, b) => b[1] - a[1];
    return out.sort(f).filter(r => r[1] !== 0).slice(0, st.topN);
  }

  function render() {
    const meas = C.measures[st.measure], hr = Math.min(M.H1, Math.max(M.H0, Math.floor(st.t + 1e-6)));
    const when = st.topMode === "hour" ? pad(hr) + ":00 to " + pad(hr) + ":59" : "whole day (05:00 to 23:59)";
    const dayTxt = st.day === "wd" ? "Weekday" : "Weekend / holiday", div = meas.kind === "div";
    $("#topSum").textContent = "Top " + st.topN + " · " + (st.topMode === "hour" ? pad(hr) + ":00" : "whole day");
    if ($("#topBody").hidden) return;
    const top = rows, max = top.length ? Math.max(...top.map(r => Math.abs(r[1]))) : 1, D = M.S;
    $("#tlist").innerHTML = top.length ? top.map((r, i) => {
      const S = M.stations[r[0]], v = r[1], colr = div ? (v >= 0 ? D.netPos : D.netNeg) : (meas.colour === "out" ? D.outBase : D.inBase);
      const dots = S.lines.map(l => '<i style="background:' + (C.lineColours[l] || "#888") + '" title="' + esc(l) + '"></i>').join("");
      return '<li tabindex="0" data-s="' + S.i + '"' + (S.i === st.sel ? ' class="sel"' : "") + '><span class="rk">' + (i + 1) + '</span><span class="nm" title="' + esc(S.name) + '">' + esc(S.name) + dots + '</span><span class="vl">' + (div ? M.fmtSigned(v) : fmt(v)) + '</span><span class="bar"><b style="width:' + Math.max(2, Math.abs(v) / max * 100).toFixed(1) + "%;background:" + colr + '"></b></span></li>';
    }).join("") : '<li style="cursor:default"><span></span><span class="nm">No stations to rank for this selection.</span></li>';
    $("#topTtl").textContent = meas.label + (div ? ", largest gaps" : "") + " · " + dayTxt + " · " + when + ". Average taps per day" + (st.topMode === "hour" ? " in that hour." : ".");
  }

  function build() {
    const body = $("#topBody");
    body.innerHTML =
      '<div class="trow"><div class="seg" id="topN" aria-label="How many stations"><button data-v="10" aria-pressed="true">Top 10</button><button data-v="20" aria-pressed="false">Top 20</button></div></div>' +
      '<div class="trow"><div class="seg" id="topM" aria-label="Ranking period"><button data-v="hour" aria-pressed="true">This hour</button><button data-v="day" aria-pressed="false">Whole day</button></div></div>' +
      '<div class="ttl" id="topTtl"></div><ul id="tlist"></ul>' +
      '<p class="note">Follows the Month, Day type, Measure and Lines you pick. Interchange stations appear once. Click a station to open its profile.</p>';
    const pr = (box, v) => box.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v) === String(v)));
    $("#topN").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; st.topN = +b.dataset.v; pr($("#topN"), st.topN); key = ""; M.redraw(); });
    $("#topM").addEventListener("click", e => { const b = e.target.closest("button"); if (!b) return; st.topMode = b.dataset.v; pr($("#topM"), st.topMode); key = ""; M.redraw(); });
    const list = $("#tlist"), li = e => e.target.closest("li[data-s]");
    list.addEventListener("click", e => { const l = li(e); if (l) M.select(+l.dataset.s); });
    list.addEventListener("keydown", e => { const l = li(e); if (l && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); M.select(+l.dataset.s); } });
    list.addEventListener("pointerover", e => { const l = li(e); if (l && st.hover !== +l.dataset.s) { st.hover = +l.dataset.s; M.redraw(); } });
    list.addEventListener("pointerleave", () => { if (st.hover >= 0) { st.hover = -1; M.redraw(); } });
    $("#topBtn").addEventListener("click", () => { const o = $("#topBtn").getAttribute("aria-expanded") !== "true"; $("#topBtn").setAttribute("aria-expanded", o); body.hidden = !o; key = ""; if (o) M.redraw(); });
  }

  /* hook into the build and the per-frame update */
  const origBuild = M.buildUI;
  M.buildUI = () => {
    origBuild(); build();
    const origUpdate = M.ui.update;
    M.ui.update = eff => {
      origUpdate(eff);
      const hr = Math.floor(st.t + 1e-6), k = [st.month, st.day, st.measure, st.topMode === "hour" ? hr : "d", st.topN, st.topMode, M.activeKey(), M.version, st.sel, $("#topBody").hidden].join("|");
      if (k !== key) { key = k; rows = rank(); render(); }
    };
  };
})(window.MRT);
