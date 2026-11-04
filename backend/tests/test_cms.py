from backend.cms.images import generate_all_variants, variant_file, AVIF_AVAILABLE, VARIANT_WIDTHS
from backend.config import settings
from backend.tests.conftest import XHR, login, make_admin, png_bytes, OWNER


def _upload(c, folder="hero", width=1600):
    r = c.post("/api/admin/media/upload", files={"files": ("pic.png", png_bytes(width=width), "image/png")},
               data={"folder": folder}, headers=XHR)
    assert r.status_code == 201, r.text
    return r.json()["media"][0]


def _first_vehicle(c):
    return c.get("/api/vehicles").json()["vehicles"][0]


def test_hero_draft_hidden_until_published(owner):
    img = _upload(owner)
    r = owner.post("/api/admin/hero", json={"title": "Winter arrivals", "desktopImage": img["url"], "status": "draft"},
                   headers=XHR)
    sid = r.json()["slide"]["id"]
    titles = [s["title"] for s in owner.get("/api/public/home").json()["hero"]]
    assert "Winter arrivals" not in titles
    preview = [s["title"] for s in owner.get("/api/public/home?preview=1").json()["hero"]]
    assert "Winter arrivals" in preview
    body = {"title": "Winter arrivals", "desktopImage": img["url"], "status": "published"}
    assert owner.put(f"/api/admin/hero/{sid}", json=body, headers=XHR).status_code == 200
    titles = [s["title"] for s in owner.get("/api/public/home").json()["hero"]]
    assert "Winter arrivals" in titles


def test_preview_requires_cms_permission(client):
    client.cookies.clear()
    r = client.get("/api/public/home?preview=1")
    assert r.json()["preview"] is False
    assert r.headers["cache-control"].startswith("public")


def test_hero_rejects_unsafe_links(owner):
    img = _upload(owner)
    for bad in ("javascript:alert(1)", "//evil.example", "http://plain.example"):
        r = owner.post("/api/admin/hero", json={"title": "x", "desktopImage": img["url"], "ctaUrl": bad}, headers=XHR)
        assert r.status_code == 422, bad


def test_hero_image_minimum_width(owner):
    r = owner.post("/api/admin/media/upload", files={"files": ("small.png", png_bytes(width=600, height=400), "image/png")},
                   data={"folder": "hero"}, headers=XHR)
    assert r.status_code == 400


def test_showcase_orders_featured_vehicles(owner):
    vehicles = owner.get("/api/vehicles").json()["vehicles"]
    a, b = vehicles[0]["id"], vehicles[1]["id"]
    ra = owner.post("/api/admin/featured-vehicles", json={"vehicleId": a, "label": "Just in"}, headers=XHR).json()
    rb = owner.post("/api/admin/featured-vehicles", json={"vehicleId": b}, headers=XHR).json()
    owner.post("/api/admin/featured-vehicles/reorder", json={"ids": [rb["item"]["id"], ra["item"]["id"]]}, headers=XHR)
    feat = owner.get("/api/public/home").json()["featured"]
    assert feat["source"] == "cms"
    assert [v["id"] for v in feat["vehicles"][:2]] == [b, a]
    assert owner.post("/api/admin/featured-vehicles", json={"vehicleId": a}, headers=XHR).status_code == 409


def test_customer_review_needs_approval(client):
    client.cookies.clear()
    r = client.post("/api/public/reviews", json={"customerName": "Ritu Sharma", "rating": 5,
                                                 "body": "Smooth purchase, honest inspection report and quick paperwork."})
    assert r.status_code == 201
    assert all(x["customerName"] != "Ritu Sharma" for x in client.get("/api/public/reviews").json()["reviews"])
    login(client, *OWNER)
    pending = client.get("/api/admin/reviews?status=pending").json()["reviews"]
    rid = next(x["id"] for x in pending if x["customerName"] == "Ritu Sharma")
    client.patch(f"/api/admin/reviews/{rid}/moderate", json={"status": "approved"}, headers=XHR)
    public = client.get("/api/public/reviews").json()["reviews"]
    hit = next(x for x in public if x["customerName"] == "Ritu Sharma")
    assert "submittedIp" not in hit and "status" not in hit


