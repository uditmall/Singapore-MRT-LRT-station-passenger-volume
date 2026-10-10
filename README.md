# Singapore MRT & LRT station demand map

An interactive map of average passenger taps per day, by station and hour, built from LTA DataMall
(*Passenger Volume by Train Stations*). Plain HTML, CSS and JavaScript: no framework, no build step.

Independent student project. Not affiliated with or endorsed by LTA.
Built by [Udit Narayan Mall](https://www.linkedin.com/in/udit-narayan-mall/).

## Open it

* Double-click `index.html`, or
* run `python3 -m http.server 8000` in this folder and open http://localhost:8000.

## Basemaps and credits

The basemap list (Settings panel) has three choices, and a **Basemap opacity** slider sits beneath it.

| Choice | Source | Credit shown on the map |
|---|---|---|
| OpenStreetMap (default) | tiles from `tile.openstreetmap.org`, served by the OpenStreetMap Foundation | © OpenStreetMap contributors |
| Humanitarian OpenStreetMap | tiles from `tile.openstreetmap.fr/hot`, hosted by OpenStreetMap France | © OpenStreetMap contributors. Tiles style by Humanitarian OpenStreetMap Team, hosted by OpenStreetMap France |
| No basemap | none | |

* The pill at the bottom of the map shows the credit for the basemap you are using. The **i** button opens the full list of credits.
* OpenStreetMap data is © OpenStreetMap contributors, available under the [Open Database Licence](https://www.openstreetmap.org/copyright).
* Both tile servers are free community services meant for light use. See the [OpenStreetMap tile usage policy](https://operations.osmfoundation.org/policies/tiles/). For a page that gets heavy traffic, use a tile provider with its own terms and key.
* Add or change basemaps in `js/config.js` (`basemap.providers`).

## Data and credits

* Passenger volumes: [LTA DataMall](https://datamall.lta.gov.sg), *Passenger Volume by Train Stations*, made available under the Singapore Open Data Licence version 1.0. The access date of each month is shown on the page.
* Rail lines: traced over the URA *Master Plan 2019 Rail Line layer* (data.gov.sg, Singapore Open Data Licence version 1.0). Station locations were compiled by the author with the help of Claude AI. Lines and stations are indicative only.
* This README is not legal advice. Check the licences yourself if you change how the data is shown.

## Put it on GitHub Pages

1. Create a repository and upload everything in this folder (`.nojekyll` and `.gitignore` included).
2. Settings > Pages > Deploy from a branch > `main` / `(root)`.
3. Open the Pages link that GitHub shows.

If you add a licence file, pick it deliberately (for example MIT for the code). The LTA and URA data keep their own licences.

## Folder map

| Path | What it is |
|---|---|
| `index.html`, `css/style.css` | page and styling |
| `js/config.js` | **the file to edit**: measures, filters, line chips, default colours, circle sizes, basemaps, credits |
| `js/core.js`, `data.js`, `mapview.js`, `charts.js`, `ui.js`, `main.js` | the code, one job per file |
| `data/` | generated files the page reads (`manifest.js`, `stations.js`, `lines.js`, one file per month) |
| `prepare/` | the Python / Jupyter step that creates `data/` from the raw LTA files |

## Add a new month

1. Download the month's CSV from LTA DataMall into `prepare/raw/`.
2. Add one entry to `prepare/months.json`:
   `{"month": "2026-09", "csv": "pv_train_202609.csv", "accessed": "2026-10-30", "days": null}`
   (`accessed` is the date you downloaded the file; it is shown in the credits.)
3. Make sure `prepare/holidays.json` has that year's public holidays (add the observed Monday when a holiday is on a Sunday).
4. Run `prepare/prepare_data.ipynb` (Restart and Run All), or `cd prepare && python3 prepare_data.py`. It needs `pandas` and `openpyxl`.
5. Read the printed output: day counts, and warnings about missing holidays, unknown station codes, or a volume jump of more than 25% from the previous month.
6. Reload `index.html`. The new month appears in the Month list.

If the day counts are wrong, set `"days": {"wd": 22, "we": 8}` for that month in `months.json`.

LTA's July 2026 file lists Bayfront and Marina Bay under two code strings each. `prepare_data.py` merges them into one station (`CODE_ALIASES`). Add any new variants there.

## One-file copy

`python3 prepare/bundle_single_html.py` writes `mrt-demand-map.html`: the whole site in a single file you can open by double-click or send to someone.

## Changing things

* Colours, circle sizes, line style, basemap and basemap opacity: the **Settings** panel on the page (saved in that browser; Reset, Download config and Import are at the bottom), or the defaults in `js/config.js`.
* A new measure (for example total taps): one entry in `measures` in `js/config.js`.
* Which line a station belongs to: `PREFIX_TO_CHIP` in `prepare/prepare_data.py`.
