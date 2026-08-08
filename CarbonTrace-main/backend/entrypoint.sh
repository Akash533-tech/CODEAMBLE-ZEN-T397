#!/bin/sh
set -e

echo "[ENTRYPOINT] Running database migrations..."
npx sequelize-cli db:migrate

echo "[ENTRYPOINT] Running database seeders..."
npx sequelize-cli db:seed:all || echo "[ENTRYPOINT] Seeders already applied or failed — continuing..."

echo "[ENTRYPOINT] Starting server..."
exec node server.js
