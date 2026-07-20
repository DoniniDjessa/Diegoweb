"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const LINKS = [
  { href: "/", label: "Accueil" },
  { href: "/menu", label: "Menu" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const minimal = pathname === "/" || pathname.startsWith("/table/");

  if (pathname.startsWith("/menu") || pathname.startsWith("/suivi")) {
    return null;
  }

  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/diego.png"
            alt="Chez Diego"
            width={140}
            height={70}
            priority
            className="h-10 w-auto object-contain"
          />
        </Link>

        {!minimal && (
          <nav className="hidden items-center gap-6 md:flex">
            {LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm font-medium transition-colors ${
                  pathname === l.href
                    ? "text-brand-600"
                    : "text-ink-soft hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/menu"
              className="border border-line bg-white px-5 py-2 text-[11px] font-semibold text-ink shadow-card transition-colors hover:border-brand-300 hover:text-brand-600"
            >
              Commander
            </Link>
          </nav>
        )}

        {!minimal && (
          <button
            className="rounded-card p-2 text-ink-soft md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Ouvrir le menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        )}
      </div>

      {!minimal && open && (
        <nav className="border-t border-line bg-surface px-4 py-3 md:hidden">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block rounded-card px-3 py-2.5 text-sm font-medium ${
                pathname === l.href
                  ? "bg-brand-50 text-brand-600"
                  : "text-ink-soft"
              }`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/menu"
            onClick={() => setOpen(false)}
            className="mt-2 block border border-line bg-white px-5 py-2.5 text-center text-[11px] font-semibold text-ink"
          >
            Commander
          </Link>
        </nav>
      )}
    </header>
  );
}
