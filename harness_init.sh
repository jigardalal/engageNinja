#!/bin/bash
set -euo pipefail

REQ_FILE="${1:?Please provide requirements file path}"
OUT_DIR="${2:-harness}"

if [[ ! -f "$REQ_FILE" ]]; then
  echo "Error: Requirements file not found: $REQ_FILE" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

TODAY=$(date +"%Y-%m-%d")

# Copy requirements
cp "$REQ_FILE" "$OUT_DIR/requirements.md"

# Create basic features.json
cat > "$OUT_DIR/features.json" <<'EOF'
{
  "_meta": {
    "description": "Feature list for tracking implementation progress",
    "status_values": ["failing", "in_progress", "passing"],
    "last_updated": ""
  },
  "features": []
}
EOF

# Create scope.md
cat > "$OUT_DIR/scope.md" <<'EOF'
# Scope: Done vs Missing

## From Requirements
_To be filled based on requirements analysis_

## Done
- (existing features)

## Missing
- (new features to implement)
EOF

# Create progress.md
cat > "$OUT_DIR/progress.md" <<EOF
# Session Progress Log

## $TODAY - Harness Initialized
- **Requirements:** \`$REQ_FILE\`
- **Output:** \`$OUT_DIR/\`

EOF

# Create questions.md
cat > "$OUT_DIR/questions.md" <<'EOF'
# Open Questions (Blocking)

Only questions that block implementation should go here.
Once answered, remove from this file.

## Format
\`\`\`
## Q: [Short question]
**Context:** What you found
**Options:**
- Option A: description
- Option B: description
**My recommendation:** [which and why]
**Blocks:** F001, F002
\`\`\`
EOF

# Create config.json
cat > "$OUT_DIR/config.json" <<'EOF'
{
  "_instructions": "Configuration for harness. Do not modify port numbers.",
  "ports": {
    "frontend": 5173,
    "backend": 3000
  },
  "environment": "development"
}
EOF

echo "✅ Harness initialized successfully!"
echo ""
echo "Created:"
echo "  - $OUT_DIR/requirements.md"
echo "  - $OUT_DIR/features.json"
echo "  - $OUT_DIR/scope.md"
echo "  - $OUT_DIR/progress.md"
echo "  - $OUT_DIR/questions.md"
echo "  - $OUT_DIR/config.json"
echo ""
echo "Next steps:"
echo "  1. Review $OUT_DIR/requirements.md"
echo "  2. Define features in $OUT_DIR/features.json"
echo "  3. Start implementing"
