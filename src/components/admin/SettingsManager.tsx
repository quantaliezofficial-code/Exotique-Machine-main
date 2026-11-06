import React, { useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { SiteSettings, HomeSection, VideoClip } from '../../types';
import { api } from '../../services/api';
import { Field } from '../ui';
import { PanelHeader, MoveButtons, moveItem, useAction, useAdmin, ImageField, VideoField, BuiltinVideos } from './ui';

type Key = keyof SiteSettings;
interface Meta { hasUnpublishedChanges: boolean; updatedBy?: string; publishedBy?: string; publishedAt?: string }

const TABS: { key: Key; label: string }[] = [
  { key: 'homepage', label: 'Home page' }, { key: 'general', label: 'Business' }, { key: 'contact', label: 'Contact & hours' },
  { key: 'social', label: 'Social links' }, { key: 'seo', label: 'SEO' }, { key: 'faq', label: 'FAQ' },
];
const SECTION_LABELS: Record<string, string> = {
  stories: 'Customer video stories', hero: 'Hero slideshow', stats: 'Stats bar', velocity: 'Moving text band', whyus: 'Why buy from us (stacking cards)', brands: 'Rotating brand grid', showcase: 'Featured cars (card stack)', offers: 'Offer banner',
  services: 'Services (zoom parallax)', testimonials: 'Reviews carousel', lifestyle: 'Collections (hover rows)', faq: 'FAQ',
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

const NO_COPY = new Set(['hero', 'stats', 'velocity']);

function HomepageForm({ value, onChange }: { value: SiteSettings['homepage']; onChange: (v: SiteSettings['homepage']) => void }) {
  const setSection = (i: number, p: Partial<HomeSection>) => onChange({ ...value, sections: value.sections.map((s, j) => (j === i ? { ...s, ...p } : s)) });
  const sv = value.services;
  const setSv = (p: Partial<SiteSettings['homepage']['services']>) => onChange({ ...value, services: { ...sv, ...p } });
  const setItem = (i: number, p: Partial<SiteSettings['homepage']['services']['items'][number]>) => setSv({ items: sv.items.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const rows = value.collections || [];
  const vel = value.velocity || { lines: [], brandLine: true };
  const stories = value.videoStories || [];
  const setStory = (i: number, p: Partial<VideoClip>) => onChange({ ...value, videoStories: stories.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const why = value.whyUs || [];
  const setWhy = (i: number, p: Partial<SiteSettings['homepage']['whyUs'][number]>) => onChange({ ...value, whyUs: why.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const setRow = (i: number, p: Partial<SiteSettings['homepage']['collections'][number]>) => onChange({ ...value, collections: rows.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  return (
    <div className="space-y-8">
      <Field label="Main heading (H1)" hint="Shown in the hero; also the most important words for Google on the home page.">
        {(p) => <input {...p} className="field" value={value.heading} onChange={(e) => onChange({ ...value, heading: e.target.value })} maxLength={120} />}
      </Field>

      <div>
        <p className="field-label">Sections: order, visibility and text</p>
        <ul className="divide-y divide-stone-200 rounded-lg border border-stone-200">
          {value.sections.map((s, i) => (
            <li key={s.id} className="space-y-2 p-3">
              <div className="flex items-center justify-between gap-2">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input type="checkbox" checked={s.enabled} onChange={(e) => setSection(i, { enabled: e.target.checked })} className="h-4 w-4 accent-stone-900" />
                  {SECTION_LABELS[s.id] || s.id}
                </label>
                <div className="flex items-center gap-2">
                  {'limit' in s && <label className="flex items-center gap-1 text-xs text-stone-600">Max items<input type="number" min={1} max={50} className="field min-h-9 w-20 py-1.5 text-sm" value={s.limit || ''} onChange={(e) => setSection(i, { limit: Number(e.target.value) })} /></label>}
                  <MoveButtons first={i === 0} last={i === value.sections.length - 1} onUp={() => onChange({ ...value, sections: moveItem(value.sections, i, -1) })} onDown={() => onChange({ ...value, sections: moveItem(value.sections, i, 1) })} />
                </div>
              </div>
              {!NO_COPY.has(s.id) && s.enabled && (
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="field min-h-9 py-1.5 text-sm" placeholder="Small label above the title" value={s.eyebrow || ''} onChange={(e) => setSection(i, { eyebrow: e.target.value })} aria-label={`${s.id} label`} />
                  <input className="field min-h-9 py-1.5 text-sm" placeholder="Title" value={s.title || ''} onChange={(e) => setSection(i, { title: e.target.value })} aria-label={`${s.id} title`} />
                  {s.id === 'services' && <input className="field min-h-9 py-1.5 text-sm" placeholder="Second title line (gold)" value={s.titleAccent || ''} onChange={(e) => setSection(i, { titleAccent: e.target.value })} aria-label="services second title line" />}
                  <textarea className="field min-h-16 py-1.5 text-sm sm:col-span-2" placeholder="Intro text" value={s.subtitle || ''} onChange={(e) => setSection(i, { subtitle: e.target.value })} aria-label={`${s.id} intro`} />
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="field-label">Stats bar</p>
        <p className="field-hint mb-2">Leave a value empty to calculate it from the inventory. Only state facts you can back up. Numbers count up when they scroll into view.</p>
        <ul className="space-y-2">
          {value.stats.map((st, i) => (
            <li key={i} className="flex gap-2">
              <input className="field" placeholder={st.auto ? `Automatic (${st.auto.replace('_', ' ')})` : 'Value'} value={st.value} onChange={(e) => onChange({ ...value, stats: value.stats.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)) })} aria-label="Stat value" />
              <input className="field" value={st.label} onChange={(e) => onChange({ ...value, stats: value.stats.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} aria-label="Stat label" />
            </li>
          ))}
        </ul>
      </div>

      <fieldset className="rounded-lg border border-stone-200 p-4">
        <legend className="px-1 text-sm font-semibold">Services (zoom-parallax block)</legend>
        <p className="field-hint mb-3">The centre card and up to six photos that zoom out as visitors scroll (on phones they show as swipeable cards). Use landscape photos at least 1600 px wide.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Card label">{(p) => <input {...p} className="field" value={sv.centerEyebrow} onChange={(e) => setSv({ centerEyebrow: e.target.value })} />}</Field>
          <Field label="Card title">{(p) => <input {...p} className="field" value={sv.centerTitle} onChange={(e) => setSv({ centerTitle: e.target.value })} />}</Field>
          <Field label="Card text">{(p) => <input {...p} className="field" value={sv.centerText} onChange={(e) => setSv({ centerText: e.target.value })} />}</Field>
          <Field label="Button text">{(p) => <input {...p} className="field" value={sv.ctaLabel} onChange={(e) => setSv({ ctaLabel: e.target.value })} />}</Field>
          <Field label="Button link">{(p) => <input {...p} className="field" value={sv.ctaUrl} onChange={(e) => setSv({ ctaUrl: e.target.value })} placeholder="/service" />}</Field>
        </div>
        <ul className="mt-4 space-y-3">
          {sv.items.map((it, i) => (
            <li key={i} className="grid gap-3 rounded-lg border border-stone-200 p-3 md:grid-cols-[auto_1fr]">
              <ImageField label={`Photo ${i + 1}`} required folder="general" value={it.image} onChange={(u) => setItem(i, { image: u || '' })} />
              <div className="grid gap-2">
                <div className="flex gap-2">
                  <input className="field" placeholder="Title" value={it.title} onChange={(e) => setItem(i, { title: e.target.value })} aria-label="Service title" />
                  <MoveButtons first={i === 0} last={i === sv.items.length - 1} onUp={() => setSv({ items: moveItem(sv.items, i, -1) })} onDown={() => setSv({ items: moveItem(sv.items, i, 1) })} />
                  <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center text-red-700" onClick={() => setSv({ items: sv.items.filter((_, j) => j !== i) })} aria-label="Remove service"><Trash2 className="h-4 w-4" /></button>
                </div>
                <input className="field" placeholder="Short description" value={it.desc} onChange={(e) => setItem(i, { desc: e.target.value })} aria-label="Service description" />
                <input className="field" placeholder="Link, e.g. /service" value={it.link} onChange={(e) => setItem(i, { link: e.target.value })} aria-label="Service link" />
              </div>
            </li>
          ))}
        </ul>
        {sv.items.length < 12 && (
          <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => setSv({ items: [...sv.items, { title: '', desc: '', image: '', link: '/service' }] })}><Plus className="h-4 w-4" aria-hidden />Add service</button>
        )}
      </fieldset>

      <fieldset className="rounded-lg border border-stone-200 p-4">
        <legend className="px-1 text-sm font-semibold">Collections (hover rows)</legend>
        <p className="field-hint mb-3">Each row shows its photo in a moving band when hovered. Link to a filtered list, e.g. /cars?type=SUV or /brands/bmw.</p>
        <ul className="space-y-3">
          {rows.map((r, i) => (
            <li key={i} className="grid gap-3 rounded-lg border border-stone-200 p-3 md:grid-cols-[auto_1fr]">
              <ImageField label={`Photo ${i + 1}`} required folder="general" value={r.image} onChange={(u) => setRow(i, { image: u || '' })} />
              <div className="grid gap-2">
                <div className="flex gap-2">
                  <input className="field" placeholder="Label" value={r.label} onChange={(e) => setRow(i, { label: e.target.value })} aria-label="Collection label" />
                  <MoveButtons first={i === 0} last={i === rows.length - 1} onUp={() => onChange({ ...value, collections: moveItem(rows, i, -1) })} onDown={() => onChange({ ...value, collections: moveItem(rows, i, 1) })} />
                  <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center text-red-700" onClick={() => onChange({ ...value, collections: rows.filter((_, j) => j !== i) })} aria-label="Remove row"><Trash2 className="h-4 w-4" /></button>
                </div>
                <input className="field" placeholder="Link" value={r.link} onChange={(e) => setRow(i, { link: e.target.value })} aria-label="Collection link" />
              </div>
            </li>
          ))}
        </ul>
        {rows.length < 12 && (
          <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => onChange({ ...value, collections: [...rows, { label: '', image: '', link: '/cars' }] })}><Plus className="h-4 w-4" aria-hidden />Add row</button>
        )}
      </fieldset>

      <fieldset className="rounded-lg border border-stone-200 p-4">
        <legend className="px-1 text-sm font-semibold">Customer video stories</legend>
        <p className="field-hint mb-3">Vertical (9:16) customer videos, shown as reels on the home page (and the About page unless switched off there). Add up to 12; use Remove on a story to take it down, and the arrows to change the order. Only publish videos the customer agreed to share. Add a transcript so people who can't play sound (and search engines) can follow.</p>
        <ul className="space-y-4">
          {stories.map((c, i) => (
            <li key={c.src || i} className="grid gap-3 rounded-lg border border-stone-200 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <VideoField label={`Story ${i + 1}`} value={c.src ? c : null} onChange={(v) => v ? setStory(i, v) : onChange({ ...value, videoStories: stories.filter((_, j) => j !== i) })} />
              <div className="grid content-start gap-2">
                <div className="flex gap-2">
                  <input className="field" placeholder="Customer name" value={c.name || ''} maxLength={80} onChange={(e) => setStory(i, { name: e.target.value })} aria-label="Customer name" />
                  <MoveButtons first={i === 0} last={i === stories.length - 1} onUp={() => onChange({ ...value, videoStories: moveItem(stories, i, -1) })} onDown={() => onChange({ ...value, videoStories: moveItem(stories, i, 1) })} />
                </div>
                <input className="field" placeholder="Car they bought, e.g. Mercedes-Benz C-Class" value={c.car || ''} maxLength={120} onChange={(e) => setStory(i, { car: e.target.value })} aria-label="Car" />
                <input className="field" placeholder="Short caption, e.g. Smooth paperwork and delivery" value={c.caption || ''} maxLength={200} onChange={(e) => setStory(i, { caption: e.target.value })} aria-label="Caption" />
                <textarea className="field min-h-20" placeholder="Transcript (optional): what they say in the video" value={c.transcript || ''} maxLength={6000} onChange={(e) => setStory(i, { transcript: e.target.value })} aria-label="Transcript" />
              </div>
            </li>
          ))}
        </ul>
        {stories.length < 12 && (
          <div className="mt-3"><VideoField label="Add a story" value={null} onChange={(v) => v && onChange({ ...value, videoStories: [...stories, v] })} /></div>
        )}
        <BuiltinVideos kind="story" used={stories} room={12 - stories.length} onAdd={(c) => onChange({ ...value, videoStories: [...stories, ...c] })} />
      </fieldset>

      <fieldset className="rounded-lg border border-stone-200 p-4">
        <legend className="px-1 text-sm font-semibold">Moving text band</legend>
        <p className="field-hint mb-3">Giant text that drifts across the page and speeds up as visitors scroll. One line per row, up to 3; each line moves the opposite way to the one above.</p>
        <Field label="Lines">{(p) => (
          <textarea {...p} className="field min-h-20" value={vel.lines.join('\n')} maxLength={370}
            onChange={(e) => onChange({ ...value, velocity: { ...vel, lines: e.target.value.split('\n').slice(0, 3) } })}
            onBlur={() => onChange({ ...value, velocity: { ...vel, lines: vel.lines.map((l) => l.trim()).filter(Boolean) } })} />
        )}</Field>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input type="checkbox" className="h-4 w-4 accent-stone-900" checked={vel.brandLine} onChange={(e) => onChange({ ...value, velocity: { ...vel, brandLine: e.target.checked } })} />
          Add a line with the brands in stock (updates automatically)
        </label>
      </fieldset>

      <fieldset className="rounded-lg border border-stone-200 p-4">
        <legend className="px-1 text-sm font-semibold">Why buy from us (stacking cards)</legend>
        <p className="field-hint mb-3">Up to 6 cards that pin and stack as visitors scroll. Leave the photo empty to use a featured car's photo. Only promise what the showroom actually provides.</p>
        <ul className="space-y-3">
          {why.map((c, i) => (
            <li key={i} className="grid gap-3 rounded-lg border border-stone-200 p-3 md:grid-cols-[auto_1fr]">
              <ImageField label={`Photo ${i + 1}`} folder="general" value={c.image} onChange={(u) => setWhy(i, { image: u || '' })} />
              <div className="grid gap-2">
                <div className="flex gap-2">
                  <input className="field" placeholder="Title" value={c.title} maxLength={80} onChange={(e) => setWhy(i, { title: e.target.value })} aria-label="Card title" />
                  <MoveButtons first={i === 0} last={i === why.length - 1} onUp={() => onChange({ ...value, whyUs: moveItem(why, i, -1) })} onDown={() => onChange({ ...value, whyUs: moveItem(why, i, 1) })} />
                  <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center text-red-700" onClick={() => onChange({ ...value, whyUs: why.filter((_, j) => j !== i) })} aria-label="Remove card"><Trash2 className="h-4 w-4" /></button>
                </div>
                <textarea className="field min-h-16" placeholder="Short text" value={c.text} maxLength={400} onChange={(e) => setWhy(i, { text: e.target.value })} aria-label="Card text" />
              </div>
            </li>
          ))}
        </ul>
        {why.length < 6 && (
          <button type="button" className="btn btn-ghost btn-sm mt-3" onClick={() => onChange({ ...value, whyUs: [...why, { title: '', text: '', image: '' }] })}><Plus className="h-4 w-4" aria-hidden />Add card</button>
        )}
      </fieldset>
    </div>
  );
}

function GeneralForm({ value, onChange }: { value: SiteSettings['general']; onChange: (v: SiteSettings['general']) => void }) {
  const set = (k: keyof SiteSettings['general']) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange({ ...value, [k]: e.target.value });
  const aboutClips = value.aboutVideos || [];
  const setAboutClips = (v: VideoClip[]) => onChange({ ...value, aboutVideos: v });
  const setAboutClip = (i: number, p: Partial<VideoClip>) => setAboutClips(aboutClips.map((x, j) => (j === i ? { ...x, ...p } : x)));
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
      <fieldset className="rounded-lg border border-stone-200 p-4">
        <legend className="px-1 text-sm font-semibold">About page videos</legend>
        <p className="field-hint mb-3">The first video is the showroom intro, shown beside the About text in a phone frame. Any others appear as a row further down the page. Vertical (9:16) videos look best. Up to 6.</p>
        <ul className="space-y-4">
          {aboutClips.map((c, i) => (
            <li key={c.src || i} className="grid gap-3 rounded-lg border border-stone-200 p-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <VideoField label={i === 0 ? 'Intro video (shown first)' : `Video ${i + 1}`} value={c.src ? c : null}
                onChange={(v) => setAboutClips(v ? aboutClips.map((x, j) => (j === i ? v : x)) : aboutClips.filter((_, j) => j !== i))} />
              <div className="grid content-start gap-2">
                <div className="flex gap-2">
                  <input className="field" placeholder="Title (optional), e.g. Inside Exotique Machines" value={c.title || ''} maxLength={120}
                    onChange={(e) => setAboutClip(i, { title: e.target.value })} aria-label={`Video ${i + 1} title`} />
                  <MoveButtons first={i === 0} last={i === aboutClips.length - 1}
                    onUp={() => setAboutClips(moveItem(aboutClips, i, -1))} onDown={() => setAboutClips(moveItem(aboutClips, i, 1))} />
                </div>
                <input className="field" placeholder="One-line description (optional)" value={c.description || ''} maxLength={600}
                  onChange={(e) => setAboutClip(i, { description: e.target.value })} aria-label={`Video ${i + 1} description`} />
                <textarea className="field min-h-20" placeholder="Transcript (optional): what is said in the video" value={c.transcript || ''} maxLength={6000}
                  onChange={(e) => setAboutClip(i, { transcript: e.target.value })} aria-label={`Video ${i + 1} transcript`} />
              </div>
            </li>
          ))}
        </ul>
        {aboutClips.length < 6 && (
          <div className="mt-3"><VideoField label={aboutClips.length ? 'Add another video' : 'Add the intro video'} value={null} onChange={(v) => v && setAboutClips([...aboutClips, v])} /></div>
        )}
        <BuiltinVideos kind={aboutClips.length ? 'any' : 'intro'} used={aboutClips} room={6 - aboutClips.length} onAdd={(c) => setAboutClips([...aboutClips, ...c])} />
        <label className="mt-4 flex items-center gap-2 text-sm text-stone-800">
          <input type="checkbox" className="h-4 w-4 accent-stone-900" checked={value.aboutStories !== false}
            onChange={(e) => onChange({ ...value, aboutStories: e.target.checked })} />
          Also show the customer video stories on the About page
        </label>
      </fieldset>
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
