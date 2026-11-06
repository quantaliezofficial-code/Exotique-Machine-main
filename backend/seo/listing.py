"""Answer-first summaries and facts for listing pages, and the browse-by collections.

Everything here is computed from the live inventory, so each page carries facts that
only it has (counts, price and year ranges, models, last update) and stays fresh as cars
are added or sold. The same text is shown to visitors (React app, via the public API)
and to crawlers that do not run JavaScript (server-rendered snapshot).

Rules: never state anything the data does not support. Fields that are missing are left
out of the sentence rather than guessed.
"""
from __future__ import annotations

import re
from collections import Counter
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from backend.cms.public_content import format_price_lakhs

# A collection page is only worth indexing when it lists at least this many cars;
# below that it is thin (and near-identical to a single car page).
MIN_INDEXABLE = 3


@dataclass(frozen=True)
class Collection:
    slug: str
    label: str            # "SUVs", "diesel cars", "cars under ₹20 Lakh"
    heading: str          # H1 without the city: "Used SUVs for sale"
    match: Callable[[Dict[str, Any]], bool]
    kind: str             # body | budget | fuel | transmission
    preset: Dict[str, Any]  # how the React inventory pre-filters (mirrors src/constants.ts BUDGETS)


def _body(name: str) -> Callable[[Dict[str, Any]], bool]:
    return lambda v: (v.get("lifestyle") or "").lower() == name


def _price(lo: float, hi: Optional[float]) -> Callable[[Dict[str, Any]], bool]:
    return lambda v: v.get("price") is not None and lo <= float(v["price"]) < (hi if hi is not None else 1e12)


# Budget bands match the inventory filter (src/constants.ts BUDGETS, index in preset).
COLLECTIONS: List[Collection] = [
    Collection("suv", "SUVs", "Used SUVs for sale", _body("suv"), "body", {"types": ["SUV"]}),
    Collection("sedan", "sedans", "Used sedans for sale", _body("sedan"), "body", {"types": ["Sedan"]}),
    Collection("under-20-lakh", "cars under ₹20 Lakh", "Used cars under ₹20 Lakh", _price(0, 20), "budget", {"budget": 1}),
    Collection("20-to-40-lakh", "cars from ₹20 to 40 Lakh", "Used cars from ₹20 to 40 Lakh", _price(20, 40), "budget", {"budget": 2}),
    Collection("40-to-75-lakh", "cars from ₹40 to 75 Lakh", "Used luxury cars from ₹40 to 75 Lakh", _price(40, 75), "budget", {"budget": 3}),
    Collection("75-lakh-to-1-crore", "cars from ₹75 Lakh to ₹1 Cr", "Used luxury cars from ₹75 Lakh to ₹1 Cr", _price(75, 100), "budget", {"budget": 4}),
    Collection("above-1-crore", "cars above ₹1 Cr", "Used luxury cars above ₹1 Cr", _price(100, None), "budget", {"budget": 5}),
    Collection("diesel", "diesel cars", "Used diesel cars for sale", lambda v: (v.get("fuel") or "").lower() == "diesel", "fuel", {"fuels": ["Diesel"]}),
    Collection("petrol", "petrol cars", "Used petrol cars for sale", lambda v: (v.get("fuel") or "").lower() == "petrol", "fuel", {"fuels": ["Petrol"]}),
    Collection("automatic", "automatic cars", "Used automatic cars for sale", lambda v: (v.get("transmission") or "").lower() == "automatic", "transmission", {"transmission": "Automatic"}),
]
BY_SLUG = {c.slug: c for c in COLLECTIONS}


def collection_path(slug: str) -> str:
    return f"/used-cars/{slug}"


