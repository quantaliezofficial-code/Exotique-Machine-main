import json
import re

from backend.seo.render import safe_json
from backend.tests.conftest import XHR, OWNER, login


def _ld(html):
    m = re.search(r'<script type="application/ld\+json">(.*?)</script>', html, re.S)
    return json.loads(m.group(1)) if m else None


def _types(ld):
    out = []
    for n in ld["@graph"]:
        t = n["@type"]
        out += t if isinstance(t, list) else [t]
    return out


def test_home_has_head_tags_snapshot_and_dealer(client):
    r = client.get("/__seo/")
    assert r.status_code == 200
    html = r.text
    assert "<title>Exotique Machines | Certified Pre-Owned Luxury Cars in Lucknow</title>" in html
    assert '<link rel="canonical" href="https://exotiquemachines.com/" />' in html
    assert 'class="seo-snapshot"' in html and "<h1>" in html
    types = _types(_ld(html))
    assert "AutoDealer" in types and "WebSite" in types
    assert 'id="em-initial-data"' in html
    assert "<title>Shell</title>" not in html


def test_vehicle_page(client):
    v = client.get("/api/vehicles").json()["vehicles"][0]
    r = client.get(f"/__seo/cars/{v['id']}")
    assert r.status_code == 200
    ld = _ld(r.text)
    car = next(n for n in ld["@graph"] if isinstance(n["@type"], list) and "Car" in n["@type"])
    assert car["offers"]["priceCurrency"] == "INR"
    assert car["offers"]["price"] == round(v["price"] * 100000)
    assert "aggregateRating" not in car and "review" not in car
    assert "BreadcrumbList" in _types(ld)
    data = json.loads(re.search(r'id="em-initial-data" type="application/json">(.*?)</script>', r.text, re.S).group(1))
    assert data["vehicle"]["id"] == v["id"]


def test_unknown_pages_are_404_noindex(client):
    r = client.get("/__seo/cars/does-not-exist")
    assert r.status_code == 404
    assert "noindex" in r.text and 'rel="canonical"' not in r.text
    assert client.get("/__seo/some/random/path").status_code == 404


def test_admin_is_noindex(client):
    r = client.get("/__seo/admin")
    assert "noindex,nofollow" in r.text
    assert r.headers["x-robots-tag"] == "noindex,nofollow"


def test_brand_and_inventory_pages(client):
    v = client.get("/api/vehicles").json()["vehicles"][0]
    slug = re.sub(r"[^a-z0-9]+", "-", v["brand"].lower()).strip("-")
    r = client.get(f"/__seo/brands/{slug}")
    assert r.status_code == 200 and f"Used {v['brand']} Cars" in r.text
    r = client.get("/__seo/cars")
    assert r.status_code == 200 and "ItemList" in _types(_ld(r.text))


def test_static_pages(client):
    for p in ("finance", "test-drive", "trade-in", "service", "about", "offers"):
        r = client.get(f"/__seo/{p}")
        assert r.status_code == 200, p
        assert f'href="https://exotiquemachines.com/{p}"' in r.text


def test_sitemap_lists_live_urls_only(client):
    xml = client.get("/sitemap.xml").text
    v = client.get("/api/vehicles").json()["vehicles"][0]
    assert f"https://exotiquemachines.com/cars/{v['id']}" in xml
    assert "/admin" not in xml
    assert "corporate-elite-program" not in xml  # legacy offers are drafts


def test_robots_and_ai_crawler_toggle(client):
    txt = client.get("/robots.txt").text
    assert "Sitemap: https://exotiquemachines.com/sitemap.xml" in txt and "GPTBot" not in txt
    login(client, *OWNER)
    seo = client.get("/api/admin/site-settings").json()["draft"]["seo"]
    client.put("/api/admin/site-settings/seo", json={**seo, "allowAiCrawlers": False}, headers=XHR)
    client.post("/api/admin/site-settings/publish", json={"keys": ["seo"]}, headers=XHR)
    txt = client.get("/robots.txt").text
    assert "User-agent: GPTBot\nDisallow: /" in txt
    assert "OAI-SearchBot" not in txt  # answer engines still allowed
    client.put("/api/admin/site-settings/seo", json={**seo, "allowAiCrawlers": True}, headers=XHR)
    client.post("/api/admin/site-settings/publish", json={"keys": ["seo"]}, headers=XHR)


