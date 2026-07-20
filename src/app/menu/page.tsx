"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
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
  const table = searchParams.get("table");
  const browseOnly = searchParams.get("mode") === "browse" || !table;
  const backHref = table ? `/table/${encodeURIComponent(table)}` : "/";

  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [orderNote, setOrderNote] = useState("");
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

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("fr");
    return menu.filter(
      (item) =>
        (category === "all" || item.category === category) &&
        (!normalizedQuery ||
          item.name.toLocaleLowerCase("fr").includes(normalizedQuery))
    );
  }, [category, menu, query]);

  const sections = useMemo(() => {
    const bySlug = new Map<string, MenuItem[]>();
    for (const item of filtered) {
      const list = bySlug.get(item.category) ?? [];
      list.push(item);
      bySlug.set(item.category, list);
    }

    const ordered = categories
      .filter((c) => bySlug.has(c.slug))
      .map((c) => ({
        slug: c.slug,
        label: c.label,
        items: bySlug.get(c.slug) ?? [],
      }));

    // Produits dont la catégorie n'est plus dans la liste admin.
    const known = new Set(categories.map((c) => c.slug));
    const orphan = filtered.filter((item) => !known.has(item.category));
    if (orphan.length > 0) {
      ordered.push({ slug: "_other", label: "Autres", items: orphan });
    }
    return ordered;
  }, [categories, filtered]);

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
        note: orderNote.trim() || undefined,
        items: cart.map(({ item, qty }) => ({
          productId: item.id,
          quantity: qty,
        })),
      });
      localStorage.setItem("diego-last-order", String(order.orderNumber));
      if (table) localStorage.setItem("diego-last-table", table);
      setConfirmed(order.orderNumber);
      setCart([]);
      setOrderNote("");
      setCartOpen(false);
    } catch (cause) {
      const message =
        cause instanceof Error
          ? cause.message
          : typeof cause === "object" &&
              cause &&
              "message" in cause &&
              typeof (cause as { message: unknown }).message === "string"
            ? (cause as { message: string }).message
            : "Impossible de créer la commande.";
      console.error("[checkout]", cause);
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-dvh bg-surface-muted">
      <div className="mx-auto max-w-6xl px-3 pb-8 pt-3 sm:px-4 sm:pb-10 sm:pt-4">
        <div className="relative mb-4 flex items-center justify-center">
          <Link
            href={backHref}
            aria-label="Retour"
            className="absolute left-0 flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-ink shadow-card transition hover:border-brand-300 hover:text-brand-600"
          >
            <ArrowLeft size={18} />
          </Link>
          <Image
            src="/diego.png"
            alt="Chez Diego"
            width={140}
            height={70}
            priority
            className="h-auto w-24 object-contain sm:w-28"
          />
        </div>

        {table && (
          <p className="mb-3 text-center">
            <span className="inline-flex items-center gap-2 border border-brand-200 bg-brand-50 px-3 py-1 text-[10px] font-bold text-brand-700">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-500" />
              Service à votre table
            </span>
          </p>
        )}

        {error && (
          <div className="mx-auto mb-4 max-w-2xl rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {confirmed !== null && (
          <div className="mx-auto mb-4 flex max-w-2xl items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <span>
              Commande <strong>#{confirmed}</strong> reçue ! Elle sera
              confirmée par le restaurant.
            </span>
            <Link
              href={
                table
                  ? `/suivi?table=${encodeURIComponent(table)}`
                  : `/suivi?commande=${confirmed}`
              }
              className="shrink-0 bg-brand-500 px-4 py-1.5 text-[11px] font-bold text-ink hover:bg-brand-600"
            >
              Voir
            </Link>
          </div>
        )}

        <div className="mb-4">
          <label className="relative mx-auto block max-w-md">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-faint"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher…"
              className="h-9 w-full rounded-full border border-line bg-white pl-9 pr-4 text-xs outline-none transition focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            />
          </label>
          <div className="mt-2.5 flex gap-1.5 overflow-x-auto pb-0.5">
            {[
              { id: "all", slug: "all", label: "Tout", sortOrder: -1 },
              ...categories,
            ].map((c) => (
              <button
                key={c.id}
                onClick={() => setCategory(c.slug)}
                className={`shrink-0 rounded-full border px-2.5 py-1 text-[9px] font-semibold transition-colors sm:text-[10px] ${
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
          <div className="flex justify-center py-20">
            <LoaderCircle size={28} className="animate-spin text-brand-500" />
          </div>
        ) : sections.length === 0 ? (
          <div className="mx-auto mt-6 max-w-md rounded-2xl border border-dashed border-line bg-white p-8 text-center shadow-card">
            <p className="font-display text-lg font-bold">Aucun plat</p>
            <p className="mt-1 text-sm text-ink-soft">
              Essayez une autre catégorie ou recherche.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => (
              <section key={section.slug}>
                <h2 className="mb-2.5 font-display text-base font-bold tracking-tight text-ink sm:text-lg">
                  {section.label}
                </h2>
                <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4 sm:gap-2 lg:grid-cols-5 xl:grid-cols-6">
                  {section.items.map((m) => (
                    <div
                      key={m.id}
                      className="group flex flex-col overflow-hidden rounded-xl border border-line bg-white shadow-card transition hover:border-brand-300"
                    >
                      <div className="relative">
                        <FoodImage
                          src={m.imageUrl}
                          alt={m.name}
                          className="aspect-square h-auto w-full object-cover"
                        />
                        {m.signature && (
                          <span className="absolute right-1 top-1 rounded-full bg-white/95 px-1.5 py-0.5 text-[8px] font-bold text-brand-600 shadow-card">
                            ★
                          </span>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col p-1.5 sm:p-2">
                        <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-ink sm:text-[11px]">
                          {m.name}
                        </p>
                        <div className="mt-1 flex items-center justify-between gap-0.5">
                          <span className="text-[9px] font-bold tabular-nums text-brand-600 sm:text-[10px]">
                            {formatFCFA(m.price)}
                          </span>
                          {!browseOnly && (
                            <button
                              onClick={() => add(m)}
                              aria-label={`Ajouter ${m.name}`}
                              className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-500 text-ink transition-colors hover:bg-brand-600 sm:h-6 sm:w-6"
                            >
                              <Plus size={11} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {count > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-2xl bg-brand-500 px-5 py-3 text-[11px] font-bold text-ink shadow-panel transition hover:-translate-y-0.5 hover:bg-brand-600 sm:bottom-5 sm:right-5 sm:px-6 sm:py-4"
        >
          <ShoppingBag size={17} />
          {count} article{count > 1 ? "s" : ""} · {formatFCFA(total)}
        </button>
      )}

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
              <label className="mb-3 block">
                <span className="mb-1.5 block text-[11px] font-semibold text-ink-soft">
                  Précisions (optionnel)
                </span>
                <textarea
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  rows={2}
                  maxLength={280}
                  placeholder="Moins de sel, beaucoup de piment…"
                  className="w-full resize-none rounded-xl border border-line bg-surface-muted px-3 py-2 text-xs outline-none transition focus:border-brand-400 focus:bg-white"
                />
              </label>
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
