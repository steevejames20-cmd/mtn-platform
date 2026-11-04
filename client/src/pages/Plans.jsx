import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { RotateCcw, Search, SearchX, SlidersHorizontal, Star } from 'lucide-react';
import PlanCard from '../components/PlanCard.jsx';
import { EmptyState, ErrorState, PageLoader, Spinner } from '../components/ui.jsx';
import { api } from '../lib/api.js';

const VOLUMES = [
  { v: '', l: 'Tous les volumes' },
  { v: 'small', l: 'Moins de 1 Go' },
  { v: 'medium', l: '1 à 5 Go' },
  { v: 'large', l: '5 à 20 Go' },
  { v: 'xl', l: '20 Go et plus' },
];
const DURATIONS = [
  { v: '', l: 'Toutes les durées' },
  { v: 'day', l: 'Heure / Jour (≤ 24 h)' },
  { v: 'week', l: 'Semaine (2 à 7 jours)' },
  { v: 'month', l: 'Mois (plus de 7 jours)' },
];
const SORTS = [
  { v: 'popular', l: 'Popularité' },
  { v: 'price_asc', l: 'Prix croissant' },
  { v: 'price_desc', l: 'Prix décroissant' },
  { v: 'volume_desc', l: 'Volume décroissant' },
];
const PRICES = [
  { v: '', l: 'Tous les prix' },
  { v: '0-500', l: 'Jusqu’à 500 FCFA' },
  { v: '501-2000', l: '501 à 2 000 FCFA' },
  { v: '2001-6000', l: '2 001 à 6 000 FCFA' },
  { v: '6001-', l: 'Plus de 6 000 FCFA' },
];
const KEYS = ['q', 'price', 'volume', 'duration', 'sort', 'popular'];

export default function Plans() {
  const [params, setParams] = useSearchParams();
  const filters = useMemo(() => Object.fromEntries(KEYS.map((k) => [k, params.get(k) || ''])), [params]);
  const [search, setSearch] = useState(filters.q);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reload, setReload] = useState(0);

  const update = (key, value) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  // recherche avec délai (debounce) pour ne pas interroger l'API à chaque frappe
  useEffect(() => {
    const t = setTimeout(() => search !== filters.q && update('q', search.trim()), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const [minPrice, maxPrice] = filters.price ? filters.price.split('-') : [];
    api('/plans', {
      query: {
        q: filters.q, volume: filters.volume, duration: filters.duration, sort: filters.sort || 'popular',
        popular: filters.popular ? 1 : '', minPrice, maxPrice,
      },
    })
      .then((d) => !cancelled && setData(d))
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [filters, reload]);

  const activeCount = KEYS.filter((k) => k !== 'sort' && filters[k]).length;
  const reset = () => {
    setSearch('');
    setParams({}, { replace: true });
  };

  return (
    <div className="page">
      <section className="page-hero">
        <div className="container">
          <h1>
            Nos <span className="hl">Forfaits Internet</span>
          </h1>
          <p className="lead">Choisissez le forfait qui vous convient : comparez les prix, les volumes et les durées.</p>
        </div>
      </section>

      <div className="container">
        <div className="filters card">
          <div className="search-input">
            <Search size={18} />
            <input
              type="search"
              placeholder="Rechercher un forfait (ex. Premium, social, mensuel…)"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Rechercher un forfait"
            />
          </div>
          <div className="filter-row">
            <span className="filter-label">
              <SlidersHorizontal size={16} /> Filtres
            </span>
            <select value={filters.price} onChange={(e) => update('price', e.target.value)} aria-label="Filtrer par prix">
              {PRICES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <select value={filters.volume} onChange={(e) => update('volume', e.target.value)} aria-label="Filtrer par volume">
              {VOLUMES.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <select value={filters.duration} onChange={(e) => update('duration', e.target.value)} aria-label="Filtrer par durée">
              {DURATIONS.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
            <select value={filters.sort || 'popular'} onChange={(e) => update('sort', e.target.value === 'popular' ? '' : e.target.value)} aria-label="Trier">
              {SORTS.map((o) => <option key={o.v} value={o.v}>Trier : {o.l}</option>)}
            </select>
            <button
              className={`chip ${filters.popular ? 'chip-on' : ''}`}
              onClick={() => update('popular', filters.popular ? '' : '1')}
              aria-pressed={Boolean(filters.popular)}
            >
              <Star size={14} /> Populaires
            </button>
            {activeCount > 0 && (
              <button className="btn btn-ghost btn-sm" onClick={reset}>
                <RotateCcw size={14} /> Réinitialiser
              </button>
            )}
          </div>
        </div>

        <div className="results-bar">
          {loading ? <Spinner label="Recherche…" /> : data && <span>{data.plans.length} forfait{data.plans.length > 1 ? 's' : ''} trouvé{data.plans.length > 1 ? 's' : ''}</span>}
        </div>

        {error ? (
          <ErrorState message={error} onRetry={() => setReload((n) => n + 1)} />
        ) : !data ? (
          <PageLoader />
        ) : data.plans.length === 0 ? (
          <EmptyState title="Aucun forfait ne correspond à votre recherche" icon={SearchX}>
            <button className="btn btn-outline" onClick={reset}>Réinitialiser les filtres</button>
          </EmptyState>
        ) : (
          <div className={`plan-grid ${loading ? 'is-loading' : ''}`}>
            {data.plans.map((p) => <PlanCard key={p.id} plan={p} />)}
          </div>
        )}
      </div>
    </div>
  );
}
