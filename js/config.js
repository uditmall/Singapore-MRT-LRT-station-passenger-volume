/* ===========================================================================
   MRT demand map - settings you are most likely to edit.
   Everything here is plain JavaScript. Save the file and refresh the page.
   Colours can also be changed in the page (Settings panel) without editing.
   =========================================================================== */
window.MRT_CONFIG = {

  title: "Singapore MRT & LRT station demand",

  /* ---- Measures -----------------------------------------------------------
     To add a measure, add ONE entry here.
       kind   : "seq" (one colour ramp, 0 to max)  or  "div" (two colours around zero)
       colour : for "seq" - which base colour to use: "in" or "out"
       fn     : (monthData, dayKey, stationIndex, hourIndex) => number
     monthData has .in and .out, each [dayKey]["wd"|"we"][station][hour]            */
  measures: {
    in:  { label: "Tap in",   kind: "seq", colour: "in",  fn: (d, day, s, h) => d.in[day][s][h] },
    out: { label: "Tap out",  kind: "seq", colour: "out", fn: (d, day, s, h) => d.out[day][s][h] },
    net: { label: "Net flow", kind: "div",                fn: (d, day, s, h) => d.in[day][s][h] - d.out[day][s][h] }
    /* example:  total: { label: "Total", kind: "seq", colour: "in", fn: (d,day,s,h) => d.in[day][s][h] + d.out[day][s][h] } */
  },

  /* ---- Filters shown as button rows in the Controls panel ------------------
     key     : name of the state value
     options : list of {v, label}, or "measures" to use the measures above      */
  filters: [
    { key: "day",     label: "Day type", default: "wd",     options: [ { v: "wd", label: "Weekday" }, { v: "we", label: "Weekend / holiday" } ] },
    { key: "measure", label: "Measure",  default: "in",     options: "measures" },
    { key: "layer",   label: "Layer",    default: "both",   options: [ { v: "circles", label: "Circles" }, { v: "heat", label: "Heat" }, { v: "both", label: "Both" } ] },
    { key: "scale",   label: "Scale",    default: "fixed",  options: [ { v: "fixed", label: "Fixed" }, { v: "relative", label: "Own peak" }, { v: "auto", label: "Auto by zoom" } ] }
  ],

  /* ---- Line chips ---------------------------------------------------------
     id must match the "lines" values written by prepare_data.py (NS EW NE CC DT TE LRT) */
  lineChips: [
    { id: "NS",  label: "NS" }, { id: "EW", label: "EW" }, { id: "NE", label: "NE" },
    { id: "CC",  label: "CC" }, { id: "DT", label: "DT" }, { id: "TE", label: "TE" },
    { id: "LRT", label: "LRT" }
  ],

  /* ---- Default colours (users can change them in the page) -------------- */
  colours: {
    in:  "#2a78d6",          // tap-in base colour; a 7-step ramp is generated from it
    out: "#eb6834",          // tap-out base colour
    netPos: "#2a78d6",       // net flow: more tap in
    netNeg: "#e34948",       // net flow: more tap out
    netMid: "#f0efec"        // net flow: around zero
  },
  heat: {
    separate: false,         // false = heat follows the circle colours
    low: "#9ec5f4", high: "#0d366b", glow: "#cde2fb"
  },
  lines: {
    mode: "official",        // "official" (each line its own colour) or "neutral"
    neutral: "#5d6b7b",
    opacity: 0.9,
    width: 1                 // multiplier
  },
  lineColours: { NS: "#D42E12", EW: "#009645", NE: "#9900AA", CC: "#FA9E0D", DT: "#005EC4", TE: "#9D5B25", LRT: "#748477" },

  /* ---- Circles ---------------------------------------------------------- */
  circles: {
    min: 3,                  // radius (px) of the smallest circle
    max: 15,                 // radius (px) of the biggest circle
    netFactor: 0.75,         // net-flow circles are this fraction of the normal size
    zoomGrowth: 0.1          // how fast circles grow when you zoom in
  },

  /* ---- Scale ------------------------------------------------------------ */
  scale: {
    autoZoom: 13,            // "Auto by zoom" switches to own-peak at this zoom level
    netClipPercentile: 0.97, // net flow colours stop at this percentile
    fixedBasis: "network"    // "network" (all stations) or "selected" (only chosen lines)
  },

  /* ---- Basemaps ---------------------------------------------------------
     Both are map tiles of OpenStreetMap data, free to use for light traffic under their tile usage policies.
       osm : the standard OpenStreetMap map, served by the OpenStreetMap Foundation (tile.openstreetmap.org)
       hot : the Humanitarian OpenStreetMap Team style, hosted by OpenStreetMap France (tile.openstreetmap.fr/hot)
     "subdomains" are the server names used for {s}.                                                                    */
  basemap: {
    default: "hot",
    providers: {
      osm: { label: "OpenStreetMap", url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
             attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors' },
      hot: { label: "Humanitarian OpenStreetMap", url: "https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", subdomains: "abc",
             attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors. Tiles style by <a href="https://www.hotosm.org/" target="_blank" rel="noopener">Humanitarian OpenStreetMap Team</a>, hosted by <a href="https://openstreetmap.fr/" target="_blank" rel="noopener">OpenStreetMap France</a>' },
      none: { label: "No basemap", attribution: "" }
    }
  },

  /* ---- Credits (bottom strip and the "i" card) -------------------------- */
  credits: {
    dataMallUrl: "https://datamall.lta.gov.sg",
    ltaLicenceUrl: "https://datamall.lta.gov.sg/content/datamall/en/SingaporeOpenDataLicence.html",
    ltaLicenceName: "Singapore Open Data Licence version 1.0",
    dataGovLicenceUrl: "https://data.gov.sg/open-data-licence",
    uraUrl: "https://data.gov.sg/datasets/d_222bfc84eb86c7c11994d02f8939da8d/view",   // Master Plan 2019 Rail Line layer
    author: "Udit Narayan Mall"
  }
};

