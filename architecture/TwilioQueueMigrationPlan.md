# Twilio + AWS Queue Migration Plan

## Context
- We currently send SMS/WhatsApp/Email directly from `backend/src/services/messageQueue.js` and rely on the in-process webhook handler.
- The migration doc (`ARCHITECTURE_TWILIO_MIGRATION.md`) calls for SQS + Lambda for every channel plus a shared webhook handler and stronger provider metadata.
- We now want to consolidate `tenant_channel_settings`, keep only SQLite, and seed the new metadata via `seed-twilio-sms.js` before pushing to AWS.

## Goals
1. Merge `tenant_channel_settings` and `tenant_channel_credentials_v2` into a single schema that carries encrypted credentials, webhook URL, messaging-service SID, and enable/verify flags.
2. Update the Twilio seed script, settings routes, campaign handlers, and provider factory to read/write the unified schema.
3. Transition sends for SMS/WhatsApp/Email onto AWS SQS → `SendCampaignMessage` Lambda → provider (Twilio/SES) → status updates (EventBridge/Lambda or webhooks) while keeping SSE updates.
4. Build an AWS webhook endpoint (API Gateway + Lambda) that verifies Twilio signatures and writes status updates back to the shared database.
5. Keep local dev flow (existing queue and webhook) as a flag until AWS path is production-ready.

## Phase 0 – Schema consolidation
1. Extend `backend/db/migrations/XXXX_tenant_channel_settings.sql` (or current schema file) with the new columns: `provider_config_json`, `messaging_service_sid`, `webhook_url`, `is_enabled`, `is_verified`, `verification_error`, `webhook_secret_encrypted`, credential blobs, etc.
2. Remove `tenant_channel_credentials_v2` (drop references in code/tests/migrations); add a migration that transfers any existing rows if needed.
3. Update `backend/scripts/seed-twilio-sms.js` to write into the consolidated table and include webhook/messaging service SID.
4. Adjust `backend/src/routes/settings.js`, `routes/campaigns.js`, `services/messaging/providerFactory.js`, and any other consumers to read the merged schema.
5. Add tests or scripts verifying the unified table works (e.g., seeding followed by campaign send using the new columns).

## Phase 1 – AWS Queue & Lambdas
1. Extend the Terraform stack inside `Terraform/` by:
   - Adding the `engageninja-messages-{var.environment}` outbound queue + DLQ in `engageninja-terraform-sqs.tf`, and output their URLs/ARNs.
   - Deploying a PostgreSQL RDS instance (`db.t3.micro`, free-tier compatible) and exporting its connection info for backend and Lambda environments.
   - Creating Node 18 Lambdas (`SendCampaignMessage`, `UpdateMessageStatus`, webhook handler) with the necessary IAM roles, environment variables, and triggers (SQS, EventBridge, API Gateway).
   - Routing `/webhooks/twilio` and `/webhooks/twilio/sms` through API Gateway to the webhook Lambda, exposing the endpoint URL as a Terraform output.
2. Implement `lambda/functions/send-campaign-message`: pull batches from SQS, decrypt credentials (shared `ENCRYPTION_KEY`), call the provider, update Postgres `messages`/`message_status_events`, and schedule EventBridge status updates before deleting the record from SQS.
3. Implement `lambda/functions/update-message-status`: executed by EventBridge (for mock statuses) and via the webhook Lambda, writes `delivered`/`read` updates, and notifies the backend SSE webhook so the UI reflects the new status.
4. Keep local development functional by mapping the same env vars to test queues or local emulators until the AWS path is stable.
5. Continue using the shared `ENCRYPTION_KEY` for both backend and Lambdas; later phases can adopt Secrets Manager/KMS if desired.

## Phase 2 – Webhook handling
1. Ensure the webhook Lambda validates the Twilio signature, looks up the `message` by `provider_message_id`, and writes explicit status updates into Postgres.
2. After persisting the update, call the backend’s webhook endpoint to reuse `metricsEmitter` for SSE delivery instead of building new pub/sub plumbing.
3. Only retire the legacy local webhook once the AWS handler reliably processes all callbacks.

## Phase 3 – Cutover & Validation
1. Introduce a feature flag (e.g., `USE_AWS_QUEUE`) to toggle between the local processor and the new AWS flow during rollout.
2. Run campaigns through the AWS pipeline, verify SSE metrics updates, and confirm delivery/read events appear in the UI.
3. Document Terraform redeploy steps, seeding instructions, and webhook URLs for each environment.

## Decisions
1. Use a PostgreSQL RDS instance (`db.t3.micro`) so backend and Lambdas share a hosted database; SQLite remains available for local development only.
2. Implement Phase 1 entirely inside the existing `Terraform/` workspace (dev stack) before copying the configuration to staging/prod.
3. Lambda status updates will call back to the backend’s webhook so the existing `metricsEmitter` can broadcast SSE notifications instead of building new realtime plumbing.
4. Keep using the shared `ENCRYPTION_KEY` env var for now; both backend and Lambdas decrypt credentials with the same key until we migrate to a secret manager.

## Open Questions
1. Lambda access to Postgres requires connection pooling; we’ll tune the pool size (e.g., 5 connections) and monitor for saturation.
2. Since we can reset/reseed the database, we don’t need to preserve old credentials—dropping/resetting is acceptable for dev/prod.
3. We’ll disable the local processor via a feature flag once the AWS path is reliable.

## Next steps
1. Phase 0 is complete (schema + seed consolidation and route/provider updates).
2. Implement Phase 1 Terraform/Lambda work inside `Terraform/` (SQS queue, Postgres RDS, IAM, Lambdas, API Gateway) and capture all outputs.
3. Build the Lambda logic/wehook handler so SQS → provider → Postgres updates trigger SSE notifications.
4. Proceed through Phases 2 and 3 once the AWS flow is live, then retire the local queue path.
