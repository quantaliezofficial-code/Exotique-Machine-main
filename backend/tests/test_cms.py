import json
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


def test_homepage_services_and_collections_validation(owner):
    hp = owner.get("/api/admin/site-settings").json()["draft"]["homepage"]
    assert hp["services"]["items"] and hp["collections"], "restored home sections have defaults"
    good = {**hp, "collections": [{"label": "SUVs", "image": "/uploads/x.jpg", "link": "/cars?type=SUV"}]}
    assert owner.put("/api/admin/site-settings/homepage", json=good, headers=XHR).status_code == 200
    bad = {**hp, "collections": [{"label": "x", "image": "/uploads/x.jpg", "link": "javascript:alert(1)"}]}
    assert owner.put("/api/admin/site-settings/homepage", json=bad, headers=XHR).status_code == 400
    bad = {**hp, "services": {**hp["services"], "items": [{"title": "", "desc": "", "image": "", "link": "/service"}]}}
    assert owner.put("/api/admin/site-settings/homepage", json=bad, headers=XHR).status_code == 400
    bad = {**hp, "services": {**hp["services"], "ctaUrl": "javascript:void(0)"}}
    assert owner.put("/api/admin/site-settings/homepage", json=bad, headers=XHR).status_code == 400
    many = {**hp, "collections": [{"label": f"r{i}", "image": "", "link": "/cars"} for i in range(13)]}
    assert owner.put("/api/admin/site-settings/homepage", json=many, headers=XHR).status_code == 400


def test_previous_site_reviews_imported_as_pending(owner):
    reviews = owner.get("/api/admin/reviews?status=pending").json()["reviews"]
    legacy = [r for r in reviews if r["source"] == "previous-site"]
    assert len(legacy) == 3
    public = owner.get("/api/public/reviews").json()["reviews"]
    assert not any(r.get("source") == "previous-site" for r in public), "not public until approved"


def test_approved_reviews_reorder(owner):
    pending = owner.get("/api/admin/reviews?status=pending").json()["reviews"]
    ids = [r["id"] for r in pending if r["source"] == "previous-site"][:2]
    for rid in ids:
        assert owner.patch(f"/api/admin/reviews/{rid}/moderate", json={"status": "approved"}, headers=XHR).status_code == 200
    assert owner.post("/api/admin/reviews/reorder", json={"ids": list(reversed(ids))}, headers=XHR).status_code == 200
    approved = [r["id"] for r in owner.get("/api/admin/reviews?status=approved").json()["reviews"] if r["id"] in ids]
    assert approved == list(reversed(ids))
    public = [r["id"] for r in owner.get("/api/public/reviews").json()["reviews"] if r["id"] in ids]
    assert public == list(reversed(ids))


def test_high_resolution_variant(owner):
    from PIL import Image
    import io
    assert 2560 in VARIANT_WIDTHS
    img = _upload(owner, folder="general", width=3000)
    r = owner.get(f"/media/w2560/{img['filename']}")
    assert r.status_code == 200 and Image.open(io.BytesIO(r.content)).width == 2560


def test_stored_sections_get_new_copy_fields():
    from backend.cms.service import _merge_defaults
    from backend.cms.defaults import DEFAULT_SETTINGS
    default = DEFAULT_SETTINGS["homepage"]
    old = {"sections": [{"id": i, "enabled": True} for i in
                        ["hero", "stats", "brands", "showcase", "offers", "services", "testimonials", "lifestyle", "faq"]]}
    old["sections"][3]["title"] = "My own title"
    m = _merge_defaults(default, old)
    ids = [x["id"] for x in m["sections"]]
    assert ids == [x["id"] for x in default["sections"]]
    show = next(x for x in m["sections"] if x["id"] == "showcase")
    assert show["title"] == "My own title" and show.get("eyebrow")
    custom = {"sections": [{"id": "faq", "enabled": False}, {"id": "hero", "enabled": True}, {"id": "stats", "enabled": True}]}
    m = _merge_defaults(default, custom)
    ids = [x["id"] for x in m["sections"]]
    assert ids[:2] == ["faq", "hero"] and len(ids) == len(default["sections"])
    assert ids.index("velocity") == ids.index("stats") + 1, "new sections land at their default spot"
    assert m["sections"][0]["enabled"] is False


