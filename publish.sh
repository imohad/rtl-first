#!/bin/bash
# RTL-First — Publish 4 New Packages to npm
# Run this from the directory containing all 4 tool folders
#
# Prerequisites:
#   npm login  (or set NPM_TOKEN)
#   npm org: @rtl-first (already exists)
#
# Order matters: arabize depends on the other 3

set -e

echo ""
echo "  Publishing rtl-first packages..."
echo "  ═════════════════════════════════"
echo ""

# 1. direction-injector (independent)
echo "  [1/4] @rtl-first/direction-injector"
cd direction-injector
npm publish --access public
cd ..
echo "  ✓ Published"
echo ""

# 2. locale-scaffolder (independent)
echo "  [2/4] @rtl-first/locale-scaffolder"
cd locale-scaffolder
npm publish --access public
cd ..
echo "  ✓ Published"
echo ""

# 3. patch-generator (independent)
echo "  [3/4] @rtl-first/patch-generator"
cd patch-generator
npm publish --access public
cd ..
echo "  ✓ Published"
echo ""

# 4. arabize (depends on 1+2+3)
echo "  [4/4] @rtl-first/arabize"
cd arabize
npm publish --access public
cd ..
echo "  ✓ Published"
echo ""

echo "  ═════════════════════════════════"
echo "  All 4 packages published!"
echo ""
echo "  Verify:"
echo "    npm view @rtl-first/direction-injector"
echo "    npm view @rtl-first/locale-scaffolder"
echo "    npm view @rtl-first/patch-generator"
echo "    npm view @rtl-first/arabize"
echo ""
echo "  Test:"
echo "    npx @rtl-first/arabize ./my-fork --dry-run"
echo ""
