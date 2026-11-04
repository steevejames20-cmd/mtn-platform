import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';
import { generateReference } from '../src/lib/validation.js';

const prisma = new PrismaClient();
const GO = 1024;

const PLANS = [
  { name: 'Pass Heure', price: 100, volumeMb: 300, durationHours: 1, category: 'Express', description: 'Un coup de pouce rapide pour vos messages et réseaux sociaux pendant une heure.' },
  { name: 'Forfait Découverte', price: 500, volumeMb: 500, durationHours: 24, category: 'Journalier', description: 'Idéal pour découvrir l’Internet mobile : navigation et messagerie toute la journée.', popular: false },
  { name: 'Pass Nuit', price: 250, volumeMb: 1 * GO, durationHours: 8, category: 'Express', description: '1 Go valable de minuit à 8 h pour vos téléchargements et mises à jour nocturnes.' },
  { name: 'Pass Social', price: 1000, volumeMb: 1536, durationHours: 168, category: 'Hebdomadaire', description: 'WhatsApp, Facebook, TikTok : restez en contact avec vos proches toute la semaine.' },
  { name: 'Pass Week-end', price: 1200, volumeMb: 3 * GO, durationHours: 72, category: 'Hebdomadaire', description: '3 Go à profiter du vendredi au dimanche pour vos films, musique et appels vidéo.' },
  { name: 'Forfait Classique', price: 1500, volumeMb: 2 * GO, durationHours: 168, category: 'Hebdomadaire', description: 'Le forfait préféré de nos clients : 2 Go pour naviguer sereinement pendant 7 jours.', popular: true },
  { name: 'Forfait Confort', price: 3500, volumeMb: 5 * GO, durationHours: 720, category: 'Mensuel', description: '5 Go sur 30 jours pour un usage quotidien confortable : streaming, réseaux et travail.', popular: true },
  { name: 'Forfait Premium', price: 6000, volumeMb: 10 * GO, durationHours: 720, category: 'Mensuel', description: '10 Go pour les grands consommateurs : vidéos HD, visioconférences et partage de connexion.', popular: true },
  { name: 'Forfait Pro', price: 10000, volumeMb: 20 * GO, durationHours: 720, category: 'Mensuel', description: 'Pensé pour les professionnels : 20 Go et une connexion fiable pour travailler partout.' },
  { name: 'Forfait Max', price: 20000, volumeMb: 50 * GO, durationHours: 720, category: 'Mensuel', description: '50 Go pour toute la famille ou le télétravail intensif, valables 30 jours.' },
  { name: 'Pass Étudiant', price: 2000, volumeMb: 4 * GO, durationHours: 336, category: 'Hebdomadaire', description: '4 Go sur 14 jours pour suivre vos cours en ligne et faire vos recherches.' },
  { name: 'Ancien Pass 750 Mo', price: 600, volumeMb: 750, durationHours: 48, category: 'Journalier', description: 'Offre retirée de la vente, conservée pour l’historique.', active: false },
];

const PHONES = ['677123456', '699876543', '655443322', '690112233', '678009988', '694123456', '651234567', '683456789'];

async function main() {
  const email = (process.env.ADMIN_EMAIL || 'admin@netconnect.cm').toLowerCase();
  const password = process.env.ADMIN_PASSWORD || 'Admin@2026';
  await prisma.admin.upsert({
    where: { email },
    update: {},
    create: { email, name: process.env.ADMIN_NAME || 'Administrateur', passwordHash: await bcrypt.hash(password, 10) },
  });
  console.log(`✔ Administrateur : ${email}`);

  if ((await prisma.plan.count()) === 0) {
    for (const p of PLANS) await prisma.plan.create({ data: p });
    console.log(`✔ ${PLANS.length} forfaits créés`);
  } else {
    console.log('• Forfaits déjà présents, aucune modification');
  }

  if ((await prisma.subscription.count()) === 0) {
    const plans = await prisma.plan.findMany({ where: { active: true } });
    const weights = { 'Forfait Classique': 5, 'Forfait Confort': 4, 'Forfait Premium': 3, 'Pass Social': 3, 'Forfait Découverte': 2 };
    const pool = plans.flatMap((p) => Array(weights[p.name] || 1).fill(p));
    let seed = 42;
    const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

    for (let i = 0; i < 28; i++) {
      const plan = pool[Math.floor(rnd() * pool.length)];
      const phone = PHONES[Math.floor(rnd() * PHONES.length)];
      const createdAt = new Date(Date.now() - Math.floor(rnd() * 7 * 86_400_000));
      const r = rnd();
      const status = r < 0.78 ? 'SUCCESS' : r < 0.9 ? 'FAILED' : 'CANCELLED';
      const operator = ['69', '65'].some((pre) => phone.startsWith(pre)) && !phone.startsWith('650') && !phone.startsWith('651') ? 'ORANGE_MONEY' : 'MTN_MOMO';
      await prisma.subscription.create({
        data: {
          phone,
          planId: plan.id,
          planName: plan.name,
          price: plan.price,
          volumeMb: plan.volumeMb,
          durationHours: plan.durationHours,
          status: status === 'SUCCESS' ? 'ACTIVE' : status,
          activatedAt: status === 'SUCCESS' ? createdAt : null,
          expiresAt: status === 'SUCCESS' ? new Date(createdAt.getTime() + plan.durationHours * 3600_000) : null,
          createdAt,
          transactions: {
            create: {
              reference: generateReference(),
              operator,
              payerPhone: phone,
              amount: plan.price,
              status,
              failureReason: status === 'FAILED' ? 'Solde insuffisant (échec simulé)' : status === 'CANCELLED' ? 'Paiement annulé par l’utilisateur' : null,
              createdAt,
            },
          },
        },
      });
    }
    console.log('✔ 28 souscriptions de démonstration créées');
  } else {
    console.log('• Souscriptions déjà présentes, aucune modification');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
