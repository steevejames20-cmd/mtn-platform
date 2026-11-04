export const formatPrice = (n) => `${new Intl.NumberFormat('fr-FR').format(n).replace(/ | /g, ' ')} FCFA`;

export function formatVolume(mb) {
  if (mb >= 1024) {
    const go = mb / 1024;
    return `${Number.isInteger(go) ? go : go.toFixed(1).replace('.', ',')} Go`;
  }
  return `${mb} Mo`;
}

export function formatDuration(hours) {
  if (hours < 24) return `${hours} heure${hours > 1 ? 's' : ''}`;
  const days = Math.round(hours / 24);
  return `${days} jour${days > 1 ? 's' : ''}`;
}

export const formatDateTime = (d) =>
  d ? new Date(d).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

export const formatDate = (d) => (d ? new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—');

/** 677123456 -> 677 12 34 56 */
export const formatPhone = (p) => (p && p.length === 9 ? `${p.slice(0, 3)} ${p.slice(3, 5)} ${p.slice(5, 7)} ${p.slice(7)}` : p || '');

/** Même règle que le serveur : 9 chiffres commençant par 6, indicatif +237 accepté */
export function normalizePhone(input) {
  let digits = String(input || '').replace(/[\s.\-()]/g, '');
  if (digits.startsWith('+237')) digits = digits.slice(4);
  else if (digits.startsWith('00237')) digits = digits.slice(5);
  else if (digits.length === 12 && digits.startsWith('237')) digits = digits.slice(3);
  return /^6[5-9]\d{7}$/.test(digits) ? digits : null;
}

export function phoneError(input) {
  if (!String(input || '').trim()) return 'Le numéro de téléphone est obligatoire';
  if (!normalizePhone(input)) return 'Numéro invalide : saisissez 9 chiffres commençant par 6 (ex. 677 12 34 56)';
  return null;
}

/** Devine l'opérateur à partir du préfixe (indicatif, uniquement pour pré-sélection) */
export function guessOperator(phone) {
  const p = normalizePhone(phone);
  if (!p) return null;
  const p3 = Number(p.slice(0, 3));
  if ((p3 >= 655 && p3 <= 659) || (p3 >= 690 && p3 <= 699)) return 'ORANGE_MONEY';
  return 'MTN_MOMO';
}

export const OPERATORS = {
  MTN_MOMO: { label: 'MTN Mobile Money', short: 'MoMo', color: '#ffcc00', text: '#111' },
  ORANGE_MONEY: { label: 'Orange Money', short: 'OM', color: '#ff7900', text: '#fff' },
};

export const TX_STATUS = {
  SUCCESS: { label: 'Réussie', tone: 'success' },
  FAILED: { label: 'Échouée', tone: 'danger' },
  CANCELLED: { label: 'Annulée', tone: 'muted' },
};

export const SUB_STATUS = {
  ACTIVE: { label: 'Activé', tone: 'success' },
  PENDING: { label: 'En attente', tone: 'warning' },
  FAILED: { label: 'Échoué', tone: 'danger' },
  CANCELLED: { label: 'Annulé', tone: 'muted' },
};
