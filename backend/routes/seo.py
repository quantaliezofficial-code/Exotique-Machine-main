"""Crawler endpoints: sitemap.xml, robots.txt, llms.txt and the SEO page renderer."""
import datetime
from typing import List
from xml.sax.saxutils import escape

from fastapi import APIRouter, Depends, Response
from fastapi.responses import HTMLResponse, PlainTextResponse
from sqlalchemy.orm import Session

from backend.cms.public_content import public_vehicles, brand_index, vehicle_title, format_price_lakhs, visible_offers
from backend.cms.service import content_cache, get_settings, public_settings
from backend.config import settings
from backend.database import get_db
from backend.seo import render
from backend.seo.schema_org import absolute, image_variant

router = APIRouter(tags=["SEO"], include_in_schema=False)

# Crawlers that only collect training data. Blocked only when the owner turns AI
# crawling off; search/answer bots (OAI-SearchBot, PerplexityBot, …) stay allowed so the
# showroom can still be cited in AI answers.
AI_TRAINING_BOTS = ("GPTBot", "Google-Extended", "CCBot", "anthropic-ai", "ClaudeBot", "Bytespider", "Applebot-Extended")

STATIC_PATHS = ("/cars", "/offers", "/finance", "/test-drive", "/trade-in", "/service", "/about")


def _iso(dt) -> str:
    if not dt:
        return datetime.date.today().isoformat()
    return dt.date().isoformat() if isinstance(dt, datetime.datetime) else str(dt)[:10]


@router.get("/sitemap.xml")
def sitemap(db: Session = Depends(get_db)):
    def build() -> str:
        vehicles = public_vehicles(db)
        latest = max((v.updated_at or v.created_at for v in vehicles if (v.updated_at or v.created_at)), default=None)
        urls: List[str] = []

        def add(path: str, lastmod=None, images: List[str] = ()):
            img = "".join(f"<image:image><image:loc>{escape(absolute(image_variant(i, 1280)))}</image:loc></image:image>"
                          for i in images[:10])
            urls.append(f"<url><loc>{escape(absolute(path))}</loc><lastmod>{_iso(lastmod)}</lastmod>{img}</url>")

        add("/", latest)
        for p in STATIC_PATHS:
            add(p, latest if p == "/cars" else None)
        for b in brand_index(vehicles):
            add(f"/brands/{b['slug']}", latest)
        for v in vehicles:
            add(f"/cars/{v.id}", v.updated_at or v.created_at, [i for i in (v.images or []) if i])
        for o in visible_offers(db):
            add(f"/offers/{o['slug']}", None, [o["image"]] if o.get("image") else [])
        return ('<?xml version="1.0" encoding="UTF-8"?>\n'
                '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" '
                'xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">'
                + "".join(urls) + "</urlset>")

    xml = content_cache.get_or_set("sitemap", build)
    return Response(content=xml, media_type="application/xml", headers={"Cache-Control": "public, max-age=600"})


@router.get("/robots.txt")
def robots(db: Session = Depends(get_db)):
    s = content_cache.get_or_set("settings:public", lambda: {"settings": public_settings(db)})["settings"]
    lines = []
    if not s["seo"].get("allowAiCrawlers", True):
        for bot in AI_TRAINING_BOTS:
            lines += [f"User-agent: {bot}", "Disallow: /", ""]
    # robots.txt is advice for well-behaved crawlers, not access control: /admin and the
    # API are protected by authentication regardless.
    lines += ["User-agent: *", "Allow: /", "Disallow: /admin", "Disallow: /api/", "Disallow: /*?preview=", "",
              f"Sitemap: {settings.SITE_URL}/sitemap.xml", ""]
    return PlainTextResponse("\n".join(lines), headers={"Cache-Control": "public, max-age=3600"})


@router.get("/llms.txt")
def llms_txt(db: Session = Depends(get_db)):
    def build() -> str:
        s = public_settings(db)
        g, c = s["general"], s["contact"]
        vehicles = [v for v in public_vehicles(db) if v.status != "sold"]
        phones = ", ".join(f"{p.get('label')}: {p['number']}" for p in c.get("phones") or [] if p.get("number"))
        hours = "; ".join(f"{','.join(h['days'])} {h['opens']}-{h['closes']}" for h in c.get("openingHours") or [] if h.get("days"))
        out = [
            f"# {g.get('siteName')}",
            "",
            f"> {g.get('tagline')}. {g.get('footerBlurb')}",
            "",
            "## Showroom",
            f"- Address: {c.get('streetAddress')}, {c.get('city')}, {c.get('region')} {c.get('postalCode')}, India",
            f"- Phone: {phones}" if phones else "",
            f"- Email: {c.get('email')}" if c.get("email") else "",
            f"- Hours: {hours}" if hours else "",
            f"- Map: {c.get('mapUrl')}" if c.get("mapUrl") else "",
            f"- Legal entity: {g.get('legalName')}" if g.get("legalName") else "",
            "",
            "## Key pages",
            f"- [All cars for sale]({absolute('/cars')}): current inventory with prices",
            f"- [Offers]({absolute('/offers')}): live showroom promotions",
            f"- [Car finance]({absolute('/finance')}): EMI calculator and finance application",
            f"- [Test drive]({absolute('/test-drive')}): book a test drive",
            f"- [Trade-in]({absolute('/trade-in')}): indicative valuation of your current car",
            f"- [Service]({absolute('/service')}): service booking",
            f"- [About]({absolute('/about')})",
            "",
            f"## Cars in stock ({len(vehicles)})",
        ]
        for v in vehicles[:200]:
            price = format_price_lakhs(v.price) if v.price else "price on request"
            out.append(f"- [{vehicle_title(v)} {v.badge or ''}".rstrip() + f"]({absolute('/cars/' + v.id)}): "
                       f"{v.fuel}, {v.transmission}, {price}")
        if s.get("faq"):
            out += ["", "## FAQ"] + [f"- **{i['question']}** {i['answer']}" for i in s["faq"]]
        return "\n".join(line for line in out if line is not None) + "\n"

    text = content_cache.get_or_set("llms", build)
    return PlainTextResponse(text, headers={"Cache-Control": "public, max-age=600"})


def _render(path: str, db: Session) -> HTMLResponse:
    page = render.resolve(db, path)
    full = content_cache.get_or_set("settings:full", lambda: get_settings(db))
    verification = {"google": full["seo"].get("googleSiteVerification") or "",
                    "bing": full["seo"].get("bingSiteVerification") or ""}
    s = content_cache.get_or_set("settings:public", lambda: {"settings": public_settings(db)})["settings"]
    html = render.render_html(page, s, verification)
    headers = {"Cache-Control": "public, max-age=60" if page.status == 200 and page.robots.startswith("index")
               else "no-cache"}
    if page.robots.startswith("noindex"):
        headers["X-Robots-Tag"] = page.robots
    return HTMLResponse(html, status_code=page.status, headers=headers)


@router.get("/__seo/{path:path}")
def seo_page(path: str, db: Session = Depends(get_db)):
    """Internal: nginx routes HTML page requests here. Blocked from the outside by nginx."""
    return _render("/" + path, db)
