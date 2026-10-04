# Tâches : CircleLink open source, déployable en un clic

> Source : spec.md + plan.md
> États : [ ] pas commencée · [~] en cours · [x] faite (sur preuve)
> 🔑 = demande une décision ou un accès du mainteneur (GitHub, Coolify, licence).

## Prérequis

- [x] T-001 — Dupliquer le projet sans historique  (US-007)
      Fichiers : tout le dépôt
      Fait quand : `circlelink-open` contient `develop` (b40bd99) de `circlelink`, sans `.git` d’origine ; les specs 001 à 003 de `circlelink` n’y sont pas ; `git log` de la copie part d’un premier commit neuf.

- [x] T-002 — 🔑 Choisir la licence et le nom du dépôt public  (US-008)
      Fichiers : LICENSE, spec.md
      Fait quand : licence MIT, fichier `LICENSE` à la racine ; dépôt public `circlelink-open`.

- [x] T-003 — Réécrire la constitution pour un projet ouvert  (toutes)
      Fichiers : specs/constitution.md
      Fait quand : plus de nom de personne ni de référence aux features de `circlelink` ; VII.1 couvre l’installation (seule écriture sans session, une fois, avec le code) ; VII.3 : aucune variable publique ; chaque article garde un CONTRÔLE exécutable.

## Déploiement

- [x] T-004 — `docker-compose.yml` de production et compose de dev  (US-001, US-002)
      Fichiers : docker-compose.yml, compose.dev.yaml, Dockerfile, .env.example, scripts/init-env.sh, package.json
      Fait quand : `./scripts/init-env.sh http://localhost:3000 && docker compose up -d` donne `/api/health` = 200 sur une machine vierge ; `docker compose down && docker compose up -d` garde les données ; la base n’expose aucun port ; la syntaxe des variables magiques est vérifiée dans la doc Coolify du moment.

- [x] T-005 — `SITE_URL` à l’exécution  (US-001)
      Fichiers : src/lib/site.ts (+ test), robots.ts, sitemap.ts, (public)/page.tsx, auth/server.ts, auth/mail.ts, Dockerfile
      Fait quand : `grep -rn NEXT_PUBLIC_ src Dockerfile .env.example` ne remonte rien ; une même image servie avec deux `SITE_URL` différentes produit deux `og:url` différentes.

## Installation

- [x] T-006 — Table `app_setup`, code d’installation au démarrage  (US-003)
      Fichiers : src/lib/db/schema/setup.ts, drizzle/0003_*.sql, src/lib/setup/code.ts (+ test), scripts/db/migrate.ts
      Fait quand : sur une base vide, le démarrage journalise un code et n’en garde que l’empreinte ; avec un propriétaire, aucun code n’est créé.

- [x] T-007 — Écran `/installation` et action `install()`  (US-003 ; dépend de T-006)
      Fichiers : src/app/(auth)/installation/*, src/lib/setup/*.ts (+ tests), layouts (auth) et (admin)
      Fait quand : tests : code faux refusé ; 6ᵉ essai refusé ; succès → compte, `app_owner`, session, `app_setup` vide ; second appel → « déjà terminée » ; `/installation` → 404 ensuite ; deux appels simultanés ne créent qu’un propriétaire.

## Intégrations facultatives

- [x] T-008 — SMTP facultatif et réinitialisation en ligne de commande  (US-004)
      Fichiers : src/lib/features.ts, auth/server.ts, connexion/*, scripts/reset-password.ts, Dockerfile
      Fait quand : sans SMTP, l’écran de connexion n’a que le mot de passe et aucun appel au lien magique ne passe ; le script affiche un lien qui fonctionne et refuse un email inconnu.

- [x] T-009 — Mautic facultatif, reprise interne  (US-005)
      Fichiers : newsletter/config.ts, src/instrumentation.ts, (public)/LinkPage.tsx, page-data, stats
      Fait quand : sans Mautic, pas de bloc newsletter ni d’appel réseau, stats « Newsletter non configurée » ; avec Mautic, tous les tests newsletter existants passent ; la reprise interne tourne toutes les 15 min (horloge simulée).

## Marque et contenu

- [x] T-010 — Retirer les données et outils personnels  (US-007)
      Fichiers : supabase/, scripts/db/import*, .superset/, public/avatar.jpg, docs/, CLAUDE.md, AGENTS.md, tests
      Fait quand : ces fichiers n’existent plus ; les tests n’utilisent que `@example.com` ; `pnpm test` sort 0.

- [x] T-011 — Marque neutre, photo par URL, mention « Propulsé par »  (US-006)
      Fichiers : src/lib/brand.ts (+ test), cb.css, public/*, layouts, mail-layout.ts, profile (schéma, validate, API, Apparence)
      Fait quand : `brand.test.ts` ne trouve aucun terme interdit ; une photo `javascript:` ou `http:` est refusée par l’action et par la base ; l’initiale s’affiche sans photo ; captures avant/après de `/`, `/connexion`, `/admin` à 390 et 1440 px.

## Projet ouvert

- [x] T-012 — README, licence, contribution, sécurité, changelog  (US-008, US-009)
      Fichiers : README.md, LICENSE, CONTRIBUTING.md, SECURITY.md, CHANGELOG.md
      Fait quand : le README couvre Coolify, Docker, mise à jour, sauvegarde/restauration, SMTP, Mautic, API ; toutes les commandes sont en pnpm.

- [~] T-013 — CI GitHub Actions  (US-007, US-008)
      Fichiers : .github/workflows/ci.yml, pnpm-workspace.yaml
      Fait quand : sur une PR, lint, typecheck, test, test:pg, docker build et gitleaks passent ; `minimumReleaseAge: 1440` est écrit en clair.
      État (2026-10-04) : `.github/workflows/ci.yml` écrit, validé par actionlint ; chaque étape passe en local (pnpm 11, gitleaks 8.30.1 : 0 fuite sur 13 commits). Reste à la voir passer sur GitHub (T-016).

- [x] T-014 — Test de mise à jour N → N+1  (US-009 ; dépend de T-004)
      Fait quand : un script de CI démarre l’image de `main`, écrit du contenu, démarre l’image de la PR sur le même volume et relit le contenu.
      Preuve : `scripts/ci/upgrade.sh` (job `upgrade` de la CI) ; en local, image de 4d18776 (avant la spec) → image courante : liens, clics et propriétaire gardés, migration 0003 appliquée, aucun code d’installation.

## Publication

- [ ] T-015 — 🔑 Déploiement réel sur Coolify depuis le dépôt  (US-001)
      Fait quand : sur un Coolify de test, « Public Repository » → Docker Compose → Déployer → `/installation` → premier lien visible sur `/`, en moins de 10 minutes, sans autre saisie que le domaine.

- [ ] T-016 — 🔑 Publication du dépôt et `v1.0.0`  (US-007, US-008)
      Fait quand : `gitleaks detect` local ne remonte rien ; le dépôt GitHub public est créé vide puis poussé ; la CI passe sur `main` ; l’étiquette `v1.0.0` existe.
