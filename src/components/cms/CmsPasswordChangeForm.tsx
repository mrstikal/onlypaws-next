// src/components/cms/CmsPasswordChangeForm.tsx
'use client';

import React from 'react';

export default function CmsPasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = React.useState('');

  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [okMsg, setOkMsg] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setOkMsg(null);

    const res = await fetch('/api/cms/profile/password', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        current_password: currentPassword,
        new_password: newPassword,
        new_password_confirm: newPasswordConfirm,
      }),
    });

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError((data && typeof data.error === 'string' && data.error) || 'Nepodařilo se změnit heslo');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setNewPasswordConfirm('');
    setOkMsg('Heslo změněno. Budete odhlášeni…');

    // API will invalidate all sessions => after password change the current session will no longer be valid
    window.location.assign('/');
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-md border border-gray-200 bg-white p-4">
      <h2 className="text-sm font-semibold text-gray-900">Změna hesla</h2>
      <p className="mt-1 text-sm text-gray-600">Doporučeno alespoň 8 znaků.</p>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="block md:col-span-2">
          <div className="text-xs font-semibold text-gray-600">Aktuální heslo</div>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
            disabled={loading}
            autoComplete="current-password"
          />
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Nové heslo</div>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
            disabled={loading}
            autoComplete="new-password"
          />
        </label>

        <label className="block">
          <div className="text-xs font-semibold text-gray-600">Nové heslo (potvrzení)</div>
          <input
            type="password"
            value={newPasswordConfirm}
            onChange={(e) => setNewPasswordConfirm(e.target.value)}
            className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm"
            disabled={loading}
            autoComplete="new-password"
          />
        </label>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="submit"
          disabled={loading}
          className="rounded-md bg-gray-900 px-3 py-2 text-sm font-semibold text-white hover:bg-gray-800 disabled:opacity-60"
        >
          Změnit heslo
        </button>

        {error ? <div className="text-sm font-semibold text-red-700">{error}</div> : null}
        {okMsg ? <div className="text-sm font-semibold text-green-700">{okMsg}</div> : null}
      </div>
    </form>
  );
}