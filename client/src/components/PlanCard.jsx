import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Star, Wifi } from 'lucide-react';
import { formatDuration, formatPrice, formatVolume } from '../lib/format.js';

export default function PlanCard({ plan, featured = false }) {
  return (
    <article className={`plan-card ${plan.popular ? 'is-popular' : ''} ${featured ? 'featured' : ''}`}>
      {plan.popular && (
        <span className="plan-ribbon">
          <Star size={12} fill="currentColor" /> Populaire
        </span>
      )}
      <header className="plan-head">
        <h3>{plan.name}</h3>
        <span className="plan-cat">{plan.category}</span>
      </header>
      <div className="plan-body">
        <div className="plan-volume">{formatVolume(plan.volumeMb)}</div>
        <div className="plan-duration">
          <Clock size={14} /> {formatDuration(plan.durationHours)}
        </div>
        <p className="plan-desc">{plan.description}</p>
        <div className="plan-price">{formatPrice(plan.price)}</div>
        <Link to={`/souscrire/${plan.id}`} className="btn btn-primary btn-block">
          Souscrire <ArrowRight size={16} />
        </Link>
      </div>
      <Wifi className="plan-watermark" size={90} aria-hidden />
    </article>
  );
}
