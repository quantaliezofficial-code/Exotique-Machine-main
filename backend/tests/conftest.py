"""Test setup: an isolated SQLite database, upload folders and SPA shell per test run.

Environment is configured before the backend is imported because settings are read at
import time."""
import io
import os
import shutil
import tempfile
from pathlib import Path

import pytest

TMP = Path(tempfile.mkdtemp(prefix="em-tests-"))
REPO = Path(__file__).resolve().parents[2]
(TMP / "data").mkdir()
shutil.copy(REPO / "server" / "data" / "vehicles.json", TMP / "data" / "vehicles.json")

os.environ.update({
    "ENVIRONMENT": "test",
    "DATABASE_URL": f"sqlite:///{TMP / 'test.db'}",
    "UPLOADS_DIR": str(TMP / "uploads"),
    "DATA_DIR": str(TMP / "data"),
    "DIST_DIR": str(TMP / "dist-missing"),
    "SUPERADMIN_USERNAME": "owner",
    "SUPERADMIN_PASSWORD": "Owner#Pass2026",
    "JWT_SECRET": "test-secret-" + "x" * 40,
    "COOKIE_SECURE": "false",
    "EAGER_IMAGE_VARIANTS": "false",
    "LOG_FORMAT": "text",
    "SITE_URL": "https://exotiquemachines.com",
})

from fastapi.testclient import TestClient  # noqa: E402
from PIL import Image  # noqa: E402

from backend.main import app  # noqa: E402
from backend.seo import render  # noqa: E402
from backend.security import rate_limiter  # noqa: E402

SHELL = (
    '<!doctype html><html lang="en"><head><meta charset="UTF-8" />'
    "<!--seo:start--><title>Shell</title><!--seo:end-->"
    '<script type="module" src="/assets/index.js"></script></head>'
    '<body><div id="root"></div></body></html>'
)
render._fetch_shell = lambda etag=None: ('t1', SHELL)

XHR = {"X-Requested-With": "XMLHttpRequest"}
OWNER = ("owner", "Owner#Pass2026")


@pytest.fixture(scope="session")
def client():
    with TestClient(app, base_url="http://testserver") as c:
        yield c


@pytest.fixture(autouse=True)
def _reset_limits():
    rate_limiter.reset()
    yield


def login(client, username, password):
    client.cookies.clear()
    r = client.post("/api/auth/login", json={"username": username, "password": password})
    assert r.status_code == 200, r.text
    return r


def make_admin(client, username, permissions=None, preset=None, password="Temp#Pass2026x", new_password="Staff#Pass2026y"):
    """Create an admin as the owner, then sign in as them and set their own password."""
    login(client, *OWNER)
    body = {"username": username, "name": username.title(), "temporaryPassword": password}
    if permissions is not None:
        body["permissions"] = permissions
    if preset:
        body["rolePreset"] = preset
    r = client.post("/api/auth/admins", json=body, headers=XHR)
    assert r.status_code == 201, r.text
    login(client, username, password)
    r = client.post("/api/auth/change-own-password", json={"currentPassword": password, "newPassword": new_password},
                    headers=XHR)
    assert r.status_code == 200, r.text
    return new_password


_colour = [10]


def png_bytes(width=1600, height=900, colour=None) -> bytes:
    """A unique image each call (so upload de-duplication does not merge them)."""
    _colour[0] = (_colour[0] + 37) % 250
    c = colour or (_colour[0], 90, 200 - _colour[0] // 2)
    im = Image.new("RGB", (width, height), c)
    im.putpixel((0, 0), (_colour[0], _colour[0], _colour[0]))
    buf = io.BytesIO()
    im.save(buf, "PNG")
    return buf.getvalue()


def jpeg_with_gps(width=1400, height=900) -> bytes:
    im = Image.new("RGB", (width, height), (120, 30, 60))
    exif = Image.Exif()
    exif[0x010F] = "TestCam"  # Make
    gps = {1: "N", 2: (26.0, 51.0, 0.0), 3: "E", 4: (80.0, 59.0, 0.0)}
    exif[0x8825] = gps
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=90, exif=exif)
    return buf.getvalue()


@pytest.fixture
def owner(client):
    login(client, *OWNER)
    return client
