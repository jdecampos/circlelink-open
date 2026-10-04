# Plan technique : CircleLink open source, déployable en un clic

> Spec : ./spec.md
> Constitution : ../constitution.md
> Point de départ : copie de `circlelink` (`develop`, b40bd99) dans `circlelink-open`, historique Git neuf, branche `main`.

## Vue d’ensemble

On garde la pile (Next.js 16, PostgreSQL 18, Drizzle, Better Auth) et on retire tout ce qui suppose une instance et une personne précises. Le « un clic » repose sur un `docker-compose.yml` qui embarque PostgreSQL et que Coolify sait déployer seul, en générant les secrets. Le démarrage du conteneur fait déjà le reste (base, migrations, rôle applicatif) ; on y ajoute la génération du code d’installation. Les variables deviennent toutes des variables d’exécution, et les intégrations (SMTP, Mautic) s’activent si leurs variables sont présentes.

## Décisions d’architecture

### 1. `docker-compose.yml` de production, variables magiques de Coolify

**Choix** : à la racine, deux services et un volume.

```yaml
services:
  app:
    build: .
    environment:
      SERVICE_URL_APP_3000:                        # Coolify : domaine de l'app
      SITE_URL: ${SERVICE_URL_APP:-${SITE_URL}}
      DATABASE_MIGRATION_URL: postgres://circlelink_owner:${SERVICE_PASSWORD_POSTGRES:-${POSTGRES_PASSWORD}}@db:5432/circlelink
      DATABASE_URL: postgres://circlelink_app:${SERVICE_PASSWORD_APPDB:-${APP_DB_PASSWORD}}@db:5432/circlelink
      BETTER_AUTH_SECRET: ${SERVICE_PASSWORD_64_AUTH:-${AUTH_SECRET}}
      SMTP_HOST: ${SMTP_HOST:-}                    # facultatives : visibles et éditables dans Coolify
      MAUTIC_URL: ${MAUTIC_URL:-}
    depends_on: { db: { condition: service_healthy } }
    healthcheck: GET /api/health
  db:
    image: postgres:18-alpine
    environment: { POSTGRES_USER: circlelink_owner, POSTGRES_PASSWORD: …, POSTGRES_DB: circlelink }
    volumes: [db-data:/var/lib/postgresql]
volumes: { db-data: {} }
```

- Le compose de développement actuel devient `compose.dev.yaml` (`pnpm db:up`), pour ne pas être pris par Coolify.
- La base n’expose aucun port : elle n’est joignable que par l’app.
- **Retenu à T-004** : pas de valeurs par défaut imbriquées (`${SERVICE_…:-${…}}`), que Coolify pourrait mal lire. Le compose ne référence que les variables `SERVICE_*` ; hors Coolify, `init-env.sh` écrit ces mêmes noms dans `.env`, plus `COMPOSE_FILE=docker-compose.yml:compose.port.yaml` pour publier le port 3000 (Coolify passe par son proxy et ne lit pas ce fichier). Syntaxe vérifiée le 2026-10-04 sur coolify.io/docs/knowledge-base/docker/compose.
- La syntaxe exacte des variables magiques (`SERVICE_URL_*` / `SERVICE_FQDN_*`, suffixe de port) est vérifiée sur la version de Coolify en cours au moment de T-004, puis testée par un vrai déploiement.

**Alternatives considérées** : SQLite ; base PostgreSQL créée à part dans Coolify (la situation actuelle) ; image publiée sur GHCR.
**Justification** : c’est le seul choix qui supprime l’étape manuelle sans réécrire la couche de données. L’image GHCR viendra en plus (P3), pour les hôtes qui ne construisent pas.

**Hors Coolify** : `scripts/init-env.sh <url>` écrit un `.env` avec `SITE_URL` et trois secrets tirés par `openssl rand`. Installation : `./scripts/init-env.sh https://mondomaine.fr && docker compose up -d`. La spec (US-002) est ajustée : deux commandes, aucune ligne à écrire à la main.

### 2. `SITE_URL` à l’exécution

**Choix** : `NEXT_PUBLIC_SITE_URL` est remplacée par `SITE_URL`, lue côté serveur uniquement (`src/lib/site.ts` : `siteUrl()`), dans `metadataBase`, `robots.ts`, `sitemap.ts`, les emails et la `baseURL` de Better Auth (`BETTER_AUTH_URL` devient facultative). L’`ARG` du `Dockerfile` disparaît.
**Justification** : une même image doit servir n’importe quel domaine. Les usages actuels sont tous côté serveur (vérifié : aucun composant client ne la lit). Les pages qui en dépendent sont déjà dynamiques.

### 3. Installation : code dans les journaux, écran `/installation`

