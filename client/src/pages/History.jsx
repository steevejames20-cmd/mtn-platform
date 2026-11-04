import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, Eye, History as HistoryIcon, KeyRound, LogOut, MessageSquareText, Phone, RotateCcw, Search, ShieldCheck } from 'lucide-react';
import { EmptyState, ErrorState, Field, Modal, OperatorChip, PageLoader, Spinner, TxStatusBadge } from '../components/ui.jsx';
import { api, tokens } from '../lib/api.js';
import { downloadReceipt } from '../lib/receipt.js';
import { formatDateTime, formatDuration, formatPhone, formatPrice, formatVolume, phoneError } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

export default function History() {
  const [token, setToken] = useState(tokens.history());
  const logout = useCallback(() => {
    tokens.setHistory(null);
    setToken(null);
  }, []);
  return (
    <div className="page">
      <section className="page-hero">
        <div className="container">
          <h1><span className="hl">Mon historique</span> de souscriptions</h1>
          <p className="lead">Consultez vos achats de forfaits et vos transactions, réussies, échouées ou annulées.</p>
        </div>
      </section>
      <div className="container">
        {token ? <HistoryList onLogout={logout} /> : <Verify onVerified={(t) => { tokens.setHistory(t); setToken(t); }} />}
      </div>
    </div>
  );
}

function Verify({ onVerified }) {
  const toast = useToast();
  const [phone, setPhone] = useState('');
  const [step, setStep] = useState('phone');
  const [demoCode, setDemoCode] = useState(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const requestCode = async (e) => {
    e?.preventDefault();
    const err = phoneError(phone);
    if (err) return setError(err);
    setError(null);
    setLoading(true);
    try {
      const d = await api('/history/request-code', { method: 'POST', body: { phone } });
      setDemoCode(d.demoCode);
      setCode('');
      setStep('code');
      toast.info('Code de vérification envoyé (SMS simulé)');
    } catch (e2) {
      setError(e2.message);
    } finally {
      setLoading(false);
    }
  };

  const verify = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code.trim())) return setError('Le code doit contenir 6 chiffres');
    setError(null);
    setLoading(true);
    try {
      const d = await api('/history/verify', { method: 'POST', body: { phone, code: code.trim() } });
      toast.success('Numéro vérifié');
      onVerified(d.token);
    } catch (e2) {
      setError(e2.message);
      setLoading(false);
    }
  };

  return (
    <div className="verify-wrap">
      <div className="card verify-card">
        <span className="verify-icon"><ShieldCheck size={28} /></span>
        {step === 'phone' ? (
          <form onSubmit={requestCode} noValidate>
            <h2>Accéder à mon historique</h2>
            <p className="muted">Saisissez votre numéro : un code de vérification vous sera envoyé. Seules les transactions de ce numéro seront affichées.</p>
            <Field label="Numéro de téléphone" required error={error} htmlFor="hphone">
              <div className="input-icon">
                <Phone size={18} />
                <input id="hphone" type="tel" inputMode="tel" placeholder="Ex. 677 12 34 56" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </Field>
            <button className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <Spinner label="Envoi…" /> : 'Recevoir un code'}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} noValidate>
            <h2>Vérification</h2>
            <p className="muted">Entrez le code à 6 chiffres envoyé au <b>{phone}</b>.</p>
            <div className="sms-demo">
              <MessageSquareText size={20} />
              <div>
                <small>SMS simulé — environnement de démonstration</small>
                <p>Votre code NetConnect : <b className="code">{demoCode}</b> (valable 5 min)</p>
              </div>
            </div>
            <Field label="Code de vérification" required error={error} htmlFor="hcode">
              <div className="input-icon">
                <KeyRound size={18} />
                <input id="hcode" inputMode="numeric" maxLength={6} placeholder="000000" value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} autoFocus />
              </div>
            </Field>
            <button className="btn btn-primary btn-block" disabled={loading}>
              {loading ? <Spinner label="Vérification…" /> : 'Valider'}
            </button>
            <div className="row-between small">
              <button type="button" className="link-btn" onClick={() => { setStep('phone'); setError(null); }}>Changer de numéro</button>
              <button type="button" className="link-btn" onClick={requestCode} disabled={loading}>Renvoyer un code</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const EMPTY = { q: '', status: '', operator: '', from: '', to: '' };

