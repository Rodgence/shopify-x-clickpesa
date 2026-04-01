#!/bin/bash
# One-shot deploy script for RodLine cPanel hosting
# Run this via SSH from /home/rodwayco/payments

set -e

echo "==> Pulling latest code..."
git pull origin master

echo "==> Installing dependencies..."
npm install --production=false

echo "==> Generating Prisma client..."
npx prisma generate

echo "==> Running database migrations..."
npx prisma migrate deploy

echo "==> Building app..."
npm run build

echo "==> Done! Go to cPanel -> Setup Node.js App -> Restart."
