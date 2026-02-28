import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-4">
          <h1 className="text-9xl font-bold text-rose-600">404</h1>
        </div>

        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          Stránka nenalezena
        </h2>

        <p className="text-gray-600 mb-8">
          Omlouváme se, ale stránka kterou hledáte neexistuje nebo byla přesunuta.
        </p>

        <div className="space-x-4">
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-rose-600 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
          >
            Zpět na hlavní stránku
          </Link>
          <Link
            href="/feed"
            className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500"
          >
            Zobrazit příspěvky
          </Link>
        </div>

        <div className="mt-12">
          <p className="text-sm text-gray-500">
            Nebo zkuste vyhledávání pomocí navigace nahoře.
          </p>
        </div>
      </div>
    </div>
  );
}

