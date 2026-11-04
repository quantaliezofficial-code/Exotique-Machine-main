"""Server-side SEO rendering for the React SPA.

nginx sends every HTML page request to /__seo/<path>. We take the built index.html shell,
replace the block between <!--seo:start--> and <!--seo:end--> with page-specific
<title>, meta, canonical, Open Graph and JSON-LD, and put a plain-HTML snapshot of the
page's real content inside #root (React replaces it on mount). Crawlers and AI agents
that do not run JavaScript therefore see the same content as visitors.

The page data also goes into <script id="em-initial-data" type="application/json"> so
the SPA can paint the first view without waiting for an API round-trip.
"""
import html
import json
import logging
import re
import threading
import time
import urllib.error
import urllib.request
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from backend.cms.public_content import (
    home_payload, public_vehicles, vehicle_title, brand_slug, brand_index, format_price_lakhs, visible_offers,
    inventory_stats,
)
from backend.cms.service import public_settings, offer_effective_status, content_cache
from backend.config import settings
from backend.models import Offer, Vehicle
from backend.seo import schema_org as so

logger = logging.getLogger("luxura.seo")

SEO_START, SEO_END = "<!--seo:start-->", "<!--seo:end-->"
ROOT_RE = re.compile(r'<div id="root">\s*</div>')

FALLBACK_SHELL = (
    '<!doctype html><html lang="en"><head><meta charset="UTF-8" />'
    '<meta name="viewport" content="width=device-width, initial-scale=1.0" />'
    f"{SEO_START}<title>Exotique Machines</title>{SEO_END}</head>"
    '<body><div id="root"></div></body></html>'
)

STATIC_PAGES = {
    "/finance": ("Car Finance & EMI Calculator", "Apply for pre-owned luxury car finance in Lucknow. Use the EMI calculator and get options from partner banks through Exotique Machines.",
                 "Car finance"),
    "/test-drive": ("Book a Test Drive", "Book a test drive of a certified pre-owned luxury car at the Exotique Machines showroom on Faizabad Road, Lucknow.",
                    "Test drive"),
    "/trade-in": ("Trade In Your Car", "Get an indicative trade-in value for your current car and upgrade to a certified pre-owned luxury car at Exotique Machines, Lucknow.",
                  "Trade-in"),
    "/service": ("Luxury Car Service", "Book service for your luxury car at Exotique Machines, Lucknow: diagnostics, periodic maintenance and detailing.",
                 "Service"),
}


@dataclass
class Page:
    title: str
    description: str
    path: str
    status: int = 200
    robots: str = "index,follow,max-image-preview:large"
    og_type: str = "website"
    og_image: Optional[str] = None
    jsonld: List[Dict[str, Any]] = field(default_factory=list)
    body: str = ""
    initial_data: Optional[Dict[str, Any]] = None
    # <link rel=preload as=image> entries; must mirror the <picture> sources the SPA
    # renders so the browser reuses the download (see src/components/home/Hero.tsx).
    preloads: List[Dict[str, str]] = field(default_factory=list)


# --------------------------------------------------------------------------
# Shell
# --------------------------------------------------------------------------

_shell_lock = threading.Lock()
# (checked_at, etag, html). The shell is revalidated with a conditional request every few
# seconds, so a frontend deploy (new asset hashes) is picked up almost immediately and
# pages never point at bundles that no longer exist.
_shell: Tuple[float, Optional[str], Optional[str]] = (0.0, None, None)
SHELL_REVALIDATE_S = 5


def _fetch_shell(etag: Optional[str] = None) -> Tuple[Optional[str], Optional[str]]:
    """Returns (etag, html). html is None when unchanged (304) or unavailable."""
    local = settings.DIST_DIR / "index.html"
    if local.exists():
        st = local.stat()
        tag = f"{st.st_mtime_ns}-{st.st_size}"
        return tag, (None if tag == etag else local.read_text(encoding="utf-8"))
    req = urllib.request.Request(settings.FRONTEND_SHELL_URL, headers={"If-None-Match": etag} if etag else {})
    try:
        with urllib.request.urlopen(req, timeout=3) as r:  # internal Docker network
            return r.headers.get("ETag"), r.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        if e.code == 304:
            return etag, None
        logger.warning("could not fetch SPA shell from %s: HTTP %s", settings.FRONTEND_SHELL_URL, e.code)
    except Exception as e:
        logger.warning("could not fetch SPA shell from %s: %s", settings.FRONTEND_SHELL_URL, e)
    return etag, None