def test_velocity_and_why_us_validation(owner):
    hp = owner.get("/api/admin/site-settings").json()["draft"]["homepage"]
    assert hp["velocity"]["lines"] and len(hp["whyUs"]) == 3
    ok = {**hp, "whyUs": [{"title": "Inspected", "text": "x", "image": ""}], "velocity": {"lines": ["A", "B"], "brandLine": False}}
    assert owner.put("/api/admin/site-settings/homepage", json=ok, headers=XHR).status_code == 200
    assert owner.put("/api/admin/site-settings/homepage", json={**hp, "velocity": {"lines": ["x" * 121]}}, headers=XHR).status_code == 400
    assert owner.put("/api/admin/site-settings/homepage", json={**hp, "whyUs": [{"title": "", "text": ""}]}, headers=XHR).status_code == 400
    bad_img = {**hp, "whyUs": [{"title": "t", "text": "", "image": "javascript:alert(1)"}]}
    assert owner.put("/api/admin/site-settings/homepage", json=bad_img, headers=XHR).status_code == 400


# ------------------------------------------------------------------ crop on upload


def test_crop_on_upload_keeps_original(owner):
    import io
    from PIL import Image
    from backend.config import settings
    from backend.tests.conftest import png_bytes
    data = png_bytes(width=2000, height=1000)
    crop = {"x": 0.25, "y": 0.1, "w": 0.5, "h": 0.8, "rotate": 0}
    r = owner.post("/api/admin/media/upload", files={"files": ("car.png", data, "image/png")},
                   data={"folder": "general", "crops": json.dumps([crop])}, headers=XHR)
    assert r.status_code == 201, r.text
    m = r.json()["media"][0]
    assert (m["width"], m["height"]) == (1000, 800)
    # The original is preserved byte-for-byte at full size
    original = settings.originals_dir / m["filename"]
    assert original.read_bytes() == data and Image.open(io.BytesIO(data)).size == (2000, 1000)
    # Same file uncropped is a different picture, not a duplicate of the crop
    r = owner.post("/api/admin/media/upload", files={"files": ("car.png", data, "image/png")},
                   data={"folder": "general"}, headers=XHR)
    m2 = r.json()["media"][0]
    assert not m2.get("duplicate") and (m2["width"], m2["height"]) == (2000, 1000)


def test_crop_with_rotation_and_validation(owner):
    from backend.tests.conftest import png_bytes
    data = png_bytes(width=1600, height=900)
    # Quarter turn: the upright picture is 900 x 1600; take the top half
    crop = {"x": 0, "y": 0, "w": 1, "h": 0.5, "rotate": 90}
    r = owner.post("/api/admin/media/upload", files={"files": ("p.png", data, "image/png")},
                   data={"folder": "general", "crops": json.dumps([crop])}, headers=XHR)
    m = r.json()["media"][0]
    assert (m["width"], m["height"]) == (900, 800)
    for bad in ({"x": 0.9, "y": 0, "w": 0.5, "h": 0.5}, {"x": 0, "y": 0, "w": 0.5, "h": 0.5, "rotate": 45}, "nonsense"):
        r = owner.post("/api/admin/media/upload", files={"files": ("p.png", png_bytes(), "image/png")},
                       data={"folder": "general", "crops": json.dumps([bad])}, headers=XHR)
        assert r.status_code == 400, bad


def test_vehicle_photos_with_crops(owner):
    from backend.tests.conftest import png_bytes
    crops = [None, {"x": 0, "y": 0, "w": 0.5, "h": 0.5, "rotate": 0}]
    r = owner.post("/api/upload", files=[("photos", ("a.png", png_bytes(1600, 1000), "image/png")),
                                         ("photos", ("b.png", png_bytes(1600, 1000), "image/png"))],
                   data={"photoCrops": json.dumps(crops)}, headers=XHR)
    assert r.status_code == 200, r.text
    urls = r.json()["urls"]
    media = {m["url"]: m for m in owner.get("/api/admin/media?folder=vehicles").json()["media"]}
    assert (media[urls[0]]["width"], media[urls[0]]["height"]) == (1600, 1000)
    assert (media[urls[1]]["width"], media[urls[1]]["height"]) == (800, 500)


