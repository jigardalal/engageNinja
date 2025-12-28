# EngageNinja Documentation

Consolidated documentation for the EngageNinja platform. Keep root directory clean by referencing docs here.

## Quick Navigation

### Getting Started
- **[README.md](../README.md)** - Main project overview, quick start, and API reference
- **[CLAUDE.md](../CLAUDE.md)** - Instructions for Claude Code when working on this codebase
- **[CURRENT_STATUS.md](../CURRENT_STATUS.md)** - Latest project status and configuration

### Development
- **[BACKEND_SCRIPTS.md](./BACKEND_SCRIPTS.md)** - Database setup and maintenance scripts (db-init, db-seed, db-reset)
- **[TESTING.md](./TESTING.md)** - Backend testing infrastructure (RBAC, integration, database tests)
- **[DATABASE.md](./DATABASE.md)** - Database schema, migrations, and relationships

### Design & UI
- **[DESIGN.md](./DESIGN.md)** - Design system, components, typography, colors, spacing
- **[UI_AUTOMATION.md](./UI_AUTOMATION.md)** - Puppeteer-based UI automation test scripts
- **[TEST_COVERAGE.md](./TEST_COVERAGE.md)** - UI automation test coverage overview

### Deployment & Infrastructure
- **[../Terraform/](../Terraform/)** - AWS infrastructure as code and deployment guides

### Verification & Quality
- **[VERIFICATION.md](./VERIFICATION.md)** - Webhook signature verification and testing

---

## File Organization

```
docs/
├── README.md                  # This file
├── DATABASE.md               # Database schema & migrations
├── BACKEND_SCRIPTS.md        # DB setup/maintenance scripts
├── DESIGN.md                 # Design system
├── TESTING.md                # Testing infrastructure
├── UI_AUTOMATION.md          # UI automation tests
├── TEST_COVERAGE.md          # Test coverage
└── VERIFICATION.md           # Webhook verification
```

---

## Key Documentation Files (Root Level)

These remain in the root because they're entry points:

- **README.md** - Project overview, setup, and API docs
- **CLAUDE.md** - Instructions for Claude Code (AI assistance)
- **CURRENT_STATUS.md** - Latest session status and configuration

---

## For AI Assistance

If you're using Claude Code (`/claude-code`), the configuration file is:
- **CLAUDE.md** - Contains all necessary context for Claude to understand the codebase

This replaces the need for multiple scattered documentation files that would clutter the codebase and confuse AI readers.

---

**Last Updated**: December 28, 2025
**Status**: Clean, organized, and ready for development
