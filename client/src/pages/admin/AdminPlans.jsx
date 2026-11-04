import { useEffect, useMemo, useState } from 'react';
import { Package, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { Badge, ConfirmDialog, EmptyState, ErrorState, Field, Modal, PageLoader, Spinner } from '../../components/ui.jsx';
import { api } from '../../lib/api.js';
import { formatDuration, formatPrice, formatVolume } from '../../lib/format.js';
import { useToast } from '../../context/ToastContext.jsx';

const EMPTY_FORM = {
  name: '', price: '', volume: '', volumeUnit: 'Go', duration: '', durationUnit: 'jours',
  description: '', category: 'Standard', active: true, popular: false,
};

/** Convertit un forfait (Mo / heures) vers les champs du formulaire (unités lisibles) */
function toForm(p) {
  const inGo = p.volumeMb >= 1024 && p.volumeMb % 512 === 0;
  const inDays = p.durationHours >= 24 && p.durationHours % 24 === 0;
  return {
    name: p.name, price: String(p.price),
    volume: String(inGo ? p.volumeMb / 1024 : p.volumeMb), volumeUnit: inGo ? 'Go' : 'Mo',
    duration: String(inDays ? p.durationHours / 24 : p.durationHours), durationUnit: inDays ? 'jours' : 'heures',
    description: p.description, category: p.category, active: p.active, popular: p.popular,
  };
}

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Le nom doit contenir au moins 2 caractères';
  const price = Number(f.price);
  if (!f.price || !Number.isInteger(price) || price < 50) e.price = 'Prix entier d’au moins 50 FCFA';
  const vol = Number(String(f.volume).replace(',', '.'));
  if (!f.volume || !(vol > 0)) e.volume = 'Volume supérieur à 0';
  else if (f.volumeUnit === 'Mo' && !Number.isInteger(vol)) e.volume = 'Volume entier en Mo';
  const dur = Number(f.duration);
  if (!f.duration || !Number.isInteger(dur) || dur < 1) e.duration = 'Durée entière d’au moins 1';
  if (f.description.trim().length < 5) e.description = 'Description d’au moins 5 caractères';
  return e;
}

function toPayload(f) {
  const vol = Number(String(f.volume).replace(',', '.'));
  return {
    name: f.name.trim(),
    price: Number(f.price),
    volumeMb: Math.round(f.volumeUnit === 'Go' ? vol * 1024 : vol),
    durationHours: f.durationUnit === 'jours' ? Number(f.duration) * 24 : Number(f.duration),
    description: f.description.trim(),
    category: f.category.trim() || 'Standard',
    active: f.active,
    popular: f.popular,
  };
}

