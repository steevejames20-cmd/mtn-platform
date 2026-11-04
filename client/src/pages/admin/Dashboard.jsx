import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Ban, CheckCircle2, Coins, LayoutDashboard, Mail, Package, PackageCheck, Receipt, XCircle } from 'lucide-react';
import { EmptyState, ErrorState, OperatorChip, PageLoader, SubStatusBadge } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { formatDateTime, formatPhone, formatPrice, formatVolume, OPERATORS } from '../../lib/format.js';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    api('/admin/stats', { auth: 'admin' }).then(setData).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <PageLoader label="Chargement des statistiques…" />;

  const t = data.totals;
  const tiles = [
    { label: 'Forfaits au total', value: t.totalPlans, icon: Package, tone: 'yellow' },
    { label: 'Forfaits actifs', value: t.activePlans, icon: PackageCheck, tone: 'green' },
    { label: 'Souscriptions', value: t.totalSubscriptions, icon: Receipt, tone: 'blue' },
    { label: 'Transactions réussies', value: t.successfulTransactions, icon: CheckCircle2, tone: 'green' },
    { label: 'Transactions échouées', value: t.failedTransactions, icon: XCircle, tone: 'red' },
    { label: 'Transactions annulées', value: t.cancelledTransactions, icon: Ban, tone: 'grey' },
  ];
  const max = Math.max(1, ...data.revenueLast7Days.map((d) => d.revenue));
  const opTotal = data.byOperator.reduce((s, o) => s + o.revenue, 0) || 1;

  return (
    <>
      <div className="admin-title">
        <h1><LayoutDashboard /> Tableau de bord</h1>
        {t.unreadMessages > 0 && (
          <Link to="/admin/messages" className="btn btn-outline btn-sm"><Mail size={16} /> {t.unreadMessages} message{t.unreadMessages > 1 ? 's' : ''} non lu{t.unreadMessages > 1 ? 's' : ''}</Link>
        )}
      </div>

      <div className="revenue-hero card">
        <span className="tile-icon tone-dark"><Coins size={26} /></span>
        <div>
          <span className="muted small">Chiffre d’affaires simulé</span>
          <strong>{formatPrice(t.revenue)}</strong>
        </div>
        <span className="small muted">{t.activeSubscriptions} forfaits activés</span>
      </div>

      <div className="tiles">
        {tiles.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className={`tile tone-${tone}`}>
            <span className="tile-icon"><Icon size={22} /></span>
            <div>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="dash-grid">
        <section className="card">
          <h2 className="card-title">Revenus des 7 derniers jours</h2>
          <div className="bars" role="img" aria-label="Revenus par jour sur 7 jours">
            {data.revenueLast7Days.map((d) => (
              <div key={d.date} className="bar-col" title={`${d.label} : ${formatPrice(d.revenue)} (${d.count} vente${d.count > 1 ? 's' : ''})`}>
                <span className="bar-val">{d.revenue ? `${String(Math.round(d.revenue / 100) / 10).replace('.', ',')}k` : ''}</span>
                <div className="bar" style={{ height: `${(d.revenue / max) * 100}%` }} />
                <span className="bar-label">{d.label}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <h2 className="card-title">Répartition par opérateur</h2>
          {data.byOperator.length === 0 ? (
            <p className="muted">Aucune vente pour le moment.</p>
          ) : (
            <div className="op-split">
              {data.byOperator.map((o) => (
                <div key={o.operator}>
                  <div className="row-between">
                    <OperatorChip operator={o.operator} />
                    <span className="small"><b>{formatPrice(o.revenue)}</b> · {o.count} ventes</span>
                  </div>
                  <div className="progress"><span style={{ width: `${(o.revenue / opTotal) * 100}%`, background: OPERATORS[o.operator]?.color }} /></div>
                </div>
              ))}
            </div>
          )}
          <h2 className="card-title mt">Forfaits les plus vendus</h2>
          <ol className="top-list">
            {data.topPlans.map((p) => (
              <li key={p.planName}><span>{p.planName}</span><b>{p.count}</b></li>
            ))}
          </ol>
        </section>
      </div>

      <section className="card">
        <div className="row-between">
          <h2 className="card-title">Dernières souscriptions</h2>
          <Link to="/admin/souscriptions" className="btn btn-ghost btn-sm">Tout voir <ArrowRight size={14} /></Link>
        </div>
        {data.latestSubscriptions.length === 0 ? (
          <EmptyState title="Aucune souscription" />
        ) : (
          <div className="table-wrap">
            <table className="table responsive">
              <thead><tr><th>Numéro</th><th>Forfait</th><th>Montant</th><th>Date</th><th>Statut</th><th /></tr></thead>
              <tbody>
                {data.latestSubscriptions.map((s) => (
                  <tr key={s.id}>
                    <td data-label="Numéro">{formatPhone(s.phone)}</td>
                    <td data-label="Forfait">{s.planName} ({formatVolume(s.volumeMb)})</td>
                    <td data-label="Montant">{formatPrice(s.price)}</td>
                    <td data-label="Date">{formatDateTime(s.createdAt)}</td>
                    <td data-label="Statut"><SubStatusBadge status={s.status} /></td>
                    <td className="actions"><Link to={`/admin/souscriptions/${s.id}`} className="btn btn-ghost btn-sm">Détails</Link></td>
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
