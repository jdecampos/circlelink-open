@AGENTS.md

> **Travail en cours : spec `specs/001-open-source-2026-10-04/`** (rendre CircleLink open source et déployable en un clic). Lis `contexte.md` et `tasks.md` dans ce dossier avant de reprendre.

# CircleLink

Page « lien en bio » (façon Linktree / Beacons / Stan Store) d’une seule personne propriétaire, avec un back-office, auto-hébergée (Coolify ou Docker). Les liens doivent s’ouvrir sans avertissement depuis TikTok, Instagram et Facebook. Licence MIT.

**Les principes non négociables sont dans `specs/constitution.md`.** Lis-la avant toute implémentation : chaque article a un CONTRÔLE à faire passer avant de commiter.

## Commandes

```bash
pnpm db:up             # PostgreSQL 18 (port 54329) + smtp4dev (emails : http://localhost:5080), compose.dev.yaml
pnpm db:migrate        # migrations, rôle applicatif, code d'installation (DATABASE_MIGRATION_URL)
pnpm dev               # http://localhost:3000 ; première visite : /installation avec le code affiché par db:migrate
pnpm build             # sans base ni secret : l'image Docker se construit à vide
pnpm lint
pnpm typecheck
pnpm test              # Vitest, base PGlite en mémoire (src/test/db.ts)
pnpm test:pg           # + intégration sur le PostgreSQL de compose.dev.yaml (concurrence, SMTP réel)
pnpm db:generate       # après une modif de src/lib/db/schema/ : nouvelle migration dans drizzle/
```

Variables de dev : `.env.development.local` (non versionné, modèle `.env.example`). `pnpm test:pg` demande la base `circlelink_test` (`docker compose -f compose.dev.yaml exec db createdb -U circlelink_owner circlelink_test`).

## Stack

- Next.js 16 (App Router, Turbopack), React 19, TypeScript strict, `output: 'standalone'`. Sans Cache Components : modèle de cache « précédent » (`unstable_cache`, `updateTag`, `revalidatePath`).
- PostgreSQL 18, Drizzle ORM + postgres.js. Schéma dans `src/lib/db/schema/`, migrations SQL dans `drizzle/`.
- Better Auth (`src/lib/auth/server.ts`) : mot de passe ; lien magique et mot de passe oublié si SMTP ; sessions de 30 jours en base ; inscriptions fermées.
- Déploiement : `docker-compose.yml` (app + PostgreSQL + volume) que Coolify déploie seul ; ailleurs `./scripts/init-env.sh <url> && docker compose up -d`. `Dockerfile` : node:22-alpine.
- Node 22+ exécute les scripts `.ts` nativement : les imports relatifs portent l’extension `.ts` (`allowImportingTsExtensions`). Les modules lus par les scripts du conteneur (`src/lib/env.ts`, `site.ts`, `setup/code.ts`, `auth/reset-link.ts`) n’utilisent ni `server-only` ni l’alias `@/`.
- Pas de Tailwind : le CSS vient tel quel du design (`src/styles/`). Réutilise ses tokens (`--bg`, `--fg`, `--accent`, `--s1`…`--s8`, `--r-*`) et ses classes (`.btn`, `.field`, `.od-*`), n’en invente pas d’autres.

## Architecture

Trois surfaces, chacune avec **son propre root layout** et sa propre feuille de style. Les classes `.side` et `.main` existent dans l’admin comme dans la connexion avec des styles différents : ne fusionne pas ces layouts.

| Groupe | Routes | CSS | Données |
|---|---|---|---|
| `(public)` | `/` | `public.css` | `getPublicPage()` : `unstable_cache`, tag `public-page` |
| `(auth)` | `/installation`, `/connexion`, `/nouveau-mot-de-passe` | `auth.css` | `authClient` (navigateur → `/api/auth`), `install()` |
| `(admin)` | `/admin`, `/admin/categories`, `/admin/apparence`, `/admin/stats` | `admin.css` | `getAdminData()` (session requise) |

