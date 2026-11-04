import React, { useEffect, useState } from 'react';
import { Plus, KeyRound, Pencil, Trash2, Copy } from 'lucide-react';
import type { AdminPermission, AdminUser } from '../../types';
import { api } from '../../services/api';
import { Field } from '../ui';
import Dialog from '../ui/Dialog';
import { PanelHeader, StatusBadge, ConfirmDialog, useAction, useAdmin } from './ui';

type Catalogue = { permissions: Record<string, string>; presets: Record<string, { label: string; permissions: AdminPermission[] }> };

/** Cryptographically random temporary password that satisfies the server rules. */
export function tempPassword(): string {
  const sets = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnpqrstuvwxyz', '23456789', '#@$%&*!?'];
  const pick = (s: string) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  const chars = sets.map(pick);
  const all = sets.join('');
  while (chars.length < 14) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.getRandomValues(new Uint32Array(1))[0] % (i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export default function StaffManager() {
  const { user: me } = useAdmin();
  const [list, setList] = useState<AdminUser[] | null>(null);
  const [cat, setCat] = useState<Catalogue | null>(null);
  const [editing, setEditing] = useState<AdminUser | 'new' | null>(null);
  const [resetting, setResetting] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [issued, setIssued] = useState<{ username: string; password: string } | null>(null);
  const { run, busy } = useAction();
  const load = () => api.getAdmins().then(setList);
  useEffect(() => { load(); api.getPermissionCatalogue().then(setCat); }, []);

  const reset = async () => {
    if (!resetting) return;
    const pw = tempPassword();
    if (await run(() => api.resetAdminPassword(resetting.id, pw)) !== undefined) { setIssued({ username: resetting.username, password: pw }); setResetting(null); load(); }
  };

  return (
    <div>
      <PanelHeader title="Staff accounts" lead="Each person gets their own account. New accounts and password resets use a one-time password the person must change at first sign-in."
        actions={<button className="btn btn-primary" onClick={() => setEditing('new')}><Plus className="h-4 w-4" aria-hidden />Add staff</button>} />
      {list === null ? <p className="text-sm text-stone-500">Loading…</p> : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-stone-200 text-xs uppercase tracking-wider text-stone-500">
              <tr><th className="p-3">Person</th><th className="p-3">Role</th><th className="p-3">Status</th><th className="p-3">Last sign-in</th><th className="p-3 text-right">Actions</th></tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {list.map((u) => (
                <tr key={u.id}>
                  <td className="p-3"><p className="font-semibold text-stone-900">{u.name}</p><p className="text-xs text-stone-500">@{u.username}</p></td>
                  <td className="p-3 text-xs">{u.role === 'superadmin' ? 'Super admin' : (u.rolePreset && cat?.presets[u.rolePreset]?.label) || `${u.permissions?.length || 0} permissions`}</td>
                  <td className="p-3"><StatusBadge status={u.status} />{u.mustChangePassword && <span className="ml-1 badge bg-amber-100 text-amber-900">temp password</span>}</td>
                  <td className="p-3 text-xs text-stone-600">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : 'Never'}</td>
                  <td className="p-3">
                    {u.role !== 'superadmin' && u.id !== me.id && (
                      <div className="flex justify-end gap-1">
                        <button className="flex h-9 w-9 items-center justify-center rounded hover:bg-stone-100" onClick={() => setEditing(u)} aria-label={`Edit ${u.username}`}><Pencil className="h-4 w-4" /></button>
                        <button className="flex h-9 w-9 items-center justify-center rounded hover:bg-stone-100" onClick={() => setResetting(u)} aria-label={`Reset password for ${u.username}`}><KeyRound className="h-4 w-4" /></button>
                        <button className="btn btn-ghost btn-sm" onClick={async () => { if (await run(() => api.toggleAdminStatus(u.id, u.status === 'deactivated' ? 'active' : 'deactivated'), 'Updated') !== undefined) load(); }}>
                          {u.status === 'deactivated' ? 'Activate' : 'Deactivate'}
                        </button>
                        <button className="flex h-9 w-9 items-center justify-center rounded text-red-700 hover:bg-red-50" onClick={() => setDeleting(u)} aria-label={`Delete ${u.username}`}><Trash2 className="h-4 w-4" /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {editing && cat && <StaffForm user={editing === 'new' ? null : editing} cat={cat} onClose={() => setEditing(null)}
        onSaved={(pw, username) => { setEditing(null); load(); if (pw) setIssued({ username, password: pw }); }} />}
      {resetting && <ConfirmDialog title="Reset password?" confirmLabel="Reset" busy={busy} onClose={() => setResetting(null)} onConfirm={reset}
        body={<>A new one-time password will be created for <strong>@{resetting.username}</strong> and their current sessions will be signed out.</>} />}
      {deleting && <ConfirmDialog title="Delete account?" busy={busy} onClose={() => setDeleting(null)}
        onConfirm={async () => { if (await run(() => api.deleteAdmin(deleting.id), 'Account deleted') !== undefined) { setDeleting(null); load(); } }}
        body={<>@{deleting.username} will no longer be able to sign in. Their past activity stays in the log.</>} />}
      {issued && <IssuedPassword {...issued} onClose={() => setIssued(null)} />}
    </div>
  );
}

function IssuedPassword({ username, password, onClose }: { username: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Dialog title="One-time password" onClose={onClose}>
      <p className="text-sm text-stone-700">Give this to <strong>@{username}</strong> in person or by phone. It is shown only once and must be changed at first sign-in.</p>
      <div className="mt-4 flex items-center gap-2 rounded-lg bg-stone-100 p-3 font-mono text-lg">
        <span className="flex-1 break-all">{password}</span>
        <button className="btn btn-secondary btn-sm" onClick={async () => { await navigator.clipboard.writeText(password); setCopied(true); }}><Copy className="h-4 w-4" aria-hidden />{copied ? 'Copied' : 'Copy'}</button>
      </div>
      <div className="mt-6 text-right"><button className="btn btn-primary" onClick={onClose}>Done</button></div>
    </Dialog>
  );
}

function StaffForm({ user, cat, onClose, onSaved }: { user: AdminUser | null; cat: Catalogue; onClose: () => void; onSaved: (pw: string | null, username: string) => void }) {
  const [name, setName] = useState(user?.name || '');
  const [username, setUsername] = useState(user?.username || '');
  const [preset, setPreset] = useState(user?.rolePreset || (user ? '' : 'editor'));
  const [perms, setPerms] = useState<AdminPermission[]>(user?.permissions || cat.presets.editor?.permissions || []);
  const { run, busy } = useAction();
  const choosePreset = (p: string) => { setPreset(p); if (p && cat.presets[p]) setPerms(cat.presets[p].permissions); };
  const toggle = (p: AdminPermission) => { setPreset(''); setPerms((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p])); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      if (await run(() => api.updateAdmin(user.id, { name, username, permissions: perms, rolePreset: preset || null }), 'Saved') !== undefined) onSaved(null, username);
    } else {
      const pw = tempPassword();
      if (await run(() => api.createAdmin({ name, username, temporaryPassword: pw, permissions: perms, rolePreset: preset || null }), 'Account created') !== undefined) onSaved(pw, username.toLowerCase());
    }
  };
  return (
    <Dialog title={user ? `Edit @${user.username}` : 'Add staff'} onClose={onClose} wide>
      <form onSubmit={save} className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Full name">{(p) => <input {...p} className="field" value={name} onChange={(e) => setName(e.target.value)} required />}</Field>
          <Field label="Username" hint="Lower case, no spaces">{(p) => <input {...p} className="field" value={username} onChange={(e) => setUsername(e.target.value.replace(/\s/g, '').toLowerCase())} required autoCapitalize="none" />}</Field>
        </div>
        <Field label="Role">
          {(p) => <select {...p} className="field" value={preset} onChange={(e) => choosePreset(e.target.value)}>
            <option value="">Custom</option>{Object.entries(cat.presets).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>}
        </Field>
        <fieldset>
          <legend className="field-label">Permissions</legend>
          <ul className="grid gap-1 sm:grid-cols-2">
            {Object.entries(cat.permissions).map(([k, label]) => (
              <li key={k}><label className="flex min-h-9 items-start gap-2.5 text-sm"><input type="checkbox" className="mt-0.5 h-4 w-4 accent-stone-900" checked={perms.includes(k as AdminPermission)} onChange={() => toggle(k as AdminPermission)} />
                <span>{label} <span className="font-mono text-[11px] text-stone-500">{k}</span></span></label></li>
            ))}
          </ul>
        </fieldset>
        <div className="flex justify-end gap-2 border-t border-stone-200 pt-4">
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : user ? 'Save' : 'Create account'}</button>
        </div>
      </form>
    </Dialog>
  );
}
