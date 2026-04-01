#!/bin/bash
# One-shot deploy script for RodLine cPanel hosting
# Run this via SSH after cloning the repo

set -e

echo "==> Installing dependencies..."
npm install --production=false

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Running database migrations..."
npx prisma migrate deploy

echo "==> Building app..."
npm run build

echo "==> Done! Restart the Node.js App in cPanel."
