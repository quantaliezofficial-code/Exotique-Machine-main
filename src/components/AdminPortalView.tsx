import React, { Suspense, lazy, useEffect, useState } from 'react';
import { LayoutDashboard, Car, Globe, Inbox, Users, ScrollText, UserCog, LogOut, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import type { AdminUser } from '../types';
import { api } from '../services/api';
import { usePageMeta } from '../lib/seo';
import { Link } from '../router';
import { useSite } from '../content';
import { Field, Spinner } from './ui';
import { AdminContext, ToastProvider, canFor, PasswordRules } from './admin/ui';

const Dashboard = lazy(() => import('./admin/Dashboard'));
const InventoryManager = lazy(() => import('./admin/InventoryManager'));
const CmsPanel = lazy(() => import('./admin/CmsPanel'));
const LeadsPanel = lazy(() => import('./admin/LeadsPanel'));
const StaffManager = lazy(() => import('./admin/StaffManager'));
const ActivityLogPanel = lazy(() => import('./admin/ActivityLogPanel'));
const AccountPanel = lazy(() => import('./admin/AccountPanel'));

type Tab = 'dashboard' | 'inventory' | 'website' | 'leads' | 'staff' | 'logs' | 'account';
const CMS_PERMS = ['cms:hero', 'cms:showcase', 'cms:reviews', 'cms:offers', 'cms:media', 'cms:settings'] as const;

export default function AdminPortalView() {
  usePageMeta({ title: 'Staff portal | Exotique Machines', noindex: true });
  const [user, setUser] = useState<AdminUser | null | undefined>(undefined);
  useEffect(() => { api.getMe().then(setUser); }, []);

  if (user === undefined) return <Spinner label="Checking session" />;
  if (!user) return <LoginForm onLogin={setUser} />;
  if (user.mustChangePassword) return <ForcedPasswordChange user={user} onDone={setUser} onLogout={() => setUser(null)} />;
  return (
    <ToastProvider>
      <AdminContext.Provider value={{ user, can: canFor(user) }}>
        <Portal user={user} onLogout={() => setUser(null)} onUserChange={setUser} />
      </AdminContext.Provider>
    </ToastProvider>
  );
}

function Portal({ user, onLogout, onUserChange }: { user: AdminUser; onLogout: () => void; onUserChange: (u: AdminUser) => void }) {
  const can = canFor(user);
  const { refreshVehicles, refreshHome } = useSite();
  const tabs: { id: Tab; label: string; icon: React.ElementType; show: boolean }[] = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, show: true },
    { id: 'inventory', label: 'Inventory', icon: Car, show: can('inventory:view') },
    { id: 'website', label: 'Website', icon: Globe, show: CMS_PERMS.some((p) => can(p)) },
    { id: 'leads', label: 'Leads', icon: Inbox, show: can('leads:view') },
    { id: 'staff', label: 'Staff', icon: Users, show: user.role === 'superadmin' },
    { id: 'logs', label: 'Activity log', icon: ScrollText, show: can('logs:view') },
    { id: 'account', label: 'My account', icon: UserCog, show: true },
  ];
  const visible = tabs.filter((t) => t.show);
  const fromHash = (window.location.hash.slice(1) as Tab) || 'dashboard';
  const [tab, setTabState] = useState<Tab>(visible.some((t) => t.id === fromHash) ? fromHash : 'dashboard');
  const setTab = (t: Tab) => { setTabState(t); window.history.replaceState({}, '', `/admin#${t}`); };

  const logout = async () => {
    try { await api.logout(); } catch { /* session may already be gone */ }
    onLogout();
  };
  // Content edits should show up on the public pages without a reload.
  const onContentChange = () => { refreshVehicles(); refreshHome(); };

  return (
    <div className="mx-auto flex min-h-[80vh] max-w-[1400px] flex-col lg:flex-row">
      <aside className="border-b border-stone-200 bg-white lg:w-60 lg:shrink-0 lg:border-b-0 lg:border-r">
        <div className="flex items-center justify-between gap-2 px-4 py-4 lg:block">
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-stone-900">{user.name || user.username}</p>
            <p className="text-xs text-stone-500">{user.role === 'superadmin' ? 'Super admin' : 'Staff'} · @{user.username}</p>
          </div>
          <button type="button" onClick={logout} className="btn btn-ghost btn-sm lg:mt-3 lg:w-full lg:justify-start"><LogOut className="h-4 w-4" aria-hidden />Sign out</button>
        </div>
        <nav aria-label="Admin" className="flex gap-1 overflow-x-auto px-2 pb-2 no-scrollbar lg:flex-col lg:px-2 lg:pb-4">
          {visible.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setTab(id)} aria-current={tab === id ? 'page' : undefined}
              className={`flex min-h-11 shrink-0 items-center gap-2.5 rounded-lg px-3 text-sm font-medium ${tab === id ? 'bg-stone-900 text-white' : 'text-stone-700 hover:bg-stone-100'}`}>
              <Icon className="h-4 w-4" aria-hidden />{label}
            </button>
          ))}
        </nav>
      </aside>
      <section className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8">
        <Suspense fallback={<Spinner />}>
          {tab === 'dashboard' && <Dashboard onNavigate={(t) => setTab(t as Tab)} />}
          {tab === 'inventory' && <InventoryManager onChange={onContentChange} />}
          {tab === 'website' && <CmsPanel onChange={onContentChange} />}
          {tab === 'leads' && <LeadsPanel />}
          {tab === 'staff' && <StaffManager />}
          {tab === 'logs' && <ActivityLogPanel />}
          {tab === 'account' && <AccountPanel onUserChange={onUserChange} />}
        </Suspense>
      </section>
    </div>
  );
}

