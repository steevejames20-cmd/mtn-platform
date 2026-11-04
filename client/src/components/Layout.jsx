import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { History, Mail, MapPin, Menu, Phone, ShieldCheck, UserRound, X } from 'lucide-react';
import { Logo } from './ui.jsx';

const NAV = [
  { to: '/', label: 'Accueil', end: true },
  { to: '/forfaits', label: 'Forfaits' },
  { to: '/historique', label: 'Mon historique' },
  { to: '/a-propos', label: 'À propos' },
  { to: '/contact', label: 'Contact' },
];

function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Logo />
        <nav className={`main-nav ${open ? 'open' : ''}`} aria-label="Navigation principale">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => (isActive ? 'active' : '')}>
              {n.label}
            </NavLink>
          ))}
          <Link to="/admin" className="btn btn-primary btn-sm nav-account">
            <UserRound size={16} /> Espace admin
          </Link>
        </nav>
        <button className="icon-btn burger" onClick={() => setOpen((o) => !o)} aria-label="Ouvrir le menu" aria-expanded={open}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-grid">
        <div>
          <Logo light />
          <p className="muted-light">
            La plateforme simple et rapide pour souscrire à vos forfaits Internet mobile, où que vous soyez.
          </p>
        </div>
        <div>
          <h4>Navigation</h4>
          <Link to="/forfaits">Tous les forfaits</Link>
          <Link to="/historique">Historique de mes achats</Link>
          <Link to="/a-propos">À propos</Link>
          <Link to="/contact">Contact</Link>
        </div>
        <div>
          <h4>Assistance</h4>
          <span><Phone size={15} /> +237 6 00 00 00 00</span>
          <span><Mail size={15} /> support@netconnect.cm</span>
          <span><MapPin size={15} /> Douala, Cameroun</span>
        </div>
        <div>
          <h4>Bon à savoir</h4>
          <span><ShieldCheck size={15} /> Paiements 100 % simulés</span>
          <span><History size={15} /> Historique consultable 24h/24</span>
        </div>
      </div>
      <div className="container footer-bottom">
        © {new Date().getFullYear()} NetConnect — Projet académique de démonstration. Aucun paiement réel n’est effectué.
      </div>
    </footer>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return (
    <div className="app-shell">
      <Header />
      <main className="site-main">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
