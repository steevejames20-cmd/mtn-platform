import { z } from 'zod';

/**
 * Normalise un numéro camerounais : retire espaces, tirets et indicatif +237/00237.
 * Retourne 9 chiffres (ex. 677123456) ou null si le format est invalide.
 */
export function normalizePhone(input) {
  if (typeof input !== 'string') return null;
  let digits = input.replace(/[\s.\-()]/g, '');
  if (digits.startsWith('+237')) digits = digits.slice(4);
  else if (digits.startsWith('00237')) digits = digits.slice(5);
  else if (digits.length === 12 && digits.startsWith('237')) digits = digits.slice(3);
  return /^6[5-9]\d{7}$/.test(digits) ? digits : null;
}

export const phoneSchema = z
  .string({ required_error: 'Le numéro de téléphone est obligatoire' })
  .trim()
  .min(1, 'Le numéro de téléphone est obligatoire')
  .transform((v, ctx) => {
    const n = normalizePhone(v);
    if (!n) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Numéro invalide : saisissez 9 chiffres commençant par 6 (ex. 677 12 34 56)',
      });
      return z.NEVER;
    }
    return n;
  });

export const OPERATORS = ['MTN_MOMO', 'ORANGE_MONEY'];
export const OPERATOR_LABELS = { MTN_MOMO: 'MTN Mobile Money', ORANGE_MONEY: 'Orange Money' };

export const planSchema = z.object({
  name: z.string().trim().min(2, 'Le nom doit contenir au moins 2 caractères').max(60, 'Nom trop long (60 max)'),
  price: z.coerce
    .number({ invalid_type_error: 'Le prix doit être un nombre' })
    .int('Le prix doit être un entier')
    .min(50, 'Le prix minimum est de 50 FCFA')
    .max(500000, 'Le prix maximum est de 500 000 FCFA'),
  volumeMb: z.coerce
    .number({ invalid_type_error: 'Le volume doit être un nombre' })
    .int('Le volume doit être un entier (en Mo)')
    .min(1, 'Le volume doit être supérieur à 0')
    .max(10 * 1024 * 1024, 'Volume trop élevé'),
  durationHours: z.coerce
    .number({ invalid_type_error: 'La durée doit être un nombre' })
    .int('La durée doit être un entier (en heures)')
    .min(1, 'La durée doit être d’au moins 1 heure')
    .max(24 * 366, 'Durée maximale : 1 an'),
  description: z.string().trim().min(5, 'La description doit contenir au moins 5 caractères').max(300, 'Description trop longue (300 max)'),
  category: z.string().trim().max(30).optional().default('Standard'),
  active: z.boolean().optional().default(true),
  popular: z.boolean().optional().default(false),
});

/** Génère une référence de transaction fictive unique et difficile à deviner */
export function generateReference() {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let rand = '';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  for (const b of bytes) rand += alphabet[b % alphabet.length];
  return `SIM-${date}-${rand}`;
}
