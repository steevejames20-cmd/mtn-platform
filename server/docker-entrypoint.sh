#!/bin/sh
set -e

# Crée ou met à jour les tables dans PostgreSQL
node_modules/.bin/prisma db push --skip-generate

# Administrateur et données de démonstration (idempotent : ne réécrit rien si déjà présent)
node prisma/seed.js

# exec : Node devient le processus principal et reçoit les signaux d'arrêt de Docker
exec node src/index.js