def get_shell() -> str:
    global _shell
    checked, etag, cached = _shell
    if cached and time.monotonic() - checked < SHELL_REVALIDATE_S:
        return cached
    with _shell_lock:
        checked, etag, cached = _shell
        if cached and time.monotonic() - checked < SHELL_REVALIDATE_S:
            return cached
        new_etag, fresh = _fetch_shell(etag if cached else None)
        if fresh and SEO_START in fresh:
            _shell = (time.monotonic(), new_etag, fresh)
            return fresh
        if cached:
            _shell = (time.monotonic(), etag, cached)
            return cached
        return FALLBACK_SHELL


def reset_shell_cache():
    global _shell
    _shell = (0.0, None, None)


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------


def e(text: Any) -> str:
    return html.escape("" if text is None else str(text), quote=True)


def safe_json(data: Any) -> str:
    """JSON that can sit inside a <script> element without closing it."""
    return (json.dumps(data, ensure_ascii=False, separators=(",", ":"), default=str)
            .replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
            .replace("\u2028", "\\u2028").replace("\u2029", "\\u2029"))


def _truncate(text: str, n: int = 158) -> str:
    text = re.sub(r"\s+", " ", text or "").strip()
    return text if len(text) <= n else text[: n - 1].rsplit(" ", 1)[0] + "…"


def vehicle_path(v: Dict[str, Any]) -> str:
    return f"/cars/{v['id']}"


def _srcset(url: str, fmt: str, widths) -> str:
    name = url[len("/uploads/"):]
    prefix = "/media/avif/w" if fmt == "avif" else "/media/w"
    return ", ".join(f"{prefix}{w}/{name} {w}w" for w in widths)


def _preload(url: Optional[str], widths, sizes: str, media: Optional[str] = None) -> List[Dict[str, str]]:
    """AVIF preload (browsers without AVIF skip it because of the type attribute)."""
    if not url or not url.startswith("/uploads/"):
        return []
    d = {"imagesrcset": _srcset(url, "avif", widths), "imagesizes": sizes, "type": "image/avif"}
    if media:
        d["media"] = media
    return [d]


def _price(v: Dict[str, Any]) -> str:
    return format_price_lakhs(v.get("price")) if v.get("price") else "Price on request"


def _car_list_html(vehicles: List[Dict[str, Any]]) -> str:
    items = []
    for v in vehicles:
        name = " ".join(str(p) for p in (v.get("year"), v.get("brand"), v.get("model"), v.get("badge")) if p)
        facts = " · ".join(x for x in (v.get("fuel"), v.get("transmission"), _price(v)) if x)
        status = " (sold)" if v.get("status") == "sold" else ""
        items.append(f'<li><a href="{e(vehicle_path(v))}">{e(name)}</a>{e(status)} — {e(facts)}</li>')
    return "<ul>" + "".join(items) + "</ul>" if items else "<p>New cars arrive every week. Call us for the current stock.</p>"