- Le code partagé vit dans `src/lib` et `src/components`. Aucun import entre groupes. Les requêtes SQL sont dans `src/lib/db/queries/`, une par domaine, chacune testée sur PGlite.
- **Démarrage du conteneur** (`scripts/db/migrate.ts`, empaqueté en `scripts/migrate.mjs`) : variables vérifiées (`src/lib/env.ts`, chaque manque est nommé), base créée si besoin, migrations, rôle `circlelink_app`, puis, sans propriétaire, code d’installation journalisé (empreinte seule dans `app_setup`).
- **Installation** : tant que `hasOwner()` (en cache, tag `setup`) est faux, `/connexion` et `/admin` mènent à `/installation`. `installOwner()` (`src/lib/setup/install.ts`) vérifie le code dans une transaction qui verrouille `app_setup`, limite à 5 essais par IP et par heure, crée `user` + `account` + `app_owner`. Ensuite `/installation` répond 404.
- `src/proxy.ts` (le `middleware` s’appelle `proxy` en Next 16) protège `/admin` par le cookie de session et pose le cookie indicateur `cb-owner=1`. Il ne lit pas la base et ne tourne pas sur `/`.
- Admin : le layout charge toutes les données (`getAdminData`) et les passe à `AdminShell`, un contexte client. Les vues lisent `useAdmin()`.
- Écritures : server actions dans `src/app/(admin)/admin/actions.ts`, toutes enveloppées par `owned()` (qui appelle `requireOwner()`). Chacune revalide ses entrées, puis `done()` invalide le tag `public-page` et revalide `/` et `/admin`. Passe par `run()` de `useAdmin`, qui affiche l’erreur et recharge l’aperçu.
- **Intégrations facultatives** (`src/lib/features.ts`, lues à l’exécution) : `mailEnabled()` (`SMTP_HOST` + `SMTP_FROM`) active le lien magique et le mot de passe oublié ; sans SMTP, `scripts/reset-password.mjs <email>` affiche un lien de réinitialisation.
- Newsletter : `src/lib/newsletter/` (connecteurs Brevo, Mailchimp, MailerLite, Kit dans `connectors/`, transmission, file, reprise), réglée dans l’espace (`/admin/newsletter`, table `newsletter_settings`, clé chiffrée par `src/lib/crypto/secret-box.ts`). Un nouveau service = un fichier dans `connectors/` + son test de contrat + une entrée de `providers.ts`. L’inscription appelle le service tout de suite (budget 1,5 s) ; en cas d’échec temporaire, elle part dans `newsletter_queue`, retentée toutes les 15 min par l’app elle-même (`src/instrumentation.ts`), puis purgée à 24 h. `POST /api/newsletter/retry` (Bearer `NEWSLETTER_RETRY_SECRET`) reste pour un déclenchement externe.
- `GET /api/health` : 200 si la base répond, 503 sinon (healthcheck du compose).
- API `/api/v1` : chaque route est enveloppée par `api()` de `src/lib/api/http.ts`, qui appelle `requireApiOwner()` (clé `Authorization: Bearer cl_…`, empreinte SHA-256 dans `api_keys`, compte dans `app_owner`), traduit les erreurs en 400/401/404/409/422, et expire `public-page` après une écriture (`{ writes: true }` → `revalidateTag(tag, { expire: 0 })`). Règles de validation partagées avec l’admin : `src/lib/content/validate.ts`. Toute nouvelle route va dans `src/app/api/v1/auth.test.ts` (401 sans clé) et dans `src/lib/api/openapi/paths.ts` (un test compare les deux). Doc Scalar : `/api/docs` (script CDN épinglé avec empreinte SRI).

## Données et sécurité

