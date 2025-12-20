# Repository Guidelines

## Project Structure & Module Organization
- `frontend/` hosts the Vite + React UI; source lives under `frontend/src/` (components, pages, context, hooks, styles) and is built independently via its own package scripts.  
- `backend/` contains the Express API, SQLite helpers, migrations/seeds in `backend/db/`, and nightly helper scripts under `backend/scripts/`.  
- Shared orchestration scripts, Terraform configs for SMS/SES, and harness artifacts live in `scripts/`, `Terraform/`, and `harness/` respectively; treat `scripts/ui/` as the entry point for Puppeteer-based regression checks.  
- Root-level helpers (`init.sh`, `package.json`, `package-lock.json`, `node_modules/`) coordinate the monorepo commands.

## Build, Test, and Development Commands
- `npm run dev` (root) boots both servers with `concurrently`; ports are standardized to 3173/5173 unless overridden.  
- `npm run dev:test` spins up isolated ports (3174/5174) plus a separate `database.test.sqlite` for automation.  
- `npm run build` runs `npm run build --prefix frontend` then backend build stub to ensure both halves compile.  
- `npm run db:init|seed|reset` execute backend scripts to recreate schema + data; specify `DATABASE_PATH=database.test.sqlite` before `db:reset` to reset the test stack.  
- UI automation suites: `npm run ui:test:smoke`, `ui:test:whatsapp`, `ui:test:email`, `ui:test:settings`, `ui:test:contacts`, `ui:test:all`, and template helpers under `scripts/manual-tests` or `scripts/api/*`.  
- `npm run api:test:workflow` / `api:test:sse` / `api:test:send-webhooks` run targeted API smoke scripts; these require the backend running and the relevant `.env` (see `backend/.env.example`).

## Coding Style & Naming Conventions
- Use two-space indentation, omit semicolons, and lean on ES module defaults in the frontend while keeping the backend CommonJS (`require`/`module.exports`).  
- PascalCase for React components/pages (e.g., `Homepage`, `DashboardPage`) and camelCase for hooks/utilities; suffix route handlers or controller files with their responsibility (e.g., `contactRoutes.js`, `campaignController.js`).  
- Run `eslint src` inside `frontend/` or `backend/` before sending changes; both directories ship `.eslintrc.json` configs with `eslint:recommended` (frontend extends `plugin:react/recommended`).

## Testing Guidelines
- Manual test suites reside in `scripts/ui/*.js`; run `npm run ui:test:<name>` from the root after starting both servers (or use `dev:test` for isolated infrastructure).  
- API/webhook sanity checks under `scripts/api/` expect the backend to be live; point `BASE_URL` to the target when rerunning (e.g., `BASE_URL=http://localhost:3174 npm run ui:test:smoke`).  
- Naming: script files pair with the feature they exercise (e.g., `whatsapp-campaign.js`, `settings-templates.js`); keep new JS helpers aligned with this verbal mapping.

## Commit & Pull Request Guidelines
- Commits blend conventional prefixes (`feat:`, `chore:`) with plain sentences (e.g., `Redesign Usage page with professional layout…`); use the pattern that best clarifies scope while staying concise.  
- Provide PR descriptions that summarize the change, list any manual steps/scripts run (especially UI automation), link relevant issues, and attach screenshots for UI adjustments.  
- Tag backend configuration touches and automation scripts explicitly so reviewers can rerun the same commands (e.g., “Added `scripts/api/metrics-sse` helper and tested with `npm run api:test:sse`).

## Configuration & Automation Tips
- Both `frontend/.env` and `backend/.env` are required locally; copy from the provided `.env.example` files and keep secrets out of Git.  
- Ports are fixed to 3173 (frontend) and 5173 (backend) unless you intentionally start the isolated stack on 3174/5174; adjust `FRONTEND_PORT`, `BACKEND_PORT`, and `DATABASE_PATH` environment variables accordingly.  
- Reuse `init.sh` when onboarding new environments: it installs dependencies, seeds SQLite, and prints test credentials for quick access.