def _nap_html(s: Dict[str, Any]) -> str:
    c = s["contact"]
    addr = ", ".join(x for x in (c.get("streetAddress"), c.get("city"), c.get("region"), c.get("postalCode")) if x)
    phones = " · ".join(f'<a href="tel:{e(p["number"])}">{e(p.get("label") or "")} {e(p["number"])}</a>'
                        for p in c.get("phones") or [] if p.get("number"))
    hours = "; ".join(f'{"–".join([h["days"][0], h["days"][-1]]) if len(h.get("days", [])) > 1 else "".join(h.get("days", []))} '
                      f'{h.get("opens")}–{h.get("closes")}' for h in c.get("openingHours") or [] if h.get("days"))
    parts = [f"<address>{e(s['general'].get('siteName'))}, {e(addr)}</address>"]
    if phones:
        parts.append(f"<p>Call: {phones}</p>")
    if c.get("email"):
        parts.append(f'<p>Email: <a href="mailto:{e(c["email"])}">{e(c["email"])}</a></p>')
    if hours:
        parts.append(f"<p>Opening hours: {e(hours)}</p>")
    if c.get("mapUrl"):
        parts.append(f'<p><a href="{e(c["mapUrl"])}" rel="noopener">Directions on Google Maps</a></p>')
    return "".join(parts)


def _nav_html() -> str:
    links = [("/", "Home"), ("/cars", "All cars"), ("/offers", "Offers"), ("/finance", "Finance"),
             ("/test-drive", "Test drive"), ("/trade-in", "Trade-in"), ("/service", "Service"), ("/about", "About")]
    return "<nav aria-label=\"Site\"><ul>" + "".join(f'<li><a href="{p}">{t}</a></li>' for p, t in links) + "</ul></nav>"


def _wrap(s: Dict[str, Any], inner: str) -> str:
    return (f'<div class="seo-snapshot">{_nav_html()}<main>{inner}</main>'
            f"<footer>{_nap_html(s)}</footer></div>")


def _title(s: Dict[str, Any], t: str) -> str:
    return t + (s["seo"].get("titleSuffix") or "")


def _base_graph(s: Dict[str, Any]) -> List[Dict[str, Any]]:
    return [so.dealer(s), so.website(s)]


# --------------------------------------------------------------------------
# Page builders
# --------------------------------------------------------------------------


def page_home(db: Session, s: Dict[str, Any]) -> Page:
    data = home_payload(db)
    vehicles = data["featured"]["vehicles"]
    hp = s["homepage"]
    hero = (data["hero"] or [None])[0]
    stats = data["stats"]
    inner = [f"<h1>{e(hp.get('heading') or s['seo']['homeTitle'])}</h1>",
             f"<p>{e(s['seo']['homeDescription'])}</p>"]
    if stats.get("count"):
        inner.append(f"<p>{stats['count']} cars in stock from {stats['brands']} brands, {e(stats['priceRange'])}.</p>")
    inner.append("<h2>Featured cars</h2>" + _car_list_html(vehicles))
    if data["brands"]:
        inner.append("<h2>Brands in stock</h2><ul>" + "".join(
            f'<li><a href="/brands/{e(b["slug"])}">{e(b["name"])}</a> ({b["count"]})</li>' for b in data["brands"]) + "</ul>")
    if data["offers"]:
        inner.append("<h2>Current offers</h2><ul>" + "".join(
            f'<li><a href="/offers/{e(o["slug"])}">{e(o["title"])}</a> — {e(o.get("summary") or "")}</li>'
            for o in data["offers"]) + "</ul>")
    if data["reviews"]:
        inner.append("<h2>Customer reviews</h2>" + "".join(
            f"<blockquote><p>{e(r['body'])}</p><cite>{e(r['customerName'])}"
            f"{', ' + e(r['customerTitle']) if r.get('customerTitle') else ''}</cite></blockquote>"
            for r in data["reviews"][:6]))
    faq_items = s.get("faq") or []
    if faq_items:
        inner.append("<h2>Frequently asked questions</h2>" + "".join(
            f"<h3>{e(i['question'])}</h3><p>{e(i['answer'])}</p>" for i in faq_items))
    preloads: List[Dict[str, str]] = []
    if hero:
        desktop = hero.get("desktopImage")
        mobile = hero.get("mobileImage") or desktop
        preloads = (_preload(mobile, (640, 960, 1280), "100vw", "(max-width: 767px)")
                    + _preload(desktop, (960, 1280, 1920), "100vw", "(min-width: 768px)"))
    else:
        # Same fallback as the SPA: the first featured car with a studio photo.
        auto = next((v["images"][0] for v in vehicles if (v.get("images") or [""])[0].startswith("/uploads/")), None)
        if auto:
            preloads = (_preload(auto, (640, 960, 1280), "100vw", "(max-width: 767px)")
                        + _preload(auto, (960, 1280, 1920), "100vw", "(min-width: 768px)"))
    return Page(
        title=s["seo"]["homeTitle"], description=_truncate(s["seo"]["homeDescription"]), path="/",
        og_image=s["seo"].get("defaultOgImage"),
        jsonld=_base_graph(s) + [so.item_list("Featured cars", vehicles, vehicle_path), so.faq(faq_items)],
        body=_wrap(s, "".join(inner)), initial_data={"home": data}, preloads=preloads,
    )