def test_llms_txt(client):
    txt = client.get("/llms.txt").text
    assert txt.startswith("# Exotique Machines")
    assert "## Cars in stock" in txt and "Faizabad Road" in txt


def test_script_breakout_is_escaped(owner):
    payload = "</script><script>alert(1)</script>"
    assert "</script>" not in safe_json({"x": payload})
    s = owner.get("/api/admin/site-settings").json()["draft"]["homepage"]
    s["heading"] = payload
    owner.put("/api/admin/site-settings/homepage", json=s, headers=XHR)
    owner.post("/api/admin/site-settings/publish", json={"keys": ["homepage"]}, headers=XHR)
    html = owner.get("/__seo/").text
    assert "<script>alert(1)</script>" not in html
    s["heading"] = "Certified Pre-Owned Luxury Cars in Lucknow"
    owner.put("/api/admin/site-settings/homepage", json=s, headers=XHR)
    owner.post("/api/admin/site-settings/publish", json={"keys": ["homepage"]}, headers=XHR)


def test_expired_offer_page_is_noindex(owner):
    body = {"title": "Ended spring deal", "startsAt": "2025-03-01T00:00:00Z", "endsAt": "2025-04-01T00:00:00Z",
            "status": "published"}
    slug = owner.post("/api/admin/offers", json=body, headers=XHR).json()["offer"]["slug"]
    r = owner.get(f"/__seo/offers/{slug}")
    assert r.status_code == 200 and "noindex,follow" in r.text and "This offer has ended" in r.text


def test_vehicle_page_with_colours_and_facts(owner):
    r = owner.post("/api/vehicles", data={"brand": "Volvo", "model": "XC90", "price": "62.5", "year": "2019", "kmDriven": "41000",
                                          "owners": "1", "colors": '[{"name": "Crystal White", "hex": "#f5f5f5"}]'}, headers=XHR)
    assert r.status_code == 201, r.text
    vid = r.json()["vehicle"]["id"]
    page = owner.get(f"/__seo/cars/{vid}")
    assert page.status_code == 200
    car = next(n for n in _ld(page.text)["@graph"] if isinstance(n["@type"], list))
    assert car["color"] == "Crystal White"
    assert car["mileageFromOdometer"]["value"] == 41000 and car["vehicleModelDate"] == "2019"


# ------------------------------------------------------------------ answer-first & collections


def test_clean_name_and_vehicle_summary():
    from backend.seo.listing import clean_name, vehicle_summary
    assert clean_name("730Ld M Sport", "M Sport Executive") == "730Ld M Sport Executive"
    assert clean_name("Fortuner", "4*2 MT Luxury (2023)", 2023) == "Fortuner 4*2 MT Luxury"
    assert clean_name("X5", "X5") == "X5"
    s = vehicle_summary({"year": 2021, "brand": "BMW", "model": "X1", "price": 20.5, "kmDriven": 65000, "owners": 1,
                         "fuel": "Diesel", "transmission": "Automatic", "seats": 5}, "Lucknow", "Exotique Machines", "Indira Nagar")
    assert s.startswith("This 2021 BMW X1 is for sale at Exotique Machines in Lucknow for ₹20.50 Lakh.")
    assert "65,000 km" in s and "1 previous owner" in s and "in Indira Nagar" in s
    # Missing facts are left out, never guessed
    s = vehicle_summary({"brand": "Audi", "model": "A3", "status": "sold"}, "Lucknow", "Exotique Machines")
    assert "sold" in s and "km" not in s and "test drive" not in s


def test_listing_summary_is_answer_first_and_factual():
    from backend.seo.listing import listing_facts, listing_summary
    vs = [{"brand": "BMW", "model": "X5", "price": 89.5, "year": 2024, "fuel": "Diesel", "transmission": "Automatic",
           "updatedAt": "2026-11-01T10:00:00Z"},
          {"brand": "Audi", "model": "A3", "price": 21.5, "year": 2020, "fuel": "Petrol", "transmission": "Automatic"},
          {"brand": "Audi", "model": "Q7", "price": 50, "status": "sold"}]
    f = listing_facts(vs)
    assert f["count"] == 2 and f["priceRange"] == "₹21.50 Lakh – ₹89.50 Lakh" and f["yearRange"] == "2020–2024"
    s = listing_summary("SUVs", f, "Lucknow", "Exotique Machines")
    assert s.startswith("Exotique Machines in Lucknow has 2 SUVs in stock, priced from ₹21.50 Lakh to ₹89.50 Lakh.")
    assert "1 November 2026" in s and "Q7" not in s
    one = listing_summary("SUVs", listing_facts(vs[:1]), "Lucknow", "Exotique Machines")
    assert "has 1 SUV in stock, priced at ₹89.50 Lakh" in one


