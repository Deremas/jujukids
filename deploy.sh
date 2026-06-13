#!/bin/bash

# RECOMMENDED DEPLOY FLOW FOR CPANEL
echo "Starting deployment process..."

# 1. Pull latest changes
echo "Pulling latest code..."
git pull origin main

# 2. Always clean before build
echo "Cleaning old build files..."
rm -rf .next generated node_modules/.cache

# 3. Always load .env before Prisma commands
echo "Loading environment variables..."
set -a
source .env
set +a

# 4. Use low-resource build env vars
export NODE_OPTIONS="--max-old-space-size=1536"
export UV_THREADPOOL_SIZE=1
export NEXT_TELEMETRY_DISABLED=1
export CI=1
export NODE_ENV=production
export NEXT_PRIVATE_BUILD_WORKER=0
export NEXT_PRIVATE_MAX_WORKER_THREADS=1
export RAYON_NUM_THREADS=1
export TOKIO_WORKER_THREADS=1

# 5. Always regenerate Prisma Client
echo "Generating Prisma Client..."
npx prisma generate --schema prisma/schema.prisma

# 6. Push database schema. Do not auto-accept data loss in deployment.
echo "Pushing database schema..."
npx prisma db push --schema prisma/schema.prisma

# 7. Build Next.js application
echo "Building Next.js app..."
npx next build --webpack

# 8. Always restart passenger after build
echo "Restarting passenger..."
mkdir -p tmp
: > "$HOME/logs/passenger.log"
touch tmp/restart.txt

echo "Deployment completed successfully!"
