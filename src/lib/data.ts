export interface MenuItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number; // FCFA
  imageUrl?: string | null;
  signature?: boolean;
}

export function formatFCFA(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} FCFA`;
}

export type TrackingStep = {
  id: string;
  label: string;
  description: string;
};

export const TRACKING_STEPS: TrackingStep[] = [
  { id: "recue", label: "Commande reçue", description: "Votre commande est enregistrée." },
  { id: "preparation", label: "En préparation", description: "Nos cuisiniers sont dessus." },
  { id: "pret", label: "Prête", description: "Votre commande vous attend." },
  { id: "servie", label: "Servie / Remise", description: "Bon appétit !" },
];

export const DELIVERY_TRACKING_STEPS: TrackingStep[] = [
  { id: "recue", label: "Commande reçue", description: "Votre commande est enregistrée." },
  { id: "preparation", label: "En préparation", description: "Nos cuisiniers sont dessus." },
  { id: "pret", label: "Prête", description: "Votre commande est prête à partir." },
  { id: "en_livraison", label: "En livraison", description: "Votre livreur est en route." },
  { id: "livre", label: "Livrée", description: "Votre commande a été livrée." },
];
