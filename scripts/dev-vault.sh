#!/usr/bin/env bash
# Build the plugin and link it into test-vault/ (or the vault given as $1), so Obsidian loads this checkout.
# Then: open the vault in Obsidian, enable community plugins, enable "Cedar". After a rebuild, reload with
# the "Reload app without saving" command (or install the Hot Reload plugin and run `npm run dev`).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
vault="${1:-$root/test-vault}"
plugin="$vault/.obsidian/plugins/cedar"

(cd "$root" && npm run build)
mkdir -p "$plugin"
for f in main.js manifest.json styles.css; do ln -sf "$root/$f" "$plugin/$f"; done
touch "$plugin/.hotreload"
echo "Linked $root into $plugin"
