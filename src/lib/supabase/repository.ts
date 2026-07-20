import type { RealtimeChannel } from "@supabase/supabase-js";
import { getSupabase } from "@/lib/supabase";
import type { MenuItem } from "@/lib/data";
import { DIEGO_STORAGE_BUCKET, DIEGO_TABLES } from "./constants";

type ProductRow = {
  id: string;
  name: string;
  description: string | null;
  category: string;
  price: number;
  image_path: string | null;
  signature: boolean;
};

export type MenuCategory = {
  id: string;
  slug: string;
  label: string;
  sortOrder: number;
};

export type CustomerOrderChannel = "table" | "emporter" | "livraison";

export type CustomerOrderInput = {
  channel: CustomerOrderChannel;
  items: { productId: string; quantity: number; note?: string }[];
  tableQrToken?: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  scheduledFor?: string;
  note?: string;
};

export type CreatedOrder = {
  id: string;
  orderNumber: number;
  trackingToken: string;
  total: number;
};

export type TrackedOrder = {
  id: string;
  orderNumber: number;
  status:
    | "a_valider"
    | "en_attente"
    | "preparation"
    | "pret"
    | "servi"
    | "en_livraison"
    | "livre"
    | "annule";
  channel: CustomerOrderChannel | "comptoir";
  total: number;
  createdAt: string;
};

export type OrderReceiptItem = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  note: string | null;
};

export type OrderReceipt = TrackedOrder & {
  tableStatus?: "libre" | "occupee" | "reservee" | null;
  items: OrderReceiptItem[];
};

export type ScannedRestaurantTable = {
  id: string;
  label: string;
  seats: number;
  status: "libre" | "occupee" | "reservee";
};

export type TableActiveOrder = TrackedOrder & {
  tableStatus: "libre" | "occupee" | "reservee";
};

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error("Supabase environment variables are not configured.");
  }
  return supabase;
}

export function productImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  const supabase = getSupabase();
  if (!supabase) return null;
  return supabase.storage.from(DIEGO_STORAGE_BUCKET).getPublicUrl(imagePath).data
    .publicUrl;
}

export async function fetchMenu(): Promise<MenuItem[]> {
  const { data, error } = await requireSupabase()
    .from(DIEGO_TABLES.products)
    .select(
      "id,name,description,category,price,image_path,signature"
    )
    .eq("active", true)
    .eq("in_stock", true)
    .order("sort_order")
    .order("name");

  if (error) throw error;
  return ((data ?? []) as ProductRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    category: row.category,
    price: row.price,
    imageUrl: productImageUrl(row.image_path),
    signature: row.signature,
  }));
}

export async function fetchMenuCategories(): Promise<MenuCategory[]> {
  const { data, error } = await requireSupabase()
    .from(DIEGO_TABLES.menuCategories)
    .select("id,slug,label,sort_order")
    .eq("active", true)
    .order("sort_order")
    .order("label");
  if (error) throw error;
  return ((data ?? []) as {
    id: string;
    slug: string;
    label: string;
    sort_order: number;
  }[]).map((row) => ({
    id: row.id,
    slug: row.slug,
    label: row.label,
    sortOrder: row.sort_order,
  }));
}

export async function fetchScannedTable(
  qrToken: string
): Promise<ScannedRestaurantTable | null> {
  const { data, error } = await requireSupabase()
    .from(DIEGO_TABLES.restaurantTables)
    .select("id,label,seats,status")
    .eq("qr_token", qrToken)
    .eq("active", true)
    .maybeSingle();

  if (error) throw error;
  return data as ScannedRestaurantTable | null;
}

export async function createCustomerOrder(
  input: CustomerOrderInput
): Promise<CreatedOrder> {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      channel: input.channel,
      tableQrToken: input.tableQrToken,
      note: input.note,
      items: input.items,
    }),
  });

  const payload = (await response.json().catch(() => null)) as {
    id?: string;
    orderNumber?: number;
    trackingToken?: string;
    total?: number;
    error?: string;
    debug?: { message?: string; details?: string; hint?: string; code?: string };
  } | null;

  if (!response.ok) {
    const debugBits = payload?.debug
      ? ` (${[payload.debug.code, payload.debug.message, payload.debug.details]
          .filter(Boolean)
          .join(" — ")})`
      : "";
    throw new Error(
      `${payload?.error || "Impossible de créer la commande."}${debugBits}`
    );
  }

  if (!payload?.id || payload.orderNumber == null) {
    throw new Error("Aucune commande retournée par le serveur.");
  }

  return {
    id: payload.id,
    orderNumber: payload.orderNumber,
    trackingToken: String(payload.trackingToken ?? ""),
    total: Number(payload.total ?? 0),
  };
}

