#!/usr/bin/env python3
"""Build the /artifacts section from assets/data/artifacts.json.

Generates, for every artifact in the data file:
  artifacts/<slug>.html                       detail page (served at /artifacts/<slug>)
  assets/images/artifacts/<slug>-og.png       1200x630 social share image
plus:
  artifacts/index.html                        listing (served at /artifacts)
  assets/images/artifacts/index-og.png        listing share image
  sitemap.xml                                 entries between the artifacts markers

The site is static, so pages are pre-rendered: social crawlers do not run JS,
and each page needs its own og:/twitter: tags in the HTML.

Usage:  python3 scripts/build-artifacts.py
Needs:  Pillow (pip install pillow)
"""

import hashlib
import html
import json
import re
import sys
from datetime import date
from pathlib import Path
from urllib.parse import quote

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "assets/data/artifacts.json"
OUT_PAGES = ROOT / "artifacts"
OUT_IMAGES = ROOT / "assets/images/artifacts"
SITEMAP = ROOT / "sitemap.xml"

SITE = "https://unicornmeateth.com"
FONT_DISPLAY = ROOT / "assets/fonts/bilgres/Bilgres.woff"
FONT_BOLD = ROOT / "assets/fonts/aeonik-fono/AeonikFono-Bold.woff"
FONT_REGULAR = ROOT / "assets/fonts/aeonik-fono/AeonikFono-Regular.woff"
LOGO = ROOT / "assets/images/unicornmeat-logo-200x200.png"
EMOJI_FONT = Path("/System/Library/Fonts/Apple Color Emoji.ttc")

OG_W, OG_H = 1200, 630
ADDRESS_RE = re.compile(r"^0x[0-9a-fA-F]{40}$")
SLUG_RE = re.compile(r"^[a-z0-9][a-z0-9-]*$")

e = html.escape


# ---------------------------------------------------------------- data

def load():
    data = json.loads(DATA.read_text())
    items = data["artifacts"]
    seen = set()
    for i, a in enumerate(items, 1):
        for key in ("slug", "name", "symbol", "address", "deployed", "oneLiner", "story", "supply"):
            if key not in a:
                sys.exit(f"artifact #{i}: missing '{key}'")
        if not SLUG_RE.match(a["slug"]):
            sys.exit(f"{a['slug']}: slug must be lowercase letters, digits and dashes")
        if a["slug"] in seen or a["slug"] == "index":
            sys.exit(f"{a['slug']}: duplicate or reserved slug")
        seen.add(a["slug"])
        if not ADDRESS_RE.match(a["address"]):
            sys.exit(f"{a['slug']}: bad address {a['address']}")
        if a["address"] == a["address"].lower():
            print(f"warning: {a['slug']}: address is not EIP-55 checksummed "
                  f"(run: cast to-check-sum-address {a['address']})")
        date.fromisoformat(a["deployed"])
        a["number"] = i
        a.setdefault("accent", "#ffba00")
        a.setdefault("facts", [])
        a.setdefault("tradeUrl",
                     f"https://app.uniswap.org/swap?inputCurrency=ETH&outputCurrency={a['address']}")
        a.setdefault("ehUrl", f"https://www.ethereumhistory.com/contract/{a['address'].lower()}")
        a.setdefault("etherscanUrl", f"https://etherscan.io/token/{a['address']}")
        a["url"] = f"{SITE}/artifacts/{a['slug']}"
        a["deployedHuman"] = date.fromisoformat(a["deployed"]).strftime("%b %-d, %Y")
    return items


# ---------------------------------------------------------------- OG images

def font(path, size):
    return ImageFont.truetype(str(path), size)


def wrap(draw, text, fnt, max_w):
    lines, line = [], ""
    for word in text.split():
        trial = f"{line} {word}".strip()
        if text_width(draw, trial, fnt) <= max_w:
            line = trial
        else:
            if line:
                lines.append(line)
            line = word
    if line:
        lines.append(line)
    return lines


def fit(draw, text, path, start, min_size, max_w):
    size = start
    while size > min_size and draw.textlength(text, font=font(path, size)) > max_w:
        size -= 4
    return font(path, size)


