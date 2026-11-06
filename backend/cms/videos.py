"""Video uploads (showroom intro, customer video stories).

Same rules as photos:
* the uploaded file is preserved byte-for-byte in private storage (originals/videos/);
* visitors get a web copy: H.264/AAC MP4, short side at most 720 px, 30 fps, metadata
  (including phone GPS) stripped, `faststart` so playback begins before the download ends;
* a poster frame is taken from the web copy and goes through the normal image pipeline
  (WebP/AVIF variants, blur placeholder).

Needs ffmpeg/ffprobe on the server (installed in the backend Docker image).
"""
from __future__ import annotations

import io
import json
import logging
import re
import shutil
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Optional

from fastapi import HTTPException, UploadFile
from starlette.datastructures import UploadFile as StarletteUploadFile

from backend.cms.images import store_image
from backend.config import settings

logger = logging.getLogger("luxura.videos")

MAX_VIDEO_MB = 300
MAX_DURATION_S = 300          # 5 minutes is plenty for a reel or a showroom intro
WEB_SHORT_SIDE = 720
ALLOWED_CONTAINERS = {"mov", "mp4", "m4a", "3gp", "3g2", "mj2", "matroska", "webm"}
VIDEO_URL_RE = re.compile(r"^/uploads/videos/[A-Za-z0-9_-]+\.mp4$")


def videos_dir() -> Path:
    d = settings.UPLOADS_DIR / "videos"
    d.mkdir(parents=True, exist_ok=True)
    return d


def originals_dir() -> Path:
    d = settings.originals_dir / "videos"
    d.mkdir(parents=True, exist_ok=True)
    return d


def ffmpeg_available() -> bool:
    return bool(shutil.which("ffmpeg") and shutil.which("ffprobe"))


def _probe(path: Path) -> Dict[str, Any]:
    try:
        out = subprocess.run(
            ["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(path)],
            capture_output=True, timeout=60, check=True)
        return json.loads(out.stdout or b"{}")
    except (subprocess.SubprocessError, ValueError):
        raise HTTPException(status_code=400, detail="This file is not a video we can read.")


def _save_stream(file: UploadFile, dest: Path) -> int:
    """Copy the upload to disk in chunks (videos are too big to hold in memory)."""
    limit, total = MAX_VIDEO_MB * 1024 * 1024, 0
    with open(dest, "wb") as fh:
        while True:
            chunk = file.file.read(1024 * 1024)
            if not chunk:
                break
            total += len(chunk)
            if total > limit:
                fh.close()
                dest.unlink(missing_ok=True)
                raise HTTPException(status_code=413, detail=f"Video exceeds the {MAX_VIDEO_MB} MB limit.")
            fh.write(chunk)
    if total == 0:
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Empty file.")
    return total


def store_video(file: UploadFile) -> Dict[str, Any]:
    if not ffmpeg_available():
        raise HTTPException(status_code=503, detail="Video processing is not available on this server (ffmpeg missing).")
    stem = re.sub(r"[^a-zA-Z0-9_-]", "_", Path(file.filename or "video").stem)[:50] or "video"
    name = f"{stem}-{int(time.time() * 1000)}-{uuid.uuid4().hex[:8]}"
    original = originals_dir() / f"{name}{Path(file.filename or '').suffix.lower()[:6] or '.bin'}"
    original_bytes = _save_stream(file, original)

    info = _probe(original)
    fmt = set((info.get("format", {}).get("format_name") or "").split(","))
    video = next((s for s in info.get("streams", []) if s.get("codec_type") == "video"), None)
    has_audio = any(s.get("codec_type") == "audio" for s in info.get("streams", []))
    duration = float(info.get("format", {}).get("duration") or 0)
    if not video or not (fmt & ALLOWED_CONTAINERS):
        original.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Upload an MP4, MOV or WebM video.")
    if not 1 <= duration <= MAX_DURATION_S:
        original.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail=f"Videos must be between 1 second and {MAX_DURATION_S // 60} minutes long.")

    out = videos_dir() / f"{name}.mp4"
    tmp = out.with_name(out.name + ".tmp.mp4")
    s = WEB_SHORT_SIDE
    # Short side to at most 720 px (never upscale), even dimensions, 30 fps.
    vf = f"scale='if(gt(iw,ih),-2,min({s},iw))':'if(gt(iw,ih),min({s},ih),-2)',fps=30,format=yuv420p"
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(original), "-map", "0:v:0"]
    cmd += ["-map", "0:a:0"] if has_audio else []
    cmd += ["-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "26", "-profile:v", "high",
            "-maxrate", "2500k", "-bufsize", "5000k", "-map_metadata", "-1", "-map_chapters", "-1",
            "-movflags", "+faststart"]
    cmd += ["-c:a", "aac", "-b:a", "96k", "-ac", "2"] if has_audio else ["-an"]
    cmd += [str(tmp)]
    try:
        subprocess.run(cmd, capture_output=True, timeout=900, check=True)
    except subprocess.CalledProcessError as e:
        tmp.unlink(missing_ok=True)
        logger.warning("video transcode failed: %s", (e.stderr or b"")[-500:])
        raise HTTPException(status_code=400, detail="Could not process this video.")
    except subprocess.TimeoutExpired:
        tmp.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Processing this video took too long.")
    tmp.replace(out)

    web = _probe(out)
    wv = next(st for st in web["streams"] if st.get("codec_type") == "video")
    # Poster: a frame a little way in (first frames are often black or a logo).
    at = min(1.5, duration / 3)
    poster = subprocess.run(["ffmpeg", "-v", "error", "-ss", f"{at:.2f}", "-i", str(out), "-frames:v", "1",
                             "-f", "image2", "-c:v", "mjpeg", "-q:v", "2", "pipe:1"],
                            capture_output=True, timeout=60).stdout
    return {
        "src": f"/uploads/videos/{out.name}",
        "posterBytes": poster,
        "width": int(wv["width"]), "height": int(wv["height"]),
        "duration": round(float(web["format"].get("duration") or duration), 2),
        "sizeBytes": out.stat().st_size,
        "originalBytes": original_bytes,
        "hasAudio": has_audio,
        "name": name,
    }


def poster_upload(data: bytes, name: str) -> StarletteUploadFile:
    """Wrap poster bytes so they can go through store_image like any uploaded photo."""
    return StarletteUploadFile(file=io.BytesIO(data), filename=f"{name}-poster.jpg")


def store_poster(data: bytes, name: str):
    if not data:
        return None
    return store_image(poster_upload(data, name))
