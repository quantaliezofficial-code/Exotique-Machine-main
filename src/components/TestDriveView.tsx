import React, { useMemo, useState } from 'react';
import { CheckCircle2, MapPin, Clock } from 'lucide-react';
import { useRouter, Link } from '../router';
import { useSite, useContact, vehicleName, formatPrice } from '../content';
import { useGarage } from '../garage';
import { usePageMeta } from '../lib/seo';
import { api } from '../services/api';
import { TEST_DRIVE_TIMES } from '../constants';
import { PageHeader, Field, Honeypot, normaliseMobile, useLeadSubmit } from './ui';
import Picture from './ui/Picture';

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function TestDriveView() {
  const { vehicles } = useSite();
  const contact = useContact();
  const { search } = useRouter();
  const { addRequest } = useGarage();
  usePageMeta({
    title: 'Book a Test Drive',
    description: 'Book a test drive of a certified pre-owned luxury car at the Exotique Machines showroom on Faizabad Road, Lucknow.',
    path: '/test-drive',
  });

  const stock = useMemo(() => vehicles.filter((v) => v.status !== 'sold'), [vehicles]);
  const [carId, setCarId] = useState(search.get('car') || '');
  const car = stock.find((v) => v.id === carId);
  const today = new Date();
  const max = new Date(); max.setDate(max.getDate() + 60);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [licence, setLicence] = useState(true);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { state, submit } = useLeadSubmit(api.bookTestDrive);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!car) errs.car = 'Choose the car you want to drive.';
    if (!date) errs.date = 'Choose a date.';
    if (!time) errs.time = 'Choose a time.';
    if (name.trim().length < 2) errs.name = 'Please enter your name.';
    const mobile = normaliseMobile(phone);
    if (!mobile) errs.phone = 'Enter a 10-digit Indian mobile number.';
    if (!/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(email)) errs.email = 'Enter a valid email address.';
    setErrors(errs);
    if (Object.keys(errs).length || !car) return;
    const label = `${vehicleName(car)} ${car.badge || ''}`.trim();
    const ref = await submit({ modelId: car.id, modelName: label, date, time, name: name.trim(), phone: mobile!, email, hasLicense: licence, website });
    if (ref !== null) addRequest({ reference: ref, kind: 'Test drive', label, date: `${date} ${time}` });
  };

  return (
    <div id="testdrive-view">
      <PageHeader eyebrow="Test drive" title="Book a test drive" crumbs={[{ label: 'Home', to: '/' }, { label: 'Test drive' }]}
        lead="Choose a car and a slot. We confirm every booking by phone, and the car will be ready when you arrive." />
      <div className="page-container grid gap-8 py-10 lg:grid-cols-12">
        <section className="card p-5 sm:p-7 lg:col-span-8" aria-label="Booking form">
          {state.status === 'done' ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" aria-hidden />
              <p className="mt-3 text-lg font-bold text-stone-900">Test drive requested</p>
              <p className="mt-1 text-sm text-stone-600">
                {car && <>{vehicleName(car)} on {date} at {time}. </>}We will call to confirm.
                {state.reference && <> Reference <span className="font-mono font-bold">{state.reference}</span>.</>}
              </p>
              <Link to="/cars" className="btn btn-secondary mt-5">Browse more cars</Link>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="relative space-y-5">
              <Honeypot value={website} onChange={setWebsite} />
              <Field label="Car" error={errors.car}>
                {(p) => (
                  <select {...p} className="field" value={carId} onChange={(e) => setCarId(e.target.value)}>
                    <option value="">Choose a car</option>
                    {stock.map((v) => <option key={v.id} value={v.id}>{vehicleName(v)} {v.badge} — {formatPrice(v.price)}</option>)}
                  </select>
                )}
              </Field>
              {car?.images?.[0] && (
                <div className="flex items-center gap-3 rounded-lg bg-stone-100 p-2">
                  <Picture src={car.images[0]} alt="" sizes="120px" className="h-16 w-24 rounded object-cover" wrapperClassName="h-16 w-24 shrink-0 rounded" />
                  <p className="text-sm font-semibold text-stone-900">{vehicleName(car)} <span className="block text-xs font-normal text-stone-600">{car.fuel} · {car.transmission}</span></p>
                </div>
              )}
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Date" error={errors.date}>
                  {(p) => <input {...p} type="date" className="field" min={iso(today)} max={iso(max)} value={date} onChange={(e) => setDate(e.target.value)} />}
                </Field>
                <fieldset>
                  <legend className="field-label">Time</legend>
                  <div className="flex flex-wrap gap-2">
                    {TEST_DRIVE_TIMES.map((t) => (
                      <button key={t} type="button" aria-pressed={time === t} onClick={() => setTime(t)} className={`chip ${time === t ? 'chip-active' : ''}`}>{t}</button>
                    ))}
                  </div>
                  {errors.time && <p className="field-error" role="alert">{errors.time}</p>}
                </fieldset>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Your name" error={errors.name}>
                  {(p) => <input {...p} className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
                </Field>
                <Field label="Mobile number" error={errors.phone}>
                  {(p) => <input {...p} className="field" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />}
                </Field>
              </div>
              <Field label="Email" error={errors.email}>
                {(p) => <input {...p} className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />}
              </Field>
              <label className="flex min-h-11 items-center gap-2.5 text-sm text-stone-800">
                <input type="checkbox" checked={licence} onChange={(e) => setLicence(e.target.checked)} className="h-4 w-4 accent-stone-900" />
                I have a valid driving licence
              </label>
              {state.status === 'error' && <p className="form-alert form-alert-error" role="alert">{state.error}</p>}
              <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={state.status === 'sending'}>
                {state.status === 'sending' ? 'Sending…' : 'Request test drive'}
              </button>
            </form>
          )}
        </section>
        <aside className="space-y-4 lg:col-span-4">
          {contact && (
            <div className="card p-5 text-sm text-stone-700">
              <h2 className="font-bold text-stone-900">Where you will drive from</h2>
              <p className="mt-3 flex gap-2"><MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />{contact.address}</p>
              {contact.hours && <p className="mt-2 flex gap-2"><Clock className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-accent)]" aria-hidden />{contact.hours}</p>}
              {contact.mapUrl && <a href={contact.mapUrl} target="_blank" rel="noopener" className="btn btn-secondary btn-sm mt-4">Get directions</a>}
            </div>
          )}
          <div className="card p-5 text-sm text-stone-700">
            <h2 className="font-bold text-stone-900">Bring along</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Your driving licence</li>
              <li>Your current car, if you want a trade-in valuation</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
