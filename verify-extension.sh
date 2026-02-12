#!/bin/bash

echo "🔍 Verifying WebRTC Monitor Extension Structure..."
echo ""

# Required files check
REQUIRED_FILES=(
  "manifest.json"
  "background.js"
  "content.js"
  "database.js"
  "api-client.js"
  "webrtc-monitor.js"
  "quality-analyzer.js"
  "popup.html"
  "popup.css"
  "popup.js"
  "options.html"
  "options.css"
  "options.js"
  "icons/icon16.png"
  "icons/icon48.png"
  "icons/icon128.png"
)

MISSING_FILES=0

for file in "${REQUIRED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "✅ $file"
  else
    echo "❌ $file - MISSING!"
    MISSING_FILES=$((MISSING_FILES + 1))
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check JavaScript syntax
echo ""
echo "🔍 Checking JavaScript Syntax..."
echo ""

JS_FILES=(
  "background.js"
  "content.js"
  "database.js"
  "api-client.js"
  "webrtc-monitor.js"
  "quality-analyzer.js"
  "popup.js"
  "options.js"
)

SYNTAX_ERRORS=0

for file in "${JS_FILES[@]}"; do
  if node --check "$file" 2>/dev/null; then
    echo "✅ $file - Syntax OK"
  else
    echo "❌ $file - Syntax Error!"
    SYNTAX_ERRORS=$((SYNTAX_ERRORS + 1))
  fi
done

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Check manifest.json
echo ""
echo "🔍 Validating manifest.json..."
echo ""

if node -e "JSON.parse(require('fs').readFileSync('manifest.json', 'utf8'))" 2>/dev/null; then
  echo "✅ manifest.json - Valid JSON"
else
  echo "❌ manifest.json - Invalid JSON!"
  MISSING_FILES=$((MISSING_FILES + 1))
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 VERIFICATION SUMMARY"
echo ""
echo "Missing Files: $MISSING_FILES"
echo "Syntax Errors: $SYNTAX_ERRORS"
echo ""

if [ $MISSING_FILES -eq 0 ] && [ $SYNTAX_ERRORS -eq 0 ]; then
  echo "✨ All checks passed! Extension is ready to load."
  exit 0
else
  echo "⚠️  Some issues found. Please fix them before loading."
  exit 1
fi
