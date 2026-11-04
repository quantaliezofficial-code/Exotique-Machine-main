import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, ChevronDown } from 'lucide-react';
import { useRouter } from '../router';
import { useSite, formatInr, vehicleName, formatPrice } from '../content';
import { useGarage } from '../garage';
import { usePageMeta } from '../lib/seo';
import { api } from '../services/api';
import { PageHeader, Field, Honeypot, normaliseMobile, useLeadSubmit } from './ui';

function emiFor(principal: number, annualRate: number, months: number) {
  const r = annualRate / 12 / 100;
  if (!principal || !months) return 0;
  if (r === 0) return principal / months;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
}

export default function FinanceView() {
  const { vehicles, settings } = useSite();
  const { search } = useRouter();
  const { addRequest } = useGarage();
  usePageMeta({
    title: 'Car Finance & EMI Calculator',
    description: 'Apply for pre-owned luxury car finance in Lucknow. Use the EMI calculator and get options from partner banks through Exotique Machines.',
    path: '/finance',
  });

  const stock = useMemo(() => vehicles.filter((v) => v.status !== 'sold'), [vehicles]);
  const [carId, setCarId] = useState(search.get('car') || '');
  const car = stock.find((v) => v.id === carId);
  const [price, setPrice] = useState(3000000);
  const [downPct, setDownPct] = useState(20);
  const [rate, setRate] = useState(9.5);
  const [years, setYears] = useState(5);

  useEffect(() => { if (car?.price) setPrice(Math.round(car.price * 100000)); }, [car?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const loan = Math.max(0, price * (1 - downPct / 100));
  const emi = emiFor(loan, rate, years * 12);
  const interest = Math.max(0, emi * years * 12 - loan);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [wa, setWa] = useState(true);
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { state, submit, reset } = useLeadSubmit(api.applyFinance);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = 'Please enter your name.';
    const mobile = normaliseMobile(phone);
    if (!mobile) errs.phone = 'Enter a 10-digit Indian mobile number.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const model = car ? `${vehicleName(car)} ${car.badge || ''}`.trim() : 'Not decided';
    const ref = await submit({ name: name.trim(), phone: mobile!, whatsappUpdates: wa, model:
      `${model} · loan ${formatInr(loan)} · ${years} yr`, website });
    if (ref !== null) addRequest({ reference: ref, kind: 'Finance', label: model });
  };

  const slider = 'w-full accent-stone-900 h-11';
  return (
    <div id="finance-view">
      <PageHeader eyebrow="Finance" title="Car finance and EMI calculator" crumbs={[{ label: 'Home', to: '/' }, { label: 'Finance' }]}
        lead="Work out a monthly payment, then send us a finance request. Our team compares offers from partner banks for you." />
      <div className="page-container grid gap-8 py-10 lg:grid-cols-12">
        <section className="card p-5 sm:p-7 lg:col-span-7" aria-labelledby="emi-calc">
          <h2 id="emi-calc" className="text-lg font-bold text-stone-900">EMI calculator</h2>
          <div className="mt-6 space-y-6">
            <Field label="Car" optional>
              {(p) => (
                <select {...p} className="field" value={carId} onChange={(e) => setCarId(e.target.value)}>
                  <option value="">Enter a price manually</option>
                  {stock.map((v) => <option key={v.id} value={v.id}>{vehicleName(v)} {v.badge} — {formatPrice(v.price)}</option>)}
                </select>
              )}
            </Field>
            <Field label={`Car price: ${formatInr(price)}`}>
              {(p) => <input {...p} type="range" min={300000} max={30000000} step={50000} value={price} onChange={(e) => { setPrice(Number(e.target.value)); setCarId(''); }} className={slider} />}
            </Field>
            <Field label={`Down payment: ${downPct}% (${formatInr(price * downPct / 100)})`}>
              {(p) => <input {...p} type="range" min={0} max={80} step={5} value={downPct} onChange={(e) => setDownPct(Number(e.target.value))} className={slider} />}
            </Field>
            <div className="grid gap-6 sm:grid-cols-2">
              <Field label={`Interest rate: ${rate.toFixed(1)}% p.a.`}>
                {(p) => <input {...p} type="range" min={7} max={18} step={0.25} value={rate} onChange={(e) => setRate(Number(e.target.value))} className={slider} />}
              </Field>
              <Field label={`Tenure: ${years} year${years > 1 ? 's' : ''}`}>
                {(p) => <input {...p} type="range" min={1} max={7} step={1} value={years} onChange={(e) => setYears(Number(e.target.value))} className={slider} />}
              </Field>
            </div>
          </div>
          <dl className="mt-8 grid gap-4 rounded-xl bg-stone-900 p-5 text-white sm:grid-cols-3">
            <div><dt className="text-xs uppercase tracking-wider text-stone-300">Monthly EMI</dt><dd className="mt-1 text-2xl font-black" aria-live="polite">{formatInr(emi)}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-stone-300">Loan amount</dt><dd className="mt-1 text-lg font-bold">{formatInr(loan)}</dd></div>
            <div><dt className="text-xs uppercase tracking-wider text-stone-300">Total interest</dt><dd className="mt-1 text-lg font-bold">{formatInr(interest)}</dd></div>
          </dl>
          <p className="mt-3 text-xs text-stone-500">Indicative only. The final rate depends on the lender's credit assessment.</p>
        </section>

        <section className="card p-5 sm:p-7 lg:col-span-5" aria-labelledby="finance-apply">
          <h2 id="finance-apply" className="text-lg font-bold text-stone-900">Request a finance call-back</h2>
          {state.status === 'done' ? (
            <div className="mt-6 text-center">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" aria-hidden />
              <p className="mt-3 font-bold text-stone-900">Request received</p>
              <p className="mt-1 text-sm text-stone-600">Our finance team will call you. {state.reference && <>Reference <span className="font-mono font-bold">{state.reference}</span>.</>}</p>
              <button type="button" className="btn btn-secondary mt-5" onClick={() => { reset(); setName(''); setPhone(''); }}>Send another</button>
            </div>
          ) : (
            <form onSubmit={onSubmit} noValidate className="relative mt-5 space-y-4">
              <Honeypot value={website} onChange={setWebsite} />
              <p className="rounded-lg bg-stone-100 p-3 text-sm text-stone-700">
                {car ? <><strong>{vehicleName(car)}</strong> · </> : null}Loan {formatInr(loan)} over {years} years · EMI ≈ {formatInr(emi)}
              </p>
              <Field label="Your name" error={errors.name}>
                {(p) => <input {...p} className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
              </Field>
              <Field label="Mobile number" error={errors.phone}>
                {(p) => <input {...p} className="field" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />}
              </Field>
              <label className="flex min-h-11 items-center gap-2.5 text-sm text-stone-800">
                <input type="checkbox" checked={wa} onChange={(e) => setWa(e.target.checked)} className="h-4 w-4 accent-stone-900" />
                Send me updates on WhatsApp
              </label>
              {state.status === 'error' && <p className="form-alert form-alert-error" role="alert">{state.error}</p>}
              <button type="submit" className="btn btn-primary w-full" disabled={state.status === 'sending'}>
                {state.status === 'sending' ? 'Sending…' : 'Request call-back'}
              </button>
            </form>
          )}
        </section>
      </div>

      {settings?.faq?.length ? (
        <section className="page-container max-w-3xl pb-14" aria-labelledby="finance-faq">
          <h2 id="finance-faq" className="section-title">Finance questions</h2>
          <div className="mt-6 divide-y divide-stone-200 border-y border-stone-200">
            {settings.faq.map((f) => (
              <details key={f.question} className="group">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 py-3 font-semibold text-stone-900">
                  {f.question}<ChevronDown className="h-5 w-5 shrink-0 transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="pb-4 text-sm leading-relaxed text-stone-700">{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