export async function fetchMyOrder(
  orderNumber: number
): Promise<TrackedOrder | null> {
  const receipt = await fetchOrderReceipt(orderNumber);
  if (!receipt?.id) return null;
  return {
    id: receipt.id,
    orderNumber: receipt.orderNumber,
    status: receipt.status,
    channel: receipt.channel,
    total: receipt.total,
    createdAt: receipt.createdAt,
  };
}

function mapReceipt(data: unknown): OrderReceipt | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown>;
  if (!row.id) {
    return {
      id: "",
      orderNumber: 0,
      status: "en_attente",
      channel: "table",
      total: Number(row.total ?? 0),
      createdAt: new Date(0).toISOString(),
      tableStatus: (row.tableStatus as OrderReceipt["tableStatus"]) ?? "libre",
      items: [],
    };
  }

  const rawItems = Array.isArray(row.items) ? row.items : [];
  return {
    id: String(row.id),
    orderNumber: Number(row.orderNumber),
    status: row.status as OrderReceipt["status"],
    channel: row.channel as OrderReceipt["channel"],
    total: Number(row.total ?? 0),
    createdAt: String(row.createdAt),
    tableStatus: (row.tableStatus as OrderReceipt["tableStatus"]) ?? null,
    items: rawItems.map((item) => {
      const line = item as Record<string, unknown>;
      return {
        name: String(line.name ?? ""),
        quantity: Number(line.quantity ?? 0),
        unitPrice: Number(line.unitPrice ?? 0),
        lineTotal: Number(line.lineTotal ?? 0),
        note: (line.note as string | null) ?? null,
      };
    }),
  };
}

/** Détail reçu (articles + prix) par numéro de commande. */
export async function fetchOrderReceipt(
  orderNumber: number
): Promise<OrderReceipt | null> {
  const { data, error } = await requireSupabase().rpc(
    "diego_customer_order_receipt",
    { p_order_number: orderNumber }
  );
  if (error) throw error;
  return mapReceipt(data);
}

/** Détail reçu lié à une table QR (tous les plats tant que non vidée). */
export async function fetchTableOrderReceipt(
  qrToken: string
): Promise<OrderReceipt | null> {
  const { data, error } = await requireSupabase().rpc(
    "diego_customer_table_receipt",
    { p_table_qr_token: qrToken }
  );
  if (error) throw error;
  return mapReceipt(data);
}

/** Commande active liée à une table QR (null si table libre / aucune commande). */
export async function fetchTableActiveOrder(
  qrToken: string
): Promise<TableActiveOrder | null> {
  const receipt = await fetchTableOrderReceipt(qrToken);
  if (!receipt) return null;

  const tableStatus = receipt.tableStatus ?? "libre";
  if (tableStatus === "libre" || !receipt.id) {
    return {
      id: "",
      orderNumber: 0,
      status: "en_attente",
      channel: "table",
      total: 0,
      createdAt: new Date(0).toISOString(),
      tableStatus: "libre",
    };
  }

  return {
    id: receipt.id,
    orderNumber: receipt.orderNumber,
    status: receipt.status,
    channel: receipt.channel,
    total: receipt.total,
    createdAt: receipt.createdAt,
    tableStatus,
  };
}

export function subscribeToOrder(
  orderId: string,
  onChange: () => void
): RealtimeChannel {
  return requireSupabase()
    .channel(`diego-order-${orderId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "diego-public-order-tracking",
        filter: `order_id=eq.${orderId}`,
      },
      onChange
    )
    .subscribe();
}

export function subscribeToMenu(onChange: () => void): RealtimeChannel | null {
  const supabase = getSupabase();
  if (!supabase) return null;
  return supabase
    .channel("diego-public-menu")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: DIEGO_TABLES.products },
      onChange
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: DIEGO_TABLES.menuCategories },
      onChange
    )
    .subscribe();
}

export async function removeRealtimeChannel(
  channel: RealtimeChannel | null
): Promise<void> {
  const supabase = getSupabase();
  if (supabase && channel) await supabase.removeChannel(channel);
}
