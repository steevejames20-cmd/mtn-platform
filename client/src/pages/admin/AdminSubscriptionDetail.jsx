import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Download, Receipt } from 'lucide-react';
import { ErrorState, OperatorChip, PageLoader, SubStatusBadge, TxStatusBadge } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { downloadReceipt } from '../../lib/receipt.js';
import { formatDateTime, formatDuration, formatPhone, formatPrice, formatVolume } from '../../lib/format.js';

export default function AdminSubscriptionDetail() {
  const { id } = useParams();
  const [sub, setSub] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api(`/admin/subscriptions/${id}`, { auth: 'admin' }).then((d) => setSub(d.subscription)).catch((e) => setError(e.message));
  }, [id]);

  if (error) return <ErrorState message={error} />;
  if (!sub) return <PageLoader />;

  return (
    <>
      <Link to="/admin/souscriptions" className="back-link"><ArrowLeft size={16} /> Retour aux souscriptions</Link>
      <div className="admin-title">
        <h1><Receipt /> Détail de la souscription</h1>
        <SubStatusBadge status={sub.status} />
      </div>

      <div className="dash-grid">
        <section className="card">
          <h2 className="card-title">Souscription</h2>
          <dl className="kv">
            <dt>Identifiant</dt><dd><code>{sub.id}</code></dd>
            <dt>Numéro bénéficiaire</dt><dd>{formatPhone(sub.phone)}</dd>
            <dt>Créée le</dt><dd>{formatDateTime(sub.createdAt)}</dd>
            <dt>Activée le</dt><dd>{formatDateTime(sub.activatedAt)}</dd>
            <dt>Expire le</dt><dd>{formatDateTime(sub.expiresAt)}</dd>
          </dl>
        </section>
        <section className="card">
          <h2 className="card-title">Forfait souscrit</h2>
          <dl className="kv">
            <dt>Nom</dt><dd>{sub.planName}</dd>
            <dt>Volume</dt><dd>{formatVolume(sub.volumeMb)}</dd>
            <dt>Validité</dt><dd>{formatDuration(sub.durationHours)}</dd>
            <dt>Prix</dt><dd>{formatPrice(sub.price)}</dd>
            <dt>Forfait au catalogue</dt><dd>{sub.plan ? (sub.plan.active ? 'Actif' : 'Désactivé') : 'Supprimé'}</dd>
          </dl>
        </section>
      </div>

      <section className="card">
        <h2 className="card-title">Transactions ({sub.transactions.length})</h2>
        {sub.transactions.length === 0 ? (
          <p className="muted">Aucune tentative de paiement pour cette souscription.</p>
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>Date</th><th>Référence</th><th>Opérateur</th><th>Payeur</th><th>Montant</th><th>Statut</th><th>Motif</th><th /></tr></thead>
              <tbody>
                {sub.transactions.map((t) => (
                  <tr key={t.id}>
                    <td data-label="Date">{formatDateTime(t.createdAt)}</td>
                    <td data-label="Référence"><code>{t.reference}</code></td>
                    <td data-label="Opérateur"><OperatorChip operator={t.operator} /></td>
                    <td data-label="Payeur">{formatPhone(t.payerPhone)}</td>
                    <td data-label="Montant">{formatPrice(t.amount)}</td>
                    <td data-label="Statut"><TxStatusBadge status={t.status} /></td>
                    <td data-label="Motif" className="small">{t.failureReason || '—'}</td>
                    <td className="actions">
                      {t.status === 'SUCCESS' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => downloadReceipt({ ...t, subscription: sub })}><Download size={15} /> Reçu</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
