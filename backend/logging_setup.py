"""Structured logging and per-request logging.

Every request gets an id (taken from X-Request-ID when nginx sets it, otherwise
generated) that is returned to the client and attached to every log line written while
handling it, so one slow or failing request can be traced end to end.

Logged per request: method, path (no query string — it can carry personal data),
status, duration, response size, client IP, signed-in admin username. Never logged:
bodies, cookies, Authorization headers, query strings.
"""
import contextvars
import json
import logging
import re
import sys
import time
import uuid

from backend.config import settings

request_id_var: contextvars.ContextVar[str] = contextvars.ContextVar("request_id", default="-")
SAFE_ID_RE = re.compile(r"^[A-Za-z0-9._-]{8,64}$")
access_logger = logging.getLogger("luxura.access")

_STD_ATTRS = set(logging.LogRecord("", 0, "", 0, "", (), None).__dict__) | {"message", "asctime"}


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        data = {
            "ts": time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime(record.created)) + f".{int(record.msecs):03d}Z",
            "level": record.levelname.lower(),
            "logger": record.name,
            "msg": record.getMessage(),
            "request_id": request_id_var.get(),
        }
        for k, v in record.__dict__.items():
            if k not in _STD_ATTRS and not k.startswith("_"):
                data[k] = v
        if record.exc_info:
            data["exc"] = self.formatException(record.exc_info)
        return json.dumps(data, default=str, ensure_ascii=False)


class TextFormatter(logging.Formatter):
    def __init__(self):
        super().__init__("%(asctime)s [%(levelname)s] %(name)s [%(request_id)s]: %(message)s")

    def format(self, record):
        record.request_id = request_id_var.get()
        return super().format(record)


def configure_logging():
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JsonFormatter() if settings.LOG_FORMAT == "json" else TextFormatter())
    root = logging.getLogger()
    root.handlers[:] = [handler]
    root.setLevel(logging.INFO)
    # uvicorn's own access log duplicates ours and includes query strings.
    logging.getLogger("uvicorn.access").disabled = True
    for name in ("uvicorn", "uvicorn.error"):
        logging.getLogger(name).handlers[:] = []
        logging.getLogger(name).propagate = True


class RequestLogMiddleware:
    """Pure ASGI middleware (no BaseHTTPMiddleware overhead, works with streaming)."""

    SKIP = ("/api/health",)

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            return await self.app(scope, receive, send)
        headers = dict(scope.get("headers") or [])
        incoming = headers.get(b"x-request-id", b"").decode("latin-1")
        rid = incoming if SAFE_ID_RE.match(incoming) else uuid.uuid4().hex[:16]
        token = request_id_var.set(rid)
        start = time.perf_counter()
        info = {"status": 500, "bytes": 0}

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                info["status"] = message["status"]
                message.setdefault("headers", [])
                message["headers"] = list(message["headers"]) + [(b"x-request-id", rid.encode())]
            elif message["type"] == "http.response.body":
                info["bytes"] += len(message.get("body", b""))
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            path = scope.get("path", "")
            if path not in self.SKIP:
                ms = (time.perf_counter() - start) * 1000
                state = scope.get("state") or {}
                client = headers.get(b"x-real-ip", b"").decode("latin-1") or (scope.get("client") or ("-",))[0]
                level = logging.WARNING if ms >= settings.SLOW_REQUEST_MS or info["status"] >= 500 else logging.INFO
                access_logger.log(level, "%s %s %s %.0fms", scope.get("method"), path, info["status"], ms, extra={
                    "event": "http.request", "method": scope.get("method"), "path": path[:300],
                    "status": info["status"], "duration_ms": round(ms, 1), "bytes": info["bytes"],
                    "ip": client, "actor": state.get("actor"), "slow": ms >= settings.SLOW_REQUEST_MS,
                })
            request_id_var.reset(token)
