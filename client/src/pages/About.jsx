import { Link } from 'react-router-dom';
import { ArrowRight, FlaskConical, Gauge, HeartHandshake, ShieldCheck } from 'lucide-react';
import HeroArt from '../components/HeroArt.jsx';

const VALUES = [
  { icon: Gauge, title: 'Simplicité', text: 'Un parcours d’achat en quatre étapes, pensé d’abord pour le mobile.' },
  { icon: ShieldCheck, title: 'Transparence', text: 'Prix, volume et durée affichés clairement, reçu pour chaque achat.' },
  { icon: HeartHandshake, title: 'Proximité', text: 'Une assistance disponible 24h/24 et un historique toujours accessible.' },
];

export default function About() {
  return (
    <div className="page">
      <section className="page-hero">
        <div className="container about-grid">
          <div>
            <h1>À propos de <span className="hl">NetConnect</span></h1>
            <p className="lead">
              NetConnect est une plateforme de vente de forfaits Internet mobile. Elle permet de comparer les offres,
              de souscrire en quelques secondes et de garder une trace de chaque achat.
            </p>
            <Link to="/forfaits" className="btn btn-primary btn-lg">Voir les forfaits <ArrowRight size={18} /></Link>
          </div>
          <HeroArt variant="mini" />
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="value-grid">
            {VALUES.map(({ icon: Icon, title, text }) => (
              <div className="card value" key={title}>
                <span className="feature-icon"><Icon size={22} /></span>
                <h3>{title}</h3>
                <p className="muted">{text}</p>
              </div>
            ))}
          </div>
          <div className="alert alert-warning mt">
            <FlaskConical size={20} />
            <div>
              <strong>Projet académique de démonstration</strong>
              <p>
                Les paiements MTN Mobile Money et Orange Money sont entièrement simulés : aucune API réelle n’est contactée,
                aucun code PIN n’est demandé et aucun argent n’est débité.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
