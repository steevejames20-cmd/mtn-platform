// Tests d'intégration de l'API sur un schéma PostgreSQL dédié ("test"), recréé à chaque exécution
import 'dotenv/config';
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';

// Le schéma "test" isole ces tests des données du schéma "public" (développement)
const dbUrl = new URL(process.env.DATABASE_URL || 'postgresql://mtn_user:changez_moi@localhost:5432/mtn_subscriptions');
dbUrl.searchParams.set('schema', 'test');
process.env.DATABASE_URL = dbUrl.toString();
process.env.JWT_SECRET = 'secret-de-test';
process.env.ADMIN_EMAIL = 'admin@test.cm';
process.env.ADMIN_PASSWORD = 'Test@1234';

let server;
let base;
let prisma;

before(async () => {
  const opts = { stdio: 'ignore', env: process.env };
  // schéma de test jetable : on repart d'un schéma vierge à chaque exécution
  execSync('npx prisma db push --force-reset --skip-generate --accept-data-loss', opts);
  execSync('node prisma/seed.js', opts);
  const { createApp } = await import('../src/app.js');
  ({ prisma } = await import('../src/lib/prisma.js'));
  server = createApp().listen(0);
  base = `http://localhost:${server.address().port}/api`;
});

after(async () => {
  server?.close();
  await prisma?.$disconnect();
});

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, data: await res.json() };
}

async function adminToken() {
  const { data } = await api('/admin/login', { method: 'POST', body: { email: 'admin@test.cm', password: 'Test@1234' } });
  return data.token;
}

test('catalogue : seuls les forfaits actifs, filtres et tri', async () => {
  const all = await api('/plans');
  assert.equal(all.status, 200);
  assert.ok(all.data.plans.length >= 10);
  assert.ok(all.data.plans.every((p) => p.name !== 'Ancien Pass 750 Mo'));

  const asc = await api('/plans?sort=price_asc');
  const prices = asc.data.plans.map((p) => p.price);
  assert.deepEqual(prices, [...prices].sort((a, b) => a - b));

  const desc = await api('/plans?sort=price_desc');
  assert.equal(desc.data.plans[0].price, Math.max(...prices));

  const month = await api('/plans?duration=month&volume=large');
  assert.ok(month.data.plans.length > 0);
  assert.ok(month.data.plans.every((p) => p.durationHours > 168 && p.volumeMb >= 5120 && p.volumeMb < 20480));

  const range = await api('/plans?minPrice=1000&maxPrice=3500');
  assert.ok(range.data.plans.every((p) => p.price >= 1000 && p.price <= 3500));

  const search = await api('/plans?q=premium');
  assert.equal(search.data.plans.length, 1);

  const popular = await api('/plans?popular=1');
  assert.ok(popular.data.plans.every((p) => p.popular));
});

test('souscription : validation du numéro', async () => {
  const { data: { plans } } = await api('/plans');
  const bad = await api('/subscriptions', { method: 'POST', body: { planId: plans[0].id, phone: '12345' } });
  assert.equal(bad.status, 400);
  assert.match(bad.data.error, /Numéro invalide/);

  const missing = await api('/subscriptions', { method: 'POST', body: { planId: plans[0].id } });
  assert.equal(missing.status, 400);

  const unknown = await api('/subscriptions', { method: 'POST', body: { planId: 99999, phone: '677123456' } });
  assert.equal(unknown.status, 404);
});

test('parcours complet : paiement réussi, échoué, annulé puis historique', async () => {
  const { data: { plans } } = await api('/plans?q=Classique');
  const plan = plans[0];
  const phone = '+237 670 55 44 33';

  // 1. échec puis annulation puis réussite sur la même souscription
  const sub = await api('/subscriptions', { method: 'POST', body: { planId: plan.id, phone } });
  assert.equal(sub.status, 201);
  assert.equal(sub.data.subscription.phone, '670554433');
  const subscriptionId = sub.data.subscription.id;

  const failed = await api('/payments', { method: 'POST', body: { subscriptionId, operator: 'MTN_MOMO', payerPhone: '670554433', action: 'fail' } });
  assert.equal(failed.status, 201);
  assert.equal(failed.data.transaction.status, 'FAILED');

  const cancelled = await api('/payments', { method: 'POST', body: { subscriptionId, operator: 'ORANGE_MONEY', payerPhone: '690554433', action: 'cancel' } });
  assert.equal(cancelled.data.transaction.status, 'CANCELLED');

  const zero = await api('/payments', { method: 'POST', body: { subscriptionId, operator: 'MTN_MOMO', payerPhone: '670550000', action: 'confirm' } });
  assert.equal(zero.data.transaction.status, 'FAILED');

  const ok = await api('/payments', { method: 'POST', body: { subscriptionId, operator: 'MTN_MOMO', payerPhone: '670554433', action: 'confirm' } });
  assert.equal(ok.status, 201);
  const tx = ok.data.transaction;
  assert.equal(tx.status, 'SUCCESS');
  assert.equal(tx.amount, plan.price);
  assert.match(tx.reference, /^SIM-\d{8}-[A-Z0-9]{10}$/);
  assert.equal(tx.subscription.status, 'ACTIVE');

  const again = await api('/payments', { method: 'POST', body: { subscriptionId, operator: 'MTN_MOMO', payerPhone: '670554433', action: 'confirm' } });
  assert.equal(again.status, 409);

  const receipt = await api(`/payments/${tx.reference}`);
  assert.equal(receipt.data.transaction.subscription.planName, plan.name);

  // 2. historique : vérification fictive puis accès limité au numéro
  const noToken = await api('/history');
  assert.equal(noToken.status, 401);

  const code = await api('/history/request-code', { method: 'POST', body: { phone: '670554433' } });
  assert.equal(code.status, 201);
  assert.match(code.data.demoCode, /^\d{6}$/);

  const wrong = await api('/history/verify', { method: 'POST', body: { phone: '670554433', code: code.data.demoCode === '000000' ? '111111' : '000000' } });
  assert.equal(wrong.status, 400);

  const verified = await api('/history/verify', { method: 'POST', body: { phone: '670554433', code: code.data.demoCode } });
  assert.equal(verified.status, 200);
  const token = verified.data.token;

  const history = await api('/history', { token });
  assert.equal(history.data.transactions.length, 4);
  assert.ok(history.data.transactions.every((t) => t.subscription.phone === '670554433'));
  assert.equal(history.data.summary.SUCCESS, 1);
  assert.equal(history.data.summary.FAILED, 2);
  assert.equal(history.data.summary.CANCELLED, 1);

  const onlyOrange = await api('/history?operator=ORANGE_MONEY', { token });
  assert.equal(onlyOrange.data.transactions.length, 1);

  // une transaction d'un autre numéro n'est pas accessible
  const other = await prisma.transaction.findFirst({ where: { subscription: { phone: { not: '670554433' } } } });
  const forbidden = await api(`/history/${other.reference}`, { token });
  assert.equal(forbidden.status, 404);

  // un jeton historique ne donne pas accès à l'administration
  const notAdmin = await api('/admin/stats', { token });
  assert.equal(notAdmin.status, 401);
});

