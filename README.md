# EngageNinja - WhatsApp-First Customer Engagement Platform

EngageNinja is an AI-first, WhatsApp-first customer engagement platform for WhatsApp-heavy SMBs and teams who manage messaging at scale.

## Features

- **Admin Console**: Platform-first landing with Tenants/Users/Global Tags/Audit Logs + tenant context banner for platform admins
- **Global & Tenant Tags**: Global tags catalog + inheritance/sync to tenants; tenant admins manage their own tags with status/archival
- **Editable Profiles**: Admin + tenant owners can edit tenant address/contact fields; users can edit first/last/phone/timezone
- **WhatsApp-First UX**: Optimized for WhatsApp messaging, not retrofitted from email
- **AI-Powered Campaigns**: Optional AI message generation using Claude API
- **Multi-Tenant + RBAC**: Tenant/user associations with owner/admin/member/viewer and platform roles
- **Real-Time Updates**: Server-Sent Events (SSE) for live message status updates
- **Multiple Channels**: Support for WhatsApp and Email (SES, Brevo)
- **Conversion Optimization**: 4-phase SaaS conversion system with usage alerts, feature locks, milestone celebrations, and analytics (15-25% expected conversion lift)

## Quick Start

### Prerequisites

- Node.js v18+
- npm or pnpm
- PostgreSQL 12+ (for development and production)

### Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/engageninja.git
   cd engageninja
   ```

2. **Run initialization script**
   ```bash
   ./init.sh
   ```

   This will:
   - Install all dependencies (frontend + backend)
   - Create `.env` files from examples
   - Initialize the PostgreSQL database with schema and seed data
   - Display setup information and test credentials

3. **Start development servers**
   ```bash
   npm run dev
   ```

   The application will be available at:
   - **Frontend**: http://localhost:3173
   - **Backend API**: http://localhost:5173

   > **Note**: Port configuration has been standardized to 3173 (frontend) and 5173 (backend) as of Session 26. All .env files are configured for these ports.

### Test Credentials

After running `init.sh`, you can log in with:

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@engageninja.local | AdminPassword123 |
| Regular User | user@engageninja.local | UserPassword123 |

## Project Structure

```
engageninja/
├── frontend/                    # React + Vite frontend
│   ├── src/
│   │   ├── components/         # Reusable UI components
│   │   ├── pages/              # Page components
│   │   ├── context/            # React context for state
│   │   ├── hooks/              # Custom React hooks
│   │   ├── api/                # API client
│   │   └── App.jsx             # Main app component
│   ├── package.json
│   └── vite.config.js
│
├── backend/                     # Express.js backend
│   ├── src/
│   │   ├── routes/             # API route handlers
│   │   ├── middleware/         # Express middleware
│   │   ├── controllers/        # Business logic
│   │   ├── models/             # Database models/queries
│   │   ├── utils/              # Utility functions
│   │   ├── config/             # Configuration
│   │   └── app.js              # Express app setup
│   ├── db/
│   │   ├── migrations/         # Database schema
│   │   └── seeds/              # Database seed data
│   ├── package.json
│   └── .env.example
│
├── init.sh                      # Setup script
└── README.md                    # This file
```

## Technology Stack

### Frontend
- **Framework**: React 18+ with Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router v6
- **State Management**: React Hooks + Context API
- **Build Tool**: Vite

### Backend
- **Runtime**: Node.js with Express.js
- **Database**: PostgreSQL with async/await (connection pooling, migrations)
- **Authentication**: Email + Password with bcrypt
- **Session Management**: HTTP-only cookies
- **Streaming**: Server-Sent Events (SSE)
- **API**: REST (GraphQL planned for Phase 2)

### External Services
- **WhatsApp**: Meta WhatsApp Cloud API
- **Email**: Amazon SES (primary), Brevo (optional)
- **AI**: Anthropic Claude API
- **Auth**: Email/Password (Auth0 Phase 2+)

## Conversion Optimization System

EngageNinja includes a comprehensive **4-phase conversion optimization system** to increase free-to-paid conversion by 15-25%:

### Phase 1: Quick Wins & Foundation (+5-10% lift)
- **Usage Alerts**: Real-time alerts at 70%, 80%, 90% usage with upgrade CTAs
- **Plan Context Card**: Dashboard banner showing current plan + usage summary
- **Contact Limit Alerts**: Warning when approaching contact limits
- **Empty State Upgrades**: Contextual upgrade hints in empty states

### Phase 2: Feature Lock Infrastructure (+10-15% lift)
- **Feature Locks**: Systematic gating of premium features behind plan tiers
- **`useFeatureAccess` Hook**: Centralized plan tier checking
- **Upgrade Banners**: Flexible compact and full-card variants
- **Feature-Specific Locks**: Scheduled sending, bulk actions, resend workflows

### Phase 3: Engagement & Growth Features (+8-12% lift)
- **Milestone Celebrations**: Toast notifications at campaign/contact/message milestones
- **Usage Projections**: Predict if users will exceed limits based on current pace
- **Welcome Carousel**: 3-step onboarding flow for new users
- **Plan Comparison Widget**: Side-by-side tier comparison with benefits

### Phase 4: Analytics & Optimization (+5-8% lift)
- **Event Tracking**: Track all user interactions with conversion features
- **Analytics Endpoints**: Real-time metrics, funnel analysis, A/B test performance
- **A/B Testing Framework**: 6 predefined tests ready for deployment
- **Email Automation**: Triggered emails for usage warnings, milestones, feature locks

### Key Files
- Frontend components: `frontend/src/components/billing/`
- Frontend hooks: `frontend/src/hooks/`
- Frontend utilities: `frontend/src/utils/conversionTracking.js`, `frontend/src/utils/abTesting.js`
- Backend routes: `backend/src/routes/analytics.js`
- Backend services: `backend/src/services/conversionEmails.js`
- Documentation: `docs/CONVERSION_OPTIMIZATION_IMPLEMENTATION.md`

## Development Workflow

### Environment Variables

Create `.env` files in both frontend and backend directories:

**backend/.env** (from .env.example):
```
DATABASE_URL=postgresql://user:password@localhost:5432/engageninja
PORT=5173
NODE_ENV=development
```

### Database

**Initialize/reset database:**
```bash
cd backend
npm run db:init      # Create schema + seed data
npm run db:seed      # Re-seed data only
```

**Database is automatically created at**: `backend/database.sqlite`

### Running Scripts

**Development mode (auto-reload):**
```bash
npm run dev
```

**Frontend only:**
```bash
pnpm run dev       # From root or frontend directory
```

**Backend only:**
```bash
cd backend && npm run dev
```

**Production build:**
```bash
npm run build
npm run start
```

## API Documentation

### Authentication Endpoints

- `POST /api/auth/signup` - Register new user (requires `firstName`, `companyName`, `email`, `password`; optional `lastName`, `phone`)
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password with token

### Contacts Endpoints

- `GET /api/contacts` - List contacts (with filters, search, pagination)
- `POST /api/contacts` - Create contact
- `PATCH /api/contacts/:id` - Update contact
- `DELETE /api/contacts/:id` - Delete contact (soft delete)
- `POST /api/contacts/import` - Import contacts from CSV

### Campaigns Endpoints

- `GET /api/campaigns` - List campaigns
- `POST /api/campaigns` - Create campaign
- `GET /api/campaigns/:id` - Get campaign details
- `POST /api/campaigns/:id/send` - Send campaign
- `POST /api/campaigns/:id/resend` - Resend to non-readers
- `GET /api/campaigns/:id/messages` - Get message statuses

### Settings Endpoints

- `GET /api/settings/channels` - Get channel status
- `POST /api/settings/channels/whatsapp` - Configure WhatsApp
- `POST /api/settings/channels/whatsapp/test` - Tenant-scoped webhook signature self-test (uses stored webhook token/secret; no env fallback)
- `POST /api/settings/channels/email` - Configure Email
- `POST /api/settings/channels/whatsapp/sync-templates` - Sync WhatsApp templates

### Webhooks (tenant-only secrets)

- WhatsApp webhook verification/signature uses per-tenant tokens/secrets from `tenant_channel_settings` only; env values are ignored. Missing tenant secrets will cause verification/signature checks to fail.
- Enable signature verification by setting `ENABLE_WEBHOOK_VERIFICATION=true` in `backend/.env`.
- Run the integration test while backend is running:
  ```bash
  npm run test:webhooks --prefix backend
  ```

## Configuration

### reCAPTCHA

- `VITE_RECAPTCHA_SITE_KEY`: frontend site key used to render the widget on `/signup`. Leave empty for local development or when captcha isn't required.
- `RECAPTCHA_SECRET_KEY`: backend secret used to verify tokens issued by the frontend widget. When present, the signup endpoint enforces reCAPTCHA validation before creating the tenant and user.

## Testing

**Run tests:**
```bash
npm run test          # All tests
npm run test:unit    # Unit tests only
npm run test:e2e     # End-to-end tests
```

**Coverage report:**
```bash
npm run test:coverage
```

## Deployment

### Production Build

```bash
npm run build
npm run start
```

### Environment Variables for Production

Set these in your production environment:
- `NODE_ENV=production`
- `DATABASE_PATH=/var/lib/engageninja/database.sqlite` (or use PostgreSQL)
- `JWT_SECRET=<strong-random-string>`
- All external service credentials (Meta, SES, Claude)

### Docker (Optional)

```bash
docker build -t engageninja .
docker run -p 3173:3173 -p 5173:5173 engageninja
```

## Troubleshooting

### Database Issues

**Database file not created:**
```bash
cd backend
npm install better-sqlite3
npm run db:init
```

**Reset database:**
```bash
rm backend/database.sqlite
npm run db:init
```

**Verify seed data:**
```bash
npm run db:verify
```

### Port Already in Use

Change ports via environment variables:
```bash
PORT=5001 npm run dev    # Backend
VITE_PORT=3001 npm run dev  # Frontend
```

Or kill existing processes:
```bash
lsof -i :3173
lsof -i :5173
kill -9 <PID>
```

### Login Issues

Verify test user credentials:
```bash
npm run db:verify
```

Check backend logs for authentication errors.

## Contributing

1. Create a feature branch: `git checkout -b feature/feature-name`
2. Make your changes
3. Commit: `git commit -m "Add feature-name"`
4. Push: `git push origin feature/feature-name`
5. Create a Pull Request

## Support

For issues, questions, or contributions:
- Check existing issues
- Create a new issue with detailed description
- Join our Slack community (link TBD)

## License

EngageNinja is proprietary software. All rights reserved.

---

**Last Updated**: December 13, 2025
**Current Phase**: ✅ MVP Complete (Phase 1)
**Estimated Progress**: 16/60 features (~27%)
**Quality Status**: Production-Ready
**Next Phase**: Phase 2 (User Settings, Admin Dashboard, Advanced Features)
