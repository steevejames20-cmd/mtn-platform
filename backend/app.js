const express = require('express');

// Numéros MTN Cameroun (simplifié) : 9 chiffres, préfixes 650-654 et 670-689,
// avec ou sans l'indicatif +237 / 237.
const MTN_REGEX = /^6(5[0-4]|[78]\d)\d{6}$/;

function normalizePhone(raw) {
  if (typeof raw !== 'string') return null;
  const digits = raw.replace(/[\s.\-()]/g, '').replace(/^\+?237/, '');
  return MTN_REGEX.test(digits) ? digits : null;
}

// `pool` est injecté (pg.Pool en production, faux objet dans les tests).
function createApp(pool) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '10kb' }));

  // Health check : 200 si l'API ET la base répondent, 503 sinon.
  app.get('/health', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', database: 'up' });
    } catch (_err) {
      res.status(503).json({ status: 'error', database: 'down' });
    }
  });

  // Consultation des forfaits
  app.get('/api/plans', async (_req, res, next) => {
    try {
      const { rows } = await pool.query(
        'SELECT id, name, type, price_xaf, description FROM plans ORDER BY type, price_xaf'
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  // Souscription
  app.post('/api/subscriptions', async (req, res, next) => {
    try {
      const phone = normalizePhone(req.body && req.body.phone);
      const planId = Number.parseInt(req.body && req.body.plan_id, 10);

      if (!phone) {
        return res.status(400).json({ error: 'Numéro MTN invalide (ex : 670123456).' });
      }
      if (!Number.isInteger(planId) || planId <= 0) {
        return res.status(400).json({ error: 'plan_id invalide.' });
      }

      const plan = await pool.query('SELECT id, name FROM plans WHERE id = $1', [planId]);
      if (plan.rows.length === 0) {
        return res.status(404).json({ error: 'Forfait introuvable.' });
      }

      const { rows } = await pool.query(
        'INSERT INTO subscriptions (phone, plan_id) VALUES ($1, $2) RETURNING id, phone, plan_id, created_at',
        [phone, planId]
      );
      res.status(201).json({ ...rows[0], plan_name: plan.rows[0].name });
    } catch (err) {
      next(err);
    }
  });

  // Historique d'un numéro
  app.get('/api/subscriptions/:phone', async (req, res, next) => {
    try {
      const phone = normalizePhone(req.params.phone);
      if (!phone) {
        return res.status(400).json({ error: 'Numéro MTN invalide (ex : 670123456).' });
      }
      const { rows } = await pool.query(
        `SELECT s.id, s.phone, s.plan_id, p.name AS plan_name, p.price_xaf, s.created_at
           FROM subscriptions s
           JOIN plans p ON p.id = s.plan_id
          WHERE s.phone = $1
          ORDER BY s.created_at DESC, s.id DESC`,
        [phone]
      );
      res.json(rows);
    } catch (err) {
      next(err);
    }
  });

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Route inconnue.' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    console.error(err.message);
    res.status(500).json({ error: 'Erreur interne.' });
  });

  return app;
}

module.exports = { createApp, normalizePhone };
