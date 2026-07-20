import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type Body = {
  channel: "table" | "emporter" | "livraison";
  tableQrToken?: string;
  note?: string;
  items: { productId: string; quantity: number; note?: string }[];
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Body;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !key) {
      return NextResponse.json(
        { error: "Supabase n’est pas configuré sur le serveur." },
        { status: 500 }
      );
    }

    if (!body?.items?.length) {
      return NextResponse.json(
        { error: "Le panier est vide." },
        { status: 400 }
      );
    }

    if (body.channel === "table" && !body.tableQrToken) {
      return NextResponse.json(
        { error: "QR de table manquant. Re-scannez la table." },
        { status: 400 }
      );
    }

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data, error } = await supabase.rpc("diego_create_order", {
      p_channel: body.channel,
      p_items: body.items.map((item) => ({
        product_id: item.productId,
        quantity: item.quantity,
        note: item.note ?? null,
      })),
      p_table_qr_token: body.tableQrToken ?? null,
      p_customer_name: null,
      p_customer_phone: null,
      p_delivery_address: null,
      p_scheduled_for: null,
      p_note: body.note ?? null,
    });

    if (error) {
      console.error("[diego_create_order]", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
        body: {
          channel: body.channel,
          tableQrToken: body.tableQrToken,
          itemCount: body.items.length,
          note: body.note,
        },
      });

      let message = error.message || "Impossible de créer la commande.";
      if (/invalid table qr code/i.test(message)) {
        message =
          "QR de table invalide. Utilisez « Simuler une table » ou scannez un QR actif.";
      } else if (/invalid or unavailable/i.test(message)) {
        message =
          "Un ou plusieurs plats ne sont plus disponibles. Actualisez le menu.";
      } else if (/a_valider|check constraint|diego-orders_status/i.test(message)) {
        message =
          "Migration SQL manquante : exécutez 20260720220000_order_staff_validation.sql dans Supabase.";
      }

      return NextResponse.json(
        {
          error: message,
          debug: {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code,
          },
        },
        { status: 400 }
      );
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      return NextResponse.json(
        { error: "Aucune commande retournée par Supabase." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      id: row.id,
      orderNumber: row.order_number,
      trackingToken: row.tracking_token,
      total: row.total,
    });
  } catch (cause) {
    console.error("[api/orders]", cause);
    return NextResponse.json(
      {
        error:
          cause instanceof Error
            ? cause.message
            : "Impossible de créer la commande.",
      },
      { status: 500 }
    );
  }
}
