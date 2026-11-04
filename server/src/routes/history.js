import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError, parse } from '../lib/errors.js';
import { phoneSchema, OPERATORS } from '../lib/validation.js';
import { requireHistory, signToken } from '../lib/auth.js';
import { buildDateRange } from '../lib/filters.js';

/*
 * Historique utilisateur.
 * Vérification FICTIVE : un code à 6 chiffres est généré et renvoyé directement
 * dans la réponse (pas d'envoi de SMS réel en environnement de démonstration).
 * Une fois vérifié, un jeton limité au numéro est délivré : seules les
 * transactions de ce numéro sont accessibles.
 */

const router = Router();
const CODE_TTL_MS = 5 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const limiter = rateLimit({ windowMs: 10 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Trop de tentatives, réessayez dans quelques minutes' } });

router.post(
  '/request-code',
  limiter,
  asyncHandler(async (req, res) => {
    const { phone } = parse(z.object({ phone: phoneSchema }), req.body);
    const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000).padStart(6, '0');

    await prisma.verificationCode.updateMany({ where: { phone, used: false }, data: { used: true } });
    await prisma.verificationCode.create({
      data: { phone, codeHash: await bcrypt.hash(code, 8), expiresAt: new Date(Date.now() + CODE_TTL_MS) },
    });

    res.status(201).json({
      message: 'Code de vérification généré (SMS simulé)',
      demoCode: code,
      expiresInSeconds: CODE_TTL_MS / 1000,
    });
  }),
);

router.post(
  '/verify',
  limiter,
  asyncHandler(async (req, res) => {
    const { phone, code } = parse(
      z.object({ phone: phoneSchema, code: z.string().trim().regex(/^\d{6}$/, 'Le code doit contenir 6 chiffres') }),
      req.body,
    );
    const record = await prisma.verificationCode.findFirst({
      where: { phone, used: false },
      orderBy: { createdAt: 'desc' },
    });
    if (!record || record.expiresAt < new Date()) throw new HttpError(400, 'Code expiré ou inexistant, demandez un nouveau code');
    if (record.attempts >= MAX_ATTEMPTS) throw new HttpError(429, 'Trop de tentatives, demandez un nouveau code');

    const ok = await bcrypt.compare(code, record.codeHash);
    if (!ok) {
      await prisma.verificationCode.update({ where: { id: record.id }, data: { attempts: { increment: 1 } } });
      throw new HttpError(400, 'Code incorrect');
    }
    await prisma.verificationCode.update({ where: { id: record.id }, data: { used: true } });
    res.json({ token: signToken({ scope: 'history', phone }, '30m'), phone });
  }),
);

const STATUSES = ['SUCCESS', 'FAILED', 'CANCELLED'];

router.get(
  '/',
  requireHistory,
  asyncHandler(async (req, res) => {
    const { status, operator, q, from, to } = req.query;
    const where = { subscription: { phone: req.auth.phone } };
    if (STATUSES.includes(status)) where.status = status;
    if (OPERATORS.includes(operator)) where.operator = operator;
    const createdAt = buildDateRange(from, to);
    if (createdAt) where.createdAt = createdAt;
    if (typeof q === 'string' && q.trim()) {
      const term = q.trim().slice(0, 50);
      where.AND = [{ OR: [{ reference: { contains: term } }, { subscription: { planName: { contains: term } } }] }];
    }

    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { subscription: true },
    });
    const all = await prisma.transaction.groupBy({
      by: ['status'],
      where: { subscription: { phone: req.auth.phone } },
      _count: true,
      _sum: { amount: true },
    });
    const summary = { SUCCESS: 0, FAILED: 0, CANCELLED: 0, spent: 0 };
    for (const g of all) {
      summary[g.status] = g._count;
      if (g.status === 'SUCCESS') summary.spent = g._sum.amount ?? 0;
    }
    res.json({ phone: req.auth.phone, transactions, summary });
  }),
);

router.get(
  '/:reference',
  requireHistory,
  asyncHandler(async (req, res) => {
    const transaction = await prisma.transaction.findFirst({
      where: { reference: String(req.params.reference), subscription: { phone: req.auth.phone } },
      include: { subscription: true },
    });
    if (!transaction) throw new HttpError(404, 'Transaction introuvable pour ce numéro');
    res.json({ transaction });
  }),
);

export default router;
