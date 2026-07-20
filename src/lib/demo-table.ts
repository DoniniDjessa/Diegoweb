/**
 * Lien de test « scan table ».
 * Par défaut : Table 1 (déjà en base).
 * Pour une Table Test dédiée, exécuter
 * `20260720230000_demo_table.sql` puis mettre
 * NEXT_PUBLIC_DEMO_TABLE_TOKEN=a0000000-0000-4000-8000-000000000001
 */
export const DEMO_TABLE_QR_TOKEN =
  process.env.NEXT_PUBLIC_DEMO_TABLE_TOKEN ??
  "d792d2e4-8c68-4962-a687-4e9e01bbf270";

export const DEMO_TABLE_PATH = `/table/${DEMO_TABLE_QR_TOKEN}`;
