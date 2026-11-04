import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Clock, Phone, ShoppingCart, Wifi } from 'lucide-react';
import { ErrorState, Field, PageLoader, Spinner } from '../components/ui.jsx';
import HeroArt from '../components/HeroArt.jsx';
import { api } from '../lib/api.js';
import { formatDuration, formatPhone, formatPrice, formatVolume, normalizePhone, phoneError } from '../lib/format.js';
import { useToast } from '../context/ToastContext.jsx';

export default function Subscribe() {
  const { planId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [plan, setPlan] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState(null);

  const load = () => {
    setLoadError(null);
    api(`/plans/${planId}`).then((d) => setPlan(d.plan)).catch((e) => setLoadError(e.message));
  };
  useEffect(load, [planId]);

  const error = touched ? phoneError(phone) : null;
  const normalized = normalizePhone(phone);

  const submit = async (e) => {
    e.preventDefault();
    setTouched(true);
    setServerError(null);
    if (phoneError(phone)) return;
    setSubmitting(true);
    try {
      const { subscription } = await api('/subscriptions', { method: 'POST', body: { planId: plan.id, phone } });
      toast.success('Souscription enregistrée, place au paiement');
      navigate(`/paiement/${subscription.id}`);
    } catch (err) {
      setServerError(err.message);
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="container page-pad">
        <ErrorState message={loadError} />
        <div className="center"><Link to="/forfaits" className="btn btn-primary">Voir les forfaits disponibles</Link></div>
      </div>
    );
  }
  if (!plan) return <PageLoader label="Chargement du forfait…" />;

  return (
    <div className="container page-pad">
      <Link to="/forfaits" className="back-link"><ArrowLeft size={16} /> Retour aux forfaits</Link>
      <h1 className="page-title"><ShoppingCart /> Souscrire à un forfait</h1>
      <Stepper current={1} />

      <div className="split">
        <form className="card form-card" onSubmit={submit} noValidate>
          <h2 className="card-title">Détails de votre souscription</h2>

          <div className="selected-plan">
            <span className="radio-dot on" />
            <div>
              <strong>{plan.name} – {formatVolume(plan.volumeMb)} ({formatDuration(plan.durationHours)})</strong>
              <p className="muted small">{plan.description}</p>
            </div>
            <span className="price-tag">{formatPrice(plan.price)}</span>
          </div>
          <Link to="/forfaits" className="small link">Changer de forfait</Link>

          <Field label="Numéro de téléphone bénéficiaire" required error={error} htmlFor="phone"
            hint="Le forfait sera activé sur ce numéro. Format : 6XX XX XX XX (+237 facultatif)">
            <div className="input-icon">
              <Phone size={18} />
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="Ex. 677 12 34 56"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onBlur={() => setTouched(true)}
                aria-invalid={Boolean(error)}
              />
            </div>
          </Field>

          {serverError && <div className="alert alert-error">{serverError}</div>}

          <button type="submit" className="btn btn-primary btn-block btn-lg" disabled={submitting}>
            {submitting ? <Spinner label="Enregistrement…" /> : <>Continuer vers le paiement <ArrowRight size={18} /></>}
          </button>
        </form>

        <aside className="card summary">
          <h2 className="card-title">Récapitulatif de la commande</h2>
          <dl className="kv">
            <dt>Forfait</dt><dd>{plan.name}</dd>
            <dt><Wifi size={14} /> Volume</dt><dd>{formatVolume(plan.volumeMb)}</dd>
            <dt><Clock size={14} /> Validité</dt><dd>{formatDuration(plan.durationHours)}</dd>
            <dt><Phone size={14} /> Numéro</dt><dd>{normalized ? formatPhone(normalized) : '—'}</dd>
          </dl>
          <div className="total">
            <span>Total à payer</span>
            <strong>{formatPrice(plan.price)}</strong>
          </div>
          <div className="summary-art">
            <HeroArt variant="mini" />
          </div>
        </aside>
      </div>
    </div>
  );
}

export function Stepper({ current }) {
  const steps = ['Forfait', 'Numéro', 'Paiement', 'Confirmation'];
  return (
    <ol className="stepper" aria-label="Étapes de la souscription">
      {steps.map((s, i) => (
        <li key={s} className={i < current ? 'done' : i === current ? 'current' : ''}>
          <span>{i + 1}</span>
          {s}
        </li>
      ))}
    </ol>
  );
}
