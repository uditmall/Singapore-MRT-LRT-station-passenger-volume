"""Prepare map data for the MRT/LRT demand map.

Usage:  python prepare_data.py            (from the prepare/ folder)
Also imported by prepare_data.ipynb.

Reads : months.json, holidays.json, raw/*.csv, MRT_Stations_with_Coordinates.xlsx, lines/*.geojson
Writes: ../data/stations.js, ../data/lines.js, ../data/YYYY-MM.js, ../data/manifest.js
"""
import json, calendar, re, datetime as dt
from pathlib import Path
import pandas as pd

HERE = Path(__file__).resolve().parent
DATA = HERE.parent / "data"
HOURS = list(range(5, 24))            # 5..23 shown on the map (hour 0 in the raw file is dropped)
DAYTYPES = {"WEEKDAY": "wd", "WEEKENDS/HOLIDAY": "we"}
MIN_HOLIDAYS = 11
# LTA sometimes publishes the same physical station under a different code string in some months
# (July 2026 splits Bayfront and Marina Bay into extra CE-code rows). Rows listed here are added into the canonical station.
CODE_ALIASES = {"CE1/DT16": "CC34/DT16", "NS27/CE2/TE20": "NS27/CC33/TE20"}
VOLUME_JUMP = 0.25

# station-code prefix -> line chip
PREFIX_TO_CHIP = {"NS": "NS", "EW": "EW", "CG": "EW", "NE": "NE", "CC": "CC", "DT": "DT", "TE": "TE",
                  "BP": "LRT", "SW": "LRT", "SE": "LRT", "PE": "LRT", "PW": "LRT", "PTC": "LRT", "STC": "LRT"}
# geojson line code -> chip
FILE_TO_CHIP = {"NSL": "NS", "EWL": "EW", "NEL": "NE", "CCL": "CC", "DTL": "DT", "TEL": "TE"}
LINE_NAMES = {"NS": "North South Line", "EW": "East West Line", "NE": "North East Line", "CC": "Circle Line",
              "DT": "Downtown Line", "TE": "Thomson-East Coast Line", "LRT": "LRT (Bukit Panjang, Sengkang, Punggol)"}
LINE_COLOURS = {"NS": "#D42E12", "EW": "#009645", "NE": "#9900AA", "CC": "#FA9E0D", "DT": "#005EC4", "TE": "#9D5B25", "LRT": "#748477"}


def log(*a):
    print(*a)


def chips_for(code):
    out = []
    for tok in code.split("/"):
        pre = re.match(r"[A-Z]+", tok).group()
        c = PREFIX_TO_CHIP.get(pre)
        if c and c not in out:
            out.append(c)
    return out


def load_stations():
    df = pd.read_excel(HERE / "MRT_Stations_with_Coordinates.xlsx")
    df["PT_CODE"] = df["PT_CODE"].astype(str).str.strip()
    df["lines"] = df["PT_CODE"].map(chips_for)
    bad = df[df["lines"].map(len) == 0]
    if len(bad):
        log("WARNING: no line for codes:", bad["PT_CODE"].tolist())
    miss = df[df["LATITUDE"].isna() | df["LONGITUDE"].isna()]
    if len(miss):
        log("WARNING: stations missing coordinates:", miss["PT_CODE"].tolist())
    return df


def day_counts(month, holidays, override=None):
    y, m = map(int, month.split("-"))
    hol = {h["date"] for h in holidays.get(str(y), [])}
    wd = we = 0
    for d in range(1, calendar.monthrange(y, m)[1] + 1):
        date = dt.date(y, m, d)
        iso = date.isoformat()
        if date.weekday() >= 5 or iso in hol:
            we += 1
        else:
            wd += 1
    if len(holidays.get(str(y), [])) < MIN_HOLIDAYS:
        log(f"WARNING: only {len(holidays.get(str(y), []))} holidays listed for {y} (expected about {MIN_HOLIDAYS}). Day counts may be wrong - check holidays.json.")
    if override:
        log(f"  manual override used: {override} (calculated was wd={wd}, we={we})")
        wd, we = override["wd"], override["we"]
    log(f"  day check {month}: {wd} weekdays + {we} weekend/holiday days = {wd+we} (calendar has {calendar.monthrange(y,m)[1]})")
    return {"wd": wd, "we": we}