def emoji(char, size):
    """Render a colour emoji at `size` px, or None if the system font is missing."""
    if not EMOJI_FONT.exists():
        return None
    f = ImageFont.truetype(str(EMOJI_FONT), 160)  # Apple Color Emoji only ships 160px strikes
    img = Image.new("RGBA", (200, 200), (0, 0, 0, 0))
    ImageDraw.Draw(img).text((0, 0), char, font=f, embedded_color=True)
    img = img.crop(img.getbbox())
    return img.resize((size, size), Image.LANCZOS)


MEAT = "\U0001F356"


def text_width(draw, text, fnt):
    """Width of `text`, counting each 🍖 as a square the size of the font."""
    parts = text.split(MEAT)
    return sum(draw.textlength(p, font=fnt) for p in parts) + (len(parts) - 1) * (fnt.size + 6)


def draw_text(img, xy, text, fnt, fill="#000"):
    """Draw `text`, swapping each 🍖 for a colour emoji (PIL fonts have no emoji glyphs)."""
    x, y = xy
    asc, _ = fnt.getmetrics()
    parts = text.split(MEAT)
    for i, part in enumerate(parts):
        ImageDraw.Draw(img).text((x, y), part, font=fnt, fill=fill)
        x += ImageDraw.Draw(img).textlength(part, font=fnt)
        if i < len(parts) - 1:
            size = fnt.size
            em = emoji(MEAT, size)
            if em:
                img.alpha_composite(em, (int(x + 3), int(y + asc - size * 0.9)))
            x += size + 6


def gradient(w, h, top, bottom):
    base = Image.new("RGB", (w, h), top)
    overlay = Image.new("RGB", (w, h), bottom)
    mask = Image.linear_gradient("L").resize((w, h))
    return Image.composite(overlay, base, mask)


def card(img, box, fill, radius=28, shadow=12, border=5):
    d = ImageDraw.Draw(img)
    x0, y0, x1, y1 = box
    d.rounded_rectangle((x0 + shadow, y0 + shadow, x1 + shadow, y1 + shadow), radius, fill="#000")
    d.rounded_rectangle(box, radius, fill=fill, outline="#000", width=border)


def pill(img, xy, text, fill, fnt, pad=(22, 12)):
    d = ImageDraw.Draw(img)
    w = text_width(d, text, fnt)
    asc, desc = fnt.getmetrics()
    x, y = xy
    box = (x, y, x + w + pad[0] * 2, y + asc + desc + pad[1] * 2)
    r = (box[3] - box[1]) // 2
    d.rounded_rectangle((box[0] + 5, box[1] + 5, box[2] + 5, box[3] + 5), r, fill="#000")
    d.rounded_rectangle(box, r, fill=fill, outline="#000", width=3)
    draw_text(img, (x + pad[0], y + pad[1] + 2), text, fnt)
    return box


def og_frame(header_right):
    img = gradient(OG_W, OG_H, "#ffe6f0", "#fff4e6").convert("RGBA")
    d = ImageDraw.Draw(img)
    # header bar, same blue as the site nav
    card(img, (40, 34, OG_W - 52, 124), "#98cefb", radius=22, shadow=8, border=4)
    logo = Image.open(LOGO).convert("RGBA").resize((64, 64), Image.LANCZOS)
    img.alpha_composite(logo, (62, 47))
    d.text((140, 58), "UNICORN MEAT", font=font(FONT_DISPLAY, 40), fill="#000")
    f = font(FONT_BOLD, 26)
    d.text((OG_W - 76 - d.textlength(header_right, font=f), 66), header_right, font=f, fill="#000")
    return img


def build_og(a):
    img = og_frame(f"ARTIFACT #{a['number']:03d}")
    d = ImageDraw.Draw(img)
    card(img, (40, 158, OG_W - 52, OG_H - 46), "#ffffff")

    x, max_w = 84, OG_W - 84 - 100
    title_font = fit(d, a["symbol"], FONT_DISPLAY, 112, 56, max_w)
    # offset shadow under the title, like .steak-title-highlight on the site
    shadow = Image.new("RGBA", img.size, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).text((x - 4, 190), a["symbol"], font=title_font, fill=(0, 0, 0, 50))
    img.alpha_composite(shadow)
    d = ImageDraw.Draw(img)
    d.text((x, 186), a["symbol"], font=title_font, fill="#ff4fa3")

    asc, desc = title_font.getmetrics()
    y = 186 + asc + desc - 4
    d.text((x, y), a["name"], font=font(FONT_BOLD, 30), fill="#3a3a3a")
    y += 58

    body = font(FONT_BOLD, 40)
    for line in wrap(d, a["oneLiner"], body, max_w)[:3]:
        d.text((x, y), line, font=body, fill="#000")
        y += 52

    pf = font(FONT_BOLD, 24)
    py = OG_H - 46 - 86
    b = pill(img, (x, py), f"Supply {a['supply']['display']}", a["accent"], pf)
    b = pill(img, (b[2] + 22, py), f"Deployed {a['deployedHuman']}", "#ffffff", pf)
    pill(img, (b[2] + 22, py), "Paired with w🍖 on Uniswap", "#ffe6f0", pf)
    return img.convert("RGB")


