/* charts.js - SVG charts: network/selection chart and the station mini charts */
(function (M) {
  "use strict";
  const st = M.state, H0 = M.H0, H1 = M.H1, NH = M.NH, pad = M.pad;
  const TH = { ink: "#13202b", muted: "#6f7d8b", line: "rgba(19,32,43,.12)" };
  const niceStep = top => { const q = top / 2 || 1, p = Math.pow(10, Math.floor(Math.log10(q))), u = q / p; return (u <= 1 ? 1 : u <= 2 ? 2 : u <= 2.5 ? 2.5 : u <= 5 ? 5 : 10) * p; };
  const tick = v => v >= 1000 ? (v / 1000) + "k" : v;
  const lerp = (a, t) => { const x = Math.min(Math.max(t - H0, 0), NH - 1), i = Math.floor(x), j = Math.min(i + 1, NH - 1); return a[i] * (1 - (x - i)) + a[j] * (x - i); };

  /* bottom chart: follows the line chips; interchanges are counted once */
  M.drawNetwork = svg => {
    const r = svg.getBoundingClientRect(), w = Math.max(r.width, 300), h = Math.max(r.height, 80);
    const mT = 6, mB = 18, ih = h - mT - mB;
    /* line the plot area up with the hour slider: hour 5 sits above the slider's left end, hour 23 above its right end */
    let mL = 38, mR = 56; const sr = document.getElementById("scrub").getBoundingClientRect();
    if (sr.width > 0 && r.width > 0) { mL = Math.max(38, sr.left - r.left + 8); mR = Math.max(56, r.right - sr.right + 8); }
    const iw = w - mL - mR;
    const si = M.totals(st.day, "in"), so = M.totals(st.day, "out"), cI = M.S.inBase, cO = M.S.outBase;
    const top = Math.max(...si, ...so, 1), step = niceStep(top), ymax = Math.ceil(top / step) * step, X = t => mL + (t - H0) / (H1 - H0) * iw, Y = v => mT + ih - (v / ymax) * ih;
    let o = "";
    for (let v = 0; v <= ymax + 1; v += step) o += '<line x1="' + mL + '" x2="' + (w - mR) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="' + TH.line + '"/><text x="' + (mL - 6) + '" y="' + (Y(v) + 4) + '" text-anchor="end" font-size="11" fill="' + TH.muted + '">' + tick(v) + "</text>";
    for (let t = H0; t <= H1; t += 2) o += '<text x="' + X(t) + '" y="' + (h - 4) + '" text-anchor="middle" font-size="11" fill="' + TH.muted + '">' + pad(t) + "</text>";
    const path = a => a.map((v, i) => (i ? "L" : "M") + X(H0 + i).toFixed(1) + " " + Y(v).toFixed(1)).join("");
    const m = st.measure;
    o += '<path d="' + path(so) + '" fill="none" stroke="' + cO + '" stroke-width="2.5" stroke-linejoin="round" opacity="' + (m === "in" ? .4 : 1) + '"/><path d="' + path(si) + '" fill="none" stroke="' + cI + '" stroke-width="2.5" stroke-linejoin="round" opacity="' + (m === "out" ? .4 : 1) + '"/>';
    const tx = X(Math.min(Math.max(st.t, H0), H1)), iv = lerp(si, st.t), ov = lerp(so, st.t);
    o += '<line x1="' + tx + '" x2="' + tx + '" y1="' + mT + '" y2="' + (mT + ih) + '" stroke="' + TH.ink + '" stroke-dasharray="3 3"/>';
    o += '<circle cx="' + tx + '" cy="' + Y(ov) + '" r="4.5" fill="' + cO + '" stroke="#fff" stroke-width="1.5"/><circle cx="' + tx + '" cy="' + Y(iv) + '" r="4.5" fill="' + cI + '" stroke="#fff" stroke-width="1.5"/>';
    const lx = w - mR + 8; let yi = Y(si[NH - 1]), yo = Y(so[NH - 1]); if (Math.abs(yi - yo) < 13) { if (yi < yo) { yi -= 6; yo += 6; } else { yi += 6; yo -= 6; } }
    o += '<text x="' + lx + '" y="' + (yi + 4) + '" font-size="11.5" font-weight="700" fill="' + TH.ink + '">Tap in</text><text x="' + lx + '" y="' + (yo + 4) + '" font-size="11.5" font-weight="700" fill="' + TH.ink + '">Tap out</text>';
    const rx = tx > w / 2 ? tx - 8 : tx + 8;
    o += '<text x="' + rx + '" y="' + (mT + 11) + '" text-anchor="' + (tx > w / 2 ? "end" : "start") + '" font-size="11.5" font-weight="700" fill="' + TH.ink + '">' + Math.round(iv).toLocaleString("en-SG") + " in · " + Math.round(ov).toLocaleString("en-SG") + " out</text>";
    svg.setAttribute("viewBox", "0 0 " + w + " " + h); svg.innerHTML = o;
    svg._inv = px => { const r2 = svg.getBoundingClientRect(); return H0 + ((px - r2.left) / r2.width * w - mL) / iw * (H1 - H0); };
  };

  /* station profile mini chart (same y-scale for weekday and weekend) */
  M.miniChart = (s, day) => {
    const d = M.data(), w = 300, h = 92, mL = 30, mR = 6, mT = 6, mB = 16, iw = w - mL - mR, ih = h - mT - mB, a = d.in[day][s], b = d.out[day][s];
    const mx0 = Math.max(...d.in.wd[s], ...d.out.wd[s], ...d.in.we[s], ...d.out.we[s], 1), step = niceStep(mx0), ym = Math.ceil(mx0 / step) * step;
    const X = i => mL + i / (NH - 1) * iw, Y = v => mT + ih - v / ym * ih; let o = "";
    for (let v = 0; v <= ym + 1; v += step) o += '<line x1="' + mL + '" x2="' + (w - mR) + '" y1="' + Y(v) + '" y2="' + Y(v) + '" stroke="' + TH.line + '"/><text x="' + (mL - 4) + '" y="' + (Y(v) + 3.5) + '" text-anchor="end" font-size="10" fill="' + TH.muted + '">' + tick(v) + "</text>";
    for (let t = H0; t <= H1; t += 3) o += '<text x="' + X(t - H0) + '" y="' + (h - 3) + '" text-anchor="middle" font-size="10" fill="' + TH.muted + '">' + pad(t) + "</text>";
    const path = arr => arr.map((v, i) => (i ? "L" : "M") + X(i).toFixed(1) + " " + Y(v).toFixed(1)).join("");
    o += '<path d="' + path(b) + '" fill="none" stroke="' + M.S.outBase + '" stroke-width="2" stroke-linejoin="round"/><path d="' + path(a) + '" fill="none" stroke="' + M.S.inBase + '" stroke-width="2" stroke-linejoin="round"/>';
    const tx = X(Math.min(Math.max(st.t, H0), H1) - H0);
    o += '<line x1="' + tx + '" x2="' + tx + '" y1="' + mT + '" y2="' + (mT + ih) + '" stroke="' + TH.ink + '" stroke-dasharray="3 3"/>';
    return '<svg class="mini" viewBox="0 0 ' + w + " " + h + '" role="img" aria-label="Hourly profile">' + o + "</svg>";
  };
})(window.MRT);

