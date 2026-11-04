import React, { useState } from 'react';
import type { AdminUser } from '../../types';
import { api } from '../../services/api';
import { Field } from '../ui';
import { PanelHeader, useAction, useAdmin, PasswordRules } from './ui';

export default function AccountPanel({ onUserChange }: { onUserChange: (u: AdminUser) => void }) {
  const { user } = useAdmin();
  const [name, setName] = useState(user.name || '');
  const [username, setUsername] = useState(user.username);
  const [confirmPw, setConfirmPw] = useState('');
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [error, setError] = useState('');
  const { run, busy } = useAction();

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await run(() => api.updateOwnProfile({ name, username, currentPassword: confirmPw }), 'Profile saved');
    if (r) { setConfirmPw(''); onUserChange(r.user); }
  };
  const savePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (next !== repeat) { setError('The new passwords do not match.'); return; }
    const r = await run(() => api.changeOwnPassword({ currentPassword: current, newPassword: next }), 'Password changed. Other sessions were signed out.');
    if (r) { setCurrent(''); setNext(''); setRepeat(''); onUserChange(r.user); }
  };

  return (
    <div className="max-w-2xl space-y-8">
      <PanelHeader title="My account" />
      <form onSubmit={saveProfile} className="card space-y-4 p-5">
        <h3 className="font-bold text-stone-900">Profile</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">{(p) => <input {...p} className="field" value={name} onChange={(e) => setName(e.target.value)} />}</Field>
          <Field label="Username">{(p) => <input {...p} className="field" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} autoCapitalize="none" />}</Field>
        </div>
        <Field label="Current password" hint="Needed to confirm the change.">{(p) => <input {...p} type="password" className="field" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} autoComplete="current-password" required />}</Field>
        <button className="btn btn-primary" disabled={busy}>Save profile</button>
      </form>
      <form onSubmit={savePassword} className="card space-y-4 p-5">
        <h3 className="font-bold text-stone-900">Change password</h3>
        <Field label="Current password">{(p) => <input {...p} type="password" className="field" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" required />}</Field>
        <Field label="New password">{(p) => <input {...p} type="password" className="field" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />}</Field>
        <PasswordRules />
        <Field label="Repeat new password">{(p) => <input {...p} type="password" className="field" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" required />}</Field>
        {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
        <button className="btn btn-primary" disabled={busy}>Change password</button>
      </form>
    </div>
  );
}
