import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Eye, Receipt, RotateCcw, Search } from 'lucide-react';
import { EmptyState, ErrorState, OperatorChip, PageLoader, Spinner, SubStatusBadge, TxStatusBadge } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { formatDateTime, formatPhone, formatPrice, formatVolume } from '../../lib/format.js';

const KEYS = ['q', 'status', 'operator', 'from', 'to', 'page'];

export default function AdminSubscriptions() {
  const [params, setParams] = useSearchParams();
  const filters = Object.fromEntries(KEYS.map((k) => [k, params.get(k) || '']));
  const [q, setQ] = useState(filters.q);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  const key = params.toString();

  const update = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    if (k !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  useEffect(() => {
    const t = setTimeout(() => q.trim() !== filters.q && update('q', q.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    api('/admin/subscriptions', { auth: 'admin', query: { ...Object.fromEntries(new URLSearchParams(key)), pageSize: 10 } })
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [key, reload]);

  const hasFilters = KEYS.some((k) => k !== 'page' && filters[k]);

  return (
    <>
      <div className="admin-title">
        <h1><Receipt /> Souscriptions</h1>
        {data && <span className="muted">{data.total} résultat{data.total > 1 ? 's' : ''}</span>}
      </div>

      <div className="filters card">
        <div className="search-input">
          <Search size={18} />
          <input type="search" placeholder="Numéro, forfait ou référence de transaction" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher" />
        </div>
        <div className="filter-row">
          <select value={filters.status} onChange={(e) => update('status', e.target.value)} aria-label="Statut">
            <option value="">Tous les statuts</option>
            <option value="ACTIVE">Activé</option>
            <option value="PENDING">En attente</option>
            <option value="FAILED">Échoué</option>
            <option value="CANCELLED">Annulé</option>
          </select>
          <select value={filters.operator} onChange={(e) => update('operator', e.target.value)} aria-label="Opérateur">
            <option value="">Tous les opérateurs</option>
            <option value="MTN_MOMO">MTN Mobile Money</option>
            <option value="ORANGE_MONEY">Orange Money</option>
          </select>
          <label className="inline-label">Du <input type="date" value={filters.from} onChange={(e) => update('from', e.target.value)} /></label>
          <label className="inline-label">Au <input type="date" value={filters.to} onChange={(e) => update('to', e.target.value)} /></label>
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setQ(''); setParams({}, { replace: true }); }}><RotateCcw size={14} /> Réinitialiser</button>
          )}
          {loading && data && <Spinner />}
        </div>
      </div>

      {error ? (
        <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
      ) : !data ? (
        <PageLoader />
      ) : data.subscriptions.length === 0 ? (
        <EmptyState title="Aucune souscription trouvée" icon={Receipt} />
      ) : (
        <>
          <div className="table-wrap card">
            <table className="table responsive">
              <thead>
                <tr><th>Date</th><th>Numéro</th><th>Forfait</th><th>Montant</th><th>Opérateur</th><th>Référence</th><th>Statut</th><th /></tr>
              </thead>
              <tbody>
                {data.subscriptions.map((s) => {
                  const tx = s.transactions[0];
                  return (
                    <tr key={s.id}>
                      <td data-label="Date">{formatDateTime(s.createdAt)}</td>
                      <td data-label="Numéro">{formatPhone(s.phone)}</td>
                      <td data-label="Forfait">{s.planName}<div className="small muted">{formatVolume(s.volumeMb)}</div></td>
                      <td data-label="Montant">{formatPrice(s.price)}</td>
                      <td data-label="Opérateur">{tx ? <OperatorChip operator={tx.operator} /> : '—'}</td>
                      <td data-label="Référence">
                        {tx ? <code>{tx.reference}</code> : <span className="muted">—</span>}
                        {s._count.transactions > 1 && <div className="small muted">{s._count.transactions} tentatives · dernière : <TxStatusBadge status={tx.status} /></div>}
                      </td>
                      <td data-label="Statut"><SubStatusBadge status={s.status} /></td>
                      <td className="actions"><Link to={`/admin/souscriptions/${s.id}`} className="btn btn-ghost btn-sm"><Eye size={15} /> Détails</Link></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button className="btn btn-ghost btn-sm" disabled={data.page <= 1} onClick={() => update('page', String(data.page - 1))}><ChevronLeft size={16} /> Précédent</button>
            <span>Page {data.page} / {data.pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={data.page >= data.pages} onClick={() => update('page', String(data.page + 1))}>Suivant <ChevronRight size={16} /></button>
          </div>
        </>
      )}
    </>
  );
}