def build_month(entry, stations, days):
    raw = pd.read_csv(HERE / "raw" / entry["csv"], encoding="utf-8-sig")
    raw = raw.drop(columns=[c for c in ("LATITUDE", "LONGITUDE") if c in raw.columns])   # coords come from the workbook
    raw["PT_CODE"] = raw["PT_CODE"].astype(str).str.strip()
    hit = sorted(set(raw["PT_CODE"]) & set(CODE_ALIASES))
    if hit:
        log("  NOTE: merged alias codes into their station:", {c: CODE_ALIASES[c] for c in hit})
        raw["PT_CODE"] = raw["PT_CODE"].replace(CODE_ALIASES)
    codes = list(stations["PT_CODE"])
    unmapped = sorted(set(raw["PT_CODE"]) - set(codes))
    if unmapped:
        log("WARNING: codes in CSV with no row in the coordinates workbook (dropped):", unmapped)
    nodata = sorted(set(codes) - set(raw["PT_CODE"]))
    if nodata:
        log("WARNING: stations in workbook with no data this month (zeros):", nodata)
    out = {"in": {}, "out": {}}
    totals = {}
    for dtype, key in DAYTYPES.items():
        sub = raw[raw["DAY_TYPE"] == dtype]
        n = days[key]
        for meas, col in (("in", "TOTAL_TAP_IN_VOLUME"), ("out", "TOTAL_TAP_OUT_VOLUME")):
            piv = sub.pivot_table(index="PT_CODE", columns="TIME_PER_HOUR", values=col, aggfunc="sum").reindex(index=codes, columns=HOURS).fillna(0)
            avg = (piv / n).round().astype(int)
            out[meas][key] = avg.values.tolist()
            totals[(meas, key)] = float(avg.values.sum())
    return out, totals


def js_dump(obj):
    return json.dumps(obj, separators=(",", ":"), ensure_ascii=False)


def dp(pts, eps):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    L = (dx * dx + dy * dy) ** 0.5 or 1e-12
    best, bi = -1, 0
    for i in range(1, len(pts) - 1):
        d = abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / L
        if d > best:
            best, bi = d, i
    if best > eps:
        return dp(pts[:bi + 1], eps)[:-1] + dp(pts[bi:], eps)
    return [pts[0], pts[-1]]


def parts(geom):
    return [geom["coordinates"]] if geom["type"] == "LineString" else list(geom["coordinates"])


def build_lines(eps=0.00004):
    res = {}
    g = json.load(open(HERE / "lines" / "MRT_lines_existing.geojson"))
    for f in g["features"]:
        chip = FILE_TO_CHIP.get(f["properties"]["code"])
        if chip:
            res.setdefault(chip, []).extend(parts(f["geometry"]))
        else:
            log("WARNING: unknown MRT line code", f["properties"]["code"])
    g = json.load(open(HERE / "lines" / "LRT_lines_geojson.geojson"))
    for f in g["features"]:
        res.setdefault("LRT", []).extend(parts(f["geometry"]))
    out = []
    for chip in ["NS", "EW", "NE", "CC", "DT", "TE", "LRT"]:
        segs = [[[round(x, 5), round(y, 5)] for x, y in dp(s, eps)] for s in res.get(chip, [])]
        out.append({"id": chip, "name": LINE_NAMES[chip], "colour": LINE_COLOURS[chip], "parts": segs})
    return out


def run():
    DATA.mkdir(exist_ok=True)
    st = load_stations()
    stations = [[r.PT_CODE, r.STATION_NAME, round(r.LATITUDE, 6), round(r.LONGITUDE, 6), r.lines] for r in st.itertuples()]
    (DATA / "stations.js").write_text("window.MRT_STATIONS=" + js_dump(stations) + ";\n", encoding="utf-8")
    log(f"stations.js: {len(stations)} stations")
    lines = build_lines()
    (DATA / "lines.js").write_text("window.MRT_LINES=" + js_dump(lines) + ";\n", encoding="utf-8")
    log("lines.js:", {l["id"]: sum(len(p) for p in l["parts"]) for l in lines})

    holidays = json.load(open(HERE / "holidays.json"))
    cfg = json.load(open(HERE / "months.json"))["months"]
    cfg = sorted(cfg, key=lambda e: e["month"])
    manifest, prev = [], None
    for e in cfg:
        mo = e["month"]
        log(f"Month {mo}")
        days = day_counts(mo, holidays, e.get("days"))
        data, totals = build_month(e, st, days)
        if prev:
            for k, v in totals.items():
                p = prev.get(k)
                if p and abs(v / p - 1) > VOLUME_JUMP:
                    log(f"  WARNING: {k} total per-day volume changed {100*(v/p-1):+.0f}% vs previous month - check the file / day counts")
        prev = totals
        (DATA / f"{mo}.js").write_text(f'MRT.registerMonth("{mo}",' + js_dump(data) + ");\n", encoding="utf-8")
        label = dt.date(int(mo[:4]), int(mo[5:]), 1).strftime("%B %Y")
        manifest.append({"month": mo, "label": label, "file": f"data/{mo}.js", "days": days, "accessed": e.get("accessed", "")})
    (DATA / "manifest.js").write_text("window.MRT_MANIFEST=" + js_dump(manifest) + ";\n", encoding="utf-8")
    log("manifest.js written:", [m["month"] for m in manifest])


if __name__ == "__main__":
    run()
