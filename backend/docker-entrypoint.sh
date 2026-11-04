#!/bin/sh
# Prepare writable folders, then run the app as the unprivileged "app" user.
set -eu
for d in /app/server/uploads /app/server/originals /app/server/data; do
  mkdir -p "$d"
  # Only chown when needed (volumes can hold thousands of photos).
  if [ "$(id -u)" = "0" ] && [ "$(stat -c %u "$d")" != "1000" ]; then
    chown -R 1000:1000 "$d"
  fi
done
if [ "$(id -u)" = "0" ]; then
  exec setpriv --reuid=1000 --regid=1000 --init-groups "$@"
fi
exec "$@"
