import React, { useState } from 'react';
import { CheckCircle2, Phone, MessageCircle } from 'lucide-react';
import Dialog from './ui/Dialog';
import { Field, Honeypot, normaliseMobile, useLeadSubmit } from './ui';
import { api } from '../services/api';
import { useContact, useSite, displayPhone, whatsappLink, vehicleName } from '../content';
import { useGarage } from '../garage';

/** Sends a real enquiry to the showroom (stored in Admin → Leads). */
export default function EnquiryModal({ initialCar, onClose }: { initialCar?: string; onClose: () => void }) {
  const { vehicles } = useSite();
  const contact = useContact();
  const { addRequest } = useGarage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [car, setCar] = useState(initialCar || '');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { state, submit } = useLeadSubmit(api.sendEnquiry);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = 'Please enter your name.';
    const mobile = normaliseMobile(phone);
    if (!mobile) errs.phone = 'Enter a 10-digit Indian mobile number.';
    if (email && !/^[^@\s]+@[^@\s]+\.[A-Za-z]{2,}$/.test(email)) errs.email = 'Enter a valid email or leave it empty.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    const ref = await submit({ name: name.trim(), phone: mobile!, email: email || undefined, vehicleInterest: car || undefined,
      message: message || undefined, source: 'website-enquiry', website });
    if (ref !== null) addRequest({ reference: ref, kind: 'Enquiry', label: car || 'General enquiry' });
  };

  const stock = vehicles.filter((v) => v.status !== 'sold');

  return (
    <Dialog title="Enquire with the showroom" onClose={onClose}>
      {state.status === 'done' ? (
        <div className="py-6 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-700" aria-hidden />
          <p className="mt-4 text-lg font-bold text-stone-900">Thank you — we have your enquiry</p>
          <p className="mt-2 text-sm text-stone-600">
            A showroom advisor will call you shortly{contact?.hours ? ` (${contact.hours})` : ''}.
            {state.reference && <> Your reference is <span className="font-mono font-bold">{state.reference}</span>.</>}
          </p>
          <button type="button" className="btn btn-primary mt-6" onClick={onClose}>Done</button>
        </div>
      ) : (
        <form onSubmit={onSubmit} noValidate className="relative space-y-4">
          <Honeypot value={website} onChange={setWebsite} />
          <Field label="Your name" error={errors.name}>
            {(p) => <input {...p} className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />}
          </Field>
          <Field label="Mobile number" error={errors.phone} hint="We will call or WhatsApp you on this number.">
            {(p) => <input {...p} className="field" type="tel" inputMode="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" placeholder="98765 43210" />}
          </Field>
          <Field label="Email" optional error={errors.email}>
            {(p) => <input {...p} className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />}
          </Field>
          <Field label="Car you are interested in" optional>
            {(p) => (
              <select {...p} className="field" value={car} onChange={(e) => setCar(e.target.value)}>
                <option value="">Not sure yet</option>
                {stock.map((v) => <option key={v.id} value={`${vehicleName(v)} ${v.badge || ''}`.trim()}>{vehicleName(v)} {v.badge}</option>)}
              </select>
            )}
          </Field>
          <Field label="Message" optional>
            {(p) => <textarea {...p} className="field min-h-20" value={message} onChange={(e) => setMessage(e.target.value)} maxLength={2000} />}
          </Field>
          {state.status === 'error' && <p className="form-alert form-alert-error" role="alert">{state.error}</p>}
          <button type="submit" className="btn btn-primary w-full" disabled={state.status === 'sending'}>
            {state.status === 'sending' ? 'Sending…' : 'Send enquiry'}
          </button>
          {contact && (
            <div className="border-t border-stone-200 pt-4">
              <p className="field-label">Or talk to us now</p>
              <div className="grid grid-cols-2 gap-2">
                {contact.phones.slice(0, 2).map((p) => (
                  <a key={p.number} href={`tel:${p.number}`} className="btn btn-secondary btn-sm normal-case tracking-normal">
                    <Phone className="h-4 w-4" aria-hidden />{p.label || displayPhone(p.number)}
                  </a>
                ))}
                {contact.whatsapp && (
                  <a href={whatsappLink(contact.whatsapp, car ? `Hi, I'm interested in the ${car}.` : undefined)} target="_blank" rel="noopener" className="btn btn-secondary btn-sm col-span-2 normal-case tracking-normal">
                    <MessageCircle className="h-4 w-4 text-emerald-700" aria-hidden />WhatsApp the showroom
                  </a>
                )}
              </div>
            </div>
          )}
        </form>
      )}
    </Dialog>
  );
}
