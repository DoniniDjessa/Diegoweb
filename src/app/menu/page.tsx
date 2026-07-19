"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  House,
  LoaderCircle,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  X,
} from "lucide-react";
import { formatFCFA, type MenuItem } from "@/lib/data";
import {
  createCustomerOrder,
  fetchMenuCategories,
  fetchMenu,
  type MenuCategory,
  removeRealtimeChannel,
  subscribeToMenu,
} from "@/lib/supabase/repository";
import { FoodImage } from "@/components/FoodImage";

type CartLine = { item: MenuItem; qty: number };
function MenuContent() {
  const searchParams = useSearchParams();
  // Le QR d'une table contient son token UUID : /menu?table=<qr_token>
  const table = searchParams.get("table");
  const browseOnly = searchParams.get("mode") === "browse" || !table;

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [confirmed, setConfirmed] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const loadMenu = useCallback(async () => {
    try {
      const [products, nextCategories] = await Promise.all([
        fetchMenu(),
        fetchMenuCategories(),
      ]);
      setMenu(products);
      // Ne garde que les catégories qui ont au moins un produit en stock.
      const usedSlugs = new Set(products.map((item) => item.category));
      const available = nextCategories.filter((item) => usedSlugs.has(item.slug));
      setCategories(available);
      setCategory((current) =>
        current === "all" || available.some((item) => item.slug === current)
          ? current
          : "all"
      );
      setError(null);
    } catch {
      setMenu([]);
      setCategories([]);
      setError("Impossible de charger le menu depuis Supabase.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadMenu();
    const channel = subscribeToMenu(() => void loadMenu());
    return () => {
      void removeRealtimeChannel(channel);
    };
  }, [loadMenu]);

  const items = useMemo(
    () => {
      const normalizedQuery = query.trim().toLocaleLowerCase("fr");
      return menu.filter(
        (item) =>
          (category === "all" || item.category === category) &&
          (!normalizedQuery ||
            item.name.toLocaleLowerCase("fr").includes(normalizedQuery))
      );
    },
    [category, menu, query]
  );
  const total = cart.reduce((s, l) => s + l.item.price * l.qty, 0);
  const count = cart.reduce((s, l) => s + l.qty, 0);

  function add(item: MenuItem) {
    setCart((prev) => {
      const found = prev.find((l) => l.item.id === item.id);
      if (found)
        return prev.map((l) =>
          l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l
        );
      return [...prev, { item, qty: 1 }];
    });
  }

  function setQty(id: string, qty: number) {
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => l.item.id !== id)
        : prev.map((l) => (l.item.id === id ? { ...l, qty } : l))
    );
  }

  async function checkout() {
    if (!table) {
      setError("Scannez le QR code de votre table pour commander sur place.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const order = await createCustomerOrder({
        channel: "table",
        tableQrToken: table ?? undefined,
        items: cart.map(({ item, qty }) => ({
          productId: item.id,
          quantity: qty,
        })),
      });
      localStorage.setItem("diego-last-order", String(order.orderNumber));
      setConfirmed(order.orderNumber);
      setCart([]);
      setCartOpen(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Impossible de créer la commande."
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-surface-muted">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <div className="flex flex-col items-center gap-4">
          <Image
            src="/diego.png"
            alt="Chez Diego"
            width={180}
            height={90}
            priority
            className="h-auto w-36 object-contain sm:w-44"
          />
          <Link
            href="/"
            className="inline-flex items-center gap-2 border border-line bg-white px-4 py-2 text-[11px] font-semibold text-ink-soft shadow-card transition hover:border-brand-300 hover:text-brand-600 sm:px-5 sm:py-2.5"
          >
            <House size={15} /> Accueil
          </Link>
        </div>
        <div className="mx-auto mt-6 max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-ink-faint">
            {browseOnly ? "Notre carte" : "Commandez en quelques touches"}
          </p>
          <h1 className="mt-3 font-title text-3xl font-semibold tracking-tight sm:text-5xl">
            {browseOnly ? "Le Menu" : "Notre Menu"}
          </h1>
          {table && (
            <p className="mx-auto mt-3 inline-flex items-center gap-2 border border-brand-200 bg-brand-50 px-3 py-1 text-[11px] font-bold text-brand-700 sm:px-4 sm:py-1.5 sm:text-xs">
              <span className="h-2 w-2 rounded-full bg-brand-500" />
              QR de table validé — service directement à votre table
            </p>
          )}
        </div>

        {!browseOnly && (
          <div className="mt-6 flex justify-center">
            <span className="rounded-full border border-brand-200 bg-brand-50 px-4 py-2 text-[11px] font-semibold text-brand-700 shadow-card">
              Commande à table
            </span>
          </div>
        )}

        {error && (
          <div className="mx-auto mt-6 max-w-2xl rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            {error}
          </div>
        )}

        {confirmed !== null && (
          <div className="mx-auto mt-6 flex max-w-2xl items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
            <span>
              Commande <strong>#{confirmed}</strong> confirmée ! Suivez sa
              préparation en direct.
            </span>
            <Link
              href={`/suivi?commande=${confirmed}`}
              className="ml-3 shrink-0 bg-brand-500 px-5 py-2 text-[11px] font-bold text-ink hover:bg-brand-600"
            >
              Suivre
            </Link>
          </div>
        )}

        <div className="mt-8 border-b border-line pb-3">
          <label className="relative block">
            <Search
              size={16}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un plat"
              className="w-full border border-line bg-white py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-brand-400"
            />
          </label>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1 sm:justify-center">
            {[
              { id: "all", slug: "all", label: "Tout", sortOrder: -1 },
              ...categories,
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.slug)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-semibold transition-colors sm:px-3.5 sm:py-1.5 sm:text-[10px] ${
                  category === c.slug
                    ? "border-brand-500 bg-brand-500 text-ink shadow-card"
                    : "border-line bg-white text-ink-soft shadow-card hover:border-brand-300 hover:text-brand-600"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-24">
            <LoaderCircle size={28} className="animate-spin text-brand-500" />
          </div>
        ) : items.length === 0 ? (
          <div className="mx-auto mt-8 max-w-md rounded-2xl border border-dashed border-line bg-white p-10 text-center shadow-card">
            <p className="font-display text-xl font-bold">
              Rien dans cette catégorie
            </p>
            <p className="mt-2 text-sm text-ink-soft">
              Les plats disponibles apparaîtront ici dès leur mise en ligne.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {items.map((m) => (
              <div
                key={m.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-card transition hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-panel"
              >
                <div className="relative">
                  <FoodImage
                    src={m.imageUrl}
                    alt={m.name}
                    className="h-24 w-full object-cover sm:h-32"
                  />
                  {m.signature && (
                    <span className="absolute right-1.5 top-1.5 rounded-full bg-white/95 px-2 py-0.5 text-[9px] font-bold text-brand-600 shadow-card">
                      Signature
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-2.5 sm:p-3">
                  <p className="line-clamp-2 font-script text-lg leading-5 sm:text-xl sm:leading-6">
                    {m.name}
                  </p>
                  <p className="mt-0.5 line-clamp-2 flex-1 text-[10px] text-ink-soft sm:text-xs">
                    {m.description}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-brand-600 tabular-nums sm:text-sm">
                      {formatFCFA(m.price)}
                    </span>
                    {!browseOnly && (
                      <button
                        onClick={() => add(m)}
                        aria-label={`Ajouter ${m.name}`}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-500 text-ink transition-colors hover:bg-brand-600 sm:h-8 sm:w-8"
                      >
                        <Plus size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bouton panier flottant */}
      {count > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 text-[11px] font-bold text-ink shadow-panel transition hover:-translate-y-0.5 hover:bg-brand-600 sm:bottom-5 sm:right-5 sm:px-6 sm:py-4"
        >
          <ShoppingBag size={17} />
          {count} article{count > 1 ? "s" : ""} · {formatFCFA(total)}
        </button>
      )}

      {/* Drawer panier */}
      {cartOpen && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-ink/40"
            onClick={() => setCartOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-white shadow-panel">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="font-script text-2xl sm:text-3xl">
                Votre commande
              </h2>
              <button
                onClick={() => setCartOpen(false)}
                className="p-2 text-ink-soft hover:bg-surface-soft"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">
              {cart.length === 0 ? (
                <p className="mt-8 text-center text-sm text-ink-faint">
                  Votre panier est vide.
                </p>
              ) : (
                <ul className="space-y-3">
                  {cart.map(({ item, qty }) => (
                    <li
                      key={item.id}
                      className="flex items-center gap-3 rounded-2xl border border-line p-3"
                    >
                      <FoodImage
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-14 w-14 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-script text-xl leading-6">
                          {item.name}
                        </p>
                        <p className="text-xs text-ink-soft">
                          {formatFCFA(item.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setQty(item.id, qty - 1)}
                          className="flex h-8 w-8 items-center justify-center border border-line text-ink-soft hover:bg-surface-soft"
                          aria-label="Diminuer"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="w-5 text-center text-sm font-bold">
                          {qty}
                        </span>
                        <button
                          onClick={() => setQty(item.id, qty + 1)}
                          className="flex h-8 w-8 items-center justify-center border border-line text-ink-soft hover:bg-surface-soft"
                          aria-label="Augmenter"
                        >
                          <Plus size={13} />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t border-line px-5 py-4">
              {error && (
                <p className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                  {error}
                </p>
              )}
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs text-ink-soft sm:text-sm">
                  Sur place
                  {table ? " — QR validé" : ""}
                </span>
                <span className="font-display text-xl font-bold sm:text-2xl">
                  {formatFCFA(total)}
                </span>
              </div>
              <button
                onClick={checkout}
                disabled={cart.length === 0 || submitting}
                className="w-full rounded-xl bg-brand-500 py-3 text-[11px] font-bold text-ink transition-colors hover:bg-brand-600 disabled:bg-ink-faint/30 sm:py-3.5"
              >
                {submitting ? "Validation…" : "Valider la commande"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function MenuPage() {
  return (
    <Suspense>
      <MenuContent />
    </Suspense>
  );
}
