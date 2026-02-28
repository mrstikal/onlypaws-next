'use client';

import Checkbox from '@/components/ui/Checkbox';
import InputError from '@/components/ui/InputError';
import InputLabel from '@/components/ui/InputLabel';
import Modal from '@/components/ui/Modal';
import PrimaryButton from '@/components/ui/PrimaryButton';
import TextInput from '@/components/ui/TextInput';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Props = {
  loginOpen: boolean;
  registerOpen: boolean;
  onCloseLogin: () => void;
  onCloseRegister: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
};

export default function AuthModals({
  loginOpen,
  registerOpen,
  onCloseLogin,
  onCloseRegister,
  onOpenLogin,
  onOpenRegister,
}: Props) {
  return (
    <>
      <LoginModal
        open={loginOpen}
        onClose={onCloseLogin}
        onOpenRegister={() => {
          onCloseLogin();
          onOpenRegister();
        }}
      />
      <RegisterModal
        open={registerOpen}
        onClose={onCloseRegister}
        onOpenLogin={() => {
          onCloseRegister();
          onOpenLogin();
        }}
      />
    </>
  );
}

function LoginModal({ open, onClose, onOpenRegister }: { open: boolean; onClose: () => void; onOpenRegister: () => void; }) {
  const router = useRouter();

  const [data, setData] = useState({ email: '', password: '', remember: false });
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (processing) return;

    setProcessing(true);
    setErrors({});

    try {
      const resp = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          remember: data.remember,
        }),
      });

      const json = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setErrors(json?.errors ?? { email: 'Neplatné přihlašovací údaje.' });
        return;
      }

      onClose();
      router.refresh();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal show={open} onClose={onClose} maxWidth="md">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Přihlášení</h2>
            <p className="mt-1 text-sm text-gray-600">
              Pro demo si vytvoř nový účet.
              Email verifikace je vypnutá (demo).
            </p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
          >
            Zavřít
          </button>
        </div>

        <form onSubmit={submit} className="mt-6">
          <div>
            <InputLabel htmlFor="login_email" value="Email" />
            <TextInput
              id="login_email"
              type="email"
              name="email"
              value={data.email}
              className="mt-1 block w-full"
              autoComplete="username"
              isFocused={true}
              onChange={e => setData({ ...data, email: e.target.value })}
            />
            <InputError message={errors.email} className="mt-2" />
          </div>

          <div className="mt-4">
            <InputLabel htmlFor="login_password" value="Heslo" />
            <TextInput
              id="login_password"
              type="password"
              name="password"
              value={data.password}
              className="mt-1 block w-full"
              autoComplete="current-password"
              onChange={e => setData({ ...data, password: e.target.value })}
            />
            <InputError message={errors.password} className="mt-2" />
          </div>

          <div className="mt-4 block">
            <label className="flex items-center">
              <Checkbox
                name="remember"
                checked={data.remember}
                onChange={e => setData({ ...data, remember: e.target.checked })}
              />
              <span className="ms-2 text-sm text-gray-600">Zapamatovat</span>
            </label>
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <a
              href="#"
              className="text-sm text-gray-600 underline hover:text-gray-900"
            >
              Zapomněl jsi heslo?
            </a>
            <PrimaryButton disabled={processing}>
              {processing ? 'Přihlašuji…' : 'Přihlásit'}
            </PrimaryButton>
          </div>

          <div className="mt-6 border-t pt-4 text-sm text-gray-600">
            Nemáš účet?{' '}
            <button
              type="button"
              onClick={onOpenRegister}
              className="font-semibold text-gray-900 hover:underline"
            >
              Registrace
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}

function RegisterModal({ open, onClose, onOpenLogin }: { open: boolean; onClose: () => void; onOpenLogin: () => void; }) {
  const router = useRouter();

  const [data, setData] = useState({ name: '', email: '', password: '', password_confirmation: '' });
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; password_confirmation?: string }>({});

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (processing) return;

    setProcessing(true);
    setErrors({});

    try {
      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        setErrors(json?.errors ?? { email: 'Registrace se nezdařila.' });
        return;
      }

      onClose();
      router.refresh();
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Modal show={open} onClose={onClose} maxWidth="md">
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Registrace</h2>
            <p className="mt-1 text-sm text-gray-600">Email verifikace je vypnutá (demo).</p>
          </div>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
          >
            Zavřít
          </button>
        </div>

        <form onSubmit={submit} className="mt-6">
          <div>
            <InputLabel htmlFor="register_name" value="Jméno" />
            <TextInput
              id="register_name"
              name="name"
              value={data.name}
              className="mt-1 block w-full"
              autoComplete="name"
              isFocused={true}
              onChange={e => setData({ ...data, name: e.target.value })}
              required
              disabled={processing}
            />
            <InputError message={errors.name} className="mt-2" />
          </div>

          <div className="mt-4">
            <InputLabel htmlFor="register_email" value="Email" />
            <TextInput
              id="register_email"
              type="email"
              name="email"
              value={data.email}
              className="mt-1 block w-full"
              autoComplete="username"
              onChange={e => setData({ ...data, email: e.target.value })}
              required
              disabled={processing}
            />
            <InputError message={errors.email} className="mt-2" />
          </div>

          <div className="mt-4">
            <InputLabel htmlFor="register_password" value="Heslo" />
            <TextInput
              id="register_password"
              type="password"
              name="password"
              value={data.password}
              className="mt-1 block w-full"
              autoComplete="new-password"
              onChange={e => setData({ ...data, password: e.target.value })}
              required
              disabled={processing}
            />
            <InputError message={errors.password} className="mt-2" />
          </div>

          <div className="mt-4">
            <InputLabel htmlFor="register_password_confirmation" value="Potvrdit heslo" />
            <TextInput
              id="register_password_confirmation"
              type="password"
              name="password_confirmation"
              value={data.password_confirmation}
              className="mt-1 block w-full"
              autoComplete="new-password"
              onChange={e => setData({ ...data, password_confirmation: e.target.value })}
              required
              disabled={processing}
            />
            <InputError message={errors.password_confirmation} className="mt-2" />
          </div>

          <div className="mt-6 flex items-center justify-end">
            <PrimaryButton disabled={processing}>{processing ? 'Registruju…' : 'Registrovat'}</PrimaryButton>
          </div>

          <div className="mt-6 border-t pt-4 text-sm text-gray-600">
            Už máš účet?{' '}
            <button
              type="button"
              onClick={onOpenLogin}
              className="font-semibold text-gray-900 hover:underline"
              disabled={processing}
            >
              Přihlášení
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
