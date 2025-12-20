# TODO - EngageNinja Spec Compliance & UI Overhaul

## UX & Design System
- [ ] Establish design tokens (colors, typography, spacing) and Tailwind config
- [ ] Introduce shadcn component set (buttons, inputs, cards, modals, tables, alerts, nav)
- [ ] Create unified app shell (header/sidebar/footer) and apply to all app pages
- [ ] Build marketing site (hero, value props, CTA, pricing, FAQ, footer)

## Core Product Features
- [ ] Campaign creation: multi-step flow (channel → audience → template/message → review/send) with validation
- [ ] AI message generation via Claude; persist to ai_generation_logs; UI hook “Generate with AI”
- [ ] Real sending: Meta WhatsApp + SES/Brevo wiring; credential validation; error surfacing
- [ ] Resend to non-readers UI wired to backend resend logic; enforce cooldown/usage limits
- [ ] Real-time metrics: frontend SSE subscription for campaign metrics/status badges
- [ ] ROI/uplift snapshots: backend query + UI report/card
- [ ] Tenant switching UI for users with multiple tenants

## Integrations & Settings
- [ ] WhatsApp: credential validation call, template sync UX, store provider IDs; webhook signature verification
- [ ] Email: SES/Brevo connect/disconnect with verified sender enforcement; status display
- [ ] Webhooks: verify signatures (Meta/SES), persist events, propagate statuses to UI

## Testing
- [ ] Expand Puppeteer coverage: login, dashboard, contacts CRUD, campaign create/send, settings connect/disconnect, resend flow, SSE metrics
- [ ] API tests for send paths, webhooks, AI generation endpoints

## Housekeeping
- [ ] Normalize scripts/docs to fixed ports (3173/5173) and remove dead legacy references
- [ ] Improve app-level error handling and loading states across pages
