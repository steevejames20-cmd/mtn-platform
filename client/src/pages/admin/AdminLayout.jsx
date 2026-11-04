import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ExternalLink, Home, LayoutDashboard, LogOut, Mail, Menu, Package, Receipt, UserRound, X } from 'lucide-react';
import { Logo, PageLoader } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

const LINKS = [
  { to: '/admin', label: 'Tableau de bord', icon: LayoutDashboard, end: true },
  { to: '/admin/forfaits', label: 'Forfaits', icon: Package },
  { to: '/admin/souscriptions', label: 'Souscriptions', icon: Receipt },
  { to: '/admin/messages', label: 'Messages', icon: Mail },
];

export default function AdminLayout() {
  const { admin, checking, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (checking) return <PageLoader label="Vérification de la session…" />;
  if (!admin) return <Navigate to="/admin/connexion" replace state={{ from: location.pathname }} />;

  const doLogout = () => {
    logout();
    toast.info('Vous êtes déconnecté');
    navigate('/admin/connexion');
  };

  return (
    <div className="admin-shell">
      <aside className={`admin-side ${open ? 'open' : ''}`}>
        <div className="admin-side-head">
          <Logo to="/admin" light />
          <button className="icon-btn admin-close" onClick={() => setOpen(false)} aria-label="Fermer le menu"><X /></button>
        </div>
        <nav>
          {LINKS.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end}>
              <Icon size={18} /> {label}
            </NavLink>
          ))}
          <Link to="/" target="_blank" rel="noreferrer"><ExternalLink size={18} /> Voir le site</Link>
          <button onClick={doLogout}><LogOut size={18} /> Déconnexion</button>
        </nav>
      </aside>
      {open && <div className="admin-overlay" onClick={() => setOpen(false)} />}
      <div className="admin-main">
        <header className="admin-top">
          <button className="icon-btn admin-burger" onClick={() => setOpen(true)} aria-label="Ouvrir le menu"><Menu /></button>
          <Link to="/" className="admin-home-link"><Home size={16} /> Site public</Link>
          <div className="admin-user">
            <UserRound size={18} />
            <span>{admin.name}</span>
            <small className="muted">{admin.email}</small>
          </div>
        </header>
        <div className="admin-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
