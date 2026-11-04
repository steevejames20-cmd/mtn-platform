'use strict';

const $ = (id) => document.getElementById(id);

async function api(path, options) {
  const res = await fetch(path, options);
  let data = null;
  try { data = await res.json(); } catch (_) { /* réponse vide */ }
  if (!res.ok) throw new Error((data && data.error) || `Erreur ${res.status}`);
  return data;
}

function setMsg(el, text, ok) {
  el.textContent = text;
  el.className = 'msg ' + (ok ? 'ok' : 'ko');
}

const fcfa = (n) => `${Number(n).toLocaleString('fr-FR')} FCFA`;

async function checkHealth() {
  const el = $('health');
  try {
    await api('/health');
    el.textContent = 'API en ligne';
    el.className = 'health up';
  } catch (_) {
    el.textContent = 'API hors ligne';
    el.className = 'health down';
  }
}

async function loadPlans() {
  const box = $('plans');
  const select = $('plan');
  try {
    const plans = await api('/api/plans');
    box.replaceChildren();
    select.replaceChildren();
    for (const p of plans) {
      const card = document.createElement('article');
      card.className = 'plan';

      const tag = document.createElement('span');
      tag.className = 'tag';
      tag.textContent = p.type;
      const title = document.createElement('h3');
      title.textContent = p.name;
      const price = document.createElement('div');
      price.className = 'price';
      price.textContent = fcfa(p.price_xaf);
      const desc = document.createElement('p');
      desc.textContent = p.description || '';
      card.append(tag, title, price, desc);
      box.append(card);

      const opt = document.createElement('option');
      opt.value = p.id;
      opt.textContent = `${p.name} – ${fcfa(p.price_xaf)}`;
      select.append(opt);
    }
  } catch (err) {
    box.textContent = 'Impossible de charger les forfaits : ' + err.message;
  }
}

async function loadHistory(phone) {
  const list = $('history');
  const msg = $('history-msg');
  list.replaceChildren();
  try {
    const rows = await api('/api/subscriptions/' + encodeURIComponent(phone));
    if (rows.length === 0) {
      setMsg(msg, 'Aucune souscription pour ce numéro.', true);
      return;
    }
    setMsg(msg, `${rows.length} souscription(s).`, true);
    for (const r of rows) {
      const li = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = `${r.plan_name} – ${fcfa(r.price_xaf)}`;
      const when = document.createElement('time');
      when.dateTime = r.created_at;
      when.textContent = new Date(r.created_at).toLocaleString('fr-FR');
      li.append(label, when);
      list.append(li);
    }
  } catch (err) {
    setMsg(msg, err.message, false);
  }
}

$('subscribe').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msg = $('subscribe-msg');
  try {
    const sub = await api('/api/subscriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: $('phone').value, plan_id: $('plan').value }),
    });
    setMsg(msg, `Souscription enregistrée : ${sub.plan_name} pour le ${sub.phone}.`, true);
    $('history-phone').value = sub.phone;
    loadHistory(sub.phone);
  } catch (err) {
    setMsg(msg, err.message, false);
  }
});

$('history-form').addEventListener('submit', (e) => {
  e.preventDefault();
  loadHistory($('history-phone').value);
});

checkHealth();
setInterval(checkHealth, 15000);
loadPlans();