export default function AdminPlans() {
  const toast = useToast();
  const [plans, setPlans] = useState(null);
  const [error, setError] = useState(null);
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [editing, setEditing] = useState(null); // null | 'new' | plan
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [toggling, setToggling] = useState(null);

  const load = () => {
    setError(null);
    api('/admin/plans', { auth: 'admin' }).then((d) => setPlans(d.plans)).catch((e) => setError(e.message));
  };
  useEffect(load, []);

  const filtered = useMemo(() => {
    if (!plans) return [];
    const term = q.trim().toLowerCase();
    return plans.filter(
      (p) =>
        (!term || p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term)) &&
        (!statusFilter || (statusFilter === 'active' ? p.active : !p.active)),
    );
  }, [plans, q, statusFilter]);

  const openNew = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setEditing('new');
  };
  const openEdit = (p) => {
    setForm(toForm(p));
    setErrors({});
    setEditing(p);
  };
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSaving(true);
    try {
      const body = toPayload(form);
      if (editing === 'new') {
        await api('/admin/plans', { method: 'POST', auth: 'admin', body });
        toast.success('Forfait ajouté');
      } else {
        await api(`/admin/plans/${editing.id}`, { method: 'PUT', auth: 'admin', body });
        toast.success('Forfait modifié');
      }
      setEditing(null);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (p) => {
    setToggling(p.id);
    try {
      await api(`/admin/plans/${p.id}/status`, { method: 'PATCH', auth: 'admin', body: { active: !p.active } });
      toast.success(p.active ? 'Forfait désactivé' : 'Forfait activé');
      setPlans((list) => list.map((x) => (x.id === p.id ? { ...x, active: !p.active } : x)));
    } catch (err) {
      toast.error(err.message);
    } finally {
      setToggling(null);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await api(`/admin/plans/${toDelete.id}`, { method: 'DELETE', auth: 'admin' });
      toast.success('Forfait supprimé');
      setPlans((list) => list.filter((x) => x.id !== toDelete.id));
      setToDelete(null);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setDeleting(false);
    }
  };

  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!plans) return <PageLoader label="Chargement des forfaits…" />;

  return (
    <>
      <div className="admin-title">
        <h1><Package /> Gestion des forfaits</h1>
        <button className="btn btn-primary" onClick={openNew}><Plus size={18} /> Ajouter un forfait</button>
      </div>

      <div className="filters card">
        <div className="filter-row">
          <div className="search-input grow">
            <Search size={18} />
            <input type="search" placeholder="Rechercher par nom ou catégorie" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Rechercher un forfait" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="Statut">
            <option value="">Tous les statuts</option>
            <option value="active">Actifs</option>
            <option value="inactive">Inactifs</option>
          </select>
          <span className="small muted">{filtered.length} / {plans.length} forfaits</span>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState title="Aucun forfait" icon={Package}>
          <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Ajouter un forfait</button>
        </EmptyState>
      ) : (
        <div className="table-wrap card">
          <table className="table responsive">
            <thead>
              <tr><th>Nom</th><th>Prix</th><th>Volume</th><th>Durée</th><th>Ventes</th><th>Statut</th><th /></tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className={p.active ? '' : 'row-muted'}>
                  <td data-label="Nom">
                    <strong>{p.name}</strong> {p.popular && <Star size={13} className="star" fill="currentColor" aria-label="Populaire" />}
                    <div className="small muted">{p.category}</div>
                  </td>
                  <td data-label="Prix">{formatPrice(p.price)}</td>
                  <td data-label="Volume">{formatVolume(p.volumeMb)}</td>
                  <td data-label="Durée">{formatDuration(p.durationHours)}</td>
                  <td data-label="Ventes">{p._count.subscriptions}</td>
                  <td data-label="Statut">
                    <label className="switch" title={p.active ? 'Désactiver' : 'Activer'}>
                      <input type="checkbox" checked={p.active} disabled={toggling === p.id} onChange={() => toggle(p)} aria-label={`${p.active ? 'Désactiver' : 'Activer'} ${p.name}`} />
                      <span />
                    </label>
                    <Badge tone={p.active ? 'success' : 'muted'}>{p.active ? 'Actif' : 'Inactif'}</Badge>
                  </td>
                  <td className="actions">
                    <button className="btn btn-ghost btn-sm" onClick={() => openEdit(p)}><Pencil size={15} /> Modifier</button>
                    <button className="btn btn-ghost btn-sm text-danger" onClick={() => setToDelete(p)}><Trash2 size={15} /> Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal
        open={Boolean(editing)}
        title={editing === 'new' ? 'Ajouter un forfait' : 'Modifier le forfait'}
        onClose={() => !saving && setEditing(null)}
        closable={!saving}
        size="lg"
        footer={
          <>
            <button className="btn btn-ghost" onClick={() => setEditing(null)} disabled={saving}>Annuler</button>
            <button className="btn btn-primary" form="plan-form" disabled={saving}>{saving ? <Spinner label="Enregistrement…" /> : 'Enregistrer'}</button>
          </>
        }
      >
        <form id="plan-form" onSubmit={save} noValidate>
          <div className="form-grid">
            <Field label="Nom du forfait" required error={errors.name} htmlFor="p-name">
              <input id="p-name" value={form.name} onChange={set('name')} maxLength={60} />
            </Field>
            <Field label="Prix (FCFA)" required error={errors.price} htmlFor="p-price">
              <input id="p-price" type="number" min="50" step="1" value={form.price} onChange={set('price')} />
            </Field>
            <Field label="Volume Internet" required error={errors.volume} htmlFor="p-vol">
              <div className="input-group">
                <input id="p-vol" type="number" min="0" step="any" value={form.volume} onChange={set('volume')} />
                <select value={form.volumeUnit} onChange={set('volumeUnit')} aria-label="Unité de volume">
                  <option>Mo</option><option>Go</option>
                </select>
              </div>
            </Field>
            <Field label="Durée de validité" required error={errors.duration} htmlFor="p-dur">
              <div className="input-group">
                <input id="p-dur" type="number" min="1" step="1" value={form.duration} onChange={set('duration')} />
                <select value={form.durationUnit} onChange={set('durationUnit')} aria-label="Unité de durée">
                  <option value="heures">heures</option><option value="jours">jours</option>
                </select>
              </div>
            </Field>
            <Field label="Catégorie" htmlFor="p-cat">
              <input id="p-cat" list="cats" value={form.category} onChange={set('category')} maxLength={30} />
              <datalist id="cats"><option value="Express" /><option value="Journalier" /><option value="Hebdomadaire" /><option value="Mensuel" /></datalist>
            </Field>
            <div className="field checks">
              <label className="check"><input type="checkbox" checked={form.active} onChange={set('active')} /> Forfait actif (visible dans le catalogue)</label>
              <label className="check"><input type="checkbox" checked={form.popular} onChange={set('popular')} /> Mettre en avant (populaire)</label>
            </div>
          </div>
          <Field label="Description" required error={errors.description} htmlFor="p-desc">
            <textarea id="p-desc" rows={3} maxLength={300} value={form.description} onChange={set('description')} />
          </Field>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(toDelete)}
        title="Supprimer le forfait"
        message={toDelete && `Voulez-vous vraiment supprimer « ${toDelete.name} » ? Les souscriptions existantes sont conservées dans l’historique. Cette action est irréversible.`}
        confirmLabel="Supprimer"
        danger
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
}