- **Seul le propriétaire écrit** (constitution VII.1) : par l’admin (`requireOwner()`) ou par l’API (`requireApiOwner()`, clé générée dans `/admin/apparence`). `requireOwner()` exige une session Better Auth valide **et** un email listé dans `app_owner`. `actions.test.ts` et `newsletter-actions.test.ts` vérifient que chaque export refuse sans session : toute nouvelle action doit y passer (`owned()` de `action-helpers.ts`). Seule exception : `install()`, une fois, avec le code.
- **Deux rôles PostgreSQL** : `circlelink_owner` (migrations, `DATABASE_MIGRATION_URL`) et `circlelink_app` (l’app, `DATABASE_URL`), qui lit et écrit les données sans pouvoir modifier le schéma. Rôle créé et mis à jour par `scripts/db/setup.ts`, avec le mot de passe de `DATABASE_URL`. Les contraintes (formats, longueurs, unicités) restent en base.
- Les visiteurs n’écrivent qu’un clic (`trackClick`, lien visible uniquement) et une inscription newsletter. La page publique ne fait aucun appel à `/api/auth`.
- Le lien magique et la réinitialisation ne partent **qu’aux emails de `app_owner`** : Better Auth enverrait sinon un email à n’importe quelle adresse saisie.
- **Aucune variable `NEXT_PUBLIC_*`** : `SITE_URL` et tous les secrets (`DATABASE_*`, `BETTER_AUTH_SECRET`, `SMTP_*`, `NEWSLETTER_RETRY_SECRET`) sont des variables d’exécution serveur ; l’image Docker n’en contient aucun. Sur Coolify, les secrets viennent des variables `SERVICE_*` du compose.
- **Aucune donnée personnelle dans le dépôt** (constitution VII.4) : tests en `@example.com`, nom affiché tiré du profil.
- **Clés de service** (newsletter) : en base, chiffrées (AES-256-GCM, clé dérivée de `BETTER_AUTH_SECRET`) ; l’espace n’en voit que les 4 derniers caractères. Changer `BETTER_AUTH_SECRET` oblige à reconnecter le service. Les connecteurs n’appellent que des adresses écrites dans le code.
- **Jamais d’email dans les journaux** : `logNewsletter()` n’accepte qu’une issue, un statut, une cause courte et un identifiant de file. `logging.serverFunctions` est désactivé dans `next.config.ts`, car Next journaliserait sinon les arguments des actions (donc l’email).
- Migrations : modifie le schéma Drizzle, puis `pnpm db:generate`. En production, le conteneur les applique lui-même au démarrage. N’édite jamais une migration déjà appliquée. Pendant une bascule de déploiement, deux conteneurs tournent en même temps : migrations et reprise de file doivent le tolérer.

## Pièges

- **Pas de redirection pour les liens publics.** Les `href` pointent vers l’URL stockée. Les clics partent en `sendBeacon` vers `/api/click`, qui détecte la provenance par le User-Agent (`src/lib/source.ts`). Une route `/go/…` déclencherait les alertes « lien dangereux » des réseaux.
- **`/` est dynamique mais lit le cache** : ne contourne pas `getPublicPage()` par une requête directe, sinon chaque visite touche la base (constitution VII.2). Ce qui dépend du visiteur (bouton « Modifier ma page » via `cb-owner`, onglet depuis l’ancre) se fait côté client après hydratation.
- **`headers()` avant `getAuth()`** dans tout code serveur qui lit la session ; toute page qui lit la base porte `dynamic = 'force-dynamic'` : sinon `next build` tente de pré-rendre la page et échoue sans base.
- **`exec()` de `src/lib/db/client.ts`** pour le SQL brut : postgres.js renvoie un tableau, PGlite `{ rows }`. `pgErrorCode()` lit le code PostgreSQL dans la chaîne des `cause` (Drizzle enveloppe l’erreur). Une FK `restrict` donne `23001`, pas `23503`.
- **`getDb()` et `getAuth()` sont paresseux** : rien ne doit se connecter à l’import d’un module, sinon le build sans base casse.
- **Les clics faits dans l’aperçu de l’admin ne sont pas comptés** (`window.top !== window.self`). Pour tester les stats, ouvre `/` dans un onglet normal.
- **Le rendu doit rester pur** pour éviter les erreurs d’hydratation : pas de compteur muté pendant le rendu (voir l’index d’animation dans `Feed`).
- **Grilles :** utilise `grid-template-columns: minmax(0, 1fr)` sur les conteneurs de rails horizontaux, sinon ils débordent sur mobile.
- **`revalidateTag` exige deux arguments en Next 16.** Dans une server action, utilise `updateTag`.
- **Coolify : pas de valeurs par défaut imbriquées** dans `docker-compose.yml` (`${SERVICE_…:-${…}}`). Hors Coolify, `init-env.sh` écrit les mêmes noms `SERVICE_*` dans `.env`.

## Conventions

- Interface en français, au tutoiement, avec les apostrophes et espaces typographiques du design (`’`, `« … »`, espace avant `:`).
- Commentaires en français, sobres, seulement quand le « pourquoi » n’est pas évident.
- Toute URL écrite passe par `isSafeUrl` / `normalizeUrl` (`src/lib/links.ts`). Seuls `https:`, `http:` et `mailto:` sont acceptés ; `https:` seulement pour la photo de profil.
- pnpm uniquement (`minimumReleaseAge` et `allowBuilds` dans `pnpm-workspace.yaml`).

## Branches

Une seule branche : `main`, étiquetée `vX.Y.Z` à chaque version. Les modifications passent par une branche de travail et une PR vers `main` ; la CI GitHub Actions tourne sur chaque PR.
