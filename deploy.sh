#!/bin/bash

# RECOMMENDED DEPLOY FLOW FOR CPANEL
echo "Starting deployment process..."

# 1. Pull latest changes
echo "Pulling latest code..."
git pull origin main

# 2. Always clean before build
echo "Cleaning old build files..."
rm -rf .next generated node_modules/.cache

# 3. Use low-resource build env vars
export NODE_OPTIONS="--max-old-space-size=1536"
export UV_THREADPOOL_SIZE=1
export NEXT_TELEMETRY_DISABLED=1
export CI=1
export NODE_ENV=production
export NEXT_PRIVATE_BUILD_WORKER=0
export NEXT_PRIVATE_MAX_WORKER_THREADS=1
export RAYON_NUM_THREADS=1
export TOKIO_WORKER_THREADS=1

# 4. Always regenerate Prisma Client
echo "Generating Prisma Client..."
node scripts/run-prisma.mjs generate --schema=prisma/schema.prisma

# 5. Push database schema. Do not auto-accept data loss in deployment.
echo "Pushing database schema..."
node scripts/run-prisma.mjs db push --schema=prisma/schema.prisma

# 6. Build Next.js application
echo "Building Next.js app..."
npx next build --webpack

# 7. Always restart passenger after build
echo "Restarting passenger..."
mkdir -p tmp
: > "$HOME/logs/passenger.log"
touch tmp/restart.txt

echo "Deployment completed successfully!"
