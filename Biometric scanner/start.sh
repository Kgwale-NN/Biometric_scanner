#!/usr/bin/env bash
set -euo pipefail

# This helper script is intended for Railpack / Railway builds where the
# repository root might contain a single folder (for example: "Biometric scanner/")
# that actually holds the app. The script will:
#  - detect the folder that contains package.json
#  - install dependencies, build the app, and run `vite preview` on $PORT

PORT=${PORT:-3000}

APP_DIR=""

# If there's a package.json in this directory, use it.
if [ -f package.json ]; then
  APP_DIR="."
fi

# If the project is nested in a folder named exactly "Biometric scanner", prefer that.
if [ -z "${APP_DIR}" ] && [ -d "Biometric scanner" ] && [ -f "Biometric scanner/package.json" ]; then
  APP_DIR="Biometric scanner"
fi

# Otherwise search for the first subdirectory that contains package.json.
if [ -z "${APP_DIR}" ]; then
  for d in ./*/; do
    if [ -f "$d/package.json" ]; then
      APP_DIR="${d%/}"
      break
    fi
  done
fi

if [ -z "${APP_DIR}" ]; then
  echo "Error: couldn't find a directory with package.json. Ensure your app is in the repo or add a start.sh that points to it."
  exit 1
fi

echo "Using app dir: $APP_DIR"

echo "Installing dependencies..."
npm ci --prefix "$APP_DIR"

echo "Building project..."
npm run build --prefix "$APP_DIR"

echo "Starting preview (vite) on port $PORT..."
# Use the project's preview script. Pass the port through to vite preview.
npm run preview --prefix "$APP_DIR" -- --port "$PORT"