def page_inventory(db: Session, s: Dict[str, Any]) -> Page:
    rows = public_vehicles(db)
    vehicles = [v.to_dict(public=True) for v in rows]
    stock = [v for v in vehicles if v.get("status") != "sold"]
    city = s["contact"].get("city") or "Lucknow"
    t = f"Pre-Owned Luxury Cars for Sale in {city}"
    stats = inventory_stats(rows)
    d = (f"Browse {len(stock)} certified pre-owned luxury cars for sale in {city}: "
         + ", ".join(b["name"] for b in brand_index(rows)[:6])
         + f". {stats['priceRange']}. Finance and trade-in available.")
    return Page(
        title=_title(s, t), description=_truncate(d), path="/cars",
        jsonld=_base_graph(s) + [so.breadcrumbs([("Home", "/"), ("All cars", "/cars")]),
                                 so.item_list(t, stock, vehicle_path)],
        body=_wrap(s, f"<h1>{e(t)}</h1><p>{e(d)}</p>" + _car_list_html(vehicles)),
    )


def page_vehicle(db: Session, s: Dict[str, Any], vehicle_id: str) -> Optional[Page]:
    row = db.query(Vehicle).filter(Vehicle.id == vehicle_id, Vehicle.is_published.is_(True)).first()
    if not row:
        return None
    v = row.to_dict(public=True)
    path = vehicle_path(v)
    name = vehicle_title(row) + (f" {row.badge}" if row.badge else "")
    city = s["contact"].get("city") or "Lucknow"
    sold = v.get("status") == "sold"
    t = f"Sold: {name}" if sold else f"Used {name} for sale in {city}"
    bits = [x for x in (v.get("fuel"), v.get("transmission"), f"{v['seats']} seats" if v.get("seats") else None,
                        v.get("engine"), _price(v)) if x]
    d = f"{name} at Exotique Machines, {city}. " + ", ".join(bits) + ". Book a test drive or apply for finance."
    specs = [("Price", _price(v)), ("Fuel", v.get("fuel")), ("Transmission", v.get("transmission")),
             ("Engine", v.get("engine")), ("Power", v.get("power")), ("Mileage", v.get("mileage")),
             ("Seats", v.get("seats")), ("Body type", v.get("lifestyle")), ("Year", v.get("year")),
             ("Kilometres", f"{v['kmDriven']:,} km" if v.get("kmDriven") else None), ("Owners", v.get("owners")),
             ("Status", (v.get("status") or "available").capitalize())]
    inner = (f"<h1>{e(name)}</h1><p>{e(v.get('description'))}</p><h2>Specifications</h2><dl>"
             + "".join(f"<dt>{e(k)}</dt><dd>{e(val)}</dd>" for k, val in specs if val not in (None, ""))
             + "</dl>")
    if v.get("features"):
        inner += "<h2>Features</h2><ul>" + "".join(f"<li>{e(f)}</li>" for f in v["features"][:40]) + "</ul>"
    first = (v.get("images") or [None])[0]
    if first:
        inner += f'<img src="{e(so.image_variant(first, 960))}" alt="{e(name)}" width="960" />'
    inner += (f'<p><a href="/test-drive?car={e(v["id"])}">Book a test drive</a> · '
              f'<a href="/finance?car={e(v["id"])}">Apply for finance</a> · '
              f'<a href="/brands/{e(brand_slug(v["brand"]))}">More {e(v["brand"])} cars</a></p>')
    return Page(
        title=_title(s, t), description=_truncate(d), path=path, og_type="product",
        og_image=so.image_variant(first, 1280) if first else None,
        jsonld=_base_graph(s) + [
            so.breadcrumbs([("Home", "/"), ("All cars", "/cars"), (v["brand"], f"/brands/{brand_slug(v['brand'])}"),
                            (name, path)]),
            so.vehicle(v, path)],
        body=_wrap(s, inner), initial_data={"vehicle": v},
        preloads=_preload(first, (640, 960, 1280, 1920), "(min-width: 1024px) 60vw, 100vw"),
    )


