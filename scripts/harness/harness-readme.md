# AI Agent Harness Generator v3
Last updated: 2025-12-17

A tool that generates instruction files for **both Codex and Claude Code**, plus tracking files for structured feature development. Based on [Anthropic's patterns for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents).

## Key Features

### Dual Agent Support
- Generates `AGENTS.md` (for OpenAI Codex)
- Generates `CLAUDE.md` (for Claude Code)
- Both agents read their file automatically - no pasting prompts
- Shared harness folder for tracking

### Strict Port Management
**The #1 agent failure mode is port-hopping.** This harness explicitly forbids it:
- Agent will NEVER change port numbers
- If a port is busy, agent kills the process and reuses the same port
- No modifying vite.config.js, package.json, .env just to change ports

### Structured Feature Tracking
- JSON feature list with status tracking
- Session progress logs for context handoff
- Blocking questions mechanism

## Quick Start

```bash
# From your project root
bash scripts/harness.sh init --req docs/prd.md --title "MyProject"

# Commit the harness
git add AGENTS.md CLAUDE.md harness/ && git commit -m "chore: add agent harness"

# For Codex:
codex "Initialize the harness"
codex "Continue coding"

# For Claude Code:
claude "Initialize the harness"
claude "Continue coding"
```

## Generated Structure

```
./AGENTS.md                 # Codex reads this automatically
./CLAUDE.md                 # Claude Code reads this automatically
harness/
├── config.json             # Ports, URLs (NEVER change ports!)
├── features.json           # Feature list with status
├── requirements.md         # Normalized requirements
├── progress.md             # Session log (append-only)
├── questions.md            # Blocking questions
└── scope.md                # Done vs missing
```

## Commands

### `init` - First Time Setup
```bash
bash scripts/harness.sh init \
  --req <path>      # Required: requirements file
  --out <dir>       # Optional: harness directory (default: harness)
  --title <name>    # Optional: project name (default: Project)
```

### `add-feature` - Add Features to Existing Project
```bash
# From a requirements file
bash scripts/harness.sh add-feature --out harness --req docs/new-feature.md

# Inline description
bash scripts/harness.sh add-feature --out harness --desc "add dark mode toggle"

# Verbal (agent will ask what you want)
bash scripts/harness.sh add-feature --out harness
```

### `refresh` - Requirements Changed
```bash
bash scripts/harness.sh refresh --out harness --req docs/prd-v2.md
```

---

## Workflow Examples

### Example 1: Greenfield Project (New Project)

You have a PRD and an empty repo:

```bash
# 1. Generate harness
bash scripts/harness.sh init --req docs/prd.md --title "MyNewApp"

# 2. Commit
git add AGENTS.md CLAUDE.md harness/ && git commit -m "chore: add agent harness"

# 3. Initialize - agent will:
#    - Read PRD
#    - Create feature list in harness/features.json
#    - All features start as "failing"
codex "Initialize the harness"

# 4. Start coding - agent will:
#    - Pick first "failing" feature
#    - Implement it
#    - Run lint/build/test
#    - Mark as "passing"
#    - Commit
#    - Continue to next feature
codex "Continue coding"
```

### Example 2: Brownfield Project (Existing Codebase)

You have an existing app and want to add features:

```bash
# 1. Generate harness pointing to your requirements
bash scripts/harness.sh init --req docs/new-features.md --title "ExistingApp"

# 2. Commit
git add AGENTS.md CLAUDE.md harness/ && git commit -m "chore: add agent harness"

# 3. Initialize - agent will:
#    - Analyze existing codebase
#    - Identify what's already implemented
#    - Mark existing features as "passing" in scope.md
#    - Create features only for what's MISSING
#    - Detect existing tools (vitest, tailwind, etc.)
codex "Initialize the harness"

# 4. Continue - agent follows existing patterns
codex "Continue coding"
```

### Example 3: Adding a Feature to Ongoing Project

Harness already exists, you want to add a new feature:

```bash
# Option A: You have a requirements doc for the new feature
bash scripts/harness.sh add-feature --out harness --req docs/dark-mode-spec.md
codex "Add the features from docs/dark-mode-spec.md"

# Option B: Quick inline description
bash scripts/harness.sh add-feature --out harness --desc "Add dark mode toggle to settings page with system preference detection"
codex "Add the dark mode feature"

# Option C: Just tell the agent verbally
codex "Add feature: user profile page with avatar upload"
# Agent will:
#   - Ask clarifying questions
#   - Research existing patterns
#   - Add to features.json with status "failing"
#   - Implement it
```

### Example 4: Subsequent Coding Sessions

```bash
# Agent reads progress.md to see what happened last time
# Picks up where it left off
codex "Continue coding"

# Or be specific
codex "Continue with feature F003"
```

---

## Port Management (Critical)

The harness includes strict rules to prevent the common "port-hopping" failure:

```markdown
### PORT MANAGEMENT (CRITICAL)
**NEVER change port numbers. NEVER try alternative ports.**

If a port is in use:
lsof -ti:<PORT> | xargs kill -9 2>/dev/null || true
# Then start the service on the ORIGINAL port

**FORBIDDEN actions:**
- Changing port numbers in config files
- Trying port+1 when a port is busy
- Adding --port flags to override configured ports
```

The generator auto-detects ports from:
- package.json scripts
- vite.config.js / next.config.js
- .env files

## Agent Rules (18 Rules Enforced)

| # | Rule | Prevents |
|---|------|----------|
| 1 | **PORT MANAGEMENT** | Port-hopping, config chaos |
| 2 | **ASK WITH OPTIONS** | Blind assumptions |
| 3 | **ONE FEATURE AT A TIME** | Scattered incomplete work |
| 4 | **GIT DISCIPLINE** | Lost work, messy history |
| 5 | **SESSION BOUNDARIES** | Context loss between sessions |
| 6 | **NO SERVER STARTUP** | Runaway processes |
| 7 | **USE EXISTING TOOLS** | Jest↔Vitest, Puppeteer↔Playwright switches |
| 8 | **FOLLOW EXISTING PATTERNS** | Style inconsistencies |
| 9 | **TOKEN EFFICIENCY** | Context bloat, wasted tokens |
| 10 | **QUALITY OVER SPEED** | Lint/build/test failures |
| 11 | **NO FALLBACK CODE** | Hidden failures, masked bugs |
| 12 | **NO DEAD CODE** | Unused imports, variables, parameters |
| 13 | **VERIFY YOUR CLAIMS** | "Done" without testing |
| 14 | **DEVDEPENDENCIES** | Test libs in wrong place |
| 15 | **NO HARDCODED VALUES** | Magic numbers, hardcoded colors |
| 16 | **NO OVER-ENGINEERING** | Unnecessary abstractions, premature optimization |
| 17 | **DO EXACTLY WHAT IS ASKED** | Scope creep, unrequested "improvements" |
| 18 | **INTEGRATION TESTS ONLY** | Unit tests, mocks, testing implementation details |

## Asking Questions (No Assumptions)

When the agent encounters ambiguity, it must:
1. Research existing code and patterns
2. Present options with pros/cons
3. Give a recommendation
4. Wait for user answer

Example format in `harness/questions.md`:
```markdown
## Q: Which authentication approach should we use?
**Context:** Found existing JWT setup in /lib/auth.ts but requirements mention "social login"
**Options:**
- **Option A:** Extend existing JWT with OAuth - Pros: keeps current code, Cons: more complex
- **Option B:** Switch to NextAuth.js - Pros: built-in social, Cons: migration effort
- **Option C:** Add social as separate flow - Pros: no migration, Cons: two auth systems
**My recommendation:** Option A - minimal disruption, follows existing patterns
**Blocks:** F003, F004
```

## Do Exactly What Is Asked - Nothing More

**Only implement what is explicitly requested. No extras.**

```
Request: "Add a logout button to the navbar"

WRONG approach:
✓ Add logout button
✗ Also refactor the navbar component
✗ Also add comments explaining auth flow
✗ Also create a useAuth hook
✗ Also add loading states "for better UX"

RIGHT approach:
✓ Add logout button
✓ Done.
```

If you see other issues, note them in `questions.md` for later - don't fix them now.

## No Over-Engineering

The agent is explicitly forbidden from:
- Abstract base classes "for future flexibility"
- Factory patterns for single implementations
- Dependency injection containers for simple apps
- Configuration options that aren't required
- "Plugin architectures" for one plugin
- Building for hypothetical future requirements

**Required mindset:**
- 3 lines of duplicated code > 1 clever abstraction
- Direct code > indirect code
- Boring code > clever code
- If unsure whether a feature is needed, don't build it

## Integration Tests Only - No Mocks

**Forbidden:**
```javascript
// NO unit tests
test('calculateTotal returns sum', () => {...})

// NO mocking
jest.mock('./database')
vi.mock('./api')
sinon.stub(service, 'method')
```

**Required - Real integration tests:**
```javascript
test('user can complete checkout', async () => {
  // Real database, real API, real browser
  await page.goto('/cart')
  await page.click('[data-testid="checkout"]')
  await page.fill('#card-number', '4242424242424242')
  await expect(page.locator('.confirmation')).toBeVisible()

  // Verify in real database
  const order = await db.orders.findFirst({ where: { status: 'completed' }})
  expect(order).toBeTruthy()
})
```

**Why:** Mocks test your assumptions, not your code. Unit tests break on refactoring but miss real bugs. Integration tests catch problems users would actually hit.

## No Fallback Code (Critical)

A [well-documented agent problem](https://www.seangoedecke.com/agents-and-fallbacks/) - agents write backup code that masks whether the real implementation works:

```javascript
// BAD - hides whether complexAlgorithm actually works
try {
  result = complexAlgorithm(data);
} catch {
  result = data.sort(); // Fallback masks the real failure!
}

// GOOD - fails visibly, forces you to fix the real issue
result = complexAlgorithm(data);
```

The harness explicitly forbids fallback code. If something doesn't work, **fix it** - don't hide it.

## Token Efficiency

Context windows and tokens are expensive. The harness enforces:

**DO:**
- Read only files you need (not entire directories)
- Use grep/search to find relevant code, then read specific sections
- Keep progress.md entries concise (3-5 bullet points)
- Summarize findings instead of dumping full contents

**DON'T:**
- Read the same file multiple times in one session
- Dump entire file contents when you only need a few lines
- Include full stack traces - just the relevant error
- Repeat information already in harness files

## Quality Over Speed

The agent is explicitly told: **"You have ample time. There is NO RUSH."**

**Zero tolerance for:**
- Lint errors
- Build failures
- Type errors
- Failing tests
- Console errors

**Before marking ANY feature "passing":**
```bash
npm run lint   # Must pass
npm run build  # Must pass
npm run test   # Must pass
```

**Mindset enforced:**
- Slow is smooth, smooth is fast
- One properly working feature > three broken features
- 10 minutes fixing now > 2 hours debugging later

## Tool & Library Detection

The generator auto-detects existing tools and includes them in AGENTS.md/CLAUDE.md:

**Testing tools detected:**
- Test runners: vitest, jest, mocha, ava, node:test
- E2E: playwright, puppeteer, cypress
- Mocking: sinon, nock, msw
- React: @testing-library/react, enzyme

**Utility libraries detected:**
- HTTP: axios, got, node-fetch
- Dates: date-fns, dayjs, moment
- Validation: zod, yup, joi
- State: zustand, redux, mobx
- CSS: tailwind, styled-components, emotion

The generated files will include:
```markdown
## Existing Test Setup (USE THESE - DO NOT ADD ALTERNATIVES)
- **vitest** (already installed)
- **@testing-library/react** (already installed)

**You MUST use these tools. Do NOT add alternatives.**
```

## Feature Status Values

| Status | Meaning |
|--------|---------|
| `failing` | Not yet implemented |
| `in_progress` | Currently being worked on |
| `passing` | Implemented and verified |

## How It Works

1. **AGENTS.md / CLAUDE.md** - Agent reads its instruction file automatically
2. **harness/features.json** - Tracks what to build and current status
3. **harness/progress.md** - Session handoff log (append-only)
4. **harness/config.json** - Ports and URLs (agent won't modify)
5. **harness/questions.md** - Blocking questions with researched options

The agent:
1. Reads instruction file (automatic)
2. Checks progress.md to understand current state
3. Picks next "failing" feature from features.json
4. If unclear → researches and asks with options in questions.md
5. Implements feature, verifies it works (lint/build/test)
6. Updates status to "passing", commits
7. Continues to next feature

## Greenfield vs Brownfield

| Project Type | What Happens |
|--------------|--------------|
| **Greenfield** | All features start as "failing", agent builds from scratch |
| **Brownfield** | Agent analyzes existing code, marks done features as "passing", only builds what's missing, follows existing patterns |

## Based On

Research and best practices from:
- [Effective Harnesses for Long-Running AI Coding Agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents) (Anthropic)
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices) (Anthropic)
- [Writing a Good CLAUDE.md](https://www.humanlayer.dev/blog/writing-a-good-claude-md) (HumanLayer)
- [Improve Your AI Code Output with AGENTS.md](https://www.builder.io/blog/agents-md) (Builder.io)
- [AI Coding Agents Rely Too Much on Fallbacks](https://www.seangoedecke.com/agents-and-fallbacks/) (Sean Goedecke)
- [Codex CLI Documentation](https://developers.openai.com/codex/cli/)
- [AGENTS.md Standard](https://agents.md)

Key patterns applied:
- Dual agent support (Codex + Claude Code)
- JSON feature list (harder to corrupt)
- Explicit test procedures
- Session logs for context handoff
- Strict port management rules
- "Ask with options" instead of assuming
- Auto-detect existing tools (no reinventing)
- No fallback code (don't mask failures)
- Token efficiency (concise context)
- Quality over speed (zero tolerance for failures)
