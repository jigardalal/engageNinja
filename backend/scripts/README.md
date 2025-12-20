# Backend Scripts

Utility scripts for database initialization, seeding, and management. These are **setup/maintenance scripts**, not tests.

## Scripts

### Database Setup & Maintenance

- **`db-init.js`** - Initialize database schema
  ```bash
  node scripts/db-init.js
  ```
  - Creates database file if doesn't exist
  - Runs all migrations from `db/migrations/`
  - Sets up initial schema

- **`db-reset.js`** - Reset database to clean state
  ```bash
  node scripts/db-reset.js
  ```
  - Deletes all data
  - Keeps schema intact
  - Use for testing/development cleanup

- **`db-seed.js`** - Populate database with test data
  ```bash
  node scripts/db-seed.js
  ```
  - Creates test users with diverse roles:
    - Owner: admin@engageninja.local
    - Admin: user@engageninja.local
    - Member: member@engageninja.local
    - Viewer: viewer@engageninja.local
    - Platform Admin: platform.admin@engageninja.local
  - Creates test tenants (Demo, Beta)
  - Creates tags, contacts, usage counters
  - Configures channel settings
  - **Idempotent**: safe to run multiple times

## Usage Workflow

### First Time Setup
```bash
# 1. Initialize database schema
node scripts/db-init.js

# 2. Seed with test data
node scripts/db-seed.js

# 3. Start the backend
npm run dev
```

### For Development/Testing
```bash
# Clean slate without rebuilding schema
node scripts/db-reset.js

# Reseed with test data
node scripts/db-seed.js

# Test with fresh data
npm run dev
```

### For Production
- `db-init.js` runs automatically on server startup
- Other scripts should not be used in production
- Use proper database migrations for schema changes

## Test Data Generated

When you run `db-seed.js`:

### Users (with roles)
| Email | Password | Role | Tenants |
|-------|----------|------|---------|
| admin@engageninja.local | AdminPassword123 | Owner (Demo), Admin (Demo) | Demo, Beta |
| user@engageninja.local | UserPassword123 | Admin (Demo), Owner (Beta) | Demo, Beta |
| member@engageninja.local | MemberPassword123 | Member (Demo) | Demo |
| viewer@engageninja.local | ViewerPassword123 | Viewer (Demo) | Demo |
| platform.admin@engageninja.local | PlatformAdminPassword123 | platform_admin | Demo (admin role) |

### Tenants
- **Demo Tenant** - Growth plan
- **Beta Tenant** - Starter plan

### Connections
- 8 user-tenant associations with role hierarchy
- Multi-tenant users for testing tenant switching
- Owner protection (each tenant has at least one owner)

### Additional Data
- 5 tags (vip, newsletter, active, new, beta_tester)
- 3 sample contacts per tenant
- Monthly usage counters
- WhatsApp channel configuration
- Email/SES channel configuration

## Notes

### Idempotency
- All scripts are safe to run multiple times
- Existing data is preserved (not overwritten)
- Only creates missing records

### Database Path
- Default: `./database.sqlite` (relative to backend directory)
- Override via `DATABASE_PATH` environment variable

### Encryption
- Credentials are encrypted using `ENCRYPTION_KEY` env var
- Default key: 'default-dev-key-change-in-production'
- **IMPORTANT**: Change in production!

## Integration with Testing

For testing workflows, see: `backend/tests/README.md`

Tests rely on data from `db-seed.js`:
- Verification scripts check if test data exists
- Manual tests use provided credentials
- Jest tests need seeded database

## Troubleshooting

### Database Lock
```bash
# If database is locked
rm database.sqlite
node scripts/db-init.js
node scripts/db-seed.js
```

### Missing Schema
```bash
# Ensure migrations are applied
node scripts/db-init.js
```

### Test Data Inconsistent
```bash
# Reseed test data
node scripts/db-seed.js
```

---

**Last Updated**: 2025-12-16
**Status**: Production Ready
