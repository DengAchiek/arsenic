#!/usr/bin/env sh
set -eu

DIST_DIR="${DIST_DIR:-dist}"

rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

cp ./*.html "$DIST_DIR"/
cp -R admin "$DIST_DIR"/
cp -R assets "$DIST_DIR"/
cp -R css "$DIST_DIR"/
cp -R js "$DIST_DIR"/

if [ -n "${ARSENIC_API_BASE_URL:-}" ]; then
  escaped_api_url=$(printf '%s' "$ARSENIC_API_BASE_URL" | sed "s/'/\\\\'/g")
  cat > "$DIST_DIR/js/backend-config.js" <<EOF
(function () {
  'use strict';

  window.ARSENIC_BACKEND_CONFIG = window.ARSENIC_BACKEND_CONFIG || {
    apiBaseUrl: '$escaped_api_url',
    authToken: ''
  };
})();
EOF
fi

printf 'Static site packaged in %s\n' "$DIST_DIR"
