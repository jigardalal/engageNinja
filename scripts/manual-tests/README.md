# Manual Test Scripts

Ad-hoc scripts for quick API checks against the dev servers.

## Ports
- Frontend: http://localhost:3173
- Backend: http://localhost:5173

## Scripts
- `test-backend-health.js` – checks /health and login flow
- `test-basic.js` – health check only
- `test-5173-correct.js` / `test-5173-cors.js` – login/CORS against backend 5173
- `test-login.js`, `test-login-verify.js`, `test-login-response.js`, `test-login-verbose.js`, `test-auth-manual.js` – login helpers
- `test-campaign-create.js`, `test-endpoint-exists.js`, `test-settings-api.js` – CRUD/API spot checks
- `test-cors-login.js` – proxy/CORS via frontend
- `test-webhooks.js`, `test-webhook-integration.js` – webhook endpoints
- `test-metrics-api.js` – campaign metrics

Most scripts assume cookies from login; run them one at a time from this directory, e.g.:
```bash
cd scripts/manual-tests
node test-backend-health.js
```

Preferred flow: use `test-backend-health.js` for quick sanity; others are legacy/debug helpers.