def test_offer_lifecycle_and_expiry(owner):
    base = {"title": "Festive exchange bonus", "summary": "Extra value on exchange", "discountType": "fixed",
            "discountValue": 50000, "startsAt": "2026-01-01T00:00:00Z", "endsAt": "2099-01-01T00:00:00Z"}
    r = owner.post("/api/admin/offers", json={**base, "status": "published"}, headers=XHR)
    assert r.status_code == 201
    slug = r.json()["offer"]["slug"]
    assert owner.get(f"/api/public/offers/{slug}").status_code == 200
    expired = {**base, "title": "Old monsoon deal", "startsAt": "2025-01-01T00:00:00Z", "endsAt": "2025-02-01T00:00:00Z"}
    r = owner.post("/api/admin/offers", json={**expired, "status": "published"}, headers=XHR)
    eslug = r.json()["offer"]["slug"]
    assert r.json()["offer"]["effectiveStatus"] == "expired"
    assert eslug not in [o["slug"] for o in owner.get("/api/public/offers").json()["offers"]]
    bad = {**base, "title": "Backwards dates", "startsAt": "2026-05-01T00:00:00Z", "endsAt": "2026-04-01T00:00:00Z"}
    assert owner.post("/api/admin/offers", json=bad, headers=XHR).status_code == 400


def test_offer_duplicate_is_draft(owner):
    offers = owner.get("/api/admin/offers").json()["offers"]
    r = owner.post(f"/api/admin/offers/{offers[0]['id']}/duplicate", headers=XHR)
    assert r.status_code == 201
    assert r.json()["offer"]["effectiveStatus"] == "draft"


def test_media_in_use_cannot_be_deleted(owner):
    img = _upload(owner)
    owner.post("/api/admin/hero", json={"title": "Uses image", "desktopImage": img["url"], "status": "draft"}, headers=XHR)
    r = owner.delete(f"/api/admin/media/{img['id']}", headers=XHR)
    assert r.status_code == 409
    assert r.json()["detail"]["usage"]
    assert (settings.UPLOADS_DIR / img["filename"]).exists()


def test_unused_media_delete_removes_all_copies(owner):
    img = _upload(owner, folder="general")
    generate_all_variants(img["filename"])
    src = settings.UPLOADS_DIR / img["filename"]
    v = variant_file(src, 640, "webp")
    assert v.exists()
    assert owner.delete(f"/api/admin/media/{img['id']}", headers=XHR).status_code == 200
    assert not src.exists() and not v.exists()
    assert not (settings.originals_dir / img["filename"]).exists()


def test_duplicate_upload_reuses_existing(owner):
    data = png_bytes()
    a = owner.post("/api/admin/media/upload", files={"files": ("a.png", data, "image/png")}, headers=XHR).json()["media"][0]
    b = owner.post("/api/admin/media/upload", files={"files": ("b.png", data, "image/png")}, headers=XHR).json()["media"][0]
    assert b["duplicate"] is True and b["id"] == a["id"]


def test_replace_media_updates_references(owner):
    img = _upload(owner)
    sid = owner.post("/api/admin/hero", json={"title": "Replace me", "desktopImage": img["url"], "status": "draft"},
                     headers=XHR).json()["slide"]["id"]
    r = owner.post(f"/api/admin/media/{img['id']}/replace", files={"file": ("n.png", png_bytes(), "image/png")},
                   headers=XHR)
    assert r.status_code == 200
    new_url = r.json()["media"]["url"]
    assert new_url != img["url"]
    slide = next(s for s in owner.get("/api/admin/hero").json()["slides"] if s["id"] == sid)
    assert slide["desktopImage"] == new_url
    assert r.json()["media"]["originalPreserved"] is True


