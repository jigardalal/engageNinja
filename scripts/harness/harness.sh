#!/usr/bin/env bash
set -euo pipefail

cmd="${1:-}"
shift || true

usage() {
  cat <<EOF
AI Agent Harness Generator (v3 - Supports Codex + Claude Code)

This tool generates instruction files that AI agents read automatically:
- AGENTS.md (for OpenAI Codex)
- CLAUDE.md (for Claude Code)
Plus tracking files for structured feature development.

Commands:
  init --req <requirements.md> [--out <harness_dir>] [--title <project_name>]
       Creates a new harness (first time setup)

  add-feature --out <harness_dir> [--req <file>] [--desc "description"]
       Adds new features to an existing harness (ongoing work)
       Three input modes:
         --req <file>    Read requirements from a file
         --desc "text"   Inline description (e.g., "add dark mode toggle")
         (neither)       Codex will ask you verbally what to build

  refresh --out <harness_dir> --req <requirements.md>
       Re-analyzes requirements without wiping progress (requirements changed)

Examples:
  # First time: create harness
  bash scripts/harness.sh init --req docs/prd.md --title MyProject

  # Add feature from a requirements file
  bash scripts/harness.sh add-feature --out harness --req docs/new-feature.md

  # Add feature with inline description
  bash scripts/harness.sh add-feature --out harness --desc "add dark mode toggle"

  # Add feature verbally (Codex will ask what to build)
  bash scripts/harness.sh add-feature --out harness

  # Requirements changed: refresh without losing progress
  bash scripts/harness.sh refresh --out harness --req docs/prd-v2.md

Generated Structure:
  ./AGENTS.md                 # Codex reads this automatically
  ./CLAUDE.md                 # Claude Code reads this automatically
  harness/
  ├── config.json             # Ports, URLs, environment settings
  ├── features.json           # Structured feature list
  ├── requirements.md         # Normalized requirements
  ├── progress.md             # Session log (append-only)
  ├── questions.md            # Blocking questions
  └── scope.md                # Done vs missing

Workflow (Codex):
  1. Run init to generate harness
  2. codex "initialize the harness"
  3. codex "continue coding" (subsequent sessions)

Workflow (Claude Code):
  1. Run init to generate harness
  2. claude "initialize the harness"
  3. claude "continue coding" (subsequent sessions)

Notes:
- Both agents read their instruction file automatically
- The harness folder contains shared tracking files
- Never delete the harness between features
EOF
}

init() {
  local req="" out="harness" title="Project"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --req) req="$2"; shift 2;;
      --out) out="$2"; shift 2;;
      --title) title="$2"; shift 2;;
      *) echo "Unknown arg: $1" >&2; usage; exit 1;;
    esac
  done

  [[ -n "$req" ]] || { echo "--req is required" >&2; exit 1; }
  [[ -f "$req" ]] || { echo "Requirements file not found: $req" >&2; exit 1; }

  mkdir -p "$out"
  local today
  today="$(date +"%Y-%m-%d")"

  # Detect package manager
  local pkg_manager="npm"
  if [[ -f "pnpm-lock.yaml" ]]; then
    pkg_manager="pnpm"
  elif [[ -f "yarn.lock" ]]; then
    pkg_manager="yarn"
  elif [[ -f "bun.lockb" ]]; then
    pkg_manager="bun"
  fi

  # best-effort package.json scripts capture
  local scripts_summary=""
  if [[ -f package.json ]] && command -v node >/dev/null 2>&1; then
    scripts_summary="$(node - <<NODE
const fs=require('fs');
try{
  const pkg=JSON.parse(fs.readFileSync('package.json','utf8'));
  const s=pkg.scripts||{};
  const keys=Object.keys(s).sort();
  for(const k of keys){
    console.log(`  - \`${k}\`: \`${s[k]}\``);
  }
}catch(e){}
NODE
)"
  fi

  # Detect existing test frameworks
  local detected_test_tools=""
  if [[ -f package.json ]] && command -v node >/dev/null 2>&1; then
    detected_test_tools="$(node - <<NODE
const fs = require('fs');
const tools = [];

