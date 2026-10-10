/* main.js - start-up and month switching */
(function (M) {
  "use strict";
  const $ = M.$;
  const fail = msg => { const e = $("#err"); e.hidden = false; e.innerHTML = "<b>Could not start the map.</b><br>" + M.esc(msg) + "<br><small>Run prepare/prepare_data.py (or the notebook) to create the data files.</small>"; };
  M.setMonth = month => {
    M.loadMonth(month, () => {
      M.state.month = month; M.cacheClear(); M.recomputeVisible(); M.ui.refreshAll();
      $("#monthLbl").textContent = M.monthTitle(); const sel = $("#monthSel"); if (sel) sel.value = month;
      if (M.state.sel >= 0) M.select(M.state.sel); M.redraw();
    }, msg => fail(msg));
  };
  if (!M.manifest.length) return fail("data/manifest.js lists no months.");
  M.state.month = M.manifest[M.manifest.length - 1].month;      /* latest month first */
  M.buildUI();
  M.setMonth(M.state.month);
  window.__mrt = M;                                             /* handy for debugging in the browser console */
})(window.MRT);

