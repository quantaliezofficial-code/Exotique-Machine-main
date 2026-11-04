import React, { useState } from 'react';
import { CheckCircle2, Clock, MapPin, Phone } from 'lucide-react';
import { useContact, displayPhone } from '../content';
import { useGarage } from '../garage';
import { usePageMeta } from '../lib/seo';
import { api } from '../services/api';
import { SERVICE_TYPES } from '../constants';
import { PageHeader, Field, Honeypot, normaliseMobile, useLeadSubmit } from './ui';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function ServiceView() {
  const contact = useContact();
  const { addRequest } = useGarage();
  usePageMeta({
    title: 'Luxury Car Service',
    description: 'Book service for your luxury car at Exotique Machines, Lucknow: diagnostics, periodic maintenance and detailing.',
    path: '/service',
  });
  const [car, setCar] = useState('');
  const [type, setType] = useState(SERVICE_TYPES[0]);
  const [date, setDate] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { state, submit } = useLeadSubmit(api.bookService);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (car.trim().length < 2) errs.car = 'Tell us which car (make and model).';
    if (!date) errs.date = 'Choose a preferred date.';
    if (name.trim().length < 2) errs.name = 'Please enter your name.';
    const mobile = normaliseMobile(phone);
    if (!mobile) errs.phone = 'Enter a 10-digit Indian mobile number.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const ref = await submit({ vehicleModel: car.trim(), serviceType: type, preferredDate: date, customerName: name.trim(),
      customerPhone: mobile!, notes, website });
    if (ref !== null) addRequest({ reference: ref, kind: 'Service', label: `${type} · ${car.trim()}`, date });
  };

  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  return (
    <div id="service-view">
      <PageHeader eyebrow="Service" title="Book a service" crumbs={[{ label: 'Home', to: '/' }, { label: 'Service' }]}
        lead="Periodic maintenance, diagnostics, detailing and repairs for luxury cars. Tell us what you need and we will call to fix a slot." />
      <div className="page-container grid gap-8 py-10 lg:grid-cols-12">
        <section className="card p-5 sm:p-7 lg:col-span-8" aria-label="Service booking form">
          {state.status === 'done' ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" aria-hidden />
              <p className="mt-3 text-lg font-bold text-stone-900">Service request received</p>
              <p className="mt-1 text-sm text-stone-600">We will call you to confirm the slot. {state.reference && <>Reference <span className="font-mono font-bold">{state.reference}</span>.</>}</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="relative space-y-5">
              <Honeypot value={website} onChange={setWebsite} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Your car" error={errors.car} hint="Make, model and year">
                  {(p) => <input {...p} className="field" value={car} onChange={(e) => setCar(e.target.value)} placeholder="e.g. BMW X1 2019" />}
                </Field>
                <Field label="Service needed">
                  {(p) => (
                    <select {...p} className="field" value={type} onChange={(e) => setType(e.target.value)}>
                      {SERVICE_TYPES.map((t) => <option key={t}>{t}</option>)}
                    </select>
                  )}
                </Field>
              </div>
              <Field label="Preferred date" error={errors.date}>
                {(p) => <input {...p} type="date" className="field sm:max-w-xs" min={iso(tomorrow)} value={date} onChange={(e) => setDate(e.target.value)} />}
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Your name" error={errors.name}>
                  {(p) => <input {...p} className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
                </Field>
                <Field label="Mobile number" error={errors.phone}>
                  {(p) => <input {...p} className="field" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />}
                </Field>
              </div>
              <Field label="Anything we should know?" optional>
                {(p) => <textarea {...p} className="field min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={2000} />}
              </Field>
              {state.status === 'error' && <p className="form-alert form-alert-error" role="alert">{state.error}</p>}
              <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={state.status === 'sending'}>
                {state.status === 'sending' ? 'Sending…' : 'Request service'}
              </button>
            </form>
          )}
        </section>
        {contact && (
          <aside className="card h-fit space-y-3 p-5 text-sm text-stone-700 lg:col-span-4">
            <h2 className="font-bold text-stone-900">Service desk</h2>
            <p className="flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />{contact.address}</p>
            {contact.hours && <p className="flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />{contact.hours}</p>}
            {contact.phones.map((p) => (
              <p key={p.number} className="flex gap-2"><Phone className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />
                <a href={`tel:${p.number}`} className="hover:underline">{p.label}: {displayPhone(p.number)}</a></p>
            ))}
          </aside>
        )}
      </div>
    </div>
  );
}