def page_brand(db: Session, s: Dict[str, Any], slug: str) -> Optional[Page]:
    rows = [v for v in public_vehicles(db) if brand_slug(v.brand) == slug]
    if not rows:
        return None
    brand = rows[0].brand
    vehicles = [v.to_dict(public=True) for v in rows]
    stock = [v for v in vehicles if v.get("status") != "sold"]
    city = s["contact"].get("city") or "Lucknow"
    t = f"Used {brand} Cars for Sale in {city}"
    d = (f"{len(stock)} certified pre-owned {brand} car{'s' if len(stock) != 1 else ''} for sale at Exotique Machines, "
         f"{city}: " + ", ".join(sorted({v['model'] for v in stock})[:6]) + ". Finance, trade-in and test drives.")
    path = f"/brands/{slug}"
    return Page(
        title=_title(s, t), description=_truncate(d), path=path,
        jsonld=_base_graph(s) + [so.breadcrumbs([("Home", "/"), ("All cars", "/cars"), (brand, path)]),
                                 so.item_list(t, stock, vehicle_path)],
        body=_wrap(s, f"<h1>{e(t)}</h1><p>{e(d)}</p>" + _car_list_html(vehicles)),
    )


def page_offers(db: Session, s: Dict[str, Any]) -> Page:
    offers = visible_offers(db)
    t = "Current Offers on Pre-Owned Luxury Cars"
    d = ("Live offers at the Exotique Machines showroom in Lucknow: " + "; ".join(o["title"] for o in offers[:4])
         if offers else "Offers at the Exotique Machines showroom in Lucknow. There are no live offers right now — check back soon.")
    inner = f"<h1>{e(t)}</h1>"
    inner += ("<ul>" + "".join(f'<li><a href="/offers/{e(o["slug"])}">{e(o["title"])}</a> — {e(o.get("summary") or "")} '
                               f'(valid until {e((o.get("endsAt") or "")[:10])})</li>' for o in offers) + "</ul>"
              if offers else "<p>There are no live offers right now.</p>")
    return Page(
        title=_title(s, t), description=_truncate(d), path="/offers",
        jsonld=_base_graph(s) + [so.breadcrumbs([("Home", "/"), ("Offers", "/offers")])]
        + [so.promo_offer(o, f"/offers/{o['slug']}") for o in offers],
        body=_wrap(s, inner),
    )


def page_offer(db: Session, s: Dict[str, Any], slug: str) -> Optional[Page]:
    o = db.query(Offer).filter(Offer.slug == slug).first()
    if not o:
        return None
    eff = offer_effective_status(o)
    if eff in ("draft", "archived", "paused", "scheduled"):
        return None
    od = o.to_dict(public=True, effective_status=eff)
    path = f"/offers/{slug}"
    ended = eff == "expired"
    inner = (f"<h1>{e(od['title'])}</h1>" + (f"<p><strong>This offer has ended.</strong></p>" if ended else "")
             + f"<p>{e(od.get('summary'))}</p><p>{e(od.get('description'))}</p>"
             + f"<p>Valid {e((od.get('startsAt') or '')[:10])} to {e((od.get('endsAt') or '')[:10])}.</p>"
             + (f"<h2>Terms</h2><p>{e(od['terms'])}</p>" if od.get("terms") else ""))
    vehicle = None
    if o.vehicle_id:
        v = db.query(Vehicle).filter(Vehicle.id == o.vehicle_id, Vehicle.is_published.is_(True)).first()
        if v:
            vehicle = v.to_dict(public=True)
            inner += f'<p>Applies to: <a href="{e(vehicle_path(vehicle))}">{e(vehicle_title(v))}</a></p>'
    return Page(
        title=_title(s, od["title"]), description=_truncate(od.get("summary") or od.get("description") or od["title"]),
        path=path, robots="noindex,follow" if ended else "index,follow,max-image-preview:large",
        og_image=so.image_variant(od.get("image"), 1280) if od.get("image") else None,
        jsonld=_base_graph(s) + [so.breadcrumbs([("Home", "/"), ("Offers", "/offers"), (od["title"], path)]),
                                 so.promo_offer(od, path)],
        body=_wrap(s, inner), initial_data={"offer": od, "vehicle": vehicle},
    )


