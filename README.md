# FundForge Backend API

A production-ready, scalable REST API for the **FundForge** crowdfunding platform.

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 18+ |
| Framework | Express.js |
| Language | TypeScript (strict) |
| ORM | Prisma 5 |
| Database | PostgreSQL (NeonDB / Supabase / Local) |
| Auth | Firebase Admin SDK |
| Password Hashing | bcryptjs |

---

## Project Structure

```
e:/prisma/
├── prisma/
│   ├── schema.prisma        # 6 models, 4 enums
│   └── seed.ts              # Seeds categories + admin user
├── src/
│   ├── app.ts               # Express app, middleware, routes
│   ├── server.ts            # HTTP server entry point
│   ├── lib/
│   │   └── prisma.ts        # Singleton Prisma client
│   ├── middleware/
│   │   ├── auth.ts          # Firebase token verification + role guards
│   │   └── errorHandler.ts  # Global error handler + asyncHandler
│   ├── routes/              # Thin route handlers (7 modules)
│   ├── services/            # Business logic (7 modules)
│   └── types/
│       └── index.ts         # Shared transformers (_id aliasing)
├── .env                     # Configuration (fill in your values)
├── package.json
└── tsconfig.json
```

---

## Database Schema

```
User         (users)         — uid, name, email, role, credits, isDeleted
Category     (categories)    — name, slug, iconName, color, description, isDeleted
Campaign     (campaigns)     — title, story, fundingGoal, status, isDeleted
Contribution (contributions) — amount, status (escrow flow), isDeleted
Review       (reviews)       — rating 1-5, comment, isDeleted
Notification (notifications) — title, message, type, read, isDeleted
```

**Enums:** `Role`, `CampaignStatus`, `ContributionStatus`, `NotificationType`

---

## Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Edit `.env` and fill in:
```env
DATABASE_URL="postgresql://user:pass@host:5432/fundforge"
FIREBASE_SERVICE_ACCOUNT_BASE64="<base64 encoded service account JSON>"
JWT_SECRET="your-secret-key"
CLIENT_URL="http://localhost:3000"
```

**Getting Firebase Service Account:**
1. Firebase Console → Project Settings → Service Accounts
2. Click "Generate new private key" → downloads JSON
3. Encode it:
   ```powershell
   [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("serviceAccountKey.json"))
   ```
4. Paste the result into `FIREBASE_SERVICE_ACCOUNT_BASE64`

### 3. Run Database Migration
```bash
npx prisma migrate dev --name init
```

### 4. Seed Database
```bash
npx prisma db seed
```
Seeds 10 categories and an admin user.

### 5. Open Prisma Studio (Optional)
```bash
npx prisma studio
```
Launches a visual DB browser at http://localhost:5555

### 6. Start Development Server
```bash
npm run dev
```
Server runs at **http://localhost:5000**

---

## API Modules

| Module | Endpoints | Auth |
|---|---|---|
| Auth | POST /api/auth/register, /google | Firebase token |
| Users | GET/PUT/DELETE /api/users | Mixed |
| Categories | GET/POST/PUT/DELETE /api/categories | Mixed |
| Campaigns | GET/POST/PUT/PATCH/DELETE /api/campaigns | Mixed |
| Contributions | GET/POST/PATCH /api/contributions | Required |
| Reviews | GET/POST/PUT/DELETE /api/reviews | Mixed |
| Notifications | GET/PATCH/DELETE /api/notifications | Required |

---

## Scripts

```bash
npm run dev          # Start dev server (hot reload)
npm run build        # Compile TypeScript → dist/
npm run start        # Run compiled production server
npm run prisma:migrate   # Run migrations
npm run prisma:studio    # Open Prisma Studio
npm run prisma:seed      # Seed the database
```

---

## Frontend Integration

The Next.js frontend at `e:/assignment-11` connects to this backend at `http://localhost:5000`.

All API calls are made via `src/lib/api.js` which automatically injects the Firebase JWT token as `Authorization: Bearer <token>`.

The backend returns `_id` as an alias for all `id` fields to maintain frontend compatibility.
