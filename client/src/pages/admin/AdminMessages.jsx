import { useEffect, useState } from 'react';
import { CheckCheck, Mail, Trash2 } from 'lucide-react';
import { Badge, ConfirmDialog, EmptyState, ErrorState, PageLoader } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { formatDateTime } from '../../lib/format.js';
import { useToast } from '../../context/ToastContext.jsx';

export default function AdminMessages() {
  const toast = useToast();
  const [messages, setMessages] = useState(null);
  const [error, setError] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = () => {
    setError(null);
    api('/admin/messages', { auth: 'admin' }).then((d) => setMessages(d.messages)).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const markRead = async (m) => {
    try {
      await api(`/admin/messages/${m.id}/read`, { method: 'PATCH', auth: 'admin' });
      setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, read: true } : x)));
    } catch (e) {
      toast.error(e.message);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await api(`/admin/messages/${toDelete.id}`, { method: 'DELETE', auth: 'admin' });
      setMessages((list) => list.filter((x) => x.id !== toDelete.id));
      toast.success('Message supprimé');
      setToDelete(null);
    } catch (e) {
      toast.error(e.message);
    } finally {
      setDeleting(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!messages) return <PageLoader />;

  return (
    <>
      <div className="admin-title"><h1><Mail /> Messages de contact</h1></div>
      {messages.length === 0 ? (
        <EmptyState title="Aucun message reçu" icon={Mail} />
      ) : (
        <div className="msg-list">
          {messages.map((m) => (
            <article key={m.id} className={`card msg ${m.read ? '' : 'unread'}`}>
              <header className="row-between">
                <div>
                  <strong>{m.subject}</strong> {!m.read && <Badge tone="warning">Nouveau</Badge>}
                  <div className="small muted">{m.name} · <a href={`mailto:${m.email}`} className="link">{m.email}</a> · {formatDateTime(m.createdAt)}</div>
                </div>
                <div className="actions">
                  {!m.read && <button className="btn btn-ghost btn-sm" onClick={() => markRead(m)}><CheckCheck size={15} /> Marquer lu</button>}
                  <button className="btn btn-ghost btn-sm text-danger" onClick={() => setToDelete(m)}><Trash2 size={15} /> Supprimer</button>
                </div>
              </header>
              <p className="msg-body">{m.message}</p>
            </article>
          ))}
        </div>
      )}
      <ConfirmDialog open={Boolean(toDelete)} title="Supprimer le message" message="Ce message sera définitivement supprimé. Continuer ?"
        confirmLabel="Supprimer" danger loading={deleting} onConfirm={remove} onCancel={() => setToDelete(null)} />
    </>
  );
}
