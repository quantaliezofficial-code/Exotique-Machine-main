"""Videos that ship with the website code (frontend `public/videos/`).

They are already web-optimised (720p H.264/AAC, metadata stripped, faststart), so they don't
go through the admin upload, which large files can't pass when a proxy limits upload size.
New installs show them by default; on an existing site the admin adds them from
"Built-in videos" in Settings (Business → About page videos, Home page → Customer video stories).

File names carry a content hash, so they can be cached for a year. To replace one, add the
new file under a new name and update this list.
"""
from __future__ import annotations

import copy
from typing import Any, Dict, List

BUILTIN_VIDEOS: List[Dict[str, Any]] = [
    {"id": "exotique-intro", "kind": "intro", "label": "Showroom intro", "src": "/videos/exotique-intro-ba3c32eb.mp4", "poster": "/videos/exotique-intro-ba3c32eb.jpg", "duration": 37.23, "width": 720, "height": 1280, "uploadedAt": "2026-11-06T00:00:00+05:30"},
    {"id": "customer-story-1", "kind": "story", "label": "Customer review 1", "src": "/videos/customer-story-1-b79f0f1b.mp4", "poster": "/videos/customer-story-1-b79f0f1b.jpg", "duration": 53.06, "width": 720, "height": 1280, "uploadedAt": "2026-11-06T00:00:00+05:30"},
    {"id": "customer-story-2", "kind": "story", "label": "Customer review 2", "src": "/videos/customer-story-2-e835ccad.mp4", "poster": "/videos/customer-story-2-e835ccad.jpg", "duration": 60.07, "width": 720, "height": 1280, "uploadedAt": "2026-11-06T00:00:00+05:30"},
    {"id": "customer-story-3", "kind": "story", "label": "Customer review 3", "src": "/videos/customer-story-3-55c636d4.mp4", "poster": "/videos/customer-story-3-55c636d4.jpg", "duration": 60.03, "width": 720, "height": 1280, "uploadedAt": "2026-11-06T00:00:00+05:30"},
    {"id": "customer-story-4", "kind": "story", "label": "Customer review 4", "src": "/videos/customer-story-4-c367e5ec.mp4", "poster": "/videos/customer-story-4-c367e5ec.jpg", "duration": 24.94, "width": 720, "height": 1280, "uploadedAt": "2026-11-06T00:00:00+05:30"},
]

CLIP_KEYS = ("src", "poster", "duration", "width", "height", "uploadedAt")


def clip(v: Dict[str, Any]) -> Dict[str, Any]:
    """A settings entry for a built-in video (texts left for the owner to fill in)."""
    return {**{k: v[k] for k in CLIP_KEYS}, "name": "", "car": "", "caption": "", "title": "", "description": "", "transcript": ""}


def builtin(kind: str) -> List[Dict[str, Any]]:
    return [clip(v) for v in BUILTIN_VIDEOS if v["kind"] == kind]


def catalogue() -> List[Dict[str, Any]]:
    return [{"id": v["id"], "kind": v["kind"], "label": v["label"], "clip": clip(v)} for v in copy.deepcopy(BUILTIN_VIDEOS)]
