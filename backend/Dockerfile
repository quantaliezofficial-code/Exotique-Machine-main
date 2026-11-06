FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Unprivileged runtime user (UID 1000). The entrypoint fixes ownership of the mounted
# volumes once, then drops privileges before starting the app.
RUN useradd --uid 1000 --create-home --shell /usr/sbin/nologin app

# ffmpeg: makes the web copy and poster of uploaded videos (backend/cms/videos.py).
RUN apt-get update \
 && apt-get install -y --no-install-recommends ffmpeg \
 && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt /app/requirements.txt
COPY backend/requirements.lock /app/requirements.lock
RUN pip install -r /app/requirements.txt -c /app/requirements.lock

# Only what the API needs (no frontend sources, no local databases or uploads).
COPY backend /app/backend
COPY server/data/vehicles.json /app/server/data/vehicles.json
COPY run_backend.py /app/run_backend.py
COPY backend/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 0755 /usr/local/bin/docker-entrypoint.sh && rm -rf /app/backend/tests

EXPOSE 5000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:5000/api/health', timeout=4).status == 200 else 1)"

ENTRYPOINT ["docker-entrypoint.sh"]
# One worker: the content cache, rate limiter and background image jobs are per process.
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "5000", "--workers", "1", \
     "--proxy-headers", "--forwarded-allow-ips", "*", "--no-server-header", "--no-access-log"]
