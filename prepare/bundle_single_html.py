"""Optional: bundle the whole site into ONE self-contained HTML file (../mrt-demand-map.html).
Handy for emailing or opening anywhere by double-click. If a private js/config.local.js exists it is included, so
that single file may contain private settings - do not publish it."""
import re
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
html = (ROOT / "index.html").read_text(encoding="utf-8")
html = html.replace('<link rel="stylesheet" href="css/style.css">', "<style>\n" + (ROOT / "css/style.css").read_text(encoding="utf-8") + "\n</style>")
months = sorted((ROOT / "data").glob("20??-??.js"))

def inline(m):
    src = m.group(1)
    p = ROOT / src
    if not p.exists():
        return ""
    out = "<script>\n" + p.read_text(encoding="utf-8").replace("</script>", "<\\/script>") + "\n</script>"
    local = ROOT / "js" / "config.local.js"
    if src == "js/config.js" and local.exists():      # private, optional overrides (never uploaded)
        out += "\n<script>\n" + local.read_text(encoding="utf-8") + "\n</script>"
    if src == "js/data.js":      # month files register themselves; they must come after data.js
        for mf in months:
            out += "\n<script>\n" + mf.read_text(encoding="utf-8") + "\n</script>"
    return out

html = re.sub(r'<script src="([^"]+)"[^>]*></script>', inline, html)
out = ROOT / "mrt-demand-map.html"
out.write_text(html, encoding="utf-8")
print("wrote", out, round(out.stat().st_size / 1024), "KB")
