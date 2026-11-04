import io

from PIL import Image

from backend.config import settings
from backend.tests.conftest import OWNER, XHR, login, make_admin, png_bytes, jpeg_with_gps


def test_login_sets_httponly_cookie_and_hides_token(client):
    r = login(client, *OWNER)
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=strict" in cookie
    assert "token" not in r.json()
    assert "passwordhash" not in r.text.lower() and "password_hash" not in r.text.lower()


def test_login_errors_are_generic(client):
    client.cookies.clear()
    a = client.post("/api/auth/login", json={"username": "nobody-here", "password": "x" * 12})
    b = client.post("/api/auth/login", json={"username": "owner", "password": "wrong-password"})
    assert a.status_code == b.status_code == 401
    assert a.json()["error"] == b.json()["error"]


def test_brute_force_lockout(client):
    client.cookies.clear()
    for _ in range(settings.MAX_LOGIN_ATTEMPTS):
        client.post("/api/auth/login", json={"username": "lockme", "password": "bad-password"})
    r = client.post("/api/auth/login", json={"username": "lockme", "password": "bad-password"})
    assert r.status_code == 429


def test_cookie_requests_need_csrf_header(owner):
    r = owner.post("/api/admin/offers/xyz/duplicate")
    assert r.status_code == 403
    assert "CSRF" in r.json()["error"]


