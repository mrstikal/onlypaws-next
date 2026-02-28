import Link from 'next/link';
import { formatFollowersCS } from '@/utils/pluralize';

type PetMini = {
  id: number | string | bigint;
  name: string;
  slug: string;
  followers_count: number;
};

type Props = {
  pets: PetMini[];
};

function toIdString(id: PetMini['id']) {
  return typeof id === 'bigint' ? id.toString() : String(id);
}

export default function RecommendedPetsCard({ pets }: Props) {
  return (
    <div className="op-card px-5 py-4">
      <div className="text-sm font-semibold text-gray-900">Doporučení Mazlíčci</div>

      <div className="mt-4 space-y-3">
        {pets.map((p) => {
          const href = `/pets/${toIdString(p.id)}/${p.slug}`;

          return (
            <div key={toIdString(p.id)} className="flex items-center justify-between gap-3">
              <div>
                <Link
                  href={href}
                  className="text-sm font-semibold text-rose-700 hover:underline"
                >
                  {p.name}
                </Link>

                <div className="text-xs text-gray-600">
                  {formatFollowersCS(p.followers_count)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}