import { useState } from 'react';
import { Clock, Mail, MapPin, Phone, Send } from 'lucide-react';
import { Field, Spinner } from '../components/ui.jsx';
import { api } from '../lib/api.js';
import { useToast } from '../context/ToastContext.jsx';

const EMPTY = { name: '', email: '', subject: '', message: '' };

function validate(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Indiquez votre nom';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Adresse e-mail invalide';
  if (f.subject.trim().length < 3) e.subject = 'Indiquez un objet';
  if (f.message.trim().length < 10) e.message = 'Votre message doit contenir au moins 10 caractères';
  return e;
}

export default function Contact() {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const errs = validate(form);
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setSending(true);
    try {
      await api('/contact', { method: 'POST', body: form });
      toast.success('Message envoyé, nous vous répondrons rapidement');
      setForm(EMPTY);
      setSent(true);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="page">
      <section className="page-hero">
        <div className="container">
          <h1>Nous <span className="hl">contacter</span></h1>
          <p className="lead">Une question sur un forfait ou une souscription ? Écrivez-nous.</p>
        </div>
      </section>
      <div className="container split">
        <form className="card form-card" onSubmit={submit} noValidate>
          {sent && <div className="alert alert-success">Merci ! Votre message a bien été enregistré.</div>}
          <div className="form-grid">
            <Field label="Nom complet" required error={errors.name} htmlFor="c-name">
              <input id="c-name" value={form.name} onChange={set('name')} autoComplete="name" />
            </Field>
            <Field label="E-mail" required error={errors.email} htmlFor="c-email">
              <input id="c-email" type="email" value={form.email} onChange={set('email')} autoComplete="email" />
            </Field>
          </div>
          <Field label="Objet" required error={errors.subject} htmlFor="c-subject">
            <input id="c-subject" value={form.subject} onChange={set('subject')} />
          </Field>
          <Field label="Message" required error={errors.message} htmlFor="c-message">
            <textarea id="c-message" rows={5} value={form.message} onChange={set('message')} />
          </Field>
          <button className="btn btn-primary btn-lg" disabled={sending}>
            {sending ? <Spinner label="Envoi…" /> : <><Send size={18} /> Envoyer le message</>}
          </button>
        </form>
        <aside className="card summary contact-info">
          <h2 className="card-title">Service client</h2>
          <p><Phone size={18} /> +237 6 00 00 00 00</p>
          <p><Mail size={18} /> support@netconnect.cm</p>
          <p><MapPin size={18} /> Akwa, Douala — Cameroun</p>
          <p><Clock size={18} /> 24h/24 – 7j/7</p>
        </aside>
      </div>
    </div>
  );
}
