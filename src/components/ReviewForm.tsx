import React, { useState } from 'react';
import { Star } from 'lucide-react';
import { Field, Honeypot } from './ui';
import { api } from '../services/api';

/** Customers can leave a review. It is published only after staff approve it. */
export default function ReviewForm({ onDone }: { onDone?: () => void }) {
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');
  const [website, setWebsite] = useState('');
  const [state, setState] = useState<{ status: 'idle' | 'sending' | 'done' | 'error'; message?: string }>({ status: 'idle' });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (name.trim().length < 2) errs.name = 'Please enter your name.';
    if (body.trim().length < 20) errs.body = 'Please write at least 20 characters.';
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setState({ status: 'sending' });
    try {
      const r = await api.submitReview({ customerName: name.trim(), customerTitle: title.trim() || undefined,
        rating: rating || undefined, body: body.trim(), website });
      setState({ status: 'done', message: r.message });
    } catch (err: any) {
      setState({ status: 'error', message: err?.message || 'Could not send your review. Please try again.' });
    }
  };

  if (state.status === 'done') {
    return (
      <div className="form-alert form-alert-success" role="status">
        {state.message}
        {onDone && <button type="button" className="ml-2 underline" onClick={onDone}>Close</button>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="relative grid gap-4 sm:grid-cols-2">
      <Honeypot value={website} onChange={setWebsite} />
      <Field label="Your name" error={errors.name}>
        {(p) => <input {...p} className="field" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={120} />}
      </Field>
      <Field label="Car you bought" optional hint="e.g. BMW X1 owner, Lucknow">
        {(p) => <input {...p} className="field" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={160} />}
      </Field>
      <fieldset className="sm:col-span-2">
        <legend className="field-label">Rating <span className="normal-case font-medium tracking-normal text-stone-500">(optional)</span></legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n === rating ? 0 : n)} aria-pressed={rating >= n}
              aria-label={`${n} star${n > 1 ? 's' : ''}`} className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-stone-100">
              <Star className={`h-6 w-6 ${rating >= n ? 'fill-amber-500 text-amber-500' : 'text-stone-300'}`} />
            </button>
          ))}
        </div>
      </fieldset>
      <div className="sm:col-span-2">
        <Field label="Your review" error={errors.body}>
          {(p) => <textarea {...p} className="field min-h-28" value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} />}
        </Field>
      </div>
      {state.status === 'error' && <p className="form-alert form-alert-error sm:col-span-2" role="alert">{state.message}</p>}
      <div className="sm:col-span-2 flex flex-wrap items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={state.status === 'sending'}>
          {state.status === 'sending' ? 'Sending…' : 'Submit review'}
        </button>
        <p className="text-xs text-stone-500">Reviews appear after our team checks them.</p>
      </div>
    </form>
  );
}
