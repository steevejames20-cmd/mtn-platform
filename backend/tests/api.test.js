const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp, normalizePhone } = require('../app');

// Faux pool : répond selon le SQL reçu, sans base de données réelle.
function fakePool({ down = false } = {}) {
  const subs = [];
  const plans = [
    { id: 1, name: 'Data 1 Go', type: 'data', price_xaf: 500, description: '1 Go' },
    { id: 2, name: 'Appels 30 min', type: 'voix', price_xaf: 300, description: '30 min' },
  ];
  return {
    async query(sql, params = []) {
      if (down) throw new Error('db down');
      if (/^SELECT 1/.test(sql)) return { rows: [{ '?column?': 1 }] };
      if (/FROM plans ORDER BY/.test(sql)) return { rows: plans };
      if (/FROM plans WHERE id/.test(sql)) return { rows: plans.filter((p) => p.id === params[0]) };
      if (/^INSERT INTO subscriptions/.test(sql)) {
        const row = { id: subs.length + 1, phone: params[0], plan_id: params[1], created_at: new Date().toISOString() };
        subs.push(row);
        return { rows: [row] };
      }
      if (/FROM subscriptions s/.test(sql)) {
        return {
          rows: subs
            .filter((s) => s.phone === params[0])
            .map((s) => ({ ...s, plan_name: plans.find((p) => p.id === s.plan_id).name, price_xaf: 500 })),
        };
      }
      throw new Error('SQL inattendu : ' + sql);
    },
  };
}

async function withServer(pool, fn) {
  const server = createApp(pool).listen(0);
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    await fn(base);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const json = (body) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

test('normalizePhone accepte les numéros MTN et refuse les autres', () => {
  assert.equal(normalizePhone('670123456'), '670123456');
  assert.equal(normalizePhone('+237 652 12 34 56'), '652123456');
  assert.equal(normalizePhone('237680123456'), '680123456');
  assert.equal(normalizePhone('690123456'), null); // Orange
  assert.equal(normalizePhone('12345'), null);
  assert.equal(normalizePhone(undefined), null);
});

test('GET /health -> 200 quand la base répond', async () => {
  await withServer(fakePool(), async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok', database: 'up' });
  });
});

test('GET /health -> 503 quand la base est coupée', async () => {
  await withServer(fakePool({ down: true }), async (base) => {
    const res = await fetch(`${base}/health`);
    assert.equal(res.status, 503);
  });
});

test('GET /api/plans retourne la liste des forfaits', async () => {
  await withServer(fakePool(), async (base) => {
    const plans = await (await fetch(`${base}/api/plans`)).json();
    assert.equal(plans.length, 2);
    assert.equal(plans[0].name, 'Data 1 Go');
  });
});

test('souscription puis historique', async () => {
  await withServer(fakePool(), async (base) => {
    const created = await fetch(`${base}/api/subscriptions`, json({ phone: '+237670123456', plan_id: 1 }));
    assert.equal(created.status, 201);
    const body = await created.json();
    assert.equal(body.phone, '670123456');
    assert.equal(body.plan_name, 'Data 1 Go');

    const history = await (await fetch(`${base}/api/subscriptions/670123456`)).json();
    assert.equal(history.length, 1);
    assert.equal(history[0].plan_name, 'Data 1 Go');
  });
});

test('souscription refusée : numéro invalide, forfait inconnu', async () => {
  await withServer(fakePool(), async (base) => {
    const bad = await fetch(`${base}/api/subscriptions`, json({ phone: '690123456', plan_id: 1 }));
    assert.equal(bad.status, 400);
    const unknown = await fetch(`${base}/api/subscriptions`, json({ phone: '670123456', plan_id: 99 }));
    assert.equal(unknown.status, 404);
    const badPlan = await fetch(`${base}/api/subscriptions`, json({ phone: '670123456', plan_id: 'x' }));
    assert.equal(badPlan.status, 400);
  });
});

test('historique : numéro invalide -> 400', async () => {
  await withServer(fakePool(), async (base) => {
    const res = await fetch(`${base}/api/subscriptions/abc`);
    assert.equal(res.status, 400);
  });
});
