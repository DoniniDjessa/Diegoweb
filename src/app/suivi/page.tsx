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
  Check,
  ChefHat,
  House,
  LoaderCircle,
  PackageCheck,
  Receipt,
  Search,
  Truck,
  Utensils,
} from "lucide-react";
import { DELIVERY_TRACKING_STEPS, TRACKING_STEPS } from "@/lib/data";
import {
  fetchMyOrder,
  removeRealtimeChannel,
  subscribeToOrder,
  type TrackedOrder,
} from "@/lib/supabase/repository";

const ICONS = [Receipt, ChefHat, PackageCheck, Utensils];
const DELIVERY_ICONS = [Receipt, ChefHat, PackageCheck, Truck, Check];
const STATUS_STEP = {
  en_attente: 0,
  preparation: 1,
  pret: 2,
  servi: 3,
  en_livraison: 3,
  livre: 4,
  annule: 0,
} as const;

function TrackingContent() {
  const searchParams = useSearchParams();
  const initialNumber = searchParams.get("commande") ?? "";
  const [orderNumber, setOrderNumber] = useState(initialNumber);
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadOrder = useCallback(async (number: number) => {
    const result = await fetchMyOrder(number);
    setOrder(result);
    return result;
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
    try {
      await loadOrder(number);
    } catch (cause) {
      setOrder(null);
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
    const saved = initialNumber || localStorage.getItem("diego-last-order");
    if (saved) {
      setOrderNumber(saved);
      void searchOrder(saved);
    }
    // The initial lookup must run only once for this page load.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!order) return;
    const channel = subscribeToOrder(order.id, () => {
      void loadOrder(order.orderNumber);
    });
    // Sans session, le temps réel peut être indisponible : on rafraîchit aussi périodiquement.
    const timer = window.setInterval(() => {
      void loadOrder(order.orderNumber);
    }, 15_000);
    return () => {
      void removeRealtimeChannel(channel);
      window.clearInterval(timer);
    };
  }, [loadOrder, order?.id, order?.orderNumber]);

  const step = order ? STATUS_STEP[order.status] : 0;
  const delivery = order?.channel === "livraison";
  const trackingSteps = delivery ? DELIVERY_TRACKING_STEPS : TRACKING_STEPS;
  const trackingIcons = delivery ? DELIVERY_ICONS : ICONS;

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
          <Link
            href="/"
            className="inline-flex items-center gap-2 border border-line bg-white px-4 py-2 text-[11px] font-semibold text-ink-soft shadow-card transition hover:border-brand-300 hover:text-brand-600 sm:px-5 sm:py-2.5"
          >
            <House size={15} /> Accueil
          </Link>
        </div>
        <div className="mt-6 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-faint">
            Mise à jour en temps réel
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight sm:text-5xl">
            Où en est ma commande ?
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-xs text-ink-soft sm:text-base">
            Saisissez le numéro reçu après votre commande pour suivre chaque
            étape de sa préparation.
          </p>
        </div>

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
            {loading ? "Recherche…" : "Suivre ma commande"}
          </button>
        </form>

        {error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        )}

        {searched && !loading && !error && !order && (
          <div className="mt-6 rounded-2xl border border-line bg-white p-8 text-center shadow-card">
            <p className="font-bold">Commande introuvable</p>
            <p className="mt-2 text-sm text-ink-soft">
              Vérifiez le numéro. Pour votre sécurité, seules les commandes
              créées sur cet appareil sont accessibles.
            </p>
          </div>
        )}

        {order && (
          <section className="mt-6 overflow-hidden rounded-2xl border border-line bg-white shadow-panel">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-ink-faint">
                  Votre commande
                </p>
                <p className="mt-1 text-xl font-black text-ink sm:text-2xl">
                  #{order.orderNumber}
                </p>
              </div>
              <span
                className={`px-3 py-1.5 text-[11px] font-bold sm:px-4 sm:py-2 sm:text-xs ${
                  order.status === "annule"
                    ? "bg-red-50 text-red-600"
                    : "bg-brand-50 text-brand-600"
                }`}
              >
                {order.status === "annule"
                  ? "Commande annulée"
                  : trackingSteps[step].label}
              </span>
            </div>

            <ol className="px-5 py-7 sm:flex sm:px-7 sm:py-9">
              {trackingSteps.map((trackingStep, index) => {
                const Icon = trackingIcons[index];
                const done = index < step;
                const current = index === step;
                const active = done || current;

                return (
                  <li
                    key={trackingStep.id}
                    className="relative flex min-h-24 gap-4 last:min-h-0 sm:min-h-0 sm:flex-1 sm:flex-col sm:items-center sm:gap-3"
                  >
                    {index < trackingSteps.length - 1 && (
                      <>
                        <span
                          className={`absolute left-5 top-10 h-[calc(100%-1rem)] w-0.5 sm:hidden ${
                            done ? "bg-emerald-500" : "bg-line"
                          }`}
                        />
                        <span
                          className={`absolute left-[calc(50%+1.25rem)] top-5 hidden h-0.5 w-[calc(100%-2.5rem)] sm:block ${
                            done ? "bg-emerald-500" : "bg-line"
                          }`}
                        />
                      </>
                    )}
                    <div
                      className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        done
                          ? "border-emerald-500 bg-emerald-500 text-white"
                          : current
                            ? "border-brand-500 bg-brand-500 text-ink shadow-[0_0_0_5px_#f3ead0]"
                            : "border-line bg-white text-ink-faint"
                      }`}
                    >
                      {done ? <Check size={18} /> : <Icon size={18} />}
                    </div>
                    <div className="pt-0.5 sm:text-center">
                      <p
                        className={`text-xs font-bold sm:text-sm ${
                          current
                            ? "text-brand-600"
                            : active
                              ? "text-ink"
                              : "text-ink-faint"
                        }`}
                      >
                        {trackingStep.label}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-ink-soft">
                        {trackingStep.description}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
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