# ------------------------------------------------------------------ videos


def _tiny_video(tmp_path, seconds=3, w=1080, h=1920, gps=True):
    import subprocess
    out = tmp_path / "clip.mov"
    cmd = ["ffmpeg", "-v", "error", "-y", "-f", "lavfi", "-i", f"testsrc=size={w}x{h}:rate=60:duration={seconds}",
           "-f", "lavfi", "-i", f"sine=frequency=440:duration={seconds}", "-c:v", "libx264", "-preset", "ultrafast",
           "-c:a", "aac", "-shortest"]
    if gps:
        cmd += ["-metadata", "location=+26.8467+080.9462/"]
    subprocess.run(cmd + [str(out)], check=True, capture_output=True)
    return out.read_bytes()


def test_video_upload_makes_web_copy_and_poster(owner, tmp_path):
    import shutil, subprocess
    if not shutil.which("ffmpeg"):
        import pytest
        pytest.skip("ffmpeg not installed")
    data = _tiny_video(tmp_path)
    r = owner.post("/api/admin/videos/upload", files={"file": ("reel.mov", data, "video/quicktime")}, headers=XHR)
    assert r.status_code == 201, r.text
    v = r.json()["video"]
    assert v["src"].startswith("/uploads/videos/") and v["src"].endswith(".mp4")
    assert (v["width"], v["height"]) == (720, 1280) and 2.5 < v["duration"] < 3.5 and v["hasAudio"]
    assert v["poster"].startswith("/uploads/") and v["originalBytes"] == len(data)
    web = settings.UPLOADS_DIR / "videos" / v["src"].rsplit("/", 1)[1]
    probe = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format_tags:stream=codec_name,r_frame_rate",
                            "-of", "json", str(web)], capture_output=True, check=True).stdout.decode()
    assert "h264" in probe and "aac" in probe and "30/1" in probe
    assert "location" not in probe.lower()  # phone GPS stripped
    # served with byte ranges (seeking)
    r = owner.get(v["src"], headers={"Range": "bytes=0-99"})
    assert r.status_code == 206 and len(r.content) == 100
    # can be used in settings
    hp = owner.get("/api/admin/site-settings").json()["draft"]["homepage"]
    clip = {**v, "name": "A. Kumar", "car": "Toyota Fortuner", "caption": "Smooth delivery"}
    assert owner.put("/api/admin/site-settings/homepage", json={**hp, "videoStories": [clip]}, headers=XHR).status_code == 200
    owner.post("/api/admin/site-settings/publish", json={"keys": ["homepage"]}, headers=XHR)
    html = owner.get("/__seo/").text
    assert '"VideoObject"' in html and "A. Kumar on buying a Toyota Fortuner" in html
    # About page: several videos (intro first), customer stories shown unless switched off
    g = owner.get("/api/admin/site-settings").json()["draft"]["general"]
    intro = {**v, "title": "Inside the showroom"}
    second = {**v, "title": "Delivery day"}
    assert owner.put("/api/admin/site-settings/general", json={**g, "aboutVideos": [intro, second]}, headers=XHR).status_code == 200
    owner.post("/api/admin/site-settings/publish", json={"keys": ["general"]}, headers=XHR)
    html = owner.get("/__seo/about").text
    assert "Inside the showroom" in html and "Delivery day" in html and "A. Kumar" in html
    assert owner.put("/api/admin/site-settings/general", json={**g, "aboutVideos": [intro], "aboutStories": False},
                     headers=XHR).status_code == 200
    owner.post("/api/admin/site-settings/publish", json={"keys": ["general"]}, headers=XHR)
    html = owner.get("/__seo/about").text
    assert "Inside the showroom" in html and "Delivery day" not in html and "A. Kumar" not in html
    owner.put("/api/admin/site-settings/general", json={**g, "aboutVideos": [], "aboutStories": True}, headers=XHR)
    owner.put("/api/admin/site-settings/homepage", json={**hp, "videoStories": []}, headers=XHR)
    owner.post("/api/admin/site-settings/publish", json={"keys": ["homepage", "general"]}, headers=XHR)