def page_static(db: Session, s: Dict[str, Any], path: str) -> Page:
    t, d, crumb = STATIC_PAGES[path]
    extra = ""
    if path == "/finance" and s.get("faq"):
        extra = "<h2>Finance questions</h2>" + "".join(f"<h3>{e(i['question'])}</h3><p>{e(i['answer'])}</p>" for i in s["faq"])
    if path == "/test-drive":
        extra = "<h2>Cars available for a test drive</h2>" + _car_list_html(
            [v.to_dict(public=True) for v in public_vehicles(db) if v.status != "sold"][:30])
    return Page(
        title=_title(s, t), description=d, path=path,
        jsonld=_base_graph(s) + [so.breadcrumbs([("Home", "/"), (crumb, path)])]
        + ([so.faq(s.get("faq") or [])] if path == "/finance" else []),
        body=_wrap(s, f"<h1>{e(t)}</h1><p>{e(d)}</p>{extra}"),
    )


def page_about(db: Session, s: Dict[str, Any]) -> Page:
    g = s["general"]
    t = g.get("aboutTitle") or "About Exotique Machines"
    paragraphs = "".join(f"<p>{e(p)}</p>" for p in (g.get("aboutBody") or "").split("\n\n") if p.strip())
    assurances = "".join(f"<li>{e(a)}</li>" for a in g.get("assurances") or [])
    d = _truncate((g.get("aboutBody") or g.get("tagline") or "").replace("\n", " "))
    return Page(
        title=_title(s, t), description=d, path="/about",
        jsonld=_base_graph(s) + [so.breadcrumbs([("Home", "/"), ("About", "/about")])],
        body=_wrap(s, f"<h1>{e(t)}</h1>{paragraphs}" + (f"<ul>{assurances}</ul>" if assurances else "")
                   + "<h2>Visit the showroom</h2>" + _nap_html(s)),
    )


def page_admin(s: Dict[str, Any]) -> Page:
    return Page(title="Admin | Exotique Machines", description="Exotique Machines staff portal.", path="/admin",
                robots="noindex,nofollow", body="")


def page_not_found(s: Dict[str, Any], path: str) -> Page:
    return Page(title=_title(s, "Page not found"), description="This page does not exist. Browse all cars at Exotique Machines.",
                path=path, status=404, robots="noindex,follow",
                body=_wrap(s, '<h1>Page not found</h1><p>This page does not exist or the car has been removed. '
                              '<a href="/cars">Browse all cars</a>.</p>'))


ROUTES: List[Tuple[re.Pattern, Callable]] = [
    (re.compile(r"^/$"), lambda db, s, m: page_home(db, s)),
    (re.compile(r"^/cars$"), lambda db, s, m: page_inventory(db, s)),
    (re.compile(r"^/cars/([A-Za-z0-9_.-]{1,128})$"), lambda db, s, m: page_vehicle(db, s, m.group(1))),
    (re.compile(r"^/brands/([a-z0-9-]{1,120})$"), lambda db, s, m: page_brand(db, s, m.group(1))),
    (re.compile(r"^/offers$"), lambda db, s, m: page_offers(db, s)),
    (re.compile(r"^/offers/([a-z0-9-]{1,160})$"), lambda db, s, m: page_offer(db, s, m.group(1))),
    (re.compile(r"^/(finance|test-drive|trade-in|service)$"), lambda db, s, m: page_static(db, s, m.group(0))),
    (re.compile(r"^/about$"), lambda db, s, m: page_about(db, s)),
    (re.compile(r"^/admin(?:/.*)?$"), lambda db, s, m: page_admin(s)),
]


