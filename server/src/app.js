import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import plansRouter from './routes/plans.js';
import subscriptionsRouter from './routes/subscriptions.js';
import paymentsRouter from './routes/payments.js';
import historyRouter from './routes/history.js';
import contactRouter from './routes/contact.js';
import adminRouter from './routes/admin.js';
import { errorHandler } from './lib/errors.js';
import { prisma } from './lib/prisma.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Derrière Nginx (1 saut) : l'IP réelle du client est lue dans X-Forwarded-For (limiteurs de débit)
  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(cors({ origin: (process.env.CLIENT_ORIGIN || 'http://localhost:5173').split(',') }));
  app.use(express.json({ limit: '50kb' }));

  app.get('/api/health', (_req, res) => res.json({ ok: true, mode: 'simulation' }));

  // Sonde Docker : 200 si l'API et la base répondent, 503 sinon
  app.get('/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ status: 'ok', database: 'up' });
    } catch {
      res.status(503).json({ status: 'error', database: 'down' });
    }
  });
  app.use('/api/plans', plansRouter);
  app.use('/api/subscriptions', subscriptionsRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/history', historyRouter);
  app.use('/api/contact', contactRouter);
  app.use('/api/admin', adminRouter);

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ressource introuvable' }));
  app.use(errorHandler);
  return app;
}
