import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, BadgeCheck, CreditCard, Headphones, History, ListChecks, Smartphone, Zap } from 'lucide-react';
import HeroArt from '../components/HeroArt.jsx';
import PlanCard from '../components/PlanCard.jsx';
import { ErrorState, PageLoader } from '../components/ui.jsx';
import { api } from '../lib/api.js';

const FEATURES = [
  { icon: Zap, title: 'Connexion ultra rapide', text: 'Votre forfait est activé immédiatement après le paiement.' },
  { icon: BadgeCheck, title: 'Paiement sécurisé', text: 'MTN Mobile Money ou Orange Money (simulation de test).' },
  { icon: Headphones, title: 'Assistance 24h/24 – 7j/7', text: 'Une équipe à votre écoute à tout moment.' },
];

const STEPS = [
  { icon: ListChecks, title: 'Choisissez', text: 'Comparez nos forfaits par prix, volume et durée.' },
  { icon: Smartphone, title: 'Renseignez', text: 'Indiquez le numéro qui recevra le forfait.' },
  { icon: CreditCard, title: 'Payez', text: 'Validez avec MTN MoMo ou Orange Money.' },
  { icon: BadgeCheck, title: 'Profitez', text: 'Recevez votre reçu et surfez sans attendre.' },
];

export default function Home() {
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState(null);

  const load = () => {
    setError(null);
    api('/plans', { query: { popular: 1, sort: 'price_asc' } })
      .then((d) => setPlans(d.plans.slice(0, 4)))
      .catch((e) => setError(e.message));
  };
  useEffect(load, []);

  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div className="hero-copy fade-up">
            <span className="eyebrow">Forfaits Internet mobile</span>
            <h1>
              Restez connecté partout, tout le temps avec <mark>NetConnect</mark> !
            </h1>
            <p className="lead">
              Souscrivez facilement à vos forfaits Internet et profitez d’une connexion ultra rapide, en quelques clics.
            </p>
            <div className="hero-cta">
              <Link to="/forfaits" className="btn btn-primary btn-lg">
                Découvrir les forfaits <ArrowRight size={18} />
              </Link>
              <Link to="/historique" className="btn btn-outline btn-lg">
                <History size={18} /> Mon historique
              </Link>
            </div>
          </div>
          <div className="hero-visual fade-up delay-1">
            <HeroArt />
          </div>
        </div>
        <div className="container">
          <div className="feature-strip">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="feature">
                <span className="feature-icon">
                  <Icon size={22} />
                </span>
                <div>
                  <strong>{title}</strong>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <div>
              <h2>
                Nos forfaits <span className="hl">populaires</span>
              </h2>
              <p className="muted">Les offres préférées de nos clients.</p>
            </div>
            <Link to="/forfaits" className="btn btn-ghost">
              Voir tous les forfaits <ArrowRight size={16} />
            </Link>
          </div>
          {error ? (
            <ErrorState message={error} onRetry={load} />
          ) : !plans ? (
            <PageLoader label="Chargement des forfaits…" />
          ) : (
            <div className="plan-grid">
              {plans.map((p) => (
                <PlanCard key={p.id} plan={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section section-alt">
        <div className="container">
          <div className="section-head center">
            <h2>
              Comment ça <span className="hl">marche</span> ?
            </h2>
            <p className="muted">Quatre étapes, moins d’une minute.</p>
          </div>
          <ol className="steps">
            {STEPS.map(({ icon: Icon, title, text }, i) => (
              <li key={title} className="step">
                <span className="step-num">{i + 1}</span>
                <Icon size={26} />
                <strong>{title}</strong>
                <p>{text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="promo">
            <div>
              <h2>Profitez d’Internet à petit prix !</h2>
              <p>Naviguez, regardez, travaillez sans interruption. Des forfaits dès 100 FCFA.</p>
            </div>
            <Link to="/forfaits" className="btn btn-dark btn-lg">
              Je choisis mon forfait <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
