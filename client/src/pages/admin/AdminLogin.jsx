import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, Lock, Mail } from 'lucide-react';
import { Field, Logo, Spinner } from '../../components/ui.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

export default function AdminLogin() {
  const { admin, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  if (admin) return <Navigate to="/admin" replace />;

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) errs.email = 'Adresse e-mail invalide';
    if (!password) errs.password = 'Le mot de passe est obligatoire';
    setErrors(errs);
    setError(null);
    if (Object.keys(errs).length) return;
    setLoading(true);
    try {
      const a = await login(email.trim(), password);
      toast.success(`Bienvenue, ${a.name}`);
      navigate(location.state?.from || '/admin', { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card card">
        <Logo />
        <h1>Espace administrateur</h1>
        <p className="muted">Connectez-vous pour gérer les forfaits et les souscriptions.</p>
        <form onSubmit={submit} noValidate>
          <Field label="Adresse e-mail" required error={errors.email} htmlFor="a-email">
            <div className="input-icon">
              <Mail size={18} />
              <input id="a-email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          </Field>
          <Field label="Mot de passe" required error={errors.password} htmlFor="a-pass">
            <div className="input-icon">
              <Lock size={18} />
              <input id="a-pass" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
              <button type="button" className="icon-btn input-suffix" onClick={() => setShow((s) => !s)} aria-label={show ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </Field>
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-primary btn-block btn-lg" disabled={loading}>
            {loading ? <Spinner label="Connexion…" /> : 'Se connecter'}
          </button>
        </form>
        <Link to="/" className="back-link center-link"><ArrowLeft size={16} /> Retour au site</Link>
      </div>
    </div>
  );
}