function LoginForm({ onLogin }: { onLogin: (u: AdminUser) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const r = await api.login(username.trim(), password);
      onLogin(r.user);
    } catch (err: any) {
      setError(err?.message || 'Sign-in failed');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-container flex min-h-[70vh] items-center justify-center py-12">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6 sm:p-8">
        <div className="text-center">
          <ShieldCheck className="mx-auto h-8 w-8 text-[var(--color-accent)]" aria-hidden />
          <h1 className="mt-3 text-xl font-black text-stone-900">Staff sign-in</h1>
          <p className="mt-1 text-xs text-stone-500">For Exotique Machines staff only.</p>
        </div>
        <Field label="Username">
          {(p) => <input {...p} className="field" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />}
        </Field>
        <Field label="Password">
          {(p) => (
            <div className="relative">
              <input {...p} className="field pr-12" type={show ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
              <button type="button" onClick={() => setShow((s) => !s)} className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center text-stone-500" aria-label={show ? 'Hide password' : 'Show password'}>
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          )}
        </Field>
        {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <p className="text-center text-xs text-stone-500"><Link to="/" className="underline">Back to the website</Link></p>
      </form>
    </div>
  );
}

function ForcedPasswordChange({ user, onDone, onLogout }: { user: AdminUser; onDone: (u: AdminUser) => void; onLogout: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) { setError('The new passwords do not match.'); return; }
    setBusy(true);
    setError('');
    try {
      const r = await api.changeOwnPassword({ currentPassword: current, newPassword: next });
      onDone(r.user);
    } catch (err: any) {
      setError(err?.message || 'Could not change the password');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="page-container flex min-h-[70vh] items-center justify-center py-12">
      <form onSubmit={submit} className="card w-full max-w-sm space-y-4 p-6 sm:p-8">
        <h1 className="text-xl font-black text-stone-900">Set your own password</h1>
        <p className="text-sm text-stone-600">Hi {user.name || user.username}. You signed in with a temporary password. Choose a new one to continue.</p>
        <Field label="Temporary password">
          {(p) => <input {...p} className="field" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />}
        </Field>
        <Field label="New password">
          {(p) => <input {...p} className="field" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />}
        </Field>
        <PasswordRules />
        <Field label="Repeat new password">
          {(p) => <input {...p} className="field" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" required />}
        </Field>
        {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={busy}>{busy ? 'Saving…' : 'Save and continue'}</button>
        <button type="button" className="btn btn-ghost w-full" onClick={async () => { try { await api.logout(); } catch { /* */ } onLogout(); }}>Sign out</button>
      </form>
    </div>
  );
}
