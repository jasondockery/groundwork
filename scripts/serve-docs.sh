#!/usr/bin/env bash
# Serve the docs locally with the footer stamped to your exact checkout
# state — e.g. "v1.0.0-3-gabc1234-dirty" (tag, commits since, short SHA,
# uncommitted changes). Tracked HTML stays "dev"; the stamp happens in a
# temp copy, so nothing churns in git.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
VERSION="$(git describe --tags --dirty --always)"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
cp -R docs/ "$TMP/docs"
find "$TMP/docs" -name '*.html' -exec sed -i '' -e "s|\(class=\"gw-version\"[^>]*>\)dev<|\1${VERSION}<|g" {} + 2>/dev/null \
  || find "$TMP/docs" -name '*.html' -exec sed -i -e "s|\(class=\"gw-version\"[^>]*>\)dev<|\1${VERSION}<|g" {} +
echo "Serving docs at http://localhost:8000 (version: ${VERSION})"
python3 -m http.server 8000 --directory "$TMP/docs"