def test_cross_origin_rejected_in_production(owner, monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    r = owner.post("/api/admin/site-settings/discard", json={}, headers={**XHR, "Origin": "https://evil.example"})
    assert r.status_code == 403
    ok = owner.post("/api/admin/site-settings/discard", json={}, headers={**XHR, "Origin": "http://testserver"})
    assert ok.status_code == 200


def test_temporary_password_must_be_changed_first(client):
    login(client, *OWNER)
    client.post("/api/auth/admins", json={"username": "pending1", "temporaryPassword": "Temp#Pass2026x",
                                     "rolePreset": "editor"}, headers=XHR)
    login(client, "pending1", "Temp#Pass2026x")
    assert client.get("/api/admin/hero").status_code == 403
    assert client.get("/api/auth/me").status_code == 200


def test_password_change_revokes_old_sessions(client):
    pwd = make_admin(client, "rotator", preset="editor")
    old = client.cookies.get(settings.AUTH_COOKIE_NAME)
    r = client.post("/api/auth/change-own-password", json={"currentPassword": pwd, "newPassword": "Another#Pass2026"},
                    headers=XHR)
    assert r.status_code == 200
    client.cookies.clear()
    r = client.get("/api/auth/me", headers={"Authorization": f"Bearer {old}"})
    assert r.status_code == 401


def test_editor_cannot_publish(client):
    make_admin(client, "editor1", preset="editor")
    body = {"title": "Draft only", "startsAt": "2026-01-01T00:00:00Z", "endsAt": "2030-01-01T00:00:00Z"}
    r = client.post("/api/admin/offers", json={**body, "status": "draft"}, headers=XHR)
    assert r.status_code == 201
    oid = r.json()["offer"]["id"]
    assert client.patch(f"/api/admin/offers/{oid}/status", json={"status": "published"}, headers=XHR).status_code == 403
    assert client.post("/api/admin/offers", json={**body, "title": "Live attempt", "status": "published"},
                       headers=XHR).status_code == 403


def test_leads_need_leads_permission(client):
    make_admin(client, "nolead", preset="editor")
    assert client.get("/api/admin/leads").status_code == 403
    assert client.get("/api/finance/applications").status_code == 403
    client.cookies.clear()
    assert client.get("/api/admin/leads").status_code == 401


def test_upload_rejects_non_images(owner):
    fake = b"<svg xmlns='http://www.w3.org/2000/svg'><script>alert(1)</script></svg>"
    r = owner.post("/api/admin/media/upload", files={"files": ("x.png", fake, "image/png")}, headers=XHR)
    assert r.status_code in (400, 415)
    html = b"<html><body>hi</body></html>"
    r = owner.post("/api/admin/media/upload", files={"files": ("x.jpg", html, "image/jpeg")}, headers=XHR)
    assert r.status_code in (400, 415)


def test_upload_strips_location_and_preserves_original(owner):
    raw = jpeg_with_gps()
    r = owner.post("/api/admin/media/upload", files={"files": ("gps.jpg", raw, "image/jpeg")}, headers=XHR)
    assert r.status_code == 201, r.text
    m = r.json()["media"][0]
    assert m["originalPreserved"] is True
    public = settings.UPLOADS_DIR / m["filename"]
    with Image.open(public) as im:
        assert not im.getexif().get_ifd(0x8825)
    original = settings.originals_dir / m["filename"]
    assert original.read_bytes() == raw  # byte-for-byte
    # The preserved original is never reachable over HTTP.
    assert owner.get(f"/originals/{m['filename']}").status_code == 404


def test_uploaded_files_are_sandboxed(owner):
    r = owner.post("/api/admin/media/upload", files={"files": ("s.png", png_bytes(), "image/png")}, headers=XHR)
    url = r.json()["media"][0]["url"]
    res = owner.get(url)
    assert res.status_code == 200
    assert "sandbox" in res.headers["content-security-policy"]
    assert res.headers["x-content-type-options"] == "nosniff"


def test_public_form_honeypot_and_validation(client):
    client.cookies.clear()
    r = client.post("/api/enquiries", json={"name": "Bot", "phone": "9876543210", "website": "http://spam"})
    assert r.status_code == 201 and set(r.json()) == {"success", "reference"}
    r = client.post("/api/enquiries", json={"name": "A", "phone": "abc"})
    assert r.status_code == 422
    assert "error" in r.json()


def test_public_forms_are_rate_limited(client):
    client.cookies.clear()
    codes = [client.post("/api/enquiries", json={"name": "Asha Verma", "phone": "9876543210"}).status_code
             for _ in range(settings.PUBLIC_FORM_LIMIT_PER_10_MIN + 2)]
    assert 429 in codes


def test_admin_responses_are_not_cached(owner):
    r = owner.get("/api/admin/cms/summary")
    assert r.status_code == 200
    assert r.headers["cache-control"] == "no-store"
    assert owner.get("/api/auth/me").headers["cache-control"] == "no-store"


def test_media_routes_reject_traversal(client):
    for bad in ("..%2F..%2Fetc%2Fpasswd", "..", ".hidden.jpg"):
        assert client.get(f"/media/w640/{bad}").status_code == 404
    assert client.get("/media/w777/x.jpg").status_code == 404


def test_request_id_header_and_no_query_logging(client, caplog):
    import logging
    caplog.set_level(logging.INFO, logger="luxura.access")
    r = client.get("/api/public/reviews?phone=9876543210")
    assert len(r.headers["x-request-id"]) >= 8
    line = [rec for rec in caplog.records if rec.name == "luxura.access"][-1]
    assert line.path == "/api/public/reviews"
    assert "9876543210" not in line.getMessage()


def test_session_endpoint_never_errors(client):
    client.cookies.clear()
    assert client.get("/api/auth/session").json() == {"user": None}
    login(client, *OWNER)
    assert client.get("/api/auth/session").json()["user"]["username"] == "owner"
    client.cookies.set(settings.AUTH_COOKIE_NAME, "garbage")
    assert client.get("/api/auth/session").json() == {"user": None}


def test_shell_revalidation_picks_up_new_build(monkeypatch):
    from backend.seo import render
    calls = []
    def fake(etag=None):
        calls.append(etag)
        return ("v2", render.SEO_START + "<title>new</title>" + render.SEO_END) if len(calls) > 1 else ("v1", render.SEO_START + render.SEO_END)
    monkeypatch.setattr(render, "_fetch_shell", fake)
    render.reset_shell_cache()
    first = render.get_shell()
    monkeypatch.setattr(render, "SHELL_REVALIDATE_S", 0)
    second = render.get_shell()
    assert "new" in second and "new" not in first and calls[1] == "v1"
    render.reset_shell_cache()


def test_published_default_passwords_are_remediated(client):
    from backend.database import SessionLocal
    from backend.models import User
    from backend.security import hash_password
    from backend.seed import remediate_default_passwords
    with SessionLocal() as db:
        db.add(User(id="usr_legacy", username="legacyadmin", name="Legacy", password_hash=hash_password("admin123"),
                    role="admin", permissions=["inventory:view"], status="active", must_change_password=False, token_version=0))
        db.commit()
        remediate_default_passwords(db)
        u = db.query(User).filter(User.username == "legacyadmin").first()
        assert u.must_change_password is True and u.token_version == 1
    # The public password no longer works at all (otherwise anyone could complete the
    # forced change with it); a super admin issues a new one-time password.
    client.cookies.clear()
    assert client.post("/api/auth/login", json={"username": "legacyadmin", "password": "admin123"}).status_code == 401
    login(client, *OWNER)
    assert client.post("/api/auth/admins/usr_legacy/reset-password", json={"temporaryPassword": "Fresh#Temp2026x"},
                       headers=XHR).status_code == 200
    login(client, "legacyadmin", "Fresh#Temp2026x")
    assert client.get("/api/admin/vehicles").status_code == 403  # must set own password first


def test_superadmin_on_default_password_blocks_production_start(monkeypatch):
    import pytest
    from backend.database import SessionLocal
    from backend.models import User
    from backend.security import hash_password
    from backend.seed import remediate_default_passwords
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "SUPERADMIN_PASSWORD", "superadmin123")
    with SessionLocal() as db:
        db.add(User(id="usr_legacy_sa", username="legacysa", name="Legacy SA", password_hash=hash_password("superadmin123"),
                    role="superadmin", permissions=[], status="active", must_change_password=False, token_version=0))
        db.commit()
        with pytest.raises(RuntimeError):
            remediate_default_passwords(db)
        db.query(User).filter(User.id == "usr_legacy_sa").delete()
        db.commit()


def test_logout_revokes_the_session(client):
    login(client, *OWNER)
    token = client.cookies.get(settings.AUTH_COOKIE_NAME)
    assert client.post("/api/auth/logout", headers=XHR).status_code == 200
    client.cookies.clear()
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401


def test_cannot_reset_another_superadmin(client):
    from backend.database import SessionLocal
    from backend.models import User
    from backend.security import hash_password
    with SessionLocal() as db:
        db.add(User(id="usr_owner2", username="owner2", name="Owner 2", password_hash=hash_password("Second#Owner2026"),
                    role="superadmin", permissions=[], status="active", must_change_password=False, token_version=0))
        db.commit()
    login(client, *OWNER)
    r = client.post("/api/auth/admins/usr_owner2/reset-password", json={"temporaryPassword": "Temp#Pass2026x"}, headers=XHR)
    assert r.status_code == 403


def test_upload_requires_media_permission(client):
    make_admin(client, "salesperson", preset="sales_staff")
    r = client.post("/api/admin/media/upload", files={"files": ("x.png", png_bytes(), "image/png")}, headers=XHR)
    assert r.status_code == 403
