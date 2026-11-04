import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, CreditCard, Lock, Phone, Smartphone, XCircle } from 'lucide-react';
import { ErrorState, Field, Modal, PageLoader, SimulationBanner, Spinner } from '../components/ui.jsx';
import { Stepper } from './Subscribe.jsx';
import { api } from '../lib/api.js';
import { formatDuration, formatPhone, formatPrice, formatVolume, guessOperator, normalizePhone, OPERATORS, phoneError } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

export default function Payment() {
  const { subscriptionId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [sub, setSub] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [operator, setOperator] = useState('');
  const [payerPhone, setPayerPhone] = useState('');
  const [touched, setTouched] = useState(false);
  const [modal, setModal] = useState(false);
  const [processing, setProcessing] = useState(null); // 'confirm' | 'fail' | 'cancel'
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    api(`/subscriptions/${subscriptionId}`)
      .then(({ subscription }) => {
        if (subscription.status === 'ACTIVE' && subscription.transactions[0]) {
          navigate(`/confirmation/${subscription.transactions[0].reference}`, { replace: true });
          return;
        }
        setSub(subscription);
        setPayerPhone(formatPhone(subscription.phone));
        setOperator(guessOperator(subscription.phone) || '');
      })
      .catch((e) => setLoadError(e.message));
  }, [subscriptionId, navigate]);

  const phoneErr = touched ? phoneError(payerPhone) : null;
  const operatorErr = touched && !operator ? 'Choisissez un mode de paiement' : null;

  const openSimulation = (e) => {
    e.preventDefault();
    setTouched(true);
    if (!operator || phoneError(payerPhone)) return;
    setLastResult(null);
    setModal(true);
  };

  const run = async (action) => {
    setProcessing(action);
    try {
      // délai simulant l'échange avec l'opérateur
      await wait(action === 'cancel' ? 400 : 1600);
      const { transaction } = await api('/payments', {
        method: 'POST',
        body: { subscriptionId, operator, payerPhone: normalizePhone(payerPhone), action },
      });
      setModal(false);
      if (transaction.status === 'SUCCESS') {
        toast.success('Paiement simulé avec succès !');
        navigate(`/confirmation/${transaction.reference}`);
        return;
      }
      setLastResult(transaction);
      if (transaction.status === 'CANCELLED') toast.info('Paiement annulé');
      else toast.error('Le paiement a échoué');
    } catch (err) {
      toast.error(err.message);
      if (err.status === 409) navigate(0);
    } finally {
      setProcessing(null);
    }
  };

  if (loadError) {
    return (
      <div className="container page-pad">
        <ErrorState message={loadError} />
        <div className="center"><Link to="/forfaits" className="btn btn-primary">Retour aux forfaits</Link></div>
      </div>
    );
  }
  if (!sub) return <PageLoader label="Préparation du paiement…" />;

  const op = OPERATORS[operator];

  return (
    <div className="container page-pad">
      <Link to={sub.planId ? `/souscrire/${sub.planId}` : '/forfaits'} className="back-link"><ArrowLeft size={16} /> Modifier la souscription</Link>
      <h1 className="page-title"><CreditCard /> Paiement</h1>
      <Stepper current={2} />
      <SimulationBanner />

      <div className="split">
        <form className="card form-card" onSubmit={openSimulation} noValidate>
          <h2 className="card-title">Choisissez votre mode de paiement</h2>

          <div className="pay-options" role="radiogroup" aria-label="Mode de paiement">
            {Object.entries(OPERATORS).map(([key, o]) => (
              <button
                type="button"
                key={key}
                role="radio"
                aria-checked={operator === key}
                className={`pay-option ${operator === key ? 'selected' : ''}`}
                onClick={() => setOperator(key)}
              >
                <span className={`radio-dot ${operator === key ? 'on' : ''}`} />
                <span className="pay-logo" style={{ background: o.color, color: o.text }}>
                  <Smartphone size={18} /> {o.short}
                </span>
                <span className="pay-text">
                  <strong>{o.label}</strong>
                  <small>Payez facilement avec {o.label} (simulé)</small>
                </span>
              </button>
            ))}
          </div>
          {operatorErr && <p className="field-error">{operatorErr}</p>}

          <Field label={`Numéro ${op ? op.label : 'Mobile Money'} du payeur`} required error={phoneErr} htmlFor="payer"
            hint="Astuce test : un numéro se terminant par 0000 provoque un échec de paiement.">
            <div className="input-icon">
              <Phone size={18} />
              <input id="payer" type="tel" inputMode="tel" value={payerPhone} placeholder="Ex. 677 12 34 56"
                onChange={(e) => setPayerPhone(e.target.value)} onBlur={() => setTouched(true)} aria-invalid={Boolean(phoneErr)} />
            </div>
          </Field>

          <div className="amount-box">
            <span>Montant à payer</span>
            <strong>{formatPrice(sub.price)}</strong>
          </div>

          {lastResult && (
            <div className={`alert ${lastResult.status === 'FAILED' ? 'alert-error' : 'alert-info'}`}>
              <XCircle size={18} />
              <div>
                <strong>{lastResult.status === 'FAILED' ? 'Paiement échoué' : 'Paiement annulé'}</strong>
                <p>{lastResult.failureReason}</p>
                <p className="small">Référence : {lastResult.reference} — vous pouvez réessayer.</p>
              </div>
            </div>
          )}

          <button type="submit" className="btn btn-primary btn-block btn-lg">
            <Lock size={18} /> Simuler le paiement
          </button>
        </form>

        <aside className="card summary">
          <h2 className="card-title">Récapitulatif</h2>
          <dl className="kv">
            <dt>Forfait</dt><dd>{sub.planName}</dd>
            <dt>Volume</dt><dd>{formatVolume(sub.volumeMb)}</dd>
            <dt>Durée</dt><dd>{formatDuration(sub.durationHours)}</dd>
            <dt>Bénéficiaire</dt><dd>{formatPhone(sub.phone)}</dd>
          </dl>
          <div className="total">
            <span>Prix</span>
            <strong>{formatPrice(sub.price)}</strong>
          </div>
        </aside>
      </div>

      <Modal open={modal} title="Simulation de paiement – Environnement de test" onClose={() => !processing && setModal(false)} closable={!processing}>
        <div className="sim-modal">
          {processing && processing !== 'cancel' ? (
            <div className="sim-processing">
              <Spinner size={36} />
              <p>Traitement de la transaction simulée auprès de <b>{op?.label}</b>…</p>
            </div>
          ) : (
            <>
              <div className="sim-phone" style={{ '--op': op?.color }}>
                <div className="sim-phone-head" style={{ background: op?.color, color: op?.text }}>
                  {op?.label}
                </div>
                <p>Demande de paiement de</p>
                <strong className="sim-amount">{formatPrice(sub.price)}</strong>
                <p>au profit de <b>NetConnect</b></p>
                <p className="small muted">Compte débité (fictif) : {payerPhone}</p>
              </div>
              <SimulationBanner compact />
              <p className="small muted center">Aucun code PIN n’est demandé. Choisissez l’issue de la simulation :</p>
              <div className="sim-actions">
                <button className="btn btn-success" onClick={() => run('confirm')} disabled={Boolean(processing)}>
                  <CheckCircle2 size={18} /> Confirmer le paiement
                </button>
                <button className="btn btn-outline-danger" onClick={() => run('fail')} disabled={Boolean(processing)}>
                  <XCircle size={18} /> Simuler un échec
                </button>
                <button className="btn btn-ghost" onClick={() => run('cancel')} disabled={Boolean(processing)}>
                  {processing === 'cancel' ? <Spinner /> : 'Annuler le paiement'}
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
