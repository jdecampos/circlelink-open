# Data Model : newsletter par connecteurs

## Entité ajoutée : `newsletter_settings`

Ligne unique (`id = 1`), créée au premier enregistrement depuis l’espace.

| Colonne | Type | Contrainte |
|---|---|---|
| `id` | `smallint` | clé primaire, `= 1` |
| `enabled` | `boolean` | non nul, défaut `false` ; vrai seulement si `provider`, `key_ciphertext` et `audience_id` sont renseignés (contrainte) |
| `provider` | `text` | `null` ou `brevo`, `mailchimp`, `mailerlite`, `kit` |
| `key_ciphertext` | `text` | `null` ou `^v1\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$`, ≤ 2048 |
| `key_hint` | `text` | `null` ou 4 caractères |
| `audience_id` | `text` | `null` ou 1 à 100 caractères |
| `audience_name` | `text` | `null` ou ≤ 200 caractères |
| `key_rejected_at` | `timestamptz` | `null` ; posé quand le service répond 401/403, effacé à l’enregistrement suivant |
| `updated_at` | `timestamptz` | non nul, `now()` |

## Entités inchangées

`newsletter_queue` (la file : seules les mentions de Mautic dans les commentaires changent), `newsletter_stats` (compteur de pertes).

## Migration depuis v1.0.x

Aucune donnée Mautic à reprendre : les réglages Mautic étaient des variables d’environnement. La table naît vide, la newsletter est donc désactivée jusqu’à la connexion d’un service. Les inscriptions encore en file sont gardées et partiront vers le service connecté, ou seront purgées à 24 h.
