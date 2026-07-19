import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, ReceiptText, ShoppingBag } from "lucide-react";

export default function HomePage() {
  return (
    <section className="flex min-h-[calc(100dvh-4rem)] items-center bg-surface-muted px-4 py-12">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex flex-col items-center text-center">
          <Image
            src="/diego.png"
            alt="Chez Diego"
            width={240}
            height={120}
            priority
            className="h-auto w-44 object-contain sm:w-52"
          />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.24em] text-ink-faint">
            Que souhaitez-vous faire ?
          </p>
        </div>
        <div className="space-y-3">
          <a
            href="https://chezdiego.ci/#menu"
            className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-panel sm:gap-4 sm:p-4"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:h-12 sm:w-12">
              <BookOpen size={20} />
            </span>
            <span className="flex-1 font-display text-[11px] font-bold">
              Voir le Menu
            </span>
            <ArrowRight
              size={18}
              className="text-ink-faint transition group-hover:translate-x-1 group-hover:text-brand-500"
            />
          </a>
          <Link
            href="/suivi"
            className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-panel sm:gap-4 sm:p-4"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:h-12 sm:w-12">
              <ReceiptText size={20} />
            </span>
            <span className="flex-1 font-display text-[11px] font-bold">
              Suivi de commande
            </span>
            <ArrowRight
              size={18}
              className="text-ink-faint transition group-hover:translate-x-1 group-hover:text-brand-500"
            />
          </Link>
          <Link
            href="/menu"
            className="group flex items-center gap-3 rounded-2xl bg-brand-500 p-3 text-ink shadow-panel transition hover:-translate-y-0.5 hover:bg-brand-600 sm:gap-4 sm:p-4"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 sm:h-12 sm:w-12">
              <ShoppingBag size={20} />
            </span>
            <span className="flex-1 font-display text-[11px] font-bold">
              Commander
            </span>
            <ArrowRight
              size={18}
              className="text-ink/60 transition group-hover:translate-x-1 group-hover:text-ink"
            />
          </Link>
        </div>
      </div>
    </section>
  );
}
