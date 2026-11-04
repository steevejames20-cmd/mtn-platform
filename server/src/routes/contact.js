import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { asyncHandler, parse } from '../lib/errors.js';

const router = Router();

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Indiquez votre nom').max(80),
  email: z.string().trim().email('Adresse e-mail invalide').max(120),
  subject: z.string().trim().min(3, 'Indiquez un objet').max(120),
  message: z.string().trim().min(10, 'Votre message doit contenir au moins 10 caractères').max(2000),
});

router.post(
  '/',
  rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, message: { error: 'Trop de messages envoyés, réessayez plus tard' } }),
  asyncHandler(async (req, res) => {
    const data = parse(contactSchema, req.body);
    const message = await prisma.contactMessage.create({ data });
    res.status(201).json({ id: message.id, message: 'Votre message a bien été envoyé' });
  }),
);

export default router;
