"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, QrCode, ReceiptText, ShoppingBag } from "lucide-react";
import {
  fetchScannedTable,
  fetchTableActiveOrder,
} from "@/lib/supabase/repository";
import { DEMO_TABLE_PATH } from "@/lib/demo-table";

export default function HomePage() {
  const [canViewOrder, setCanViewOrder] = useState(false);
  const [suiviHref, setSuiviHref] = useState("/suivi");

  useEffect(() => {
    let active = true;

    async function resolveViewOrder() {
      const tableToken = localStorage.getItem("diego-last-table");
      if (tableToken) {
        try {
          const [table, activeOrder] = await Promise.all([
            fetchScannedTable(tableToken),
            fetchTableActiveOrder(tableToken),
          ]);
          if (!active) return;
          if (
            table &&
            table.status !== "libre" &&
            activeOrder &&
            activeOrder.tableStatus !== "libre" &&
            activeOrder.id
          ) {
            setCanViewOrder(true);
            setSuiviHref(`/suivi?table=${encodeURIComponent(tableToken)}`);
            return;
          }
          localStorage.removeItem("diego-last-table");
        } catch {
          // fall through to last order number
        }
      }

      const lastOrder = localStorage.getItem("diego-last-order");
      if (!active) return;
      if (lastOrder) {
        setCanViewOrder(true);
        setSuiviHref(`/suivi?commande=${encodeURIComponent(lastOrder)}`);
      }
    }

    void resolveViewOrder();
    return () => {
      active = false;
    };
  }, []);

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
            href="/menu"
            className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-panel sm:gap-4 sm:p-4"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:h-12 sm:w-12">
              <ShoppingBag size={20} />
            </span>
            <span className="flex-1 font-display text-[11px] font-bold">
              Commander
            </span>
            <ArrowRight
              size={18}
              className="text-ink-faint transition group-hover:translate-x-1 group-hover:text-brand-500"
            />
          </Link>

          <Link
            href={DEMO_TABLE_PATH}
            className="group flex items-center gap-3 rounded-2xl border border-dashed border-brand-300 bg-brand-50/60 p-3 shadow-card transition hover:-translate-y-0.5 hover:border-brand-400 hover:bg-brand-50 hover:shadow-panel sm:gap-4 sm:p-4"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700 sm:h-12 sm:w-12">
              <QrCode size={20} />
            </span>
            <span className="flex-1">
              <span className="block font-display text-[11px] font-bold">
                Simuler une table
              </span>
              <span className="text-[10px] text-ink-soft">
                Table 1 — parcours commande
              </span>
            </span>
            <ArrowRight
              size={18}
              className="text-ink-faint transition group-hover:translate-x-1 group-hover:text-brand-500"
            />
          </Link>

          {canViewOrder ? (
            <Link
              href={suiviHref}
              className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-panel sm:gap-4 sm:p-4"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:h-12 sm:w-12">
                <ReceiptText size={20} />
              </span>
              <span className="flex-1 font-display text-[11px] font-bold">
                Voir ma commande
              </span>
              <ArrowRight
                size={18}
                className="text-ink-faint transition group-hover:translate-x-1 group-hover:text-brand-500"
              />
            </Link>
          ) : (
            <div
              aria-disabled="true"
              className="flex cursor-not-allowed items-center gap-3 rounded-2xl border border-line bg-white/60 p-3 opacity-50 sm:gap-4 sm:p-4"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-soft text-ink-faint sm:h-12 sm:w-12">
                <ReceiptText size={20} />
              </span>
              <span className="flex-1 font-display text-[11px] font-bold text-ink-faint">
                Voir ma commande
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
