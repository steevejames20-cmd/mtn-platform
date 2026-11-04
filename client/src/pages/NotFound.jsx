import { Link } from 'react-router-dom';
import { WifiOff } from 'lucide-react';
import { EmptyState } from '../components/ui.jsx';

export default function NotFound() {
  return (
    <div className="container page-pad">
      <EmptyState title="Page introuvable" icon={WifiOff}>
        <p className="muted">La page demandée n’existe pas ou a été déplacée.</p>
        <Link to="/" className="btn btn-primary">Retour à l’accueil</Link>
      </EmptyState>
    </div>
  );
}
