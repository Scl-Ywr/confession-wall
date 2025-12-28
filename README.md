This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Authentication

This application supports multiple authentication methods:

### Email/Password Authentication
- Traditional email and password registration
- Email verification required before login
- Password reset functionality
- Login attempt rate limiting (5 attempts per 15 minutes)
- Admin login with special privileges

### OAuth Social Login (via Logto)
- **Google** - Sign in with your Google account
- **GitHub** - Sign in with your GitHub account
- **WeChat (微信)** - Sign in with your WeChat account
- **QQ** - Sign in with your QQ account

OAuth accounts are automatically linked to existing email accounts when the email matches. All authentication is managed through a hybrid architecture:
- **Supabase Auth**: Handles email/password registration and login
- **Logto**: Handles third-party OAuth providers
- **Unified Session**: All auth methods create a Supabase session for consistent user management

### Security Features
- HTTP-only cookies for session tokens (防止 XSS 攻击)
- Row Level Security (RLS) on all database tables
- No tokens exposed in URLs or browser history
- Automatic session refresh every 5 minutes
- Online status tracking with heartbeat mechanism

### Setup OAuth Providers

For detailed instructions on configuring Logto and OAuth providers (Google, GitHub, WeChat, QQ), see [docs/LOGTO_SETUP.md](docs/LOGTO_SETUP.md).

Quick start:
1. Copy `.env.local.example` to `.env.local`
2. Fill in Logto credentials:
   ```bash
   NEXT_PUBLIC_LOGTO_ENDPOINT=https://your-tenant.logto.app
   NEXT_PUBLIC_LOGTO_APP_ID=your-app-id
   LOGTO_APP_SECRET=your-app-secret
   LOGTO_COOKIE_SECRET=generate-a-secure-random-string
   ```
3. Configure OAuth connectors in Logto Console
4. Run database migrations

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

### Environment Variables

Before deploying to Vercel, you need to configure the following environment variables. Refer to [VERCEL_ENV_VARS.md](VERCEL_ENV_VARS.md) for a complete list of all required and optional environment variables.

#### Required Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous API key
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `REDIS_URL` or `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD` - Redis connection details

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
