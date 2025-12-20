# EngageNinja - WhatsApp-First Customer Engagement Platform

EngageNinja is an AI-first, WhatsApp-first customer engagement platform for WhatsApp-heavy SMBs and teams who manage messaging at scale.

## Features

- **WhatsApp-First UX**: Optimized for WhatsApp messaging, not retrofitted from email
- **AI-Powered Campaigns**: Optional AI message generation using Claude API
- **One-Click Resend**: Easily resend campaigns to non-readers
- **ROI Tracking**: Built-in uplift and ROI proof snapshots
- **Multi-Tenant**: Full support for multi-tenant access via user-to-tenant associations
- **Real-Time Updates**: Server-Sent Events (SSE) for live message status updates
- **Multiple Channels**: Support for WhatsApp and Email (SES, Brevo)

## Project Status

✅ **MVP 100% COMPLETE (All 20 Features)** - Production-Ready
- Database schema with 16 fully-normalized tables
- User authentication (signup/login with session management)
- Contact management (CRUD + CSV import/export)
- Campaign management (create, send, resend with uplift tracking)
- Real-time metrics via Server-Sent Events (SSE)
- WhatsApp integration (Meta Cloud API)
- Email integration (AWS SES + Brevo)
- Multi-tenant architecture with role-based access
- Enterprise-grade security (encryption, rate limiting, validation)
- Production-ready code quality with comprehensive error handling

📚 **Documentation**:
- See `SESSION_26_SUMMARY.md` for latest verification & port configuration fixes
- See `SESSION_25_SUMMARY.md` for complete project documentation
- See `PROJECT_STATUS.md` for historical context
- See `HANDOFF_GUIDE.md` for development guidelines

## Quick Start

### Prerequisites

- Node.js v18+
- npm or pnpm
- SQLite3 (for development)

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
   - Initialize the SQLite database with schema and seed data
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
- **Database**: SQLite (MVP) / PostgreSQL (Production)
- **Authentication**: Email + Password with bcrypt
- **Session Management**: HTTP-only cookies
- **Streaming**: Server-Sent Events (SSE)
- **API**: REST (GraphQL planned for Phase 2)

### External Services
- **WhatsApp**: Meta WhatsApp Cloud API
- **Email**: Amazon SES (primary), Brevo (optional)
- **AI**: Anthropic Claude API
- **Auth**: Email/Password (Auth0 Phase 2+)

## Development Workflow

### Environment Variables

Create `.env` files in both frontend and backend directories:

**backend/.env** (from .env.example):
```
DATABASE_PATH=./database.sqlite
PORT=5173
NODE_ENV=development
```

### Database

**Initialize/reset database:**
```bash
cd backend
npm run db:init      # Create schema + seed data
npm run db:seed      # Re-seed data only
npm run db:verify    # Verify seed data
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

- `POST /api/auth/signup` - Register new user
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
- `POST /api/settings/channels/email` - Configure Email
- `POST /api/settings/channels/whatsapp/sync-templates` - Sync WhatsApp templates

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