try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  // Test runners
  if (allDeps['vitest']) tools.push('vitest');
  if (allDeps['jest']) tools.push('jest');
  if (allDeps['mocha']) tools.push('mocha');
  if (allDeps['ava']) tools.push('ava');
  if (allDeps['tap']) tools.push('tap');
  if (allDeps['uvu']) tools.push('uvu');

  // E2E / Browser testing
  if (allDeps['playwright'] || allDeps['@playwright/test']) tools.push('playwright');
  if (allDeps['puppeteer']) tools.push('puppeteer');
  if (allDeps['cypress']) tools.push('cypress');
  if (allDeps['selenium-webdriver']) tools.push('selenium');

  // Assertion libraries
  if (allDeps['chai']) tools.push('chai');

  // Mocking
  if (allDeps['sinon']) tools.push('sinon');
  if (allDeps['nock']) tools.push('nock');
  if (allDeps['msw']) tools.push('msw');

  // React testing
  if (allDeps['@testing-library/react']) tools.push('@testing-library/react');
  if (allDeps['enzyme']) tools.push('enzyme');

  // Check for node:test in scripts
  const scripts = pkg.scripts || {};
  for (const cmd of Object.values(scripts)) {
    if (cmd.includes('node --test') || cmd.includes('node:test')) {
      tools.push('node:test');
      break;
    }
  }

  if (tools.length > 0) {
    console.log(JSON.stringify(tools));
  }
} catch(e) {}
NODE
)"
  fi

  # Detect existing utility libraries
  local detected_libs=""
  if [[ -f package.json ]] && command -v node >/dev/null 2>&1; then
    detected_libs="$(node - <<NODE
const fs = require('fs');
const libs = {};

try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };

  // HTTP clients
  if (allDeps['axios']) libs.http = 'axios';
  else if (allDeps['got']) libs.http = 'got';
  else if (allDeps['node-fetch']) libs.http = 'node-fetch';
  else if (allDeps['ky']) libs.http = 'ky';

  // Date libraries
  if (allDeps['date-fns']) libs.date = 'date-fns';
  else if (allDeps['dayjs']) libs.date = 'dayjs';
  else if (allDeps['moment']) libs.date = 'moment';
  else if (allDeps['luxon']) libs.date = 'luxon';

  // Validation
  if (allDeps['zod']) libs.validation = 'zod';
  else if (allDeps['yup']) libs.validation = 'yup';
  else if (allDeps['joi']) libs.validation = 'joi';

  // State management
  if (allDeps['zustand']) libs.state = 'zustand';
  else if (allDeps['redux'] || allDeps['@reduxjs/toolkit']) libs.state = 'redux';
  else if (allDeps['mobx']) libs.state = 'mobx';
  else if (allDeps['jotai']) libs.state = 'jotai';
  else if (allDeps['recoil']) libs.state = 'recoil';

  // UI frameworks
  if (allDeps['tailwindcss']) libs.css = 'tailwind';
  else if (allDeps['styled-components']) libs.css = 'styled-components';
  else if (allDeps['@emotion/react']) libs.css = 'emotion';

  if (Object.keys(libs).length > 0) {
    console.log(JSON.stringify(libs));
  }
} catch(e) {}
NODE
)"
  fi

  # Try to detect ports from package.json, vite.config, etc.
  local detected_ports=""
  if [[ -f package.json ]] && command -v node >/dev/null 2>&1; then
    detected_ports="$(node - <<NODE
const fs = require('fs');
const ports = new Set();

// Check package.json scripts for port patterns
try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const scripts = pkg.scripts || {};
  for (const [name, cmd] of Object.entries(scripts)) {
    // Match --port 3000, -p 3000, PORT=3000, :3000
    const matches = cmd.match(/(?:--port\s+|(?:^|[^a-z])PORT=|-p\s+|:)(\d{4,5})/gi) || [];
    matches.forEach(m => {
      const port = m.match(/\d{4,5}/);
      if (port) ports.add(port[0]);
    });
  }
} catch(e) {}

// Check for common config files
const configFiles = ['vite.config.js', 'vite.config.ts', 'next.config.js', 'nuxt.config.js', 'webpack.config.js'];
for (const file of configFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/port['":\s]+(\d{4,5})/gi) || [];
    matches.forEach(m => {
      const port = m.match(/\d{4,5}/);
      if (port) ports.add(port[0]);
    });
  } catch(e) {}
}

// Check .env files
const envFiles = ['.env', '.env.local', '.env.development'];
for (const file of envFiles) {
  try {
    const content = fs.readFileSync(file, 'utf8');
    const matches = content.match(/PORT=(\d{4,5})/gi) || [];
    matches.forEach(m => {
      const port = m.match(/\d{4,5}/);
      if (port) ports.add(port[0]);
    });
  } catch(e) {}
}

if (ports.size > 0) {
  console.log(JSON.stringify([...ports].sort()));
}
NODE
)"
  fi

  # Detect tech stack
  local has_backend=$( [[ -d backend ]] && echo "true" || echo "false")
  local has_frontend=$( [[ -d frontend ]] && echo "true" || echo "false")
  local has_src=$( [[ -d src ]] && echo "true" || echo "false")

  #############################################################################
  # AGENTS.md - The main file Codex reads automatically
  #############################################################################
  cat > "AGENTS.md" <<AGENTS_EOF
# AGENTS.md - Codex Instructions for $title
# Generated: $today
# Codex reads this file automatically at the start of every session.

