"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowRight,
  BookOpen,
  LoaderCircle,
  ReceiptText,
  ShoppingBag,
  Users,
} from "lucide-react";
import {
  fetchScannedTable,
  fetchTableActiveOrder,
  type ScannedRestaurantTable,
} from "@/lib/supabase/repository";

export default function ScannedTablePage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [table, setTable] = useState<ScannedRestaurantTable | null>(null);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadTable() {
      try {
        const [result, activeOrder] = await Promise.all([
          fetchScannedTable(token),
          fetchTableActiveOrder(token).catch(() => null),
        ]);
        if (!active) return;
        setTable(result);
        if (!result) {
          setError("Ce QR code ne correspond à aucune table active.");
          return;
        }
        const open =
          result.status !== "libre" &&
          Boolean(activeOrder?.id) &&
          activeOrder?.tableStatus !== "libre";
        setHasActiveOrder(open);
        if (open) localStorage.setItem("diego-last-table", token);
        else localStorage.removeItem("diego-last-table");
      } catch {
        if (active) setError("Impossible de vérifier cette table.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadTable();
    return () => {
      active = false;
    };
  }, [token]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-surface-muted">
        <LoaderCircle className="animate-spin text-brand-500" size={28} />
      </div>
    );
  }

  if (!table || error) {
    return (
      <div className="flex min-h-[calc(100dvh-4rem)] items-center justify-center bg-surface-muted px-4">
        <div className="w-full max-w-sm rounded-2xl border border-red-200 bg-white p-7 text-center shadow-panel">
          <h1 className="text-2xl font-bold">QR code invalide</h1>
          <p className="mt-2 text-sm text-ink-soft">{error}</p>
          <Link
            href="/"
            className="mt-6 inline-flex rounded-xl bg-brand-500 px-5 py-3 text-[11px] font-bold text-ink"
          >
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    );
  }

  const encodedToken = encodeURIComponent(token);
  const tableCleared = table.status === "libre";
  const canViewOrder = hasActiveOrder;

  return (
    <section className="flex min-h-[calc(100dvh-4rem)] items-center bg-surface-muted px-4 py-10">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-7 text-center">
          <Image
            src="/diego.png"
            alt="Chez Diego"
            width={180}
            height={90}
            priority
            className="mx-auto mb-4 h-auto w-36 object-contain"
          />
          <span className="inline-flex items-center gap-2 border border-brand-200 bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700">
            <span className="h-2 w-2 rounded-full bg-brand-500" />
            Table reconnue
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight sm:text-4xl">
            {table.label}
          </h1>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-ink-soft sm:text-sm">
            <Users size={15} /> {table.seats} places
            {!tableCleared && (
              <span className="ml-1 text-brand-700">· Commande en cours</span>
            )}
          </p>
        </div>

        <div className="space-y-3">
          <a
            href="https://chezdiego.ci/#menu"
            className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-card transition hover:border-brand-300 hover:shadow-panel sm:gap-4 sm:p-4"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:h-12 sm:w-12">
              <BookOpen size={20} />
            </span>
            <span className="flex-1">
              <span className="block font-display text-[11px] font-bold">
                Voir notre Menu
              </span>
              <span className="text-xs text-ink-soft">
                Découvrir les plats disponibles
              </span>
            </span>
            <ArrowRight size={18} className="text-ink-faint" />
          </a>

          <Link
            href={`/menu?table=${encodedToken}&mode=order`}
            className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-card transition hover:border-brand-300 hover:shadow-panel sm:gap-4 sm:p-4"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:h-12 sm:w-12">
              <ShoppingBag size={20} />
            </span>
            <span className="flex-1">
              <span className="block font-display text-[11px] font-bold">
                {canViewOrder ? "Ajouter à ma commande" : "Passer une commande"}
              </span>
              <span className="text-xs text-ink-soft">
                Servie directement à {table.label}
              </span>
            </span>
            <ArrowRight size={18} className="text-ink-faint" />
          </Link>

          {canViewOrder ? (
            <Link
              href={`/suivi?table=${encodedToken}`}
              className="group flex items-center gap-3 rounded-2xl border border-line bg-white p-3 shadow-card transition hover:border-brand-300 hover:shadow-panel sm:gap-4 sm:p-4"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 sm:h-12 sm:w-12">
                <ReceiptText size={20} />
              </span>
              <span className="flex-1">
                <span className="block font-display text-[11px] font-bold">
                  Voir ma commande
                </span>
                <span className="text-xs text-ink-soft">
                  Suivre la préparation en temps réel
                </span>
              </span>
              <ArrowRight size={18} className="text-ink-faint" />
            </Link>
          ) : (
            <div
              aria-disabled="true"
              className="flex cursor-not-allowed items-center gap-3 rounded-2xl border border-line bg-white/60 p-3 opacity-50 sm:gap-4 sm:p-4"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-soft text-ink-faint sm:h-12 sm:w-12">
                <ReceiptText size={20} />
              </span>
              <span className="flex-1">
                <span className="block font-display text-[11px] font-bold text-ink-faint">
                  Voir ma commande
                </span>
                <span className="text-xs text-ink-faint">
                  Disponible après une commande sur cette table
                </span>
              </span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