def build_index_og(items):
    img = og_frame("ARTIFACTS")
    d = ImageDraw.Draw(img)
    card(img, (40, 158, OG_W - 52, OG_H - 46), "#ffffff")
    x = 84
    d.text((x, 190), "Artifacts", font=font(FONT_DISPLAY, 112), fill="#ff4fa3")
    body = font(FONT_BOLD, 40)
    y = 330
    for line in wrap(d, "Historic Ethereum tokens, paired with w🍖 on Uniswap.", body, OG_W - 200):
        draw_text(img, (x, y), line, body)
        y += 52
    pf = font(FONT_BOLD, 24)
    py = OG_H - 46 - 86
    bx = x
    for a in items[:5]:
        b = pill(img, (bx, py), a["symbol"], a["accent"], pf)
        bx = b[2] + 22
    return img.convert("RGB")


def save_png(img, path):
    img.save(path, "PNG", optimize=True)
    return hashlib.sha256(path.read_bytes()).hexdigest()[:10]


# ---------------------------------------------------------------- HTML

NAV_ITEMS = [
    ("/#about", "About", ""),
    ("/swap", "Swap", "um-nav-cta"),
    ("/steak", "Steak", ""),
    ("/market", "Market", ""),
    ("/#join-herd", "ENS", ""),
]
MORE_ITEMS = [
    ("/#wrap", "Wrap", ""),
    ("/grinder-association", "Grinder", ""),
    ("/provenance", "Provenance", ""),
    ("/artifacts", "Artifacts", "um-nav-active"),
]


def nav_list():
    lis = "\n".join(
        f'<li><a href="{h}"{f" class={chr(34)}{c}{chr(34)}" if c else ""}>{t}</a></li>'
        for h, t, c in NAV_ITEMS)
    more = "\n".join(
        f'<li><a href="{h}"{f" class={chr(34)}{c}{chr(34)}" if c else ""}>{t}</a></li>'
        for h, t, c in MORE_ITEMS)
    return f"""{lis}
<li>
    <details class="learn-nav-dropdown">
        <summary><span>More ▾</span></summary>
        <ul class="learn-nav-menu">
{more}
            <li><a href="/paper.pdf" target="_blank" rel="noopener">Paper</a></li>
        </ul>
    </details>
</li>"""