## Project Overview
- **Name:** $title
- **Requirements:** \`$req\`
- **Harness:** \`$out/\`
- **Package Manager:** $pkg_manager

## Critical Rules (MUST FOLLOW)

### 1. PORT MANAGEMENT (CRITICAL)
**NEVER change port numbers. NEVER try alternative ports.**

If a port is in use:
\`\`\`bash
# Find and kill the process using the port
lsof -ti:<PORT> | xargs kill -9 2>/dev/null || true
# Then start the service on the ORIGINAL port
\`\`\`

**FORBIDDEN actions:**
- Changing port numbers in config files (vite.config.js, package.json, .env, etc.)
- Trying port+1 when a port is busy (e.g., 3001 instead of 3000)
- Adding --port flags to override configured ports
- Modifying any configuration just to change ports

**Required ports (from project config):**
AGENTS_EOF

  # Add detected ports or placeholder
  if [[ -n "$detected_ports" && "$detected_ports" != "[]" ]]; then
    echo "$detected_ports" | node -e "
      const ports = JSON.parse(require('fs').readFileSync(0, 'utf8'));
      ports.forEach(p => console.log('- ' + p));
    " >> "AGENTS.md" 2>/dev/null || echo "- (check package.json, vite.config.js, .env for ports)" >> "AGENTS.md"
  else
    cat >> "AGENTS.md" <<AGENTS_EOF
- Frontend: 5173 (or as specified in vite.config / package.json)
- Backend: 3000 (or as specified in config)
- (Verify actual ports in project configuration files)
AGENTS_EOF
  fi

  cat >> "AGENTS.md" <<AGENTS_EOF

### 2. NO ASSUMPTIONS - ASK WITH OPTIONS
If anything is unclear, DO NOT GUESS. Instead:

1. **Research first** - Look at existing code, docs, patterns
2. **Present options** - Show the user what you found and possible approaches
3. **Write to questions.md** with this format:

\`\`\`markdown
## Q: [Short question]
**Context:** What you found during research
**Options:**
- **Option A:** [description] - Pros: X, Cons: Y
- **Option B:** [description] - Pros: X, Cons: Y
- **Option C:** [description] - Pros: X, Cons: Y
**My recommendation:** [which option and why]
**Blocks:** F001, F002
\`\`\`

4. STOP work on that feature until answered
5. Continue with unblocked features

**Example good question:**
\`\`\`markdown
## Q: Which authentication approach should we use?
**Context:** Found existing JWT setup in /lib/auth.ts but requirements mention "social login"
**Options:**
- **Option A:** Extend existing JWT with OAuth providers - Pros: keeps current code, Cons: more complex
- **Option B:** Switch to NextAuth.js - Pros: built-in social, Cons: migration effort
- **Option C:** Add social as separate flow - Pros: no migration, Cons: two auth systems
**My recommendation:** Option A - minimal disruption, existing patterns
**Blocks:** F003 (User Login), F004 (Social Auth)
\`\`\`

### 3. REGRESSION TESTING REQUIRED
**Before marking ANY feature complete, test 3-4 critical user flows to ensure nothing broke.**

1. Identify 3-4 main flows from existing features (not the one you just built)
2. Test them end-to-end (happy path only, don't need edge cases)
3. Verify they still work exactly as before
4. Examples of main flows to test:
   - User login → dashboard (if auth exists)
   - Create item → view list → edit → delete (if CRUD exists)
   - Search → filter → sort → export (if search exists)
   - Checkout flow (if e-commerce exists)

**If ANY main flow breaks:**
1. STOP - do not mark feature as passing
2. Fix the regression immediately
3. Then re-test the 3-4 flows again
4. Only after all pass: mark feature as complete

This prevents: "The new feature works, but we broke login for everyone."

### 4. ONE FEATURE AT A TIME
- Read `harness/features.json` for the feature list
- Pick ONE feature with status "failing" or "in_progress"
- Implement it completely
- Verify it works (run the test_procedure steps)
- **Test 3-4 main flows to ensure NO REGRESSIONS** (see rule 3 above)
- Update status to "passing"
- Commit with message: `feat(<category>): <description>`
- Then move to next feature

### 5. GIT DISCIPLINE
- Commit after EVERY completed feature
- Never leave uncommitted work at session end
- Use conventional commits: feat(), fix(), chore(), etc.

### 6. SESSION BOUNDARIES
At the END of every session:
1. Commit all working code
2. Append session summary to `harness/progress.md`
3. Update `harness/features.json` with current status

### 7. NO SERVER STARTUP (unless explicitly asked)
Do NOT start development servers unless the user asks.
If you need to test, ask the user to confirm servers are running.

### 8. USE EXISTING TOOLS - NO REINVENTING (CRITICAL)
**Before adding ANY dependency or tool, check what already exists.**

**FORBIDDEN actions:**
- Adding Jest when the repo uses Vitest, Node test runner, or Mocha
- Adding Playwright when the repo uses Puppeteer (or vice versa)
- Adding axios when the repo uses fetch or got
- Adding moment/dayjs when the repo uses date-fns (or vice versa)
- Adding any testing library without checking package.json first
- Adding any utility library that duplicates existing functionality

**REQUIRED process for testing:**
1. Check `package.json` devDependencies for existing test frameworks
2. Look for existing test files: `**/*.test.{js,ts}`, `**/*.spec.{js,ts}`, `__tests__/`
3. Read 2-3 existing test files to understand patterns
4. Use the EXACT same:
   - Test runner (jest, vitest, mocha, node:test, etc.)
   - Assertion library (expect, assert, chai, etc.)
   - Mocking approach (jest.mock, vi.mock, sinon, etc.)
   - File naming convention (*.test.ts vs *.spec.ts)
   - Test organization (describe/it vs test())

**REQUIRED process for any new dependency:**
1. Search existing code: `grep -r "import.*from" --include="*.ts" --include="*.js" | head -50`
2. Check package.json for similar functionality
3. If similar tool exists, USE IT - don't add alternatives
4. If truly new functionality needed, ask in `harness/questions.md` first

### 9. FOLLOW EXISTING PATTERNS
Before writing ANY code, study the existing codebase:
- File structure and naming conventions
- Import style (relative vs aliases, default vs named)
- Error handling patterns
- Logging approach
- State management patterns
- API call patterns
- Component structure (if frontend)

Copy the existing style exactly. Don't "improve" conventions.

### 10. TOKEN EFFICIENCY (CRITICAL)
Tokens are expensive. Be efficient:

**DO:**
- Read only files you need (not entire directories)
- Read specific line ranges when possible
- Summarize findings instead of dumping full file contents
- Use grep/search to find relevant code, then read only those sections
- Keep progress.md entries concise (3-5 bullet points per session)

**DON'T:**
- Read the same file multiple times in one session
- Dump entire file contents when you only need a few lines
- Write verbose explanations in harness files
- Include full stack traces - just the relevant error line
- Repeat information that's already in harness files

**Before reading a file, ask:** "Do I actually need this, or can I search for what I need?"

### 11. QUALITY OVER SPEED (CRITICAL)
You have ample time. There is NO RUSH. What matters:

**ZERO TOLERANCE for:**
- Lint errors
- Build failures
- Type errors
- Failing tests
- Console errors

**Before marking ANY feature "passing":**
\`\`\`bash
# Run ALL of these - fix any issues before continuing
$pkg_manager run lint      # Must pass
$pkg_manager run build     # Must pass
$pkg_manager run test      # Must pass (if tests exist)
\`\`\`

**If any check fails:**
1. Fix it immediately
2. Do NOT move to next feature
3. Do NOT commit broken code
4. Take the time to understand WHY it failed

**Mindset:**
- Slow is smooth, smooth is fast
- One properly working feature > three broken features
- 10 minutes fixing now > 2 hours debugging later

### 12. NO FALLBACK CODE
**DO NOT write fallback/backup implementations that mask failures.**

**FORBIDDEN:**
\`\`\`javascript
// BAD - hides whether real implementation works
try {
  result = complexAlgorithm(data);
} catch {
  result = data.sort(); // Fallback hides the real failure!
}
\`\`\`

**REQUIRED:**
\`\`\`javascript
// GOOD - fails visibly if algorithm doesn't work
result = complexAlgorithm(data);
// If it fails, FIX IT - don't add fallback
\`\`\`

If something doesn't work, FIX IT. Don't hide failures behind fallbacks.

### 13. NO DEAD CODE
Before committing, verify:
- No unused imports
- No unused variables
- No unused function parameters
- No commented-out code blocks
- No duplicate code that could be consolidated

Run the linter - it will catch these.

### 14. VERIFY YOUR OWN CLAIMS
**Never say "done" without verification.**

Before claiming a feature works:
1. Actually run it (not just "it should work")
2. Test the happy path
3. Test at least one edge case
4. Check browser console for errors (if frontend)
5. Check server logs for errors (if backend)

**FORBIDDEN phrases without evidence:**
- "This should work"
- "I've implemented X" (without testing)
- "The feature is complete" (without running it)

### 15. DEPENDENCIES IN CORRECT PLACE
- Test libraries → \`devDependencies\`
- Build tools → \`devDependencies\`
- Type definitions → \`devDependencies\`
- Runtime code → \`dependencies\`

\`\`\`bash
# Testing libs - ALWAYS devDependencies
npm install -D vitest @testing-library/react

# NOT: npm install vitest (wrong!)
\`\`\`

### 16. NO HARDCODED VALUES
Use existing design tokens, constants, and config:

**FORBIDDEN:**
\`\`\`javascript
color: '#3b82f6'           // Hardcoded color
timeout: 5000              // Magic number
apiUrl: 'http://localhost' // Hardcoded URL
\`\`\`

**REQUIRED:**
\`\`\`javascript
color: theme.colors.primary // From design system
timeout: CONFIG.API_TIMEOUT // From constants
apiUrl: process.env.API_URL // From environment
\`\`\`

Search codebase for existing tokens/constants before adding values.

### 17. NO OVER-ENGINEERING
**Keep it simple. Build exactly what's needed, nothing more.**

**FORBIDDEN:**
- Abstract base classes "for future flexibility"
- Factory patterns for single implementations
- Dependency injection containers for simple apps
- Generic type parameters that aren't needed
- Configuration options that aren't required
- "Plugin architectures" for one plugin
- Premature optimization
- Building for hypothetical future requirements

**REQUIRED mindset:**
- Will this feature ACTUALLY be used? If unsure, don't build it
- Is there a simpler way? Use it
- 3 lines of duplicated code > 1 clever abstraction
- Direct code > indirect code
- Boring code > clever code

**Ask yourself:** "Am I building this because it's needed, or because it's 'proper'?"

### 18. DO EXACTLY WHAT IS ASKED - NOTHING MORE
**Only implement what is explicitly requested. No extras.**

**FORBIDDEN:**
- Adding "nice to have" features not requested
- Refactoring code that wasn't part of the task
- Adding comments to code you didn't change
- "Improving" nearby code while you're there
- Adding error handling "just in case"
- Creating utilities "we might need later"
- Adding types/interfaces beyond what's needed
- Writing documentation not asked for

**REQUIRED:**
- Read the request carefully
- Do exactly that, nothing else
- If you think something else should be done, ASK first
- Resist the urge to "make it better"

**Example:**
Request: "Add a logout button to the navbar"

WRONG approach:
- Add logout button ✓
- Also refactor the navbar component
- Also add comments explaining the auth flow
- Also create a useAuth hook for "better organization"
- Also add loading states "for better UX"

RIGHT approach:
- Add logout button ✓
- Done.

**If you see other issues:** Note them in questions.md for later, don't fix them now.

### 19. INTEGRATION TESTS ONLY - NO UNIT TESTS OR MOCKS
**Test real behavior with real dependencies. No mocking.**

**FORBIDDEN:**
\`\`\`javascript
// NO unit tests
test('calculateTotal returns sum', () => {...})

// NO mocking
jest.mock('./database')
vi.mock('./api')
const mockFetch = jest.fn()
sinon.stub(service, 'method')

// NO testing implementation details
expect(component.state.isLoading).toBe(true)
\`\`\`

**REQUIRED - Integration tests only:**
\`\`\`javascript
// Test real user flows with real services
test('user can complete checkout', async () => {
  // Real database, real API, real browser
  await page.goto('/cart')
  await page.click('button[data-testid="checkout"]')
  await page.fill('#card-number', '4242424242424242')
  await page.click('button[type="submit"]')
  await expect(page.locator('.confirmation')).toBeVisible()

  // Verify in real database
  const order = await db.orders.findFirst({ where: { status: 'completed' }})
  expect(order).toBeTruthy()
})
\`\`\`

**Why:**
- Mocks test your assumptions, not your code
- Unit tests break on refactoring but miss real bugs
- Integration tests catch real problems users would hit
- If it's hard to test without mocks, the design may need simplification

AGENTS_EOF

  # Add detected test tools section
  if [[ -n "$detected_test_tools" && "$detected_test_tools" != "[]" ]]; then
    cat >> "AGENTS.md" <<AGENTS_EOF

## Existing Test Setup (USE THESE - DO NOT ADD ALTERNATIVES)
AGENTS_EOF
    echo "$detected_test_tools" | node -e "
      const tools = JSON.parse(require('fs').readFileSync(0, 'utf8'));
      tools.forEach(t => console.log('- **' + t + '** (already installed)'));
    " >> "AGENTS.md" 2>/dev/null || true
    cat >> "AGENTS.md" <<AGENTS_EOF

**You MUST use these tools. Do NOT add alternatives.**
AGENTS_EOF
  fi

  # Add detected utility libraries section
  if [[ -n "$detected_libs" && "$detected_libs" != "{}" ]]; then
    cat >> "AGENTS.md" <<AGENTS_EOF

## Existing Libraries (USE THESE - DO NOT ADD ALTERNATIVES)
AGENTS_EOF
    echo "$detected_libs" | node -e "
      const libs = JSON.parse(require('fs').readFileSync(0, 'utf8'));
      for (const [category, lib] of Object.entries(libs)) {
        console.log('- **' + category + '**: ' + lib);
      }
    " >> "AGENTS.md" 2>/dev/null || true
    cat >> "AGENTS.md" <<AGENTS_EOF

**You MUST use these libraries. Do NOT add alternatives.**
AGENTS_EOF
  fi

  cat >> "AGENTS.md" <<AGENTS_EOF

## Detected npm Scripts
$scripts_summary

## Harness Files
| File | Purpose |
|------|---------|
| \`$out/features.json\` | Feature list with status (update often) |
| \`$out/requirements.md\` | Normalized requirements |
| \`$out/progress.md\` | Session log (append-only) |
| \`$out/questions.md\` | Blocking questions |
| \`$out/scope.md\` | What's done vs missing |
| \`$out/config.json\` | Ports, URLs, environment config |

## Session Startup (do this first)
\`\`\`bash
pwd
git status
git log --oneline -5
\`\`\`
Then read:
1. \`$out/progress.md\` - What happened last session?
2. \`$out/features.json\` - What's the current status?
3. \`$out/questions.md\` - Any blockers?

## Commands

### Initialize harness (first time)
Tell Codex: "Initialize the harness - analyze the repo and populate feature list"

### Continue coding (subsequent sessions)
Tell Codex: "Continue coding from the harness"

### Add a feature
Tell Codex: "Add feature: <description>"

## Feature JSON Format
\`\`\`json
{
  "id": "F001",
  "category": "auth",
  "name": "User Login",
  "description": "Users can log in with email and password",
  "requirements": ["REQ-001"],
  "test_procedure": [
    "1. Navigate to /login",
    "2. Enter valid credentials",
    "3. Verify redirect to dashboard"
  ],
  "status": "failing",
  "notes": ""
}
\`\`\`
Status values: "failing" (not done), "in_progress" (working on it), "passing" (done)
AGENTS_EOF

  #############################################################################
  # CLAUDE.md - For Claude Code (similar content, different format)
  #############################################################################
  cat > "CLAUDE.md" <<CLAUDE_EOF
# CLAUDE.md - Instructions for $title
# Generated: $today
# Claude Code reads this file automatically.

## Project: $title
- Requirements: \`$req\`
- Harness: \`$out/\`
- Package Manager: $pkg_manager

## Critical Rules

### 1. PORTS - NEVER CHANGE
If port is busy: \`lsof -ti:<PORT> | xargs kill -9\` then restart.
NEVER modify port configs. NEVER try port+1.
CLAUDE_EOF

  if [[ -n "$detected_ports" && "$detected_ports" != "[]" ]]; then
    echo "Required ports:" >> "CLAUDE.md"
    echo "$detected_ports" | node -e "
      const ports = JSON.parse(require('fs').readFileSync(0, 'utf8'));
      ports.forEach(p => console.log('- ' + p));
    " >> "CLAUDE.md" 2>/dev/null || true
  fi

  cat >> "CLAUDE.md" <<CLAUDE_EOF

### 2. ASK BEFORE ASSUMING
If unclear, research first then ask in `harness/questions.md`:
```
## Q: [question]
**Context:** What I found
**Options:**
- Option A: [desc] - Pros/Cons
- Option B: [desc] - Pros/Cons
**My recommendation:** [which and why]
**Blocks:** F001, F002
```
STOP work on blocked features until answered.

### 3. REGRESSION TESTING REQUIRED
**Before marking ANY feature complete, test 3-4 main user flows to ensure nothing broke.**
- Identify 3-4 critical flows from existing features (not your new one)
- Test end-to-end (happy path only)
- If ANY flow breaks, fix it before marking feature complete
- Examples: login→dashboard, create→view→edit→delete, search→filter→sort

### 4. ONE FEATURE AT A TIME
Read `harness/features.json`, pick ONE "failing" feature, implement fully, test 3-4 main flows for regressions, verify, mark "passing", commit, then next.

### 5. USE EXISTING TOOLS ONLY
CLAUDE_EOF

  if [[ -n "$detected_test_tools" && "$detected_test_tools" != "[]" ]]; then
    echo "**Testing (use these, no alternatives):**" >> "CLAUDE.md"
    echo "$detected_test_tools" | node -e "
      const tools = JSON.parse(require('fs').readFileSync(0, 'utf8'));
      tools.forEach(t => console.log('- ' + t));
    " >> "CLAUDE.md" 2>/dev/null || true
  fi

  if [[ -n "$detected_libs" && "$detected_libs" != "{}" ]]; then
    echo "**Libraries (use these, no alternatives):**" >> "CLAUDE.md"
    echo "$detected_libs" | node -e "
      const libs = JSON.parse(require('fs').readFileSync(0, 'utf8'));
      for (const [cat, lib] of Object.entries(libs)) console.log('- ' + cat + ': ' + lib);
    " >> "CLAUDE.md" 2>/dev/null || true
  fi

  cat >> "CLAUDE.md" <<CLAUDE_EOF

Before adding ANY dependency: check package.json first. If similar exists, USE IT.

### 6. FOLLOW EXISTING PATTERNS
Study existing code before writing. Match:
- File naming, import style, error handling
- Test patterns (read existing tests first)
- Component structure

### 7. TOKEN EFFICIENCY
Tokens are expensive. Be efficient:
- Read only files you need, not entire directories
- Use grep/search first, then read specific sections
- Keep progress.md entries concise (3-5 bullets)
- Don't read same file multiple times per session
- Summarize, don't dump full contents

### 8. QUALITY OVER SPEED
You have ample time. NO RUSH. Zero tolerance for:
- Lint errors
- Build failures
- Type errors
- Failing tests

**Before marking feature "passing":**
```bash
npm run lint   # Must pass
npm run build  # Must pass
npm run test   # Must pass
```
Fix ALL errors before moving on. One working feature > three broken ones.

### 9. GIT DISCIPLINE
Commit after every feature: `feat(<category>): <description>`

### 10. NO FALLBACK CODE
Don't mask failures with backup implementations:
```javascript
// BAD: try { realCode() } catch { fallback() }
// GOOD: realCode() - if it fails, FIX IT
```

### 11. NO DEAD CODE
Before commit: no unused imports, variables, parameters, or commented code.

### 12. VERIFY YOUR CLAIMS
Never say "done" without actually running it. Test happy path + edge case.
Forbidden: "This should work" (without testing)

### 13. DEVDEPENDENCIES
Test/build tools → `npm install -D` (devDependencies)
Runtime code → `npm install` (dependencies)

### 14. NO HARDCODED VALUES
Use existing design tokens, constants, env vars. Search codebase first.

### 15. NO OVER-ENGINEERING
Build exactly what's needed, nothing more.
- No abstract classes "for flexibility"
- No factory patterns for single implementations
- No premature optimization
- 3 lines of duplication > 1 clever abstraction
- Boring code > clever code

### 16. DO EXACTLY WHAT IS ASKED
Only implement what's explicitly requested. No extras.
- No "nice to have" features
- No refactoring code not part of the task
- No adding comments to unchanged code
- No "improving" nearby code
- If you see other issues, note in questions.md - don't fix now

### 17. INTEGRATION TESTS ONLY
No unit tests. No mocks. Test real user flows with real dependencies.
```javascript
// FORBIDDEN: jest.mock(), vi.mock(), sinon.stub()
// REQUIRED: Real database, real API, real browser
test('user can checkout', async () => {
  await page.goto('/cart')
  await page.click('[data-testid="checkout"]')
  // Verify in real database
})
```

### 18. SESSION END
1. Commit all work
2. Update `harness/progress.md` (concise!)
3. Update `harness/features.json` status

## Harness Files
- `harness/features.json` - Feature list (update status often)
- `harness/progress.md` - Session log (append-only)
- `harness/questions.md` - Blocking questions
- `harness/config.json` - Ports/URLs (DO NOT MODIFY)

## Startup
```bash
pwd && git status && git log --oneline -5
```
Then read: progress.md → features.json → questions.md
CLAUDE_EOF

  if [[ -n "$scripts_summary" ]]; then
    cat >> "CLAUDE.md" <<CLAUDE_EOF

## npm Scripts
$scripts_summary
CLAUDE_EOF
  fi

  #############################################################################
  # harness/config.json - Ports and environment configuration
  #############################################################################
  cat > "$out/config.json" <<CONFIG_EOF
{
  "_instructions": "NEVER modify port numbers. If port is in use, kill the process.",
  "ports": {
    "frontend": ${detected_ports:-5173},
    "backend": 3000,
    "database": 5432
  },
  "urls": {
    "frontend": "http://localhost:${detected_ports:-5173}",
    "backend": "http://localhost:3000",
    "api": "http://localhost:3000/api"
  },
  "commands": {
    "dev": "$pkg_manager run dev",
    "test": "$pkg_manager test",
    "build": "$pkg_manager run build",
    "lint": "$pkg_manager run lint"
  },
  "kill_port": "lsof -ti:<PORT> | xargs kill -9 2>/dev/null || true"
}
CONFIG_EOF

  #############################################################################
  # harness/features.json
  #############################################################################
  cat > "$out/features.json" <<FEATURES_EOF
{
  "_meta": {
    "description": "Feature list for tracking implementation progress",
    "status_values": ["failing", "in_progress", "passing"],
    "last_updated": ""
  },
  "features": []
}
FEATURES_EOF

  #############################################################################
  # harness/requirements.md
  #############################################################################
  cat > "$out/requirements.md" <<REQ_EOF
# Requirements (Normalized)
Last updated: $today
Source: \`$req\`

## Instructions
Before coding, rewrite requirements from \`$req\` as explicit, testable statements.

## Requirements
<!-- Format: REQ-XXX: <testable statement> -->

(To be populated by initializer)
REQ_EOF

  #############################################################################
  # harness/scope.md
  #############################################################################
  cat > "$out/scope.md" <<SCOPE_EOF
# Scope
Last updated: $today
Source: \`$req\`

## Already Implemented
(To be filled after repo analysis)

## To Build
(To be filled after repo analysis)

## Out of Scope
(From requirements)
SCOPE_EOF

  #############################################################################
  # harness/progress.md
  #############################################################################
  cat > "$out/progress.md" <<PROGRESS_EOF
# Progress Log
Append each session's summary here.

---
## $today - Harness Created
- **Agent:** Human (harness.sh)
- **Action:** Generated harness structure
- **Next:** Run initializer to populate features

PROGRESS_EOF

  #############################################################################
  # harness/questions.md
  #############################################################################
  cat > "$out/questions.md" <<QUESTIONS_EOF
# Open Questions (Blocking)

## Instructions
- Only BLOCKING questions go here
- Agent MUST NOT proceed with blocked features until answered
- Format below:

---
## Q1: [Template]
**Question:**
**Blocks:** F001, F002
**Context:** Why this is unclear
**Answer:** (human fills this)

QUESTIONS_EOF

  echo ""
  echo "=============================================="
  echo "  Harness Created Successfully!"
  echo "=============================================="
  echo ""
  echo "Generated:"
  echo "  ./AGENTS.md              (Codex reads this automatically)"
  echo "  ./CLAUDE.md              (Claude Code reads this automatically)"
  echo "  $out/config.json         (ports, URLs - DO NOT CHANGE PORTS)"
  echo "  $out/features.json       (feature tracking)"
  echo "  $out/requirements.md     (normalized requirements)"
  echo "  $out/scope.md            (done vs missing)"
  echo "  $out/progress.md         (session log)"
  echo "  $out/questions.md        (blocking questions)"
  echo ""
  echo "Next steps:"
  echo "  1. git add AGENTS.md CLAUDE.md $out/ && git commit -m 'chore: add agent harness'"
  echo ""
  echo "  For Codex:"
  echo "    codex \"Initialize the harness\""
  echo "    codex \"Continue coding\""
  echo ""
  echo "  For Claude Code:"
  echo "    claude \"Initialize the harness\""
  echo "    claude \"Continue coding\""
  echo ""
  echo "Key rules enforced:"
  echo "  - NEVER change port numbers (kill process, reuse port)"
  echo "  - ASK with options before assuming"
  echo "  - USE existing tools (no reinventing)"
  echo ""
}

add_feature() {
  local req="" out="harness" desc=""
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --req) req="$2"; shift 2;;
      --out) out="$2"; shift 2;;
      --desc) desc="$2"; shift 2;;
      *) echo "Unknown arg: $1" >&2; usage; exit 1;;
    esac
  done

  [[ -d "$out" ]] || { echo "Harness not found at: $out (run init first)" >&2; exit 1; }
  [[ -f "$out/features.json" ]] || { echo "No features.json found in $out" >&2; exit 1; }

  local today
  today="$(date +"%Y-%m-%d")"

  # Append to progress log
  if [[ -n "$req" ]]; then
    [[ -f "$req" ]] || { echo "Requirements file not found: $req" >&2; exit 1; }
    cat >> "$out/progress.md" <<EOF

---
## $today - Add Feature Request
- **Input:** File: \`$req\`
- **Action:** Run codex to add features from file

EOF
    echo ""
    echo "Feature request logged."
    echo ""
    echo "Next: codex \"Add features from $req to the harness\""
    echo ""

  elif [[ -n "$desc" ]]; then
    cat >> "$out/progress.md" <<EOF

---
## $today - Add Feature Request
- **Input:** "$desc"
- **Action:** Run codex to add this feature

EOF
    echo ""
    echo "Feature request logged."
    echo ""
    echo "Next: codex \"Add feature: $desc\""
    echo ""

  else
    cat >> "$out/progress.md" <<EOF

---
## $today - Add Feature Request
- **Input:** Verbal (user will describe)
- **Action:** Run codex to add feature

EOF
    echo ""
    echo "Feature request logged."
    echo ""
    echo "Next: codex \"Add a new feature\" (then describe what you want)"
    echo ""
  fi
}

refresh() {
  local req="" out="harness"
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --req) req="$2"; shift 2;;
      --out) out="$2"; shift 2;;
      *) echo "Unknown arg: $1" >&2; usage; exit 1;;
    esac
  done

  [[ -n "$req" ]] || { echo "--req is required" >&2; exit 1; }
  [[ -f "$req" ]] || { echo "Requirements file not found: $req" >&2; exit 1; }
  [[ -d "$out" ]] || { echo "Harness not found at: $out (run init first)" >&2; exit 1; }

  local today
  today="$(date +"%Y-%m-%d")"

  # Append to progress log
  cat >> "$out/progress.md" <<EOF

---
## $today - Requirements Refresh
- **New requirements:** \`$req\`
- **Action:** Run codex to refresh harness

EOF

  echo ""
  echo "Refresh request logged."
  echo ""
  echo "Next: codex \"Refresh the harness - requirements have changed. New file: $req\""
  echo ""
}

case "$cmd" in
  init) init "$@";;
  add-feature) add_feature "$@";;
  refresh) refresh "$@";;
  ""|-h|--help|help) usage;;
  *) echo "Unknown command: $cmd" >&2; usage; exit 1;;
esac
