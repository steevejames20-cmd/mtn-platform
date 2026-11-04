import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Calendar, CheckCircle2, Clock, CreditCard, Download, Hash, Home, Phone, Printer, Wifi, XCircle } from 'lucide-react';
import { ErrorState, OperatorChip, PageLoader, SimulationBanner, TxStatusBadge } from '../components/ui.jsx';
import { Stepper } from './Subscribe.jsx';
import { api } from '../lib/api.js';
import { downloadReceipt } from '../lib/receipt.js';
import { formatDateTime, formatDuration, formatPhone, formatPrice, formatVolume } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

export default function Confirmation() {
  const { reference } = useParams();
  const toast = useToast();
  const [tx, setTx] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api(`/payments/${reference}`).then((d) => setTx(d.transaction)).catch((e) => setError(e.message));
  }, [reference]);

  if (error) {
    return (
      <div className="container page-pad">
        <ErrorState message={error} />
        <div className="center"><Link to="/" className="btn btn-primary">Retour à l’accueil</Link></div>
      </div>
    );
  }
  if (!tx) return <PageLoader label="Chargement de votre reçu…" />;

  const sub = tx.subscription;
  const ok = tx.status === 'SUCCESS';

  const download = async () => {
    try {
      await downloadReceipt(tx);
      toast.success('Reçu PDF téléchargé');
    } catch {
      toast.error('Impossible de générer le PDF');
    }
  };

  return (
    <div className="confirm-page">
      <div className="confirm-bg" aria-hidden />
      <div className="container page-pad">
        <div className="no-print"><Stepper current={ok ? 4 : 2} /></div>
        <div className="card receipt printable">
          <div className={`receipt-icon ${ok ? 'ok' : 'ko'}`}>{ok ? <CheckCircle2 size={56} /> : <XCircle size={56} />}</div>
          <h1>{ok ? 'Souscription réussie !' : 'Transaction non aboutie'}</h1>
          <p className="lead center">
            {ok
              ? 'Votre forfait a été activé avec succès. Vous pouvez dès maintenant profiter de votre connexion.'
              : tx.failureReason}
          </p>

          <div className="receipt-grid">
            <Row icon={Wifi} label="Forfait" value={`${sub.planName} — ${formatVolume(sub.volumeMb)}`} />
            <Row icon={Clock} label="Validité" value={formatDuration(sub.durationHours)} />
            <Row icon={CreditCard} label="Montant payé" value={<strong>{formatPrice(tx.amount)}</strong>} />
            <Row icon={Phone} label="Numéro" value={formatPhone(sub.phone)} />
            <Row icon={CreditCard} label="Opérateur" value={<OperatorChip operator={tx.operator} />} />
            <Row icon={Hash} label="Référence" value={<code>{tx.reference}</code>} />
            <Row icon={Calendar} label="Date et heure" value={formatDateTime(tx.createdAt)} />
            <Row icon={CheckCircle2} label="Statut" value={<TxStatusBadge status={tx.status} />} />
            {ok && sub.expiresAt && <Row icon={Calendar} label="Date d’expiration" value={formatDateTime(sub.expiresAt)} />}
          </div>

          <SimulationBanner compact />

          <div className="receipt-actions no-print">
            {ok && (
              <>
                <button className="btn btn-primary" onClick={download}><Download size={18} /> Télécharger le reçu (PDF)</button>
                <button className="btn btn-outline" onClick={() => window.print()}><Printer size={18} /> Imprimer</button>
              </>
            )}
            {!ok && <Link to={`/paiement/${sub.id}`} className="btn btn-primary">Réessayer le paiement</Link>}
            <Link to="/" className="btn btn-dark"><Home size={18} /> Retour à l’accueil</Link>
          </div>
          <p className="small muted center no-print">
            Retrouvez cette opération à tout moment dans <Link to="/historique" className="link">Mon historique</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }) {
  return (
    <div className="receipt-row">
      <span><Icon size={16} /> {label}</span>
      <span>{value}</span>
    </div>
  );
}
