# Diego Web — Site client (Front-Office)

Site web client du restaurant Chez Diego (Next.js 14 App Router + Tailwind + Supabase).

## Pages

| Route | Description |
| --- | --- |
| `/` | Accueil rapide : menu, suivi et commande |
| `/menu` | Menu Supabase, consultation et commande |
| `/suivi` | Suivi en direct de l'état de la commande (timeline Reçue → Préparation → Prête → Servie) |
| `/table/[token]` | Accueil dédié après scan du QR code d'une table |

## Démarrage

```bash
npm install
npm run dev
```

Le site tourne sur [http://localhost:3000](http://localhost:3000).

## Supabase

Renseigner dans `.env.local` l'URL et la clé anon du projet Supabase
(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
Le schéma canonique et les données initiales se trouvent dans le dépôt
`diegogestion/supabase/migrations`. Après leur exécution, le menu, la création de
commande et le suivi Realtime utilisent les tables `diego-*`.

Dans **Authentication → Providers**, activer **Anonymous Sign-ins**. Chaque
commande web est alors liée à une session anonyme Supabase : un client ne peut
pas consulter ou écouter la commande d'un autre client.

Les QR codes de table doivent pointer vers :

```text
https://votre-domaine/table/<qr_token>
```

Le `qr_token` est celui de la table dans `"diego-restaurant-tables"`.
