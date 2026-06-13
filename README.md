# Juju Kids

Retail stock, sales, purchasing, and finance management built with Next.js and Prisma.

## Run Locally

**Prerequisites:** Node.js and a Postgres database.

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env` and fill in the required values.
3. Prepare the database: `npm run db:push`
4. Run the app: `npm run dev`

## Environment Variables

Required:

- `DATABASE_URL`: Postgres connection string used by Prisma.
- `NEXTAUTH_SECRET`: Long random secret for signing NextAuth session tokens.
- `NEXTAUTH_URL`: Canonical production URL, for example `https://stock.example.com`.
