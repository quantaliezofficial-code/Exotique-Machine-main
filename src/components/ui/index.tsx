import React, { useId, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Link } from '../../router';

/** Page header used by every inner page, so titles, spacing and breadcrumbs match. */
export function PageHeader({
  eyebrow, title, lead, crumbs, children,
}: {
  eyebrow?: string;
  title: string;
  lead?: React.ReactNode;
  crumbs?: { label: string; to?: string }[];
  children?: React.ReactNode;
}) {
  return (
    <header className="border-b border-stone-200 bg-white">
      <div className="page-container py-8 sm:py-10">
        {crumbs && crumbs.length > 0 && <Breadcrumbs items={crumbs} />}
        {eyebrow && <p className="eyebrow text-[var(--color-accent)]">{eyebrow}</p>}
        <h1 className="mt-1 text-3xl sm:text-4xl font-black tracking-tight text-stone-900">{title}</h1>
        {lead && <p className="mt-2 section-lead">{lead}</p>}
        {children}
      </div>
    </header>
  );
}

export function Breadcrumbs({ items }: { items: { label: string; to?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3">
      <ol className="flex flex-wrap items-center gap-1 text-xs text-stone-500">
        {items.map((c, i) => (
          <li key={i} className="flex items-center gap-1 min-w-0">
            {i > 0 && <ChevronRight className="w-3 h-3 shrink-0" aria-hidden />}
            {c.to ? (
              <Link to={c.to} className="hover:text-stone-900 underline-offset-2 hover:underline">{c.label}</Link>
            ) : (
              <span aria-current="page" className="text-stone-700 truncate max-w-[16rem]">{c.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function SectionHeading({
  eyebrow, title, lead, action, center = false, as: Tag = 'h2', id,
}: {
  eyebrow?: string; title: string; lead?: string; action?: React.ReactNode; center?: boolean; as?: 'h1' | 'h2'; id?: string;
}) {
  return (
    <div className={`mb-8 md:mb-10 flex flex-col gap-4 ${center ? 'items-center text-center' : 'md:flex-row md:items-end md:justify-between'}`}>
      <div className="max-w-2xl">
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <Tag id={id} className="section-title mt-1">{title}</Tag>
        {lead && <p className={`section-lead mt-2 ${center ? 'mx-auto' : ''}`}>{lead}</p>}
      </div>
      {action}
    </div>
  );
}

/** Label + control + hint/error with the ids wired for screen readers. */
export function Field({
  label, hint, error, children, optional,
}: {
  label: string;
  hint?: string;
  error?: string | null;
  optional?: boolean;
  children: (props: { id: string; 'aria-describedby'?: string; 'aria-invalid'?: boolean }) => React.ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errId = error ? `${id}-err` : undefined;
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label} {optional && <span className="normal-case font-medium tracking-normal text-stone-500">(optional)</span>}
      </label>
      {children({ id, 'aria-describedby': [hintId, errId].filter(Boolean).join(' ') || undefined, 'aria-invalid': !!error || undefined })}
      {hint && !error && <p id={hintId} className="field-hint">{hint}</p>}
      {error && <p id={errId} className="field-error" role="alert">{error}</p>}
    </div>
  );
}

/** Hidden from people, irresistible to bots. The server silently drops filled ones. */
export function Honeypot({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, overflow: 'hidden' }}>
      <label>
        Website
        <input type="text" tabIndex={-1} autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} name="website" />
      </label>
    </div>
  );
}

/** Indian mobile: accepts +91 / 0 prefixes and spaces, validates 10 digits starting 6-9. */
export function normaliseMobile(input: string): string | null {
  const d = input.replace(/\D/g, '').replace(/^(91|0)(?=\d{10}$)/, '');
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

type SubmitState = { status: 'idle' | 'sending' | 'done' | 'error'; reference?: string; error?: string };

/** Shared submit flow for lead forms: one pending state, real errors, reference on success. */
export function useLeadSubmit<T>(send: (payload: T) => Promise<{ reference?: string }>) {
  const [state, setState] = useState<SubmitState>({ status: 'idle' });
  /** Resolves to the showroom reference on success, or null on failure. */
  const submit = async (payload: T): Promise<string | null> => {
    setState({ status: 'sending' });
    try {
      const r = await send(payload);
      setState({ status: 'done', reference: r.reference });
      return r.reference || '';
    } catch (e: any) {
      const msg = e?.status === 429
        ? 'Too many attempts from this connection. Please wait a few minutes, or call us.'
        : e?.message && e.status && e.status < 500
          ? e.message
          : 'We could not send this right now. Please try again, or call or WhatsApp us.';
      setState({ status: 'error', error: msg });
      return null;
    }
  };
  return { state, submit, reset: () => setState({ status: 'idle' }) };
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="card p-10 text-center">
      <p className="text-lg font-bold text-stone-900">{title}</p>
      {body && <p className="mt-2 text-sm text-stone-600 max-w-md mx-auto">{body}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-3 py-24 text-stone-500">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-stone-300 border-t-[var(--color-accent)]" aria-hidden />
      <span className="text-xs font-mono uppercase tracking-widest">{label}…</span>
    </div>
  );
}
