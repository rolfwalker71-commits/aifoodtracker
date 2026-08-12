#!/bin/sh
set -e

UPLOAD_DIR="${UPLOAD_DIR:-/app/uploads}"
mkdir -p "$UPLOAD_DIR"

# Bind-mounts from the host are often root-owned; fix so nextjs (uid 1001) can write.
if [ "$(id -u)" = "0" ]; then
  chown -R nextjs:nodejs "$UPLOAD_DIR" 2>/dev/null || true
  if ! gosu nextjs:nodejs sh -c "touch \"$UPLOAD_DIR/.write-test\" && rm -f \"$UPLOAD_DIR/.write-test\""; then
    echo "WARN: $UPLOAD_DIR is not writable by nextjs (uid 1001)."
    echo "WARN: On the host run: mkdir -p data/uploads && chown -R 1001:1001 data/uploads"
  else
    count="$(ls -1 "$UPLOAD_DIR" 2>/dev/null | wc -l | tr -d ' ')"
    echo "Uploads: $UPLOAD_DIR ($count files, writable)"
  fi
  exec gosu nextjs:nodejs "$@"
fi

count="$(ls -1 "$UPLOAD_DIR" 2>/dev/null | wc -l | tr -d ' ')"
echo "Uploads: $UPLOAD_DIR ($count files)"
exec "$@"