def test_settings_draft_then_publish(owner):
    s = owner.get("/api/admin/site-settings").json()
    general = s["draft"]["general"]
    general["tagline"] = "Draft tagline for testing"
    assert owner.put("/api/admin/site-settings/general", json=general, headers=XHR).status_code == 200
    assert owner.get("/api/public/site-settings").json()["settings"]["general"]["tagline"] != "Draft tagline for testing"
    owner.post("/api/admin/site-settings/publish", json={"keys": ["general"]}, headers=XHR)
    assert owner.get("/api/public/site-settings").json()["settings"]["general"]["tagline"] == "Draft tagline for testing"


def test_settings_validation(owner):
    contact = owner.get("/api/admin/site-settings").json()["draft"]["contact"]
    bad = {**contact, "mapUrl": "javascript:alert(1)"}
    assert owner.put("/api/admin/site-settings/contact", json=bad, headers=XHR).status_code == 400
    bad = {**contact, "phones": [{"label": "x", "number": "call me"}]}
    assert owner.put("/api/admin/site-settings/contact", json=bad, headers=XHR).status_code == 400
    assert owner.put("/api/admin/site-settings/social", json={"instagram": "http://insecure"}, headers=XHR).status_code == 400
    assert owner.put("/api/admin/site-settings/general", json=["wrong type"], headers=XHR).status_code == 400


def test_verification_tokens_not_exposed(owner):
    seo = owner.get("/api/admin/site-settings").json()["draft"]["seo"]
    seo["googleSiteVerification"] = "google-token-123"
    owner.put("/api/admin/site-settings/seo", json=seo, headers=XHR)
    owner.post("/api/admin/site-settings/publish", json={"keys": ["seo"]}, headers=XHR)
    assert "google-token-123" not in owner.get("/api/public/site-settings").text
    assert 'content="google-token-123"' in owner.get("/__seo/").text


def test_every_change_is_audited(owner):
    entries = owner.get("/api/admin/content-audit?entity_type=offer").json()["entries"]
    assert entries and all(e["actorUsername"] for e in entries)


def test_vehicle_photo_upload_registers_media(owner):
    r = owner.post("/api/vehicles", data={"brand": "Porsche", "model": "Cayenne", "price": "95", "year": "2021",
                                          "kmDriven": "24000", "owners": "1"},
                   files=[("photos", ("car.png", png_bytes(), "image/png"))], headers=XHR)
    assert r.status_code == 201, r.text
    url = r.json()["vehicle"]["images"][0]
    media = owner.get("/api/admin/media?folder=vehicles").json()["media"]
    m = next(x for x in media if x["url"] == url)
    assert m["originalPreserved"] and m["placeholder"].startswith("data:image/webp;base64,")


def test_variants_webp_and_avif(owner):
    img = _upload(owner, folder="general", width=2000)
    t = generate_all_variants(img["filename"])
    src = settings.UPLOADS_DIR / img["filename"]
    for w in VARIANT_WIDTHS:
        assert variant_file(src, w, "webp").exists()
        if AVIF_AVAILABLE:
            assert variant_file(src, w, "avif").exists()
    assert t["total"] > 0
    r = owner.get(f"/media/w640/{img['filename']}")
    assert r.status_code == 200 and r.headers["content-type"] == "image/webp"
    assert "immutable" in r.headers["cache-control"]
    if AVIF_AVAILABLE:
        r = owner.get(f"/media/avif/w640/{img['filename']}")
        assert r.status_code == 200 and r.headers["content-type"] == "image/avif"
    assert owner.get(f"/media/w32/{img['filename']}").status_code == 200


def test_variants_never_upscale(owner):
    from PIL import Image
    img = _upload(owner, folder="general", width=700)
    path = owner.get(f"/media/w1920/{img['filename']}")
    assert path.status_code == 200
    import io
    assert Image.open(io.BytesIO(path.content)).width <= 700
