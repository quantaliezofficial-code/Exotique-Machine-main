import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SiteSettings, HomeSection } from '../../types';
import { api } from '../../services/api';
import { Field } from '../ui';
import { PanelHeader, MoveButtons, moveItem, useAction, useAdmin, ImageField } from './ui';

type Key = keyof SiteSettings;
interface Meta { hasUnpublishedChanges: boolean; updatedBy?: string; publishedBy?: string; publishedAt?: string }

const TABS: { key: Key; label: string }[] = [
  { key: 'homepage', label: 'Home page' }, { key: 'general', label: 'Business' }, { key: 'contact', label: 'Contact & hours' },
  { key: 'social', label: 'Social links' }, { key: 'seo', label: 'SEO' }, { key: 'faq', label: 'FAQ' },
];
const SECTION_LABELS: Record<string, string> = {
  hero: 'Hero slideshow', stats: 'Stats bar', brands: 'Brands in stock', showcase: 'Featured cars', offers: 'Offers',
  services: 'Services', testimonials: 'Reviews', lifestyle: 'Body types', faq: 'FAQ',
};
const DAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

export default function SettingsManager({ onChange }: { onChange: () => void }) {
  const { can } = useAdmin();
  const [draft, setDraft] = useState<SiteSettings | null>(null);
  const [meta, setMeta] = useState<Record<string, Meta>>({});
  const [tab, setTab] = useState<Key>('homepage');
  const [dirty, setDirty] = useState<Set<Key>>(new Set());
  const { run, busy } = useAction();

  const load = () => api.admin.get<{ draft: SiteSettings; meta: Record<string, Meta> }>('site-settings').then((r) => { setDraft(r.draft); setMeta(r.meta); setDirty(new Set()); });
  useEffect(() => { load(); }, []);
  if (!draft) return <p className="text-sm text-stone-500">Loading…</p>;

  const patch = <K extends Key>(key: K, value: SiteSettings[K]) => { setDraft({ ...draft, [key]: value }); setDirty(new Set(dirty).add(key)); };
  const saveDraft = async (key: Key) => {
    if (await run(() => api.admin.put(`site-settings/${key}`, draft[key]), 'Draft saved') !== undefined) {
      const d = new Set(dirty); d.delete(key); setDirty(d);
      setMeta((m) => ({ ...m, [key]: { ...(m[key] || {}), hasUnpublishedChanges: true } }));
    }
  };
  const publish = async () => {
    for (const k of dirty) await api.admin.put(`site-settings/${k}`, draft[k]).catch(() => {});
    if (await run(() => api.admin.post('site-settings/publish', {}), 'Published — the website is updated') !== undefined) { load(); onChange(); }
  };
  const discard = async () => { if (await run(() => api.admin.post('site-settings/discard', {}), 'Drafts discarded') !== undefined) load(); };
  const pending = TABS.filter((t) => meta[t.key]?.hasUnpublishedChanges || dirty.has(t.key));

  return (
    <div>
      <PanelHeader title="Settings & SEO" lead="Changes are saved as a draft first. Use “Preview drafts” to check them, then publish."
        actions={<>
          <button className="btn btn-ghost" onClick={discard} disabled={busy || !pending.length}>Discard drafts</button>
          {can('cms:publish') && <button className="btn btn-primary" onClick={publish} disabled={busy || !pending.length}>Publish{pending.length ? ` (${pending.length})` : ''}</button>}
        </>} />
      <div role="tablist" className="mb-6 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button key={t.key} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)} className={`chip ${tab === t.key ? 'chip-active' : ''}`}>
            {t.label}{(meta[t.key]?.hasUnpublishedChanges || dirty.has(t.key)) && <span className="ml-1 h-2 w-2 rounded-full bg-amber-500" aria-label="unpublished changes" />}
          </button>
        ))}
      </div>
      <div className="card p-5 sm:p-6">
        {tab === 'homepage' && <HomepageForm value={draft.homepage} onChange={(v) => patch('homepage', v)} />}
        {tab === 'general' && <GeneralForm value={draft.general} onChange={(v) => patch('general', v)} />}
        {tab === 'contact' && <ContactForm value={draft.contact} onChange={(v) => patch('contact', v)} />}
        {tab === 'social' && <SocialForm value={draft.social} onChange={(v) => patch('social', v)} />}
        {tab === 'seo' && <SeoForm value={draft.seo} onChange={(v) => patch('seo', v)} />}
        {tab === 'faq' && <FaqForm value={draft.faq} onChange={(v) => patch('faq', v)} />}
        <div className="mt-6 flex items-center justify-between gap-3 border-t border-stone-200 pt-4">
          <p className="text-xs text-stone-500">{meta[tab]?.publishedBy ? `Last published by ${meta[tab].publishedBy}${meta[tab].publishedAt ? ` on ${new Date(meta[tab].publishedAt!).toLocaleString()}` : ''}` : ''}</p>
          <button className="btn btn-secondary" onClick={() => saveDraft(tab)} disabled={busy || !dirty.has(tab)}>Save draft</button>
        </div>
      </div>
    </div>
  );
}

