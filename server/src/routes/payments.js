import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, HttpError, parse } from '../lib/errors.js';
import { generateReference, OPERATORS, phoneSchema } from '../lib/validation.js';

/*
 * SIMULATION DE PAIEMENT — ENVIRONNEMENT DE TEST
 * Aucune API Mobile Money réelle n'est appelée, aucun code PIN n'est demandé,
 * aucun argent n'est débité. Le résultat est décidé localement :
 *   - action "confirm"  -> paiement réussi (sauf numéro payeur finissant par 0000)
 *   - action "fail"     -> paiement échoué (scénario de test)
 *   - action "cancel"   -> paiement annulé par l'utilisateur
 */

const router = Router();

const paymentSchema = z.object({
  subscriptionId: z.string({ required_error: 'Souscription manquante' }).min(1, 'Souscription manquante'),
  operator: z.enum(OPERATORS, { errorMap: () => ({ message: 'Choisissez MTN Mobile Money ou Orange Money' }) }),
  payerPhone: phoneSchema,
  action: z.enum(['confirm', 'fail', 'cancel'], { errorMap: () => ({ message: 'Action de paiement invalide' }) }),
});

const transactionInclude = {
  subscription: {
    select: {
      id: true, phone: true, planName: true, price: true, volumeMb: true, durationHours: true,
      status: true, activatedAt: true, expiresAt: true, createdAt: true,
    },
  },
};

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { subscriptionId, operator, payerPhone, action } = parse(paymentSchema, req.body);

    const subscription = await prisma.subscription.findUnique({ where: { id: subscriptionId } });
    if (!subscription) throw new HttpError(404, 'Souscription introuvable');
    if (subscription.status === 'ACTIVE') throw new HttpError(409, 'Cette souscription a déjà été payée');

    let status = 'SUCCESS';
    let failureReason = null;
    if (action === 'cancel') {
      status = 'CANCELLED';
      failureReason = 'Paiement annulé par l’utilisateur';
    } else if (action === 'fail') {
      status = 'FAILED';
      failureReason = 'Solde insuffisant (échec simulé)';
    } else if (payerPhone.endsWith('0000')) {
      status = 'FAILED';
      failureReason = 'Compte Mobile Money introuvable (numéro de test se terminant par 0000)';
    }

    const now = new Date();
    const subscriptionUpdate =
      status === 'SUCCESS'
        ? { status: 'ACTIVE', activatedAt: now, expiresAt: new Date(now.getTime() + subscription.durationHours * 3600_000) }
        : { status: status === 'CANCELLED' ? 'CANCELLED' : 'FAILED' };

    const [transaction] = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          reference: generateReference(),
          subscriptionId,
          operator,
          payerPhone,
          amount: subscription.price,
          status,
          failureReason,
        },
        include: transactionInclude,
      }),
      prisma.subscription.update({ where: { id: subscriptionId }, data: subscriptionUpdate }),
    ]);

    // la souscription incluse a été lue avant la mise à jour : on renvoie l'état final
    transaction.subscription = { ...transaction.subscription, ...subscriptionUpdate };
    res.status(201).json({ transaction });
  }),
);

/** Données du reçu d'une transaction (référence aléatoire non devinable) */
router.get(
  '/:reference',
  asyncHandler(async (req, res) => {
    const transaction = await prisma.transaction.findUnique({
      where: { reference: String(req.params.reference) },
      include: transactionInclude,
    });
    if (!transaction) throw new HttpError(404, 'Transaction introuvable');
    res.json({ transaction });
  }),
);

export default router;