**Choix** :
- Au démarrage (`scripts/db/migrate.ts`), si aucun propriétaire n’existe : tirage d’un code de 128 bits, empreinte SHA-256 écrite dans `app_setup`, code affiché en clair **une seule fois** dans les journaux, encadré pour être repérable. Un redémarrage sans propriétaire remplace le code.
- `src/app/(auth)/installation/` : formulaire code + email + nom + mot de passe → server action `install()`.
- `install()` vérifie dans une transaction : aucun propriétaire, code correct (comparaison des empreintes). Puis crée `user` + `account` (`providerId: 'credential'`, mot de passe haché avec `hashPassword` de `better-auth/crypto`), ajoute l’email à `app_owner`, efface `app_setup`, ouvre la session (`auth.api.signInEmail`).
- `src/proxy.ts` ne lit pas la base : la redirection vers `/installation` se fait dans les layouts `(auth)` et `(admin)` via `hasOwner()`, mise en cache (`unstable_cache`, tag `setup`).
- Limite d’essais : 5 par IP et par heure, en mémoire du processus. Suffisant avec un code de 128 bits ; documenté comme tel.

**Alternatives considérées** : variables `OWNER_EMAIL` + `OWNER_PASSWORD` (un mot de passe dans les variables de Coolify, et une étape manuelle de plus) ; premier venu propriétaire (prise de contrôle possible entre le déploiement et la première visite).

### 4. Intégrations facultatives

- **SMTP** : `mailEnabled()` (= `SMTP_HOST` et `SMTP_FROM` présents). Sans SMTP, Better Auth ne reçoit pas les plugins d’email ; l’écran de connexion reçoit `{ magicLink: false, reset: false }` de son layout serveur. `scripts/reset-password.ts` (compilé en `.mjs` dans l’image comme `migrate`) crée un jeton de réinitialisation et affiche le lien.
- **Mautic** : `newsletterEnabled()` (= `MAUTIC_URL`, `MAUTIC_USERNAME`, `MAUTIC_PASSWORD`). La page publique reçoit ce booléen dans les données mises en cache ; `Newsletter` n’est rendu que s’il est vrai.
- **Reprise de la file** : `src/instrumentation.ts` (`register()`, runtime Node) lance `processQueue` toutes les 15 min si la newsletter est active. La réservation `for update skip locked` protège déjà contre deux conteneurs simultanés. La route `/api/newsletter/retry` reste, facultative, pour qui préfère un déclenchement externe.

### 5. Marque neutre

- `src/lib/brand.ts` : `PRODUCT_NAME = 'CircleLink'`, URL du dépôt. Le nom affiché vient du profil.
- `profile` gagne `avatar_url` (URL `https:` validée par `isSafeUrl` et une contrainte en base) et `show_credit` (booléen, vrai par défaut).
- Thème : les tokens de `cb.css` changent de valeurs (nouvelle palette CircleLink), la structure et les classes restent. Logo, favicon, `public/email/logo.png` refaits. Police Nunito Sans gardée (licence OFL, notice dans `public/fonts/`).
- `src/lib/brand.test.ts` parcourt `src/`, `public/`, `docs/`, `README.md` et échoue sur la liste des termes interdits (US-006).

### 6. Nettoyage du dépôt

Retirés : `supabase/`, `scripts/db/import*`, `.superset/`, `public/avatar.jpg`, `SUPABASE_DB_URL`, `OWNER_EMAIL`, `docs/mise-en-ligne.md` (remplacé par le README). `CLAUDE.md` et `AGENTS.md` réécrits sans données personnelles. `pnpm-workspace.yaml` porte `minimumReleaseAge: 1440` et la liste explicite des paquets autorisés à lancer un script d’installation.

### 7. Publication

- Dépôt GitHub public `circlelink-open` créé **vide**, puis premier push depuis l’historique neuf, après `gitleaks detect` local.
- CI `.github/workflows/ci.yml` : pnpm (version épinglée par `packageManager`), lint, typecheck, `pnpm test`, `docker build`, gitleaks. Un second job lance `pnpm test:pg` avec un service PostgreSQL 18.
- Étiquette `v1.0.0` sur `main` à la fin de la spec.

## Fichiers

| Fichier | Rôle |
|---|---|
| `docker-compose.yml`, `compose.dev.yaml`, `Dockerfile`, `.env.example`, `scripts/init-env.sh` | Déploiement |
| `src/lib/site.ts` | `siteUrl()` à l’exécution |
| `src/lib/db/schema/setup.ts`, `drizzle/0003_*.sql` | Table `app_setup`, colonnes `avatar_url`, `show_credit` |
| `src/lib/setup/*.ts` (+ tests) | Code d’installation, `hasOwner()`, `install()` |
| `src/app/(auth)/installation/*` | Écran d’installation |
| `scripts/db/migrate.ts`, `scripts/reset-password.ts` | Démarrage, réinitialisation sans SMTP |
| `src/lib/auth/server.ts`, `src/lib/auth/mail.ts`, `src/app/(auth)/connexion/*` | SMTP facultatif |
| `src/lib/newsletter/config.ts`, `src/instrumentation.ts`, `src/app/(public)/*` | Mautic facultatif, reprise interne |
| `src/lib/brand.ts` (+ test), `src/styles/cb.css`, `public/*`, layouts | Marque neutre |
| `LICENSE`, `README.md`, `CONTRIBUTING.md`, `SECURITY.md`, `CHANGELOG.md`, `.github/` | Projet ouvert |
| `specs/constitution.md` | Réécriture |
