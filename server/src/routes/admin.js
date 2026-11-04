import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError, parse } from '../lib/errors.js';
import { requireAdmin, signToken } from '../lib/auth.js';
import { OPERATORS, planSchema } from '../lib/validation.js';
import { buildDateRange } from '../lib/filters.js';

const router = Router();

/* ---------- Authentification ---------- */

const loginLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion, réessayez dans 15 minutes' } });

router.post(
  '/login',
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password } = parse(
      z.object({
        email: z.string().trim().toLowerCase().email('Adresse e-mail invalide'),
        password: z.string().min(1, 'Le mot de passe est obligatoire'),
      }),
      req.body,
    );
    const admin = await prisma.admin.findUnique({ where: { email } });
    // comparaison effectuée même si le compte n'existe pas (temps de réponse constant)
    const valid = await bcrypt.compare(password, admin?.passwordHash ?? '$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinv');
    if (!admin || !valid) throw new HttpError(401, 'Identifiants incorrects');

    await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
    const token = signToken({ scope: 'admin', sub: admin.id, email: admin.email }, '8h');
    res.json({ token, admin: { id: admin.id, email: admin.email, name: admin.name } });
  }),
);

// Toutes les routes suivantes exigent un jeton administrateur valide
router.use(requireAdmin);

router.get(
  '/me',
  asyncHandler(async (req, res) => {
    const admin = await prisma.admin.findUnique({ where: { id: req.auth.sub }, select: { id: true, email: true, name: true, lastLoginAt: true } });
    if (!admin) throw new HttpError(401, 'Compte administrateur introuvable');
    res.json({ admin });
  }),
);

/* ---------- Tableau de bord ---------- */

router.get(
  '/stats',
  asyncHandler(async (_req, res) => {
    const [totalPlans, activePlans, totalSubscriptions, activeSubscriptions, txByStatus, txByOperator, unreadMessages] = await Promise.all([
      prisma.plan.count(),
      prisma.plan.count({ where: { active: true } }),
      prisma.subscription.count(),
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.transaction.groupBy({ by: ['status'], _count: true, _sum: { amount: true } }),
      prisma.transaction.groupBy({ by: ['operator'], where: { status: 'SUCCESS' }, _count: true, _sum: { amount: true } }),
      prisma.contactMessage.count({ where: { read: false } }),
    ]);

    const byStatus = Object.fromEntries(txByStatus.map((g) => [g.status, g]));

    // chiffre d'affaires des 7 derniers jours
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - 6);
    const recentTx = await prisma.transaction.findMany({
      where: { status: 'SUCCESS', createdAt: { gte: start } },
      select: { amount: true, createdAt: true },
    });
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push({ date: d.toISOString().slice(0, 10), label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: '2-digit' }), revenue: 0, count: 0, _d: d });
    }
    for (const t of recentTx) {
      const idx = Math.floor((new Date(t.createdAt).setHours(0, 0, 0, 0) - start.getTime()) / 86_400_000);
      if (days[idx]) {
        days[idx].revenue += t.amount;
        days[idx].count += 1;
      }
    }

    const latest = await prisma.subscription.findMany({
      orderBy: { createdAt: 'desc' },
      take: 6,
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });

    const topPlans = await prisma.subscription.groupBy({
      by: ['planName'],
      where: { status: 'ACTIVE' },
      _count: true,
      orderBy: { _count: { planName: 'desc' } },
      take: 5,
    });

    res.json({
      totals: {
        totalPlans,
        activePlans,
        totalSubscriptions,
        activeSubscriptions,
        successfulTransactions: byStatus.SUCCESS?._count ?? 0,
        failedTransactions: byStatus.FAILED?._count ?? 0,
        cancelledTransactions: byStatus.CANCELLED?._count ?? 0,
        revenue: byStatus.SUCCESS?._sum.amount ?? 0,
        unreadMessages,
      },
      byOperator: txByOperator.map((g) => ({ operator: g.operator, count: g._count, revenue: g._sum.amount ?? 0 })),
      revenueLast7Days: days.map(({ _d, ...rest }) => rest),
      topPlans: topPlans.map((p) => ({ planName: p.planName, count: p._count })),
      latestSubscriptions: latest,
    });
  }),
);

/* ---------- Gestion des forfaits ---------- */

