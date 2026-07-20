"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();
  if (
    pathname === "/" ||
    pathname.startsWith("/table/") ||
    pathname.startsWith("/menu") ||
    pathname.startsWith("/suivi")
  ) {
    return null;
  }

  return (
    <footer className="border-t border-line bg-surface-muted">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-3">
        <div>
          <Image
            src="/diego.png"
            alt="Chez Diego"
            width={140}
            height={70}
            className="h-10 w-auto object-contain"
          />
          <p className="mt-3 text-sm text-ink-soft">
            Cuisine ivoirienne élevée, produits frais du marché, service
            attentionné.
          </p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-semibold">Horaires</p>
          <p className="text-ink-soft">Lun – Dim : 11h00 – 23h00</p>
          <p className="text-ink-soft">Service continu</p>
        </div>
        <div className="text-sm">
          <p className="mb-2 font-semibold">Commander</p>
          <ul className="space-y-1 text-ink-soft">
            <li>
              <Link href="/menu" className="hover:text-brand-600">
                Menu & commande en ligne
              </Link>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-line py-4 text-center text-xs text-ink-faint">
        © {new Date().getFullYear()} Chez Diego — Tous droits réservés.
      </div>
    </footer>
  );
}
