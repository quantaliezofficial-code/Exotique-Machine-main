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
