# Data Model : CircleLink open source

## Base concernée

Une base PostgreSQL 18 par instance, dans le même `docker-compose.yml` que l’app, sur un volume nommé. Deux rôles, comme aujourd’hui : `circlelink_owner` (créé par l’image PostgreSQL, migrations) et `circlelink_app` (créé au démarrage par `scripts/db/setup.ts`).

## Entité ajoutée : `app_setup`

Ligne unique, présente seulement tant que l’instance n’a pas de propriétaire.

| Colonne | Type | Contrainte |
|---|---|---|
| `id` | `smallint` | clé primaire, `= 1` |
| `code_hash` | `text` | non nul, `^[0-9a-f]{64}$` (SHA-256 du code) |
| `created_at` | `timestamptz` | non nul, `now()` |

- Écrite au démarrage si `app_owner` est vide ; remplacée à chaque démarrage tant qu’elle existe.
- Supprimée dans la transaction qui crée le propriétaire.

## Entité modifiée : `profile`

| Colonne ajoutée | Type | Contrainte |
|---|---|---|
| `avatar_url` | `text` | non nul, défaut `''` ; vide ou `^https://[^\s/]+\.[^\s]+$`, ≤ 2048 |
| `show_credit` | `boolean` | non nul, défaut `true` |

Type `Profile` : `avatar_url: string; show_credit: boolean`. L’API `/api/v1/profile` et l’import les acceptent (documentation OpenAPI mise à jour).

## Entités inchangées

`categories`, `links`, `link_clicks`, `app_owner`, `api_keys`, `newsletter_queue`, `newsletter_stats`, tables de Better Auth.

## Données retirées du dépôt

Le seed Supabase (`supabase/migrations/*_seed.sql`) et toute donnée d’exemple personnelle. Une instance neuve démarre sans catégorie ni lien ; le profil est vide jusqu’au premier enregistrement.