def test_video_upload_rejects_non_video_and_bad_settings(owner):
    r = owner.post("/api/admin/videos/upload", files={"file": ("x.mp4", b"not a video at all", "video/mp4")}, headers=XHR)
    assert r.status_code == 400
    r = owner.post("/api/admin/videos/upload", files={"file": ("p.png", png_bytes(), "image/png")}, headers=XHR)
    assert r.status_code == 400
    hp = owner.get("/api/admin/site-settings").json()["draft"]["homepage"]
    for bad in ({"src": "https://evil.example/x.mp4", "poster": ""}, {"src": "/uploads/videos/../../x.mp4", "poster": ""},
                {"src": "", "poster": ""}):
        assert owner.put("/api/admin/site-settings/homepage", json={**hp, "videoStories": [bad]}, headers=XHR).status_code == 400
    g = owner.get("/api/admin/site-settings").json()["draft"]["general"]
    assert owner.put("/api/admin/site-settings/general", json={**g, "aboutVideos": [{"src": "javascript:x", "poster": ""}]},
                     headers=XHR).status_code == 400
    ok = {"src": "/uploads/videos/a.mp4", "poster": ""}
    assert owner.put("/api/admin/site-settings/general", json={**g, "aboutVideos": [ok] * 7}, headers=XHR).status_code == 400
    assert owner.put("/api/admin/site-settings/homepage", json={**hp, "videoStories": [ok] * 13}, headers=XHR).status_code == 400


def test_builtin_videos_ship_with_the_site(owner):
    import pathlib
    from backend.cms.builtin_videos import BUILTIN_VIDEOS
    from backend.cms.defaults import DEFAULT_SETTINGS
    from backend.cms.videos import VIDEO_URL_RE
    public = pathlib.Path(__file__).resolve().parents[2] / "public"
    for v in BUILTIN_VIDEOS:  # every listed file exists in the frontend build input
        assert VIDEO_URL_RE.match(v["src"])
        assert (public / v["src"].lstrip("/")).is_file() and (public / v["poster"].lstrip("/")).is_file()
    assert [c["src"] for c in DEFAULT_SETTINGS["general"]["aboutVideos"]] == [v["src"] for v in BUILTIN_VIDEOS if v["kind"] == "intro"]
    assert len(DEFAULT_SETTINGS["homepage"]["videoStories"]) == 4
    r = owner.get("/api/admin/videos/builtin")
    assert r.status_code == 200 and len(r.json()["videos"]) == 5
    # a built-in clip is accepted in settings and appears in the server-rendered page
    hp = owner.get("/api/admin/site-settings").json()["draft"]["homepage"]
    clip = {**r.json()["videos"][1]["clip"], "name": "R. Singh", "car": "BMW X1"}
    assert owner.put("/api/admin/site-settings/homepage", json={**hp, "videoStories": [clip]}, headers=XHR).status_code == 200
    owner.post("/api/admin/site-settings/publish", json={"keys": ["homepage"]}, headers=XHR)
    html = owner.get("/__seo/").text
    assert "R. Singh on buying a BMW X1" in html and v["src"].rsplit("/", 1)[0] in html
    owner.put("/api/admin/site-settings/homepage", json={**hp, "videoStories": []}, headers=XHR)
    owner.post("/api/admin/site-settings/publish", json={"keys": ["homepage"]}, headers=XHR)


def test_builtin_videos_need_staff():
    from fastapi.testclient import TestClient
    from backend.main import app
    with TestClient(app, base_url="http://testserver") as anon:  # no session cookie
        assert anon.get("/api/admin/videos/builtin").status_code in (401, 403)
