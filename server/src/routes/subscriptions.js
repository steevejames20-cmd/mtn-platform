import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError, parse } from '../lib/errors.js';
import { phoneSchema } from '../lib/validation.js';

const router = Router();

const createSchema = z.object({
  planId: z.coerce.number({ invalid_type_error: 'Forfait invalide' }).int().positive('Forfait invalide'),
  phone: phoneSchema,
});

/** Crée une souscription en attente de paiement */
router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { planId, phone } = parse(createSchema, req.body);
    const plan = await prisma.plan.findFirst({ where: { id: planId, active: true } });
    if (!plan) throw new HttpError(404, 'Ce forfait n’existe pas ou n’est plus disponible');

    const subscription = await prisma.subscription.create({
      data: {
        phone,
        planId: plan.id,
        planName: plan.name,
        price: plan.price,
        volumeMb: plan.volumeMb,
        durationHours: plan.durationHours,
      },
    });
    res.status(201).json({ subscription });
  }),
);

/** Détail d'une souscription (identifiant cuid non devinable) pour la page de paiement */
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const subscription = await prisma.subscription.findUnique({
      where: { id: String(req.params.id) },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!subscription) throw new HttpError(404, 'Souscription introuvable');
    res.json({ subscription });
  }),
);

export default router;
