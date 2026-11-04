const { Pool } = require('pg');
const { createApp } = require('./app');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL manquante : définir la variable dans .env (voir .env.example).');
  process.exit(1);
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 5 });
const port = Number(process.env.PORT) || 3000;
const server = createApp(pool).listen(port, '0.0.0.0', () => {
  console.log(`API MTN à l'écoute sur le port ${port}`);
});

// Arrêt propre quand Docker envoie SIGTERM (docker compose down / redéploiement)
function shutdown() {
  server.close(() => pool.end().then(() => process.exit(0)));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
