'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthModals } from '@/components/onlypaws/AuthModalContext';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ROUTES } from '@/constants/routes';

type Variant = 'landing' | 'feed' | 'app';
type Active = 'landing' | 'feed' | 'breeds' | 'pets' | 'dashboard';

type TierSlug = 'free' | 'basic' | 'vip' | 'ultra';

type Props = {
  variant: Variant;
  onUpgradeClick?: () => void;
  viewerTierSlug?: TierSlug | string;
  active?: Active;

  tiers?: Array<{ slug: TierSlug | string; name: string }>;

  isAuthed?: boolean;
  user?: { name?: string | null; email?: string | null } | null;

  onLogoutClick?: () => void;
};

export default function TopNav({
                                 viewerTierSlug,
                                 onUpgradeClick,
                                 variant,
                                 active,
                                 tiers,
                                 isAuthed = false,
                                 user = null,
                                 onLogoutClick,
                               }: Props) {
  const pathname = usePathname() ?? '/';
  const router = useRouter();
  const authModals = useAuthModals();

  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const mobileNavWrapRef = useRef<HTMLDivElement | null>(null);
  const closeMobileNav = () => setIsMobileNavOpen(false);

  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuWrapRef = useRef<HTMLDivElement | null>(null);
  const closeUserMenu = () => setIsUserMenuOpen(false);

  useEffect(() => {
    if (!isMobileNavOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const wrap = mobileNavWrapRef.current;
      if (!wrap) return;

      const target = event.target;
      if (!(target instanceof Node)) return;

      if (!wrap.contains(target)) {
        setIsMobileNavOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    };
  }, [isMobileNavOpen]);

  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const wrap = userMenuWrapRef.current;
      if (!wrap) return;

      const target = event.target;
      if (!(target instanceof Node)) return;

      if (!wrap.contains(target)) {
        setIsUserMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsUserMenuOpen(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isUserMenuOpen]);

  const resolvedTierSlug = viewerTierSlug ?? 'free';
  const canUpgrade = resolvedTierSlug !== 'ultra';

  const resolvedTierName = useMemo(() => {
    const list = tiers ?? [];
    return list.find((t) => t.slug === resolvedTierSlug)?.name ?? String(resolvedTierSlug).toUpperCase();
  }, [tiers, resolvedTierSlug]);

  const resolvedActive: Active =
    active ??
    (pathname.startsWith('/dashboard')
      ? 'dashboard'
      : pathname.startsWith('/breeds')
        ? 'breeds'
        : pathname.startsWith('/pets') || pathname.startsWith('/pet/')
          ? 'pets'
          : pathname.startsWith('/feed')
            ? 'feed'
            : 'landing');

  const linkClass = (key: Active) => {
    const base = 'text-sm';
    if (resolvedActive === key) return `${base} font-semibold text-gray-900`;
    return `${base} text-gray-800 hover:text-gray-900`;
  };

  const handleLogout = async () => {
    closeUserMenu();

    if (onLogoutClick) {
      onLogoutClick();
      return;
    }

    const res = await fetch('/api/auth/logout', { method: 'POST' });

    if (!res.ok) {
      // If logout fails, at least don't crash the UI silently
      console.error('Logout failed', res.status);
      return;
    }

    router.refresh();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-20 whitespace-nowrap border-b border-gray-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center">
          <Image src="/images/logo.svg" alt="OnlyPaws" className="relative top-1 w-[180px] xl:w-[240px]" width={240} height={48} />
        </Link>

        <nav className="hidden items-center gap-4 xl:flex">
          {variant === 'landing' ? (
            <>
              <a href="#pricing" className="block text-sm text-gray-800 hover:text-gray-900">
                Tarify
              </a>
              <a href="#top-pets" className="block text-sm text-gray-800 hover:text-gray-900">
                Top Mazlíčci
              </a>
              <a href="#trending" className="block text-sm text-gray-800 hover:text-gray-900">
                Právě frčí
              </a>
              <div className="h-4 border-l border-gray-500"></div>
            </>
          ) : null}

          <Link href="/feed" className={linkClass('feed')}>
            Příspěvky
          </Link>
          <Link href="/pets" className={linkClass('pets')}>
            Mazlíčci
          </Link>
          <Link href="/breeds" className={linkClass('breeds')}>
            Plemena
          </Link>

          {isAuthed ? <a href={ROUTES.CMS.ROOT} className={linkClass('dashboard')}>Můj profil</a> : null}
        </nav>

        <div className="flex items-center gap-2">
          <div className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">
            Tarif: {resolvedTierName}
          </div>

          {canUpgrade ? (
            onUpgradeClick ? (
              <button
                type="button"
                onClick={onUpgradeClick}
                className="rounded-md bg-rose-800 px-3 py-2.5 text-sm font-semibold leading-none text-white hover:bg-gray-800"
              >
                Navýšit tarif (demo)
              </button>
            ) : (
              <Link
                href="/"
                className="rounded-md bg-rose-800 px-3 py-2.5 text-sm font-semibold leading-none text-white hover:bg-gray-800"
              >
                Navýšit tarif (demo)
              </Link>
            )
          ) : null}

          {!isAuthed ? (
            <div className="hidden items-center gap-2 sm:flex">
              <button
                type="button"
                onClick={() => authModals?.openLogin()}
                className="text-sm text-gray-800 hover:text-gray-900"
              >
                Přihlásit
              </button>
              <button
                type="button"
                onClick={() => authModals?.openRegister()}
                className="text-sm font-semibold text-gray-900 hover:underline"
              >
                Registrovat
              </button>
            </div>
          ) : (
            <div className="ms-2" ref={userMenuWrapRef}>
              <div className="relative inline-flex">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={isUserMenuOpen}
                  className="inline-flex items-center rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-semibold leading-none text-gray-900 transition hover:bg-gray-50 focus:outline-none"
                  title={user?.email ?? undefined}
                >
                  {user?.name ?? 'Uživatel'}
                  <svg
                    className="-me-0.5 ms-2 relative top-px h-4 w-4 text-gray-600"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 0 1 1.414 0L10 10.586l3.293-3.293a1 1 0 0 1 1.414 1.414l-4 4a1 1 0 0 1-1.414 0l-4-4a1 1 0 0 1 0-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>

                <div
                  role="menu"
                  aria-hidden={!isUserMenuOpen}
                  className={[
                    'absolute right-0 top-full z-30 mt-2 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg',
                    isUserMenuOpen ? 'block' : 'hidden',
                  ].join(' ')}
                >
                  <div className="px-4 py-2">
                    <div className="text-sm font-semibold text-gray-900">{user?.name ?? 'Uživatel'}</div>
                    <div className="text-xs text-gray-600">{user?.email ?? ''}</div>
                  </div>

                  <div className="border-t border-gray-200"></div>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-800 hover:bg-gray-50 hover:text-gray-900"
                    role="menuitem"
                  >
                    Odhlásit se
                  </button>
                </div>
              </div>
            </div>
          )}

          <div ref={mobileNavWrapRef} className="relative xl:hidden">
            <button
              type="button"
              aria-label="Otevřít navigaci"
              aria-expanded={isMobileNavOpen}
              onClick={() => setIsMobileNavOpen((v) => !v)}
              className="ml-2 flex cursor-pointer flex-col gap-1.5 p-1"
            >
              <div className="w-6 border-t-2 border-gray-700"></div>
              <div className="w-6 border-t-2 border-gray-700"></div>
              <div className="w-6 border-t-2 border-gray-700"></div>
            </button>

            <nav
              className={[
                'absolute right-0 top-full mt-2 w-max rounded-lg border border-gray-200 bg-white shadow-lg',
                'p-3 px-4 pl-8',
                isMobileNavOpen ? 'block' : 'hidden',
              ].join(' ')}
              onClick={(e) => {
                const target = e.target;
                if (!(target instanceof Element)) return;
                if (target.closest('a[href^="#"]')) closeMobileNav();
              }}
            >
              <div className="flex flex-col gap-3 text-right">
                {variant === 'landing' ? (
                  <>
                    <a href="#pricing" className="block text-sm text-gray-800 hover:text-gray-900">
                      Tarify
                    </a>
                    <a href="#top-pets" className="block text-sm text-gray-800 hover:text-gray-900">
                      Top Mazlíčci
                    </a>
                    <a href="#trending" className="block text-sm text-gray-800 hover:text-gray-900">
                      Právě frčí
                    </a>
                    <div className="border-t border-gray-200"></div>
                  </>
                ) : null}

                <Link href="/feed" className={linkClass('feed')}>
                  Příspěvky
                </Link>
                <Link href="/pets" className={linkClass('pets')}>
                  Mazlíčci
                </Link>
                <Link href="/breeds" className={linkClass('breeds')}>
                  Plemena
                </Link>

                {isAuthed ? <a href={ROUTES.CMS.ROOT} className={linkClass('dashboard')}>Můj profil</a> : null}
              </div>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
}
