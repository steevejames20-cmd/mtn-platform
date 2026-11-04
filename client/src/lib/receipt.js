import { formatDateTime, formatDuration, formatPhone, formatPrice, formatVolume, OPERATORS, TX_STATUS } from './format.js';

/** Génère et télécharge le reçu PDF d'une transaction */
export async function downloadReceipt(tx) {
  const doc = await buildReceipt(tx);
  doc.save(`recu-${tx.reference}.pdf`);
}

/** Construit le document PDF du reçu (jsPDF chargé à la demande) */
export async function buildReceipt(tx) {
  const { jsPDF } = await import('jspdf');
  const sub = tx.subscription;
  const doc = new jsPDF({ unit: 'mm', format: 'a5' });
  const W = doc.internal.pageSize.getWidth();

  // bandeau
  doc.setFillColor(255, 204, 0);
  doc.rect(0, 0, W, 34, 'F');
  doc.setDrawColor(17, 17, 17);
  doc.setLineWidth(1.2);
  doc.ellipse(24, 17, 14, 9, 'S');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(17, 17, 17);
  doc.text('NC', 24, 19, { align: 'center' });
  doc.setFontSize(16);
  doc.text('NetConnect', 44, 15);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text('Reçu de souscription — forfait Internet', 44, 22);

  // mention simulation
  doc.setFillColor(255, 243, 205);
  doc.rect(10, 40, W - 20, 10, 'F');
  doc.setFontSize(8.5);
  doc.setTextColor(120, 80, 0);
  doc.text('SIMULATION DE PAIEMENT – ENVIRONNEMENT DE TEST – AUCUN DÉBIT RÉEL', W / 2, 46.3, { align: 'center' });

  const status = TX_STATUS[tx.status]?.label || tx.status;
  const rows = [
    ['Référence', tx.reference],
    ['Date et heure', formatDateTime(tx.createdAt)],
    ['Statut', status],
    ['Forfait', sub.planName],
    ['Volume Internet', formatVolume(sub.volumeMb)],
    ['Validité', formatDuration(sub.durationHours)],
    ['Numéro bénéficiaire', formatPhone(sub.phone)],
    ['Opérateur', OPERATORS[tx.operator]?.label || tx.operator],
    ['Numéro payeur', formatPhone(tx.payerPhone)],
  ];
  if (sub.expiresAt && tx.status === 'SUCCESS') rows.push(['Expire le', formatDateTime(sub.expiresAt)]);

  let y = 60;
  doc.setFontSize(10);
  for (const [k, v] of rows) {
    doc.setTextColor(110, 110, 110);
    doc.setFont('helvetica', 'normal');
    doc.text(k, 14, y);
    doc.setTextColor(17, 17, 17);
    doc.setFont('helvetica', 'bold');
    doc.text(String(v), W - 14, y, { align: 'right' });
    doc.setDrawColor(230, 230, 230);
    doc.setLineWidth(0.2);
    doc.line(14, y + 3, W - 14, y + 3);
    y += 9.5;
  }

  doc.setFillColor(17, 17, 17);
  doc.roundedRect(14, y + 2, W - 28, 14, 2, 2, 'F');
  doc.setTextColor(255, 204, 0);
  doc.setFontSize(12);
  doc.text('Montant payé', 20, y + 11);
  doc.text(formatPrice(tx.amount), W - 20, y + 11, { align: 'right' });

  doc.setTextColor(140, 140, 140);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Document généré automatiquement — projet académique de démonstration.', W / 2, 200, { align: 'center' });

  return doc;
}
