import React, { useState } from 'react';
import { CheckCircle2, Info } from 'lucide-react';
import { useGarage } from '../garage';
import { usePageMeta } from '../lib/seo';
import { api } from '../services/api';
import { formatInr } from '../content';
import { PageHeader, Field, Honeypot, normaliseMobile, useLeadSubmit } from './ui';

const CONDITIONS = { Excellent: 1.05, Good: 1, Fair: 0.88 } as const;
type Condition = keyof typeof CONDITIONS;

/**
 * A transparent depreciation guide based on what the owner paid (we do not hold market
 * price data, so we do not pretend to), plus a request for a real valuation.
 */
function guide(paid: number, year: number, km: number, condition: Condition): [number, number] | null {
  if (!paid || !year) return null;
  const age = Math.max(0, new Date().getFullYear() - year);
  // Typical Indian used-car depreciation: ~15% first year, ~10% per year after.
  let v = paid * (age === 0 ? 0.95 : 0.85 * Math.pow(0.9, age - 1));
  const expectedKm = Math.max(1, age) * 12000;
  if (km > expectedKm * 1.5) v *= 0.9;
  else if (km < expectedKm * 0.6) v *= 1.03;
  v *= CONDITIONS[condition];
  const round = (x: number) => Math.round(x / 10000) * 10000;
  return [round(v * 0.9), round(v * 1.05)];
}

export default function TradeInView() {
  const { addRequest } = useGarage();
  usePageMeta({
    title: 'Trade In Your Car',
    description: 'Get a free trade-in valuation for your current car and upgrade to a certified pre-owned luxury car at Exotique Machines, Lucknow.',
    path: '/trade-in',
  });
  const thisYear = new Date().getFullYear();
  const [make, setMake] = useState('');
  const [year, setYear] = useState(thisYear - 4);
  const [km, setKm] = useState('');
  const [paid, setPaid] = useState('');
  const [condition, setCondition] = useState<Condition>('Good');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { state, submit } = useLeadSubmit(api.sendEnquiry);

  const range = guide(Number(paid) * 100000, year, Number(km) || 0, condition);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (make.trim().length < 2) errs.make = 'Tell us the make and model.';
    if (name.trim().length < 2) errs.name = 'Please enter your name.';
    const mobile = normaliseMobile(phone);
    if (!mobile) errs.phone = 'Enter a 10-digit Indian mobile number.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const ref = await submit({
      name: name.trim(), phone: mobile!, source: 'trade-in', vehicleInterest: `Trade-in: ${make.trim()} ${year}`,
      message: `Trade-in valuation request. ${make.trim()}, ${year}, ${km || '?'} km, condition ${condition}` +
        (paid ? `, bought for ₹${paid} lakh` : ''), website,
    });
    if (ref !== null) addRequest({ reference: ref, kind: 'Enquiry', label: `Trade-in valuation · ${make.trim()}` });
  };

  return (
    <div id="tradein-view">
      <PageHeader eyebrow="Trade-in" title="Trade in your car" crumbs={[{ label: 'Home', to: '/' }, { label: 'Trade-in' }]}
        lead="Tell us about your car for a free valuation. The final offer is made after a short physical inspection at the showroom." />
      <div className="page-container py-10">
        {state.status === 'done' ? (
          <div className="card mx-auto max-w-xl p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" aria-hidden />
            <p className="mt-3 text-lg font-bold text-stone-900">Valuation request received</p>
            <p className="mt-1 text-sm text-stone-600">We will call to arrange an inspection. {state.reference && <>Reference <span className="font-mono font-bold">{state.reference}</span>.</>}</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="relative grid gap-8 lg:grid-cols-12">
            <Honeypot value={website} onChange={setWebsite} />
            <section className="card space-y-5 p-5 sm:p-7 lg:col-span-7" aria-labelledby="trade-car">
              <h2 id="trade-car" className="text-lg font-bold text-stone-900">Your car</h2>
              <Field label="Make and model" error={errors.make}>
                {(p) => <input {...p} className="field" value={make} onChange={(e) => setMake(e.target.value)} placeholder="e.g. Toyota Fortuner 4x2 AT" />}
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Year of manufacture">
                  {(p) => (
                    <select {...p} className="field" value={year} onChange={(e) => setYear(Number(e.target.value))}>
                      {Array.from({ length: 20 }, (_, i) => thisYear - i).map((y) => <option key={y}>{y}</option>)}
                    </select>
                  )}
                </Field>
                <Field label="Kilometres driven" optional>
                  {(p) => <input {...p} className="field" inputMode="numeric" value={km} onChange={(e) => setKm(e.target.value.replace(/\D/g, ''))} placeholder="e.g. 45000" />}
                </Field>
              </div>
              <fieldset>
                <legend className="field-label">Condition</legend>
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(CONDITIONS) as Condition[]).map((c) => (
                    <button key={c} type="button" aria-pressed={condition === c} onClick={() => setCondition(c)} className={`chip ${condition === c ? 'chip-active' : ''}`}>{c}</button>
                  ))}
                </div>
              </fieldset>
              <Field label="What you paid (₹ lakh)" optional hint="Only used for the rough guide below; not sent unless you submit.">
                {(p) => <input {...p} className="field sm:max-w-xs" inputMode="decimal" value={paid} onChange={(e) => setPaid(e.target.value.replace(/[^\d.]/g, ''))} placeholder="e.g. 35" />}
              </Field>
              {range && (
                <div className="rounded-xl bg-stone-900 p-5 text-white" aria-live="polite">
                  <p className="text-xs uppercase tracking-wider text-stone-300">Rough depreciation guide</p>
                  <p className="mt-1 text-2xl font-black">{formatInr(range[0])} – {formatInr(range[1])}</p>
                  <p className="mt-2 flex gap-2 text-xs text-stone-300"><Info className="h-4 w-4 shrink-0" aria-hidden />
                    Based on typical depreciation from your purchase price, not on a market price for your model. Our offer after inspection may differ.</p>
                </div>
              )}
            </section>
            <section className="card h-fit space-y-5 p-5 sm:p-7 lg:col-span-5" aria-labelledby="trade-contact">
              <h2 id="trade-contact" className="text-lg font-bold text-stone-900">Get a real valuation</h2>
              <Field label="Your name" error={errors.name}>
                {(p) => <input {...p} className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
              </Field>
              <Field label="Mobile number" error={errors.phone}>
                {(p) => <input {...p} className="field" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />}
              </Field>
              {state.status === 'error' && <p className="form-alert form-alert-error" role="alert">{state.error}</p>}
              <button type="submit" className="btn btn-primary w-full" disabled={state.status === 'sending'}>
                {state.status === 'sending' ? 'Sending…' : 'Request free valuation'}
              </button>
            </section>
          </form>
        )}
      </div>
    </div>
  );
}
