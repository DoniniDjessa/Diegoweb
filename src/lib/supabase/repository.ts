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

export type ScannedRestaurantTable = {
  id: string;
  label: string;
  seats: number;
  status: "libre" | "occupee" | "reservee";
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
  const { data, error } = await requireSupabase().rpc("diego_create_order", {
    p_channel: input.channel,
    p_items: input.items.map((item) => ({
      product_id: item.productId,
      quantity: item.quantity,
      note: item.note ?? null,
    })),
    p_table_qr_token: input.tableQrToken ?? null,
    p_customer_name: input.customerName ?? null,
    p_customer_phone: input.customerPhone ?? null,
    p_delivery_address: input.deliveryAddress ?? null,
    p_scheduled_for: input.scheduledFor ?? null,
    p_note: input.note ?? null,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("Supabase did not return the created order.");

  return {
    id: row.id,
    orderNumber: row.order_number,
    trackingToken: row.tracking_token,
    total: row.total,
  };
}

export async function fetchMyOrder(
  orderNumber: number
): Promise<TrackedOrder | null> {
  const { data, error } = await requireSupabase().rpc("diego_track_order", {
    p_order_number: orderNumber,
  });

  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;

  return {
    id: row.id,
    orderNumber: row.order_number,
    status: row.status,
    channel: row.channel,
    total: row.total,
    createdAt: row.created_at,
  } as TrackedOrder;
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