function HomepageForm({ value, onChange }: { value: SiteSettings['homepage']; onChange: (v: SiteSettings['homepage']) => void }) {
  const setSection = (i: number, p: Partial<HomeSection>) => onChange({ ...value, sections: value.sections.map((s, j) => (j === i ? { ...s, ...p } : s)) });
  return (
    <div className="space-y-6">
      <Field label="Main heading (H1)" hint="Shown above the hero; also the most important words for Google on the home page.">
        {(p) => <input {...p} className="field" value={value.heading} onChange={(e) => onChange({ ...value, heading: e.target.value })} maxLength={120} />}
      </Field>
      <div>
        <p className="field-label">Sections (order, visibility, titles)</p>
        <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200">
          {value.sections.map((s, i) => (
            <li key={s.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center">
              <label className="flex min-w-40 items-center gap-2 text-sm font-semibold">
                <input type="checkbox" checked={s.enabled} onChange={(e) => setSection(i, { enabled: e.target.checked })} className="h-4 w-4 accent-stone-900" />
                {SECTION_LABELS[s.id] || s.id}
              </label>
              {'title' in s && <input className="field min-h-9 py-1.5 text-sm" placeholder="Title" value={s.title || ''} onChange={(e) => setSection(i, { title: e.target.value })} aria-label={`${s.id} title`} />}
              {'subtitle' in s && <input className="field min-h-9 py-1.5 text-sm" placeholder="Subtitle" value={s.subtitle || ''} onChange={(e) => setSection(i, { subtitle: e.target.value })} aria-label={`${s.id} subtitle`} />}
              {'limit' in s && <input type="number" min={1} max={50} className="field min-h-9 w-20 py-1.5 text-sm" value={s.limit || ''} onChange={(e) => setSection(i, { limit: Number(e.target.value) })} aria-label={`${s.id} item limit`} />}
              <MoveButtons first={i === 0} last={i === value.sections.length - 1} onUp={() => onChange({ ...value, sections: moveItem(value.sections, i, -1) })} onDown={() => onChange({ ...value, sections: moveItem(value.sections, i, 1) })} />
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="field-label">Stats bar</p>
        <p className="field-hint mb-2">Leave a value empty to calculate it from the inventory. Only state facts you can back up.</p>
        <ul className="space-y-2">
          {value.stats.map((st, i) => (
            <li key={i} className="flex gap-2">
              <input className="field" placeholder={st.auto ? `Automatic (${st.auto.replace('_', ' ')})` : 'Value'} value={st.value} onChange={(e) => onChange({ ...value, stats: value.stats.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} aria-label="Stat value" />
              <input className="field" value={st.label} onChange={(e) => onChange({ ...value, stats: value.stats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} aria-label="Stat label" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function GeneralForm({ value, onChange }: { value: SiteSettings['general']; onChange: (v: SiteSettings['general']) => void }) {
  const set = (k: keyof SiteSettings['general']) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [k]: e.target.value });
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Business name">{(p) => <input {...p} className="field" value={value.siteName} onChange={set('siteName')} />}</Field>
        <Field label="Legal name">{(p) => <input {...p} className="field" value={value.legalName} onChange={set('legalName')} />}</Field>
      </div>
      <Field label="Tagline">{(p) => <input {...p} className="field" value={value.tagline} onChange={set('tagline')} />}</Field>
      <Field label="Footer text">{(p) => <textarea {...p} className="field min-h-20" value={value.footerBlurb} onChange={set('footerBlurb')} />}</Field>
      <Field label="About page title">{(p) => <input {...p} className="field" value={value.aboutTitle} onChange={set('aboutTitle')} />}</Field>
      <Field label="About page text" hint="Leave an empty line between paragraphs.">{(p) => <textarea {...p} className="field min-h-36" value={value.aboutBody} onChange={set('aboutBody')} />}</Field>
      <Field label="Assurances" hint="One per line, shown on the About page.">
        {(p) => <textarea {...p} className="field min-h-20" value={value.assurances.join('\n')} onChange={(e) => onChange({ ...value, assurances: e.target.value.split('\n') })}
          onBlur={() => onChange({ ...value, assurances: value.assurances.map((a) => a.trim()).filter(Boolean) })} />}
      </Field>
      <fieldset className="rounded-lg border border-stone-200 p-4">
        <legend className="px-1 text-sm font-semibold">Announcement bar</legend>
        <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-stone-900" checked={value.announcement.enabled} onChange={(e) => onChange({ ...value, announcement: { ...value.announcement, enabled: e.target.checked } })} />Show at the top of every page</label>
        <div className="grid gap-3 sm:grid-cols-2">
          <input className="field" placeholder="Text" value={value.announcement.text} onChange={(e) => onChange({ ...value, announcement: { ...value.announcement, text: e.target.value } })} aria-label="Announcement text" />
          <input className="field" placeholder="Link (optional) e.g. /offers" value={value.announcement.link} onChange={(e) => onChange({ ...value, announcement: { ...value.announcement, link: e.target.value } })} aria-label="Announcement link" />
        </div>
      </fieldset>
    </div>
  );
}

function ContactForm({ value, onChange }: { value: SiteSettings['contact']; onChange: (v: SiteSettings['contact']) => void }) {
  const set = (k: keyof SiteSettings['contact']) => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value });
  const num = (k: 'latitude' | 'longitude') => (e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...value, [k]: e.target.value === '' ? null : Number(e.target.value) });
  return (
    <div className="space-y-5">
      <div>
        <p className="field-label">Phone numbers</p>
        <ul className="space-y-2">
          {value.phones.map((ph, i) => (
            <li key={i} className="flex gap-2">
              <input className="field" placeholder="Name" value={ph.label} onChange={(e) => onChange({ ...value, phones: value.phones.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} aria-label="Phone label" />
              <input className="field" placeholder="+91…" value={ph.number} onChange={(e) => onChange({ ...value, phones: value.phones.map((x, j) => (j === i ? { ...x, number: e.target.value.replace(/[^\d+]/g, '') } : x)) })} aria-label="Phone number" />
              <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center text-red-700" onClick={() => onChange({ ...value, phones: value.phones.filter((_, j) => j !== i) })} aria-label="Remove phone"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => onChange({ ...value, phones: [...value.phones, { label: '', number: '' }] })}><Plus className="h-4 w-4" aria-hidden />Add phone</button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="WhatsApp number" hint="Digits with country code, e.g. 916390000976">{(p) => <input {...p} className="field" value={value.whatsapp} onChange={(e) => onChange({ ...value, whatsapp: e.target.value.replace(/\D/g, '') })} />}</Field>
        <Field label="Email">{(p) => <input {...p} type="email" className="field" value={value.email} onChange={set('email')} />}</Field>
      </div>
      <Field label="Street address">{(p) => <input {...p} className="field" value={value.streetAddress} onChange={set('streetAddress')} />}</Field>
      <div className="grid gap-4 sm:grid-cols-4">
        <Field label="Area">{(p) => <input {...p} className="field" value={value.locality} onChange={set('locality')} />}</Field>
        <Field label="City">{(p) => <input {...p} className="field" value={value.city} onChange={set('city')} />}</Field>
        <Field label="State">{(p) => <input {...p} className="field" value={value.region} onChange={set('region')} />}</Field>
        <Field label="PIN code">{(p) => <input {...p} className="field" value={value.postalCode} onChange={set('postalCode')} />}</Field>
      </div>
      <Field label="Google Maps link">{(p) => <input {...p} className="field" value={value.mapUrl} onChange={set('mapUrl')} placeholder="https://maps.app.goo.gl/…" />}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Latitude" optional hint="From Google Maps (right-click the pin). Helps local search.">{(p) => <input {...p} type="number" step="any" className="field" value={value.latitude ?? ''} onChange={num('latitude')} />}</Field>
        <Field label="Longitude" optional>{(p) => <input {...p} type="number" step="any" className="field" value={value.longitude ?? ''} onChange={num('longitude')} />}</Field>
      </div>
      <div>
        <p className="field-label">Opening hours</p>
        <ul className="space-y-3">
          {value.openingHours.map((h, i) => (
            <li key={i} className="flex flex-col gap-2 rounded-lg border border-stone-200 p-3 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-1">
                {DAYS.map((d) => (
                  <button key={d} type="button" aria-pressed={h.days.includes(d)} className={`chip min-h-9 px-2.5 ${h.days.includes(d) ? 'chip-active' : ''}`}
                    onClick={() => onChange({ ...value, openingHours: value.openingHours.map((x, j) => (j === i ? { ...x, days: x.days.includes(d) ? x.days.filter((y) => y !== d) : DAYS.filter((y) => [...x.days, d].includes(y)) } : x)) })}>{d}</button>
                ))}
              </div>
              <input type="time" className="field w-auto" value={h.opens} onChange={(e) => onChange({ ...value, openingHours: value.openingHours.map((x, j) => (j === i ? { ...x, opens: e.target.value } : x)) })} aria-label="Opens" />
              <input type="time" className="field w-auto" value={h.closes} onChange={(e) => onChange({ ...value, openingHours: value.openingHours.map((x, j) => (j === i ? { ...x, closes: e.target.value } : x)) })} aria-label="Closes" />
              <button type="button" className="flex h-11 w-11 items-center justify-center text-red-700" onClick={() => onChange({ ...value, openingHours: value.openingHours.filter((_, j) => j !== i) })} aria-label="Remove hours"><Trash2 className="h-4 w-4" /></button>
            </li>
          ))}
        </ul>
        <button type="button" className="btn btn-ghost btn-sm mt-2" onClick={() => onChange({ ...value, openingHours: [...value.openingHours, { days: [], opens: '09:30', closes: '20:30' }] })}><Plus className="h-4 w-4" aria-hidden />Add hours</button>
      </div>
    </div>
  );
}

function SocialForm({ value, onChange }: { value: Record<string, string>; onChange: (v: Record<string, string>) => void }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {['instagram', 'youtube', 'facebook', 'linkedin', 'x'].map((k) => (
        <Field key={k} label={k === 'x' ? 'X (Twitter)' : k[0].toUpperCase() + k.slice(1)} optional>
          {(p) => <input {...p} className="field" value={value[k] || ''} onChange={(e) => onChange({ ...value, [k]: e.target.value })} placeholder="https://" />}
        </Field>
      ))}
    </div>
  );
}

function SeoForm({ value, onChange }: { value: SiteSettings['seo']; onChange: (v: SiteSettings['seo']) => void }) {
  const set = (k: keyof SiteSettings['seo']) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [k]: e.target.value });
  const count = (s: string, max: number) => <span className={s.length > max ? 'text-red-700' : ''}>{s.length}/{max}</span>;
  return (
    <div className="space-y-4">
      <Field label="Home page title" hint="Shown as the blue link in Google. Aim for 50–60 characters.">
        {(p) => <><input {...p} className="field" value={value.homeTitle} onChange={set('homeTitle')} /><p className="field-hint text-right">{count(value.homeTitle, 60)}</p></>}
      </Field>
      <Field label="Home page description" hint="The grey text under the link in Google. Aim for 140–160 characters.">
        {(p) => <><textarea {...p} className="field min-h-20" value={value.homeDescription} onChange={set('homeDescription')} /><p className="field-hint text-right">{count(value.homeDescription, 160)}</p></>}
      </Field>
      <Field label="Title ending for other pages">{(p) => <input {...p} className="field" value={value.titleSuffix} onChange={set('titleSuffix')} />}</Field>
      <ImageField label="Default share image" required folder="brand" value={value.defaultOgImage} onChange={(u) => onChange({ ...value, defaultOgImage: u || '/og-default.jpg' })} hint="Shown when a page is shared on WhatsApp or social media (1200×630 ideal)." />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Google Search Console code" optional hint="Only the content value of the meta tag">{(p) => <input {...p} className="field" value={value.googleSiteVerification || ''} onChange={set('googleSiteVerification')} />}</Field>
        <Field label="Bing Webmaster code" optional>{(p) => <input {...p} className="field" value={value.bingSiteVerification || ''} onChange={set('bingSiteVerification')} />}</Field>
      </div>
      <label className="flex min-h-11 items-start gap-2.5 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-stone-900" checked={value.allowAiCrawlers} onChange={(e) => onChange({ ...value, allowAiCrawlers: e.target.checked })} />
        <span>Allow AI training crawlers (GPTBot, Google-Extended, ClaudeBot…). <span className="text-stone-500">AI search assistants that cite the site stay allowed either way.</span></span>
      </label>
    </div>
  );
}

function FaqForm({ value, onChange }: { value: SiteSettings['faq']; onChange: (v: SiteSettings['faq']) => void }) {
  return (
    <div>
      <p className="field-hint mb-3">Shown on the home and finance pages and given to Google and AI assistants as FAQ data. Keep answers factual.</p>
      <ul className="space-y-3">
        {value.map((f, i) => (
          <li key={i} className="space-y-2 rounded-lg border border-stone-200 p-3">
            <div className="flex gap-2">
              <input className="field font-semibold" placeholder="Question" value={f.question} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, question: e.target.value } : x)))} aria-label="Question" />
              <MoveButtons first={i === 0} last={i === value.length - 1} onUp={() => onChange(moveItem(value, i, -1))} onDown={() => onChange(moveItem(value, i, 1))} />
              <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center text-red-700" onClick={() => onChange(value.filter((_, j) => j !== i))} aria-label="Remove question"><Trash2 className="h-4 w-4" /></button>
            </div>
            <textarea className="field min-h-20" placeholder="Answer" value={f.answer} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, answer: e.target.value } : x)))} aria-label="Answer" />
          </li>
        ))}
      </ul>
      <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => onChange([...value, { question: '', answer: '' }])}><Plus className="h-4 w-4" aria-hidden />Add question</button>
    </div>
  );
}