def page(*, title, description, canonical, og_image, og_type, jsonld, body):
    nav = nav_list()
    return f"""<!DOCTYPE html>
<!-- GENERATED by scripts/build-artifacts.py from assets/data/artifacts.json. Do not edit by hand. -->
<html lang="en" dir="ltr">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{e(title)}</title>
    <link rel="icon" type="image/png" href="/assets/favicon.ico" />
    <link rel="canonical" href="{canonical}" />
    <link rel="alternate" type="text/plain" href="{SITE}/llms.txt" title="LLM Information" />
    <meta name="description" content="{e(description)}">
    <meta name="theme-color" content="#FFBA00">
    <meta property="og:locale" content="en_US">
    <meta property="og:type" content="{og_type}">
    <meta property="og:title" content="{e(title)}">
    <meta property="og:description" content="{e(description)}">
    <meta property="og:url" content="{canonical}">
    <meta property="og:site_name" content="Unicorn Meat 🍖">
    <meta property="og:image" content="{og_image}">
    <meta property="og:image:width" content="{OG_W}">
    <meta property="og:image:height" content="{OG_H}">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:alt" content="{e(title)}">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:site" content="@UnicornMeatETH">
    <meta name="twitter:creator" content="@UnicornMeatETH">
    <meta name="twitter:title" content="{e(title)}">
    <meta name="twitter:description" content="{e(description)}">
    <meta name="twitter:image" content="{og_image}">
    <script src="/assets/js/app-head-bs.js"></script>
    <link rel="stylesheet" href="/assets/js/uni-core/css/uni-core.min.css">
    <link rel="stylesheet" href="/assets/css/unicons.min.css">
    <link rel="stylesheet" href="/assets/css/theme/theme-two.min.purge.css">
    <script src="/assets/js/uni-core/js/uni-core-bundle.min.js"></script>
    <link rel="stylesheet" href="/assets/css/theme/hero-bg.css">
    <link rel="stylesheet" href="/assets/css/custom.css?v=4">
    <link rel="stylesheet" href="/assets/css/artifacts.css?v=2">
    <script type="application/ld+json">
{json.dumps(jsonld, indent=2, ensure_ascii=False)}
    </script>
</head>

<body class="uni-body panel bg-white text-black overflow-x-hidden disable-cursor">
    <a href="#main-content" class="skip-to-content">Skip to content</a>

    <div id="uc-menu-panel" data-uc-offcanvas="overlay: true;">
        <div class="uc-offcanvas-bar m-1 rounded-2 border border-2 border-black contrast-shadow-md bg-secondary-200 text-dark">
            <header class="uc-offcanvas-header hstack justify-between items-center pb-2">
                <div class="uc-logo">
                    <a href="/" class="h5 text-none text-gray-900">
                        <img class="w-40px" src="/assets/images/home-two/unicornmeat-logo.webp" alt="Unicorn Meat" style="filter: drop-shadow(-4px 0px 8px rgba(0,0,0,0.3));">
                    </a>
                </div>
                <button class="uc-offcanvas-close rtl:end-auto rtl:start-0 m-1 mt-2 p-0 btn border-0 hover:text-primary hover:rotate-90 duration-150 transition-all" type="button">
                    <img class="icon icon-3" src="/assets/images/icons/close.svg" alt="close" data-uc-svg>
                </button>
            </header>
            <div class="panel">
                <ul class="nav-y gap-narrow fw-medium fs-6" data-uc-nav>
{nav}
                </ul>
                <div class="mt-4">
                    <a class="btn btn-md btn-secondary border border-2 border-black contrast-shadow-sm w-100" href="/swap">Swap w🍖</a>
                </div>
            </div>
        </div>
    </div>

    <header class="uc-header header-two uc-navbar-sticky-wrap z-999 uc-dark"
        data-uc-sticky="start: 100vh; animation: uc-animation-slide-top; sel-target: .uc-navbar-container; cls-active: uc-navbar-sticky; cls-inactive: uc-navbar-transparent; end: !*;">
        <nav class="uc-navbar-container bg-transparent mt-3 xl:mt-4 uc-navbar-float ft-tertiary z-1">
            <div class="uc-navbar-main" style="--uc-nav-height: 100px">
                <div class="container">
                    <div class="uc-navbar min-h-64px lg:min-h-80px xl:min-h-100px ps-2 pe-1 lg:px-4 border border-2 border-black contrast-shadow-md rounded-2 lg:rounded-3"
                        data-uc-navbar=" animation: uc-animation-slide-top-small; duration: 150;"
                        style="background-color: #98cefb">
                        <div class="uc-navbar-left">
                            <div class="uc-logo">
                                <a class="panel text-none w-150px xl:w-auto" href="/">
                                    <img src="/assets/images/home-two/unicornmeat-logo.webp" alt="Unicorn Meat Logo"
                                        style="height: 40px; width: auto; filter: drop-shadow(-4px 0px 8px rgba(0,0,0,0.3));">
                                </a>
                            </div>
                        </div>
                        <div class="uc-navbar-center">
                            <ul class="uc-navbar-nav fs-6 xl:fs-5 gap-2 lg:gap-2 xl:gap-3 d-none lg:d-flex fw-semibold">
{nav}
                            </ul>
                        </div>
                        <div class="uc-navbar-right">
                            <a class="btn btn-sm xl:btn-md btn-secondary border border-2 border-black contrast-shadow-sm -rotate-2 hover:rotate-0 d-none lg:d-inline-flex" href="/swap">Swap w🍖</a>
                            <a class="btn btn-md btn-secondary w-48px h-48px p-0 border border-2 border-black contrast-shadow-sm d-inline-flex lg:d-none" href="#uc-menu-panel" data-uc-toggle aria-label="Menu">
                                <img class="icon icon-3" src="/assets/images/icons/menu.svg" alt="menu" data-uc-svg>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    </header>

    <div id="wrapper" class="wrap">
        <main id="main-content">
{body}
        </main>

        <footer class="uc-footer panel overflow-hidden">
            <div class="footer-outer pt-2 pb-4 xl:pt-3 xl:pb-5 text-black" style="background-color: #98cefb;">
                <div class="container">
                    <div class="footer-inner panel vstack lg:hstack gap-4 justify-between fs-5 xl:fs-4 text-center py-4 lg:py-6">
                        <p class="m-0">Unicorn Meat © {date.today().year}, All rights reserved.</p>
                        <ul class="nav-x gap-0 row child-cols-auto justify-center gx-4 gy-2 lg:g-4">
                            <li><a href="/#about">About</a></li>
                            <li><a href="/swap">Swap</a></li>
                            <li><a href="/steak">Steak</a></li>
                            <li><a href="/market">Market</a></li>
                            <li><a href="/artifacts">Artifacts</a></li>
                            <li><a href="/grinder-association">Grinder</a></li>
                            <li><a href="/provenance">Provenance</a></li>
                            <li><a href="/paper.pdf" target="_blank" rel="noopener">Paper</a></li>
                        </ul>
                    </div>
                </div>
            </div>
        </footer>
    </div>

    <script defer src="/assets/js/app.js"></script>
    <script defer src="/_vercel/insights/script.js"></script>
</body>

</html>
"""