test('administration : authentification et CRUD des forfaits', async () => {
  assert.equal((await api('/admin/stats')).status, 401);
  const badLogin = await api('/admin/login', { method: 'POST', body: { email: 'admin@test.cm', password: 'mauvais' } });
  assert.equal(badLogin.status, 401);

  const token = await adminToken();
  assert.ok(token);

  const stats = await api('/admin/stats', { token });
  assert.equal(stats.status, 200);
  assert.ok(stats.data.totals.totalPlans >= 12);
  assert.ok(stats.data.totals.revenue > 0);

  const invalid = await api('/admin/plans', { method: 'POST', token, body: { name: 'X', price: -5 } });
  assert.equal(invalid.status, 400);

  const created = await api('/admin/plans', {
    method: 'POST', token,
    body: { name: 'Pass Test', price: 750, volumeMb: 1024, durationHours: 48, description: 'Forfait créé par les tests', active: true },
  });
  assert.equal(created.status, 201);
  const id = created.data.plan.id;
  assert.ok((await api('/plans?q=Pass Test')).data.plans.some((p) => p.id === id));

  const updated = await api(`/admin/plans/${id}`, {
    method: 'PUT', token,
    body: { name: 'Pass Test Modifié', price: 800, volumeMb: 2048, durationHours: 48, description: 'Forfait modifié par les tests', active: true },
  });
  assert.equal(updated.data.plan.price, 800);

  const disabled = await api(`/admin/plans/${id}/status`, { method: 'PATCH', token, body: { active: false } });
  assert.equal(disabled.data.plan.active, false);
  assert.equal((await api(`/plans/${id}`)).status, 404);

  const removed = await api(`/admin/plans/${id}`, { method: 'DELETE', token });
  assert.equal(removed.status, 200);
  assert.equal((await api(`/admin/plans/${id}`, { method: 'DELETE', token })).status, 404);
});

test('administration : liste, filtres et détail des souscriptions', async () => {
  const token = await adminToken();
  const list = await api('/admin/subscriptions?pageSize=5', { token });
  assert.equal(list.data.subscriptions.length, 5);
  assert.ok(list.data.total > 5);

  const byPhone = await api('/admin/subscriptions?q=670554433', { token });
  assert.equal(byPhone.data.total, 1);

  const active = await api('/admin/subscriptions?status=ACTIVE', { token });
  assert.ok(active.data.subscriptions.every((s) => s.status === 'ACTIVE'));

  const detail = await api(`/admin/subscriptions/${byPhone.data.subscriptions[0].id}`, { token });
  assert.equal(detail.data.subscription.transactions.length, 4);
});

test('contact : message enregistré et visible par l’administrateur', async () => {
  const bad = await api('/contact', { method: 'POST', body: { name: 'A', email: 'pas-un-email', subject: '', message: 'court' } });
  assert.equal(bad.status, 400);
  const ok = await api('/contact', { method: 'POST', body: { name: 'Awa', email: 'awa@example.com', subject: 'Question', message: 'Bonjour, je voudrais des informations.' } });
  assert.equal(ok.status, 201);
  const token = await adminToken();
  const msgs = await api('/admin/messages', { token });
  assert.ok(msgs.data.messages.some((m) => m.name === 'Awa'));
});

test('sonde /health : API et base opérationnelles', async () => {
  const res = await fetch(base.replace(/\/api$/, '') + '/health');
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { status: 'ok', database: 'up' });
});

test('recherche de forfaits insensible à la casse', async () => {
  const { status, data } = await api('/plans?q=classique');
  assert.equal(status, 200);
  assert.ok(data.plans.some((p) => p.name === 'Forfait Classique'));
});