const idParam = (req) => {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, 'Identifiant invalide');
  return id;
};

router.get(
  '/plans',
  asyncHandler(async (_req, res) => {
    const plans = await prisma.plan.findMany({
      orderBy: [{ active: 'desc' }, { price: 'asc' }],
      include: { _count: { select: { subscriptions: true } } },
    });
    res.json({ plans });
  }),
);

router.post(
  '/plans',
  asyncHandler(async (req, res) => {
    const data = parse(planSchema, req.body);
    const plan = await prisma.plan.create({ data });
    res.status(201).json({ plan });
  }),
);

router.put(
  '/plans/:id',
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    const data = parse(planSchema, req.body);
    const exists = await prisma.plan.findUnique({ where: { id } });
    if (!exists) throw new HttpError(404, 'Forfait introuvable');
    const plan = await prisma.plan.update({ where: { id }, data });
    res.json({ plan });
  }),
);

router.patch(
  '/plans/:id/status',
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    const { active } = parse(z.object({ active: z.boolean({ required_error: 'Statut manquant' }) }), req.body);
    const exists = await prisma.plan.findUnique({ where: { id } });
    if (!exists) throw new HttpError(404, 'Forfait introuvable');
    const plan = await prisma.plan.update({ where: { id }, data: { active } });
    res.json({ plan });
  }),
);

router.delete(
  '/plans/:id',
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    const exists = await prisma.plan.findUnique({ where: { id } });
    if (!exists) throw new HttpError(404, 'Forfait introuvable');
    // les souscriptions existantes conservent leur copie du forfait (planId passe à null)
    await prisma.plan.delete({ where: { id } });
    res.json({ ok: true });
  }),
);

/* ---------- Souscriptions ---------- */

const SUB_STATUSES = ['PENDING', 'ACTIVE', 'FAILED', 'CANCELLED'];

router.get(
  '/subscriptions',
  asyncHandler(async (req, res) => {
    const { q, status, operator, from, to } = req.query;
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const pageSize = Math.min(100, Math.max(5, Number.parseInt(req.query.pageSize, 10) || 10));

    const and = [];
    if (SUB_STATUSES.includes(status)) and.push({ status });
    if (OPERATORS.includes(operator)) and.push({ transactions: { some: { operator } } });
    const createdAt = buildDateRange(from, to);
    if (createdAt) and.push({ createdAt });
    if (typeof q === 'string' && q.trim()) {
      const term = q.trim().replace(/\s/g, '').slice(0, 50) || q.trim();
      and.push({
        OR: [
          { phone: { contains: term } },
          { planName: { contains: q.trim() } },
          { transactions: { some: { reference: { contains: term.toUpperCase() } } } },
        ],
      });
    }
    const where = and.length ? { AND: and } : {};

    const [total, subscriptions] = await Promise.all([
      prisma.subscription.count({ where }),
      prisma.subscription.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { transactions: { orderBy: { createdAt: 'desc' }, take: 1 }, _count: { select: { transactions: true } } },
      }),
    ]);
    res.json({ subscriptions, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) });
  }),
);

router.get(
  '/subscriptions/:id',
  asyncHandler(async (req, res) => {
    const subscription = await prisma.subscription.findUnique({
      where: { id: String(req.params.id) },
      include: { transactions: { orderBy: { createdAt: 'desc' } }, plan: true },
    });
    if (!subscription) throw new HttpError(404, 'Souscription introuvable');
    res.json({ subscription });
  }),
);

/* ---------- Messages de contact ---------- */

router.get(
  '/messages',
  asyncHandler(async (_req, res) => {
    const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ messages });
  }),
);

router.patch(
  '/messages/:id/read',
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    const exists = await prisma.contactMessage.findUnique({ where: { id } });
    if (!exists) throw new HttpError(404, 'Message introuvable');
    const message = await prisma.contactMessage.update({ where: { id }, data: { read: true } });
    res.json({ message });
  }),
);

router.delete(
  '/messages/:id',
  asyncHandler(async (req, res) => {
    const id = idParam(req);
    const exists = await prisma.contactMessage.findUnique({ where: { id } });
    if (!exists) throw new HttpError(404, 'Message introuvable');
    await prisma.contactMessage.delete({ where: { id } });
    res.json({ ok: true });
  }),
);

export default router;
