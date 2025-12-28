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
- **[VERIFICATION.md](./VERIFICATION.md)** - Webhook signature verification and testing

### Planning & Roadmap
- **[planning/DESIGN_REDESIGN_PLAN.md](./planning/DESIGN_REDESIGN_PLAN.md)** - Frontend design system redesign implementation plan

### Deployment & Infrastructure
- **[../Terraform/ENGAGENINJA_AWS_SETUP_GUIDE.md](../Terraform/ENGAGENINJA_AWS_SETUP_GUIDE.md)** - Comprehensive AWS infrastructure setup, deployment, and configuration
- **[../Terraform/README.md](../Terraform/README.md)** - Terraform scaffold overview
- **[../Terraform/AWS_QUICK_REFERENCE.md](../Terraform/AWS_QUICK_REFERENCE.md)** - Quick reference for AWS credentials and configuration

---

## File Organization

```
docs/
├── README.md                           # This file
├── DATABASE.md                         # Database schema & migrations
├── BACKEND_SCRIPTS.md                  # DB setup/maintenance scripts
├── DESIGN.md                           # Design system
├── TESTING.md                          # Testing infrastructure (backend + UI automation)
├── VERIFICATION.md                     # Webhook verification
└── planning/
    └── DESIGN_REDESIGN_PLAN.md         # Design system redesign plan
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

## Recent Changes (December 28, 2025)

- **Consolidated docs**: Merged testing docs into TESTING.md, merged Terraform guides, organized planning docs
- **Removed UI testing**: Deleted outdated Puppeteer-based UI tests from `/scripts/ui/`, `/scripts/e2e/`, `/scripts/api/`, `/scripts/manual-tests/`, `/scripts/verification/`
- **Cleaned package.json**: Removed UI test scripts and puppeteer-core dependency
- **Cleaner structure**: Reduced documentation from 9 to 6 docs/ files, removed 50+ test files

---

**Last Updated**: December 28, 2025
**Status**: Consolidated, organized, and ready for development
