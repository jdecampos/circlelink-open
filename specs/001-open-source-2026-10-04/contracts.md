# Contracts : CircleLink open source

## Variables d’environnement

Toutes lues à l’exécution, côté serveur. Plus aucune variable `NEXT_PUBLIC_*`.

| Variable | Obligatoire | Sur Coolify | Rôle |
|---|---|---|---|
| `SITE_URL` | oui | `SERVICE_URL_APP` | URL publique : métadonnées, emails, Better Auth |
| `DATABASE_URL` | oui | composée dans le compose | Rôle `circlelink_app` |
| `DATABASE_MIGRATION_URL` | oui | composée dans le compose | Rôle propriétaire du schéma |
| `BETTER_AUTH_SECRET` | oui | `SERVICE_PASSWORD_64_AUTH` | Signature des sessions |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM` | non | à saisir | Lien magique, mot de passe oublié |
| `MAUTIC_URL`, `MAUTIC_USERNAME`, `MAUTIC_PASSWORD`, `MAUTIC_SEGMENT_ALIAS` | non | à saisir | Newsletter |
| `NEWSLETTER_RETRY_SECRET` | non | — | Seulement pour un déclenchement externe de la reprise |

Retirées : `NEXT_PUBLIC_SITE_URL`, `BETTER_AUTH_URL` (déduite de `SITE_URL`), `SUPABASE_DB_URL`, `OWNER_EMAIL`.

## Démarrage du conteneur (`scripts/migrate.mjs`)

1. Base créée si besoin, migrations, rôle `circlelink_app` (inchangé).
2. Si `app_owner` est vide : nouveau code d’installation, journalisé ainsi :

```
──────────────────────────────────────────────
 CircleLink : installation
 Ouvre https://mondomaine.fr/installation
 Code d’installation : 7Kq2-x9Pd-…
──────────────────────────────────────────────
```

3. Démarrage du serveur.

## Installation

```ts
// src/lib/setup/
export function hasOwner(): Promise<boolean>;                         // en cache, tag 'setup'
export function newSetupCode(): Promise<string>;                      // écrit l'empreinte, renvoie le code en clair
export class SetupError extends Error {}                              // message affichable

// src/app/(auth)/installation/actions.ts
export function install(input: { code: string; name: string; email: string; password: string }): Promise<ActionResult>;
// refus : propriétaire déjà présent → « L’installation est déjà terminée. » ; code faux → « Code d’installation incorrect. »
// trop d’essais → « Trop d’essais. Réessaie dans une heure. »
```

| Route | Sans propriétaire | Avec propriétaire |
|---|---|---|
| `/installation` | formulaire | 404 |
| `/connexion`, `/admin/*` | redirige vers `/installation` | inchangé |
| `/` | page vide | inchangé |

## Réinitialisation sans SMTP

```
docker compose exec app node scripts/reset-password.mjs <email>
→ Lien valable 15 minutes : https://mondomaine.fr/nouveau-mot-de-passe?token=…
```
Refuse un email qui n’est pas dans `app_owner` (code de sortie 1, message explicite).

## Drapeaux transmis aux écrans

```ts
// src/lib/features.ts (serveur)
export function mailEnabled(): boolean;
export function newsletterEnabled(): boolean;
// PageData gagne : newsletter: boolean ; l'écran de connexion reçoit { magicLink: boolean; reset: boolean }
```