def artifact_body(a):
    story = "\n".join(f'                                <p class="fs-6 mb-3">{e(p)}</p>' for p in a["story"])
    facts = "\n".join(
        f'                                    <tr><th scope="row">{e(k)}</th><td>{e(v)}</td></tr>'
        for k, v in [("Contract", a["address"]), ("Symbol", a["symbol"]),
                     ("Deployed", a["deployedHuman"]), *a["facts"]])
    share_text = quote(f"{a['symbol']}: {a['oneLiner']} A w🍖 Artifact.")
    share = f"https://twitter.com/intent/tweet?text={share_text}&url={quote(a['url'], safe='')}"
    return f"""            <section class="artifact-hero section panel overflow-hidden">
                <div class="container artifact-hero-inner">
                    <div class="artifact-hero-copy mx-auto text-center vstack items-center gap-3">
                        <a class="artifact-pill" href="/artifacts">🏺 Artifact #{a['number']:03d} · Paired with w🍖</a>
                        <h1 class="h2 sm:h1 xl:display-6 m-0 ls-0"><span class="artifact-title">{e(a['symbol'])}</span></h1>
                        <p class="fs-6 fw-bold text-uppercase m-0 artifact-subtitle">{e(a['name'])}</p>
                        <p class="fs-5 xl:fs-4 text-dark m-0">{e(a['oneLiner'])}</p>
                        <div class="hstack flex-wrap justify-center gap-2 mt-2">
                            <a class="btn btn-md btn-secondary border border-2 border-black contrast-shadow-sm -rotate-1 hover:rotate-0 fw-bold" href="{e(a['tradeUrl'])}" target="_blank" rel="noopener">Trade on Uniswap ↗</a>
                            <a class="btn btn-md btn-white border border-2 border-black contrast-shadow-sm rotate-1 hover:rotate-0" href="{e(a['ehUrl'])}" target="_blank" rel="noopener">Ethereum History ↗</a>
                        </div>
                    </div>
                </div>
            </section>

            <section class="section panel overflow-hidden">
                <div class="section-outer panel py-4 sm:py-6 lg:py-7" style="background-color: #fff7ef;">
                    <div class="container">
                        <div class="row child-cols-1 md:child-cols-3 g-3 lg:g-4">
                            <div class="col">
                                <div class="panel p-4 border border-2 border-black contrast-shadow-lg bg-white h-100 -rotate-1">
                                    <h2 class="h6 mb-2 text-uppercase">Supply</h2>
                                    <p class="fs-3 fw-bold mb-1">{e(a['supply']['display'])}</p>
                                    <p class="fs-7 mb-0 text-muted">{e(a['supply'].get('label', ''))}</p>
                                </div>
                            </div>
                            <div class="col">
                                <div class="panel p-4 border border-2 border-black contrast-shadow-lg bg-white h-100 rotate-1">
                                    <h2 class="h6 mb-2 text-uppercase">Deployed</h2>
                                    <p class="fs-3 fw-bold mb-1">{e(a['deployedHuman'])}</p>
                                    <p class="fs-7 mb-0 text-muted">Ethereum mainnet</p>
                                </div>
                            </div>
                            <div class="col">
                                <div class="panel p-4 border border-2 border-black contrast-shadow-lg bg-white h-100 -rotate-1">
                                    <h2 class="h6 mb-2 text-uppercase">Contract</h2>
                                    <p class="fs-7 fw-bold mb-2 artifact-mono">{e(a['address'])}</p>
                                    <p class="fs-7 mb-0"><a href="{e(a['etherscanUrl'])}" target="_blank" rel="noopener">Etherscan ↗</a></p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <section class="section panel overflow-hidden">
                <div class="section-outer panel py-5 sm:py-6 lg:py-8" style="background-color: #ffe6f0;">
                    <div class="container">
                        <div class="row child-cols-1 lg:child-cols-2 g-3 lg:g-4">
                            <div class="col">
                                <div class="panel p-4 sm:p-5 border border-2 border-black contrast-shadow-lg bg-white h-100 -rotate-1">
                                    <h2 class="h5 sm:h4 mb-3 text-uppercase">The story</h2>
{story}
                                    <p class="fs-7 mb-0"><a class="fw-bold" href="{e(a['ehUrl'])}" target="_blank" rel="noopener">Full history on Ethereum History ↗</a></p>
                                </div>
                            </div>
                            <div class="col">
                                <div class="panel p-4 sm:p-5 border border-2 border-black contrast-shadow-lg bg-white h-100 rotate-1">
                                    <h2 class="h5 sm:h4 mb-3 text-uppercase">Onchain facts</h2>
                                    <table class="artifact-facts">
                                        <tbody>
{facts}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                        <div class="vstack items-center gap-3 mt-6 text-center">
                            <div class="hstack flex-wrap justify-center gap-2">
                                <a class="btn btn-md btn-secondary border border-2 border-black contrast-shadow-sm fw-bold" href="{e(a['tradeUrl'])}" target="_blank" rel="noopener">Trade {e(a['symbol'])} on Uniswap ↗</a>
                                <a class="btn btn-md btn-white border border-2 border-black contrast-shadow-sm" href="{e(share)}" target="_blank" rel="noopener">Share on X</a>
                                <a class="btn btn-md btn-white border border-2 border-black contrast-shadow-sm" href="/artifacts">All artifacts</a>
                            </div>
                            <p class="fs-7 text-muted m-0 max-w-600px">Historic tokens can be thinly traded. Check the pool and the contract address before you swap. Not financial advice.</p>
                        </div>
                    </div>
                </div>
            </section>"""