function HistoryList({ onLogout }) {
  const toast = useToast();
  const [filters, setFilters] = useState(EMPTY);
  const [q, setQ] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => setFilters((f) => (f.q === q.trim() ? f : { ...f, q: q.trim() })), 350);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api('/history', { auth: 'history', query: filters })
      .then(setData)
      .catch((e) => {
        if (e.status === 401) {
          toast.info('Session expirée, veuillez vérifier à nouveau votre numéro');
          onLogout();
        } else setError(e.message);
      })
      .finally(() => setLoading(false));
  }, [filters, onLogout, toast]);
  useEffect(load, [load]);

  const set = (k) => (e) => setFilters((f) => ({ ...f, [k]: e.target.value }));
  const hasFilters = Object.entries(filters).some(([, v]) => v) || q;

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return <PageLoader label="Chargement de votre historique…" />;

  const s = data.summary;
  return (
    <>
      <div className="history-head">
        <div>
          <span className="muted small">Numéro vérifié</span>
          <h2><Phone size={20} /> {formatPhone(data.phone)}</h2>
        </div>
        <button className="btn btn-ghost" onClick={onLogout}><LogOut size={16} /> Changer de numéro</button>
      </div>

      <div className="mini-stats">
        <div><strong>{s.SUCCESS}</strong><span>Réussies</span></div>
        <div><strong>{s.FAILED}</strong><span>Échouées</span></div>
        <div><strong>{s.CANCELLED}</strong><span>Annulées</span></div>
        <div><strong>{formatPrice(s.spent)}</strong><span>Total dépensé</span></div>
      </div>

      <div className="filters card">
        <div className="search-input">
          <Search size={18} />
          <input type="search" placeholder="Rechercher par forfait ou référence" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher" />
        </div>
        <div className="filter-row">
          <label className="inline-label">Du <input type="date" value={filters.from} onChange={set('from')} /></label>
          <label className="inline-label">Au <input type="date" value={filters.to} onChange={set('to')} /></label>
          <select value={filters.operator} onChange={set('operator')} aria-label="Opérateur">
            <option value="">Tous les opérateurs</option>
            <option value="MTN_MOMO">MTN Mobile Money</option>
            <option value="ORANGE_MONEY">Orange Money</option>
          </select>
          <select value={filters.status} onChange={set('status')} aria-label="Statut">
            <option value="">Tous les statuts</option>
            <option value="SUCCESS">Réussie</option>
            <option value="FAILED">Échouée</option>
            <option value="CANCELLED">Annulée</option>
          </select>
          {hasFilters && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setQ(''); setFilters(EMPTY); }}><RotateCcw size={14} /> Réinitialiser</button>
          )}
          {loading && <Spinner />}
        </div>
      </div>

      {data.transactions.length === 0 ? (
        <EmptyState title={hasFilters ? 'Aucune transaction pour ces critères' : 'Aucune transaction pour ce numéro'} icon={HistoryIcon}>
          <Link to="/forfaits" className="btn btn-primary">Découvrir les forfaits</Link>
        </EmptyState>
      ) : (
        <div className="table-wrap card">
          <table className="table responsive">
            <thead>
              <tr>
                <th>Date</th><th>Forfait</th><th>Montant</th><th>Opérateur</th><th>Référence</th><th>Statut</th><th />
              </tr>
            </thead>
            <tbody>
              {data.transactions.map((t) => (
                <tr key={t.id}>
                  <td data-label="Date">{formatDateTime(t.createdAt)}</td>
                  <td data-label="Forfait">
                    <strong>{t.subscription.planName}</strong>
                    <div className="small muted">{formatVolume(t.subscription.volumeMb)} · {formatDuration(t.subscription.durationHours)}</div>
                  </td>
                  <td data-label="Montant">{formatPrice(t.amount)}</td>
                  <td data-label="Opérateur"><OperatorChip operator={t.operator} /></td>
                  <td data-label="Référence"><code>{t.reference}</code></td>
                  <td data-label="Statut"><TxStatusBadge status={t.status} /></td>
                  <td className="actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => setDetail(t)}><Eye size={15} /> Détails</button>
                    {t.status === 'SUCCESS' && (
                      <button className="btn btn-ghost btn-sm" onClick={() => downloadReceipt(t)} aria-label="Télécharger le reçu"><Download size={15} /> Reçu</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={Boolean(detail)} title="Détails de la transaction" onClose={() => setDetail(null)}
        footer={detail && (
          <>
            {detail.status === 'SUCCESS' && <button className="btn btn-primary" onClick={() => downloadReceipt(detail)}><Download size={16} /> Télécharger le reçu</button>}
            <button className="btn btn-ghost" onClick={() => setDetail(null)}>Fermer</button>
          </>
        )}>
        {detail && (
          <dl className="kv">
            <dt>Référence</dt><dd><code>{detail.reference}</code></dd>
            <dt>Date et heure</dt><dd>{formatDateTime(detail.createdAt)}</dd>
            <dt>Statut</dt><dd><TxStatusBadge status={detail.status} /></dd>
            {detail.failureReason && (<><dt>Motif</dt><dd>{detail.failureReason}</dd></>)}
            <dt>Forfait</dt><dd>{detail.subscription.planName}</dd>
            <dt>Volume</dt><dd>{formatVolume(detail.subscription.volumeMb)}</dd>
            <dt>Validité</dt><dd>{formatDuration(detail.subscription.durationHours)}</dd>
            <dt>Montant</dt><dd>{formatPrice(detail.amount)}</dd>
            <dt>Numéro bénéficiaire</dt><dd>{formatPhone(detail.subscription.phone)}</dd>
            <dt>Numéro payeur</dt><dd>{formatPhone(detail.payerPhone)}</dd>
            <dt>Mode de paiement</dt><dd><OperatorChip operator={detail.operator} /></dd>
            {detail.status === 'SUCCESS' && detail.subscription.expiresAt && (<><dt>Expiration</dt><dd>{formatDateTime(detail.subscription.expiresAt)}</dd></>)}
          </dl>
        )}
      </Modal>
    </>
  );
}
