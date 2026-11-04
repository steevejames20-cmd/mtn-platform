import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, FlaskConical, Inbox, Loader2, X } from 'lucide-react';
import { OPERATORS, SUB_STATUS, TX_STATUS } from '../lib/format.js';

export function Logo({ to = '/', light = false }) {
  return (
    <Link to={to} className={`logo ${light ? 'logo-light' : ''}`} aria-label="NetConnect — accueil">
      <span className="logo-oval">NC</span>
      <span className="logo-text">
        Net<b>Connect</b>
      </span>
    </Link>
  );
}

export function Spinner({ size = 18, label }) {
  return (
    <span className="spinner" role="status">
      <Loader2 size={size} className="spin" />
      {label && <span>{label}</span>}
    </span>
  );
}

export function PageLoader({ label = 'Chargement…' }) {
  return (
    <div className="page-loader">
      <Spinner size={28} label={label} />
    </div>
  );
}

export function ErrorState({ message, onRetry }) {
  return (
    <div className="empty-state">
      <AlertTriangle size={36} className="text-danger" />
      <p>{message}</p>
      {onRetry && (
        <button className="btn btn-outline" onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  );
}

export function EmptyState({ title, children, icon: Icon = Inbox }) {
  return (
    <div className="empty-state">
      <Icon size={36} />
      <h3>{title}</h3>
      {children}
    </div>
  );
}

export function Badge({ tone = 'muted', children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function TxStatusBadge({ status }) {
  const s = TX_STATUS[status] || { label: status, tone: 'muted' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function SubStatusBadge({ status }) {
  const s = SUB_STATUS[status] || { label: status, tone: 'muted' };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function OperatorChip({ operator }) {
  const o = OPERATORS[operator];
  if (!o) return <span>—</span>;
  return (
    <span className="op-chip">
      <span className="op-dot" style={{ background: o.color }} />
      {o.label}
    </span>
  );
}

export function SimulationBanner({ compact = false }) {
  return (
    <div className={`sim-banner ${compact ? 'sim-compact' : ''}`}>
      <FlaskConical size={18} />
      <span>
        <b>Simulation de paiement – Environnement de test.</b>
        {!compact && ' Aucun argent n’est débité, aucun code PIN n’est demandé.'}
      </span>
    </div>
  );
}

/** Fenêtre modale accessible : Échap ferme, focus initial dans la fenêtre */
export function Modal({ open, title, onClose, children, footer, size = 'md', closable = true }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && closable && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, closable, onClose]);

  if (!open) return null;
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && closable && onClose?.()}>
      <div className={`modal modal-${size}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1} ref={ref}>
        <div className="modal-head">
          <h3>{title}</h3>
          {closable && (
            <button className="icon-btn" onClick={onClose} aria-label="Fermer">
              <X size={20} />
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirmer', danger, loading, onConfirm, onCancel }) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={loading ? undefined : onCancel}
      closable={!loading}
      size="sm"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onCancel} disabled={loading}>
            Annuler
          </button>
          <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={onConfirm} disabled={loading}>
            {loading ? <Spinner /> : confirmLabel}
          </button>
        </>
      }
    >
      <p>{message}</p>
    </Modal>
  );
}

export function Field({ label, error, hint, required, children, htmlFor }) {
  return (
    <div className={`field ${error ? 'has-error' : ''}`}>
      {label && (
        <label htmlFor={htmlFor}>
          {label}
          {required && <span className="req">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="field-error">{error}</p> : hint ? <p className="field-hint">{hint}</p> : null}
    </div>
  );
}