def index_body(items):
    cards = []
    for a in items:
        tilt = "-rotate-1" if a["number"] % 2 else "rotate-1"
        cards.append(f"""                            <div>
                                <a class="artifact-card panel vstack gap-2 p-4 border border-2 border-black contrast-shadow-lg bg-white h-100 text-none {tilt}" href="/artifacts/{a['slug']}">
                                    <span class="fs-7 fw-bold text-uppercase text-muted">Artifact #{a['number']:03d} · {e(a['deployedHuman'])}</span>
                                    <span class="h3 m-0 artifact-title">{e(a['symbol'])}</span>
                                    <span class="fs-7 fw-bold text-uppercase">{e(a['name'])}</span>
                                    <span class="fs-6 text-dark">{e(a['oneLiner'])}</span>
                                    <span class="hstack justify-between items-center mt-auto pt-2">
                                        <span class="artifact-chip" style="background:{e(a['accent'])}">Supply {e(a['supply']['display'])}</span>
                                        <span class="fw-bold">View →</span>
                                    </span>
                                </a>
                            </div>""")
    return f"""            <section class="artifact-hero section panel overflow-hidden">
                <div class="container artifact-hero-inner">
                    <div class="artifact-hero-copy mx-auto text-center vstack items-center gap-3">
                        <span class="artifact-pill">🏺 {len(items)} paired {"token" if len(items) == 1 else "tokens"}</span>
                        <h1 class="h2 sm:h1 xl:display-6 m-0 ls-0"><span class="artifact-title">Artifacts</span></h1>
                        <p class="fs-5 xl:fs-4 text-dark m-0">Historic Ethereum tokens, paired with w🍖 on Uniswap.</p>
                        <p class="fs-6 text-dark m-0">Unicorn Meat has been on Ethereum since March 2016. Artifacts are other relics from the early chain that now trade against w🍖.</p>
                    </div>
                </div>
            </section>

            <section class="section panel overflow-hidden">
                <div class="section-outer panel py-5 sm:py-6 lg:py-8" style="background-color: #fff7ef;">
                    <div class="container">
                        <div class="artifact-grid">
{chr(10).join(cards)}
                        </div>
                    </div>
                </div>
            </section>"""


