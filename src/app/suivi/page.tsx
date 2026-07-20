"use client";

import {
  type FormEvent,
  Suspense,
  useCallback,
  useEffect,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  House,
  LoaderCircle,
  Search,
  ShoppingBag,
} from "lucide-react";
import { formatFCFA } from "@/lib/data";
import {
  fetchOrderReceipt,
  fetchTableOrderReceipt,
  removeRealtimeChannel,
  subscribeToOrder,
  type OrderReceipt,
} from "@/lib/supabase/repository";

const STATUS_LABEL: Record<OrderReceipt["status"], string> = {
  a_valider: "En attente de validation",
  en_attente: "En cuisine",
  preparation: "En préparation",
  pret: "Prête",
  servi: "Servie",
  en_livraison: "En livraison",
  livre: "Livrée",
  annule: "Annulée",
};

function TrackingContent() {
  const searchParams = useSearchParams();
  const initialNumber = searchParams.get("commande") ?? "";
  const tableToken = searchParams.get("table");
  const [orderNumber, setOrderNumber] = useState(initialNumber);
  const [receipt, setReceipt] = useState<OrderReceipt | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(Boolean(tableToken));
  const [error, setError] = useState<string | null>(null);
  const [tableCleared, setTableCleared] = useState(false);

  const loadByNumber = useCallback(async (number: number) => {
    const result = await fetchOrderReceipt(number);
    setReceipt(result);
    return result;
  }, []);

  const loadByTable = useCallback(async (token: string) => {
    setLoading(true);
    setSearched(true);
    setError(null);
    setTableCleared(false);
    try {
      const result = await fetchTableOrderReceipt(token);
      if (!result || result.tableStatus === "libre") {
        setReceipt(null);
        setTableCleared(true);
        localStorage.removeItem("diego-last-table");
        setError(
          "Cette table a été libérée. Aucune commande n’est plus accessible."
        );
        return null;
      }
      if (!result.id || result.items.length === 0) {
        setReceipt(null);
        setError("Aucune commande active sur cette table pour le moment.");
        return null;
      }
      setReceipt(result);
      setOrderNumber(String(result.orderNumber));
      localStorage.setItem("diego-last-order", String(result.orderNumber));
      localStorage.setItem("diego-last-table", token);
      return result;
    } catch (cause) {
      setReceipt(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de charger la commande de la table."
      );
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  async function searchOrder(numberText: string) {
    const number = Number(numberText);
    if (!Number.isInteger(number) || number <= 0) {
      setError("Entrez un numéro de commande valide.");
      return;
    }

    setLoading(true);
    setSearched(true);
    setError(null);
    setTableCleared(false);
    try {
      const result = await loadByNumber(number);
      if (!result || !result.id) {
        setReceipt(null);
      } else {
        localStorage.setItem("diego-last-order", String(result.orderNumber));
      }
    } catch (cause) {
      setReceipt(null);
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de charger la commande."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (tableToken) {
      void loadByTable(tableToken);
      return;
    }
    const saved = initialNumber || localStorage.getItem("diego-last-order");
    if (saved) {
      setOrderNumber(saved);
      void searchOrder(saved);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!receipt?.id) return;
    const channel = subscribeToOrder(receipt.id, () => {
      if (tableToken) void loadByTable(tableToken);
      else void loadByNumber(receipt.orderNumber);
    });
    const timer = window.setInterval(() => {
      if (tableToken) void loadByTable(tableToken);
      else void loadByNumber(receipt.orderNumber);
    }, 15_000);
    return () => {
      void removeRealtimeChannel(channel);
      window.clearInterval(timer);
    };
  }, [
    loadByNumber,
    loadByTable,
    receipt?.id,
    receipt?.orderNumber,
    tableToken,
  ]);

  const encodedTable = tableToken ? encodeURIComponent(tableToken) : null;

  return (
    <div className="min-h-dvh bg-surface-muted">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/diego.png"
            alt="Chez Diego"
            width={160}
            height={80}
            priority
            className="h-auto w-32 object-contain sm:w-40"
          />
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 border border-line bg-white px-4 py-2 text-[11px] font-semibold text-ink-soft shadow-card transition hover:border-brand-300 hover:text-brand-600 sm:px-5 sm:py-2.5"
            >
              <House size={15} /> Accueil
            </Link>
            {encodedTable && receipt && !tableCleared && (
              <Link
                href={`/menu?table=${encodedTable}&mode=order`}
                className="inline-flex items-center gap-2 border border-brand-300 bg-brand-50 px-4 py-2 text-[11px] font-semibold text-brand-700 shadow-card transition hover:bg-brand-100 sm:px-5 sm:py-2.5"
              >
                <ShoppingBag size={15} /> Ajouter des éléments
              </Link>
            )}
          </div>
        </div>

        <div className="mt-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-faint">
            Votre sélection
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            Ma commande
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-xs text-ink-soft sm:text-base">
            {tableToken
              ? "Liste des plats commandés sur votre table, avec les prix."
              : "Consultez les articles et le montant de votre commande."}
          </p>
        </div>

        {!tableToken && (
          <form
            className="mt-8 flex flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-panel sm:flex-row"
            onSubmit={(e: FormEvent) => {
              e.preventDefault();
              void searchOrder(orderNumber.trim());
            }}
          >
            <div className="relative flex-1">
              <Search
                size={19}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-faint"
              />
              <input
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="Numéro de commande — ex. 142"
                inputMode="numeric"
                aria-label="Numéro de commande"
                className="h-11 w-full rounded-xl border border-line bg-surface-muted pl-11 pr-4 text-xs font-medium outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-100 sm:h-12 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-500 px-5 text-[11px] font-bold text-ink transition hover:bg-brand-600 disabled:cursor-wait disabled:opacity-70 sm:h-12 sm:px-7"
            >
              {loading && <LoaderCircle size={17} className="animate-spin" />}
              {loading ? "Recherche…" : "Voir ma commande"}
            </button>
          </form>
        )}

        {tableToken && loading && !receipt && (
          <div className="mt-8 flex justify-center">
            <LoaderCircle className="animate-spin text-brand-500" size={28} />
          </div>
        )}

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {searched && !loading && !error && !receipt && !tableCleared && (
          <div className="mt-6 rounded-2xl border border-line bg-white p-8 text-center shadow-card">
            <p className="font-bold">Commande introuvable</p>
            <p className="mt-2 text-sm text-ink-soft">
              Vérifiez le numéro. Pour votre sécurité, seules les commandes
              créées sur cet appareil sont accessibles.
            </p>
          </div>
        )}

        {receipt && receipt.items.length > 0 && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-white shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                  Votre commande
                </p>
                <p className="mt-1 text-xl font-black text-ink sm:text-2xl">
                  #{receipt.orderNumber}
                </p>
              </div>
              <span
                className={`px-3 py-1.5 text-[11px] font-bold sm:px-4 sm:py-2 sm:text-xs ${
                  receipt.status === "annule"
                    ? "bg-red-50 text-red-600"
                    : "bg-brand-50 text-brand-600"
                }`}
              >
                {STATUS_LABEL[receipt.status]}
              </span>
            </div>

            <ul className="divide-y divide-line px-5 sm:px-7">
              {receipt.items.map((item, index) => (
                <li
                  key={`${item.name}-${index}`}
                  className="flex items-start justify-between gap-4 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink sm:text-base">
                      <span className="tabular-nums text-brand-700">
                        {item.quantity}×
                      </span>{" "}
                      {item.name}
                    </p>
                    {item.note && (
                      <p className="mt-1 text-xs italic text-ink-soft">
                        {item.note}
                      </p>
                    )}
                    <p className="mt-1 text-xs text-ink-faint">
                      {formatFCFA(item.unitPrice)} l’unité
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums text-ink sm:text-base">
                    {formatFCFA(item.lineTotal)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between border-t border-line bg-surface-muted px-5 py-4 sm:px-7">
              <span className="text-sm font-semibold uppercase tracking-wide text-ink-soft">
                Total
              </span>
              <span className="text-lg font-black tabular-nums text-brand-700 sm:text-xl">
                {formatFCFA(receipt.total)}
              </span>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default function SuiviPage() {
  return (
    <Suspense>
      <TrackingContent />
    </Suspense>
  );
}
