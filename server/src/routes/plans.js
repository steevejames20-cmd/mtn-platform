import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError } from '../lib/errors.js';

const router = Router();

const VOLUME_RANGES = {
  small: { lt: 1024 }, // moins de 1 Go
  medium: { gte: 1024, lt: 5120 }, // 1 à 5 Go
  large: { gte: 5120, lt: 20480 }, // 5 à 20 Go
  xl: { gte: 20480 }, // 20 Go et plus
};

const DURATION_RANGES = {
  day: { lte: 24 }, // jusqu'à 24 h
  week: { gt: 24, lte: 168 }, // 2 à 7 jours
  month: { gt: 168 }, // plus de 7 jours
};

const SORTS = {
  price_asc: [{ price: 'asc' }],
  price_desc: [{ price: 'desc' }],
  volume_desc: [{ volumeMb: 'desc' }],
  duration_desc: [{ durationHours: 'desc' }],
  popular: [{ popular: 'desc' }, { price: 'asc' }],
};

const toInt = (v) => {
  const n = Number.parseInt(v, 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
};

/** Liste des forfaits actifs avec recherche, filtres et tri (tout est fait en base) */
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, volume, duration, sort, popular } = req.query;
    const minPrice = toInt(req.query.minPrice);
    const maxPrice = toInt(req.query.maxPrice);

    const where = { active: true };
    if (typeof q === 'string' && q.trim()) {
      const term = q.trim().slice(0, 50);
      where.OR = [{ name: { contains: term } }, { description: { contains: term } }, { category: { contains: term } }];
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) where.price.gte = minPrice;
      if (maxPrice !== undefined) where.price.lte = maxPrice;
    }
    if (VOLUME_RANGES[volume]) where.volumeMb = VOLUME_RANGES[volume];
    if (DURATION_RANGES[duration]) where.durationHours = DURATION_RANGES[duration];
    if (popular === '1' || popular === 'true') where.popular = true;

    const plans = await prisma.plan.findMany({
      where,
      orderBy: SORTS[sort] || SORTS.popular,
      select: {
        id: true, name: true, price: true, volumeMb: true, durationHours: true,
        description: true, category: true, popular: true,
      },
    });

    const bounds = await prisma.plan.aggregate({ where: { active: true }, _min: { price: true }, _max: { price: true } });
    res.json({ plans, priceBounds: { min: bounds._min.price ?? 0, max: bounds._max.price ?? 0 } });
  }),
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const id = toInt(req.params.id);
    if (id === undefined) throw new HttpError(400, 'Identifiant de forfait invalide');
    const plan = await prisma.plan.findFirst({ where: { id, active: true } });
    if (!plan) throw new HttpError(404, 'Ce forfait n’existe pas ou n’est plus disponible');
    res.json({ plan });
  }),
);

export default router;