# ---------------------------------------------------------------- sitemap

def update_sitemap(items):
    start, end = "<!-- artifacts:start -->", "<!-- artifacts:end -->"
    today = date.today().isoformat()
    urls = [f"{SITE}/artifacts"] + [a["url"] for a in items]
    block = "\n".join(
        f"  <url>\n    <loc>{u}</loc>\n    <lastmod>{today}</lastmod>\n"
        f"    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>"
        for u in urls)
    block = f"  {start}\n{block}\n  {end}"
    xml = SITEMAP.read_text()
    if start in xml:
        old = re.search(rf"  {re.escape(start)}.*?{re.escape(end)}", xml, re.S).group(0)
        # keep lastmod stable when nothing but the date would change
        if re.sub(r"<lastmod>.*?</lastmod>", "", old) == re.sub(r"<lastmod>.*?</lastmod>", "", block):
            return
        xml = xml.replace(old, block)
    else:
        xml = xml.replace("</urlset>", f"{block}\n</urlset>")
    SITEMAP.write_text(xml)


# ---------------------------------------------------------------- main

def main():
    items = load()
    OUT_PAGES.mkdir(exist_ok=True)
    OUT_IMAGES.mkdir(parents=True, exist_ok=True)

    for a in items:
        png = OUT_IMAGES / f"{a['slug']}-og.png"
        v = save_png(build_og(a), png)
        title = f"{a['symbol']}: {a['oneLiner']}"
        if len(title) > 70:
            title = f"{a['symbol']} · Unicorn Meat Artifacts"
        description = f"{a['oneLiner']} {a['name']} ({a['symbol']}), deployed {a['deployedHuman']}. Paired with w🍖 on Uniswap."
        jsonld = {
            "@context": "https://schema.org",
            "@type": "WebPage",
            "url": a["url"],
            "name": f"{a['name']} ({a['symbol']})",
            "description": a["oneLiner"],
            "isPartOf": {"@id": f"{SITE}/#website"},
            "about": {
                "@type": "Thing",
                "name": a["name"],
                "identifier": a["address"],
                "sameAs": [a["ehUrl"], a["etherscanUrl"]],
            },
        }
        (OUT_PAGES / f"{a['slug']}.html").write_text(page(
            title=title, description=description, canonical=a["url"],
            og_image=f"{SITE}/assets/images/artifacts/{a['slug']}-og.png?v={v}",
            og_type="article", jsonld=jsonld, body=artifact_body(a)))
        print(f"built /artifacts/{a['slug']}")

    v = save_png(build_index_og(items), OUT_IMAGES / "index-og.png")
    jsonld = {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        "url": f"{SITE}/artifacts",
        "name": "Unicorn Meat Artifacts",
        "isPartOf": {"@id": f"{SITE}/#website"},
        "hasPart": [{"@type": "WebPage", "url": a["url"], "name": a["name"]} for a in items],
    }
    (OUT_PAGES / "index.html").write_text(page(
        title="Artifacts · Historic Ethereum tokens paired with w🍖",
        description="Historic Ethereum tokens paired with w🍖 on Uniswap: "
                    + ", ".join(a["symbol"] for a in items) + ".",
        canonical=f"{SITE}/artifacts",
        og_image=f"{SITE}/assets/images/artifacts/index-og.png?v={v}",
        og_type="website", jsonld=jsonld, body=index_body(items)))
    print("built /artifacts")

    update_sitemap(items)
    print("updated sitemap.xml")


if __name__ == "__main__":
    main()
