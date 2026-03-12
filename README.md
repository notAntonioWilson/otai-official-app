# OTAI App

Multi-role business management platform by OTAI Systems.

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment
Copy `.env.example` to `.env.local` and fill in your Supabase credentials.
(If deploying to Vercel, add these as environment variables in the Vercel dashboard.)

### 3. Set up database
Run the schema migration in Supabase SQL Editor:
- `supabase/migrations/001_initial_schema.sql`

### 4. Create users
Run the seed script (requires Node.js):
```bash
npx tsx scripts/seed-users.ts
```
Or create users manually in the Supabase Auth dashboard.

### 5. Seed data
Run the seed data SQL in Supabase SQL Editor:
- `supabase/migrations/002_seed_data.sql`

### 6. Run locally
```bash
npm run dev
```

### 7. Deploy
Push to GitHub. Connect to Vercel. Set environment variables. Deploy.

## Users

| Username | Email | Role |
|----------|-------|------|
| professional_ | owner@otaisystems.com | Owner |
| Chad | coo@otaisystems.com | Marketing |
| TonyG$ | anthonyjjaugugliaro@gmail.com | Sales Rep |
| N3xtlvl | Nextlvlcarpentry@hotmail.com | Client |
| Jzar | jazhome2015@gmail.com | Client |
| TonyB | tonyberdych@gmail.com | Client |
| DarrickG | bigspenda84@icloud.com | Client |
| MohkhanC$ | mokhan@mokhancapital.com | Client |

## Tech Stack
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Deployment**: Vercel
- **Domain**: otaiapp.com