def test_collection_pages(client):
    r = client.get("/__seo/used-cars/suv")
    assert r.status_code == 200
    assert "<h1>Used SUVs for sale in Lucknow</h1>" in r.text
    assert "in stock" in r.text and "<table>" in r.text
    types = _types(_ld(r.text))
    assert "WebPage" in types and "ItemList" in types and "BreadcrumbList" in types
    assert client.get("/__seo/used-cars/not-a-collection").status_code == 404
    api = client.get("/api/public/listing", params={"collection": "suv"}).json()
    assert api["title"] == "Used SUVs for sale in Lucknow" and api["preset"] == {"types": ["SUV"]}
    assert api["summary"].startswith("Exotique Machines in Lucknow has")
    assert client.get("/api/public/listing", params={"collection": "nope"}).status_code == 404


def test_thin_collections_are_noindex_and_not_in_sitemap(client):
    from backend.seo.listing import COLLECTIONS, MIN_INDEXABLE, collection_vehicles
    vehicles = client.get("/api/vehicles").json()["vehicles"]
    xml = client.get("/sitemap.xml").text
    for c in COLLECTIONS:
        n = len(collection_vehicles(c, vehicles))
        html = client.get(f"/__seo/used-cars/{c.slug}").text
        if n >= MIN_INDEXABLE:
            assert f"/used-cars/{c.slug}<" in xml and 'content="index,follow' in html, c.slug
        else:
            assert f"/used-cars/{c.slug}<" not in xml and 'content="noindex,follow"' in html, c.slug


def test_vehicle_summary_in_api_and_page(client):
    v = client.get("/api/vehicles").json()["vehicles"][0]
    assert v["summary"].startswith("This ")
    html = client.get(f"/__seo/cars/{v['id']}").text
    assert v["summary"].split(".")[0].replace("₹", "") in html.replace("&#x27;", "'").replace("₹", "")
    assert "WebPage" in _types(_ld(html))


def test_titles_fit_and_do_not_repeat_the_brand(client):
    for p in ("/cars", "/about", "/used-cars/suv", "/finance"):
        t = re.search(r"<title>(.*?)</title>", client.get(f"/__seo{p}").text).group(1)
        assert len(t) <= 65, (p, t)
        assert t.count("Exotique Machines") <= 1, (p, t)


def test_llms_txt_has_key_facts_and_browse_links(client):
    txt = client.get("/llms.txt").text
    assert "## Key facts" in txt and "## Browse by brand" in txt and "/used-cars/" in txt


def test_indexnow_key_file(client, monkeypatch):
    from backend.config import settings
    assert client.get("/abcdefgh1234.txt").status_code == 404
    monkeypatch.setattr(settings, "INDEXNOW_KEY", "abcdefgh1234", raising=False)
    r = client.get("/abcdefgh1234.txt")
    assert r.status_code == 200 and r.text == "abcdefgh1234"
    assert client.get("/zzzzzzzz9999.txt").status_code == 404
    assert client.get("/robots.txt").status_code == 200 and client.get("/llms.txt").status_code == 200


def test_indexnow_only_pings_in_production(monkeypatch):
    from backend.config import settings
    from backend.seo import indexnow
    calls = []
    monkeypatch.setattr(indexnow, "_send", lambda urls: calls.append(urls))
    monkeypatch.setattr(settings, "INDEXNOW_KEY", "abcdefgh1234", raising=False)
    monkeypatch.setattr(indexnow.threading, "Thread", lambda target, args, daemon: type("T", (), {"start": lambda self: target(*args)})())
    monkeypatch.setattr(settings, "ENVIRONMENT", "test")
    indexnow.notify(["/cars/x"])
    assert calls == []
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    indexnow.notify(["/cars/x", "/cars", "not-a-path"])
    assert calls == [["https://exotiquemachines.com/cars", "https://exotiquemachines.com/cars/x"]]