def in_stock(vehicles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [v for v in vehicles if v.get("status") != "sold"]


def collection_vehicles(c: Collection, vehicles: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [v for v in in_stock(vehicles) if c.match(v)]


def collection_index(vehicles: List[Dict[str, Any]], city: str) -> List[Dict[str, Any]]:
    out = []
    for c in COLLECTIONS:
        n = len(collection_vehicles(c, vehicles))
        out.append({"slug": c.slug, "kind": c.kind, "label": c.label, "title": f"{c.heading} in {city}",
                    "path": collection_path(c.slug), "count": n, "indexable": n >= MIN_INDEXABLE,
                    "preset": c.preset})
    return out


# ------------------------------------------------------------------ facts


def _plural(n: int, one: str, many: Optional[str] = None) -> str:
    return f"{n} {one if n == 1 else (many or one + 's')}"


def _join(items: List[str]) -> str:
    items = [i for i in items if i]
    if len(items) <= 1:
        return "".join(items)
    return ", ".join(items[:-1]) + " and " + items[-1]


def _date(iso: Optional[str]) -> Optional[str]:
    if not iso:
        return None
    try:
        return datetime.fromisoformat(iso.replace("Z", "+00:00")).date().isoformat()
    except ValueError:
        return None


def human_date(iso: str) -> str:
    """'2026-11-04' -> '4 November 2026' (Indian/British order)."""
    try:
        d = datetime.fromisoformat(iso)
        return f"{d.day} {d.strftime('%B %Y')}"
    except ValueError:
        return iso


def listing_facts(vehicles: List[Dict[str, Any]]) -> Dict[str, Any]:
    stock = in_stock(vehicles)
    prices = [float(v["price"]) for v in stock if v.get("price")]
    years = [int(v["year"]) for v in stock if v.get("year")]
    kms = [int(v["kmDriven"]) for v in stock if v.get("kmDriven")]
    brands = Counter(v["brand"] for v in stock if v.get("brand"))
    fuels = Counter(v["fuel"] for v in stock if v.get("fuel"))
    trans = Counter(v["transmission"] for v in stock if v.get("transmission"))
    updated = max((v.get("updatedAt") or v.get("createdAt") or "" for v in vehicles), default="") or None
    return {
        "count": len(stock),
        "minPrice": min(prices) if prices else None,
        "maxPrice": max(prices) if prices else None,
        "priceRange": f"{format_price_lakhs(min(prices))} – {format_price_lakhs(max(prices))}" if prices else None,
        "yearRange": (f"{min(years)}–{max(years)}" if min(years) != max(years) else str(years[0])) if years else None,
        "lowestKm": min(kms) if kms else None,
        "brands": [{"name": b, "count": n} for b, n in brands.most_common()],
        "fuels": [{"name": f, "count": n} for f, n in fuels.most_common()],
        "transmissions": [{"name": t, "count": n} for t, n in trans.most_common()],
        "models": sorted({v["model"] for v in stock if v.get("model")}),
        "updatedAt": _date(updated),
    }


def _singular(label: str) -> str:
    """'SUVs' -> 'SUV', 'cars under ₹20 Lakh' -> 'car under ₹20 Lakh' (first word only)."""
    first, _, rest = label.partition(" ")
    if first.endswith("s"):
        first = first[:-1]
    return f"{first} {rest}".strip()


def listing_summary(label: str, facts: Dict[str, Any], city: str, dealer: str) -> str:
    """Bottom line up front: how many, how much, which makes, then the details."""
    n = facts["count"]
    if not n:
        return f"There are no {label} in stock at {dealer} in {city} right now. New cars arrive often; call us or check back soon."
    s = [f"{dealer} in {city} has {n} {label if n != 1 else _singular(label)} in stock"]
    if facts.get("priceRange"):
        s[0] += (f", priced at {format_price_lakhs(facts['minPrice'])}" if facts["minPrice"] == facts["maxPrice"]
                 else f", priced from {format_price_lakhs(facts['minPrice'])} to {format_price_lakhs(facts['maxPrice'])}")
    s[0] += "."
    brands = facts.get("brands") or []
    if brands:
        top = [f"{b['name']} ({b['count']})" for b in brands[:5]]
        more = len(brands) - 5
        if more > 0:
            top.append(_plural(more, "other brand"))
        s.append(f"Makes in stock: {_join(top)}.")
    details = []
    if facts.get("yearRange"):
        details.append(f"model year{'s' if '–' in facts['yearRange'] else ''} {facts['yearRange']}")
    fuels = facts.get("fuels") or []
    if len(fuels) > 1:
        details.append(_join([f"{f['count']} {f['name'].lower()}" for f in fuels[:3]]))
    trans = facts.get("transmissions") or []
    if len(trans) > 1:
        details.append(_join([f"{t['count']} {t['name'].lower()}" for t in trans]))
    if details:
        s.append("The range covers " + "; ".join(details) + ".")
    if facts.get("updatedAt"):
        s.append(f"Stock list updated {human_date(facts['updatedAt'])}.")
    return " ".join(s)


# ------------------------------------------------------------------ single car


def clean_name(model: str, badge: Optional[str], year: Optional[int] = None) -> str:
    """'730Ld M Sport' + 'M Sport Executive' -> '730Ld M Sport Executive' (no repeated words);
    a trailing '(2023)' in the trim is dropped when the year is already shown."""
    model = (model or "").strip()
    badge = (badge or "").strip()
    if year:
        badge = re.sub(rf"\s*\({year}\)\s*$", "", badge)
    if not badge or badge.lower() == model.lower():
        return model
    mw, bw = model.split(), badge.split()
    for k in range(min(len(mw), len(bw)), 0, -1):
        if [w.lower() for w in mw[-k:]] == [w.lower() for w in bw[:k]]:
            return " ".join(mw + bw[k:])
    if badge.lower() in model.lower():
        return model
    return f"{model} {badge}"


def vehicle_summary(v: Dict[str, Any], city: str, dealer: str, area: Optional[str] = None) -> str:
    name = " ".join(p for p in (str(v["year"]) if v.get("year") else None, v.get("brand"),
                                clean_name(v.get("model") or "", v.get("badge"), v.get("year"))) if p)
    price = format_price_lakhs(float(v["price"])) if v.get("price") else None
    status = v.get("status") or "available"
    if status == "sold":
        first = f"This {name} has been sold by {dealer}, {city}."
    else:
        first = f"This {name} is for sale at {dealer} in {city}" + (f" for {price}" if price else "") + "."
        if status == "reserved":
            first += " It is currently reserved."
    s = [first]
    usage = []
    if v.get("kmDriven"):
        usage.append(f"has covered {int(v['kmDriven']):,} km")
    if v.get("owners"):
        usage.append(f"has had {_plural(int(v['owners']), 'previous owner')}")
    spec = []
    if v.get("fuel"):
        spec.append(f"a {v['fuel'].lower()} engine" + (f" ({v['engine']})" if v.get("engine") else ""))
    if v.get("transmission"):
        spec.append(f"{v['transmission'].lower()} transmission")
    if v.get("seats"):
        spec.append(f"{v['seats']} seats")
    if usage:
        s.append("It " + _join(usage) + ".")
    if spec:
        s.append("It has " + _join(spec) + ".")
    if v.get("registration"):
        s.append(f"Registration: {v['registration']}.")
    if status != "sold":
        where = f" in {area}" if area else ""
        s.append(f"You can see it and book a test drive at our showroom{where}.")
    return " ".join(s)


def listing_payload(db, s: Dict[str, Any], brand: Optional[str] = None, collection: Optional[str] = None) -> Optional[Dict[str, Any]]:
    """What /api/public/listing returns, and what the server-rendered page embeds as
    initial data, for /cars, /brands/<slug> and /used-cars/<slug>. None if not found."""
    from backend.cms.public_content import brand_index, brand_slug, public_vehicles
    city = s["contact"].get("city") or "Lucknow"
    dealer = s["general"].get("siteName") or "Exotique Machines"
    rows = public_vehicles(db)
    all_v = [v.to_dict(public=True) for v in rows]
    if collection:
        c = BY_SLUG.get(collection)
        if not c:
            return None
        vs, label, title, path = collection_vehicles(c, all_v), c.label, f"{c.heading} in {city}", collection_path(c.slug)
    elif brand:
        vs = [v for v in all_v if brand_slug(v["brand"]) == brand]
        if not vs:
            return None
        name = vs[0]["brand"]
        label, title, path = f"used {name} cars", f"Used {name} Cars for Sale in {city}", f"/brands/{brand}"
    else:
        vs, label, title, path = all_v, "used cars", f"Pre-Owned Luxury Cars for Sale in {city}", "/cars"
    facts = listing_facts(vs)
    return {
        "title": title, "path": path,
        "summary": listing_summary(label, facts, city, dealer), "facts": facts,
        "indexable": facts["count"] >= MIN_INDEXABLE or not collection,
        "preset": BY_SLUG[collection].preset if collection else None,
        "collections": [x for x in collection_index(all_v, city) if x["indexable"]],
        "brands": brand_index(rows),
    }
