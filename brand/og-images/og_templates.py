"""Generate Open Graph preview images (1200x630) for the blog.

Add an entry to PAGES, then run:  python3 brand/og-images/og_templates.py
PNGs are written to public/ (e.g. public/og/<slug>-en.png); reference them from a
post's frontmatter with `ogImage: "/og/<slug>-en.png"`. Requires Google Chrome.
"""
import html, sys, tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from chrome_shot import screenshot  # noqa: E402

ROOT = Path(__file__).resolve().parents[2]

def page(kicker, title, sub, chips):
    chips_html = ''.join(f'<span class="chip">{html.escape(c)}</span>' for c in chips)
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>
*{{margin:0;padding:0;box-sizing:border-box}}
html,body{{width:1200px;height:630px;overflow:hidden}}
body{{background:#09090b;color:#f4f4f5;font-family:"Helvetica Neue","PingFang SC",sans-serif;
  display:flex;flex-direction:column;justify-content:space-between;padding:72px 80px;position:relative}}
body::before{{content:"";position:absolute;inset:0;background:
  radial-gradient(900px 500px at 100% 0%,rgba(99,102,241,.28),transparent 60%),
  radial-gradient(700px 400px at 0% 100%,rgba(16,185,129,.12),transparent 60%);}}
.top,.mid,.bot{{position:relative}}
.kicker{{font-size:26px;font-weight:600;color:#a5b4fc;letter-spacing:.02em}}
h1{{font-size:68px;line-height:1.12;font-weight:800;letter-spacing:-.02em;margin-bottom:22px}}
.sub{{font-size:32px;line-height:1.4;color:#d4d4d8;max-width:1000px}}
.bot{{display:flex;justify-content:space-between;align-items:center}}
.chips{{display:flex;gap:12px;flex-wrap:wrap}}
.chip{{font-size:22px;padding:8px 18px;border-radius:999px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);color:#e4e4e7}}
.url{{font-size:22px;color:#a1a1aa}}
</style></head><body>
<div class="top"><div class="kicker">{html.escape(kicker)}</div></div>
<div class="mid"><h1>{title}</h1><div class="sub">{html.escape(sub)}</div></div>
<div class="bot"><div class="chips">{chips_html}</div><div class="url">zjshen14.github.io</div></div>
</body></html>'''
PAGES = {  # output path (relative to public/) -> page
 'og-default.png': page('DevLog · 研发手记', 'Notes on AI agents,<br>dev tools &amp; building', 'Hands-on write-ups in English and 中文', ['AI', 'Agents', 'Crypto', 'Investing']),
 'og/setup-opencode-remote-web-ide-en.png': page('DevLog · Tutorial', 'Self-host OpenCode Web IDE', 'Drive a coding agent from your laptop or phone, with Muse Spark 1.3 free on OpenCode', ['Home LAN', 'Tailscale', 'Caddy / Nginx', '1M context']),
 'og/setup-opencode-remote-web-ide-zh.png': page('研发手记 · 实战教程', '自建 OpenCode Web IDE', '手机、笔记本随时驱动编码 Agent，免费接入 Muse Spark 1.3', ['家庭局域网', 'Tailscale', 'Caddy / Nginx', '100 万上下文']),
}

def render(out_rel, page_html):
    out = ROOT / 'public' / out_rel
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / 'page.html'
        src.write_text(page_html)
        screenshot(src, out, 1200, 630)
    print('wrote', out.relative_to(ROOT))

if __name__ == '__main__':
    for out_rel, page_html in PAGES.items():
        render(out_rel, page_html)