def normalise(path: str) -> str:
    path = "/" + path.lstrip("/")
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")
    return path


def resolve(db: Session, path: str) -> Page:
    s = content_cache.get_or_set("settings:public", lambda: {"settings": public_settings(db)})["settings"]
    path = normalise(path)
    for rx, builder in ROUTES:
        m = rx.match(path)
        if m:
            page = builder(db, s, m)
            if page:
                return page
            break
    return page_not_found(s, path)


# --------------------------------------------------------------------------
# HTML
# --------------------------------------------------------------------------


def build_head(page: Page, s: Dict[str, Any], verification: Dict[str, str]) -> str:
    canonical = so.absolute(page.path if page.path != "/" else "/")
    og_image = so.absolute(page.og_image or s["seo"].get("defaultOgImage") or "/og-default.jpg")
    site_name = s["general"].get("siteName") or settings.SITE_NAME
    tags = [
        f"<title>{e(page.title)}</title>",
        f'<meta name="description" content="{e(page.description)}" />',
        f'<meta name="robots" content="{e(page.robots)}" />',
    ]
    if page.status == 200:
        tags.append(f'<link rel="canonical" href="{e(canonical)}" />')
    tags += [
        f'<meta property="og:site_name" content="{e(site_name)}" />',
        f'<meta property="og:type" content="{e(page.og_type)}" />',
        f'<meta property="og:title" content="{e(page.title)}" />',
        f'<meta property="og:description" content="{e(page.description)}" />',
        f'<meta property="og:url" content="{e(canonical)}" />',
        f'<meta property="og:image" content="{e(og_image)}" />',
        '<meta property="og:locale" content="en_IN" />',
        '<meta name="twitter:card" content="summary_large_image" />',
        f'<meta name="twitter:title" content="{e(page.title)}" />',
        f'<meta name="twitter:description" content="{e(page.description)}" />',
        f'<meta name="twitter:image" content="{e(og_image)}" />',
    ]
    if verification.get("google"):
        tags.append(f'<meta name="google-site-verification" content="{e(verification["google"])}" />')
    if verification.get("bing"):
        tags.append(f'<meta name="msvalidate.01" content="{e(verification["bing"])}" />')
    for p in page.preloads:
        attrs = " ".join(f'{k}="{e(v)}"' for k, v in p.items())
        tags.append(f'<link rel="preload" as="image" {attrs} fetchpriority="high" />')
    nodes = [n for n in page.jsonld if n]
    if nodes:
        tags.append(f'<script type="application/ld+json">{safe_json(so.graph(*nodes))}</script>')
    return "\n    ".join(tags)


def render_html(page: Page, s: Dict[str, Any], verification: Dict[str, str], shell: Optional[str] = None) -> str:
    shell = shell or get_shell()
    head = build_head(page, s, verification)
    start, end = shell.find(SEO_START), shell.find(SEO_END)
    if start != -1 and end != -1:
        out = shell[: start + len(SEO_START)] + "\n    " + head + "\n    " + shell[end:]
    else:
        out = shell.replace("</head>", head + "</head>", 1)
    body = page.body
    if page.initial_data is not None:
        body += f'<script id="em-initial-data" type="application/json">{safe_json(page.initial_data)}</script>'
    if ROOT_RE.search(out):
        # The initial-data script must sit outside #root so React's first render does not
        # remove it before the app reads it.
        snapshot = page.body
        data = body[len(page.body):]
        out = ROOT_RE.sub(lambda _: f'<div id="root">{snapshot}</div>{data}', out, count=1)
    return out
