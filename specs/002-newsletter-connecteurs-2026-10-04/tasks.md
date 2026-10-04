# Tâches : newsletter par connecteurs

> Source : spec.md + plan.md
> États : [ ] pas commencée · [~] en cours · [x] faite (sur preuve)
> 🔑 = demande une décision ou un accès du mainteneur.

## Fondations

- [ ] T-001 — 🔑 Valider la spec (double opt-in, emplacement de la page)  (toutes)
      Fait quand : les deux lignes « À valider » des Clarifications sont tranchées.

- [ ] T-002 — Amender la constitution VII.3  (toutes)
      Fichiers : specs/constitution.md
      Fait quand : VII.3 couvre les clés saisies dans l’espace (chiffrées, jamais renvoyées, adresses fixes) avec un CONTRÔLE exécutable.

- [ ] T-003 — Chiffrement des clés  (US-002)
      Fichiers : src/lib/crypto/secret-box.ts (+ test)
      Fait quand : aller-retour testé ; un texte altéré ou un autre secret lève une erreur ; deux chiffrements du même texte diffèrent.

- [ ] T-004 — Table `newsletter_settings` et requêtes  (US-001, US-002)
      Fichiers : src/lib/db/schema/newsletter.ts, drizzle/0004_*.sql, src/lib/db/queries/newsletter-settings.ts (+ test)
      Fait quand : la base refuse `enabled = true` sans service ni liste ; la lecture renvoie la clé déchiffrée côté serveur seulement.

## Connecteurs

- [ ] T-005 — Interface, classement des réponses  (US-003)
      Fichiers : connectors/types.ts, classify.ts (+ test)
- [ ] T-006 — Brevo  (US-002, US-003, US-004)
- [ ] T-007 — Mailchimp  (US-002, US-003, US-004)
- [ ] T-008 — MailerLite  (US-002, US-003, US-004)
- [ ] T-009 — Kit  (US-002, US-003, US-004)
      Fait quand (chacun) : test de contrat sur `fetch` simulé : requêtes conformes à la documentation du service (URL, en-têtes, corps) ; 2xx, 401, 422/400, 429, 5xx et délai classés comme prévu ; la clé n’apparaît dans aucun message d’erreur.

## Branchement

- [ ] T-010 — Inscription et reprise par le connecteur actif  (US-001, US-003)
      Fichiers : deliver.ts, subscription.ts, retry.ts, start.ts, instrumentation.ts (+ tests)
      Fait quand : désactivé → refus sans appel ; service lent → file ; 401 → file + `key_rejected_at` ; reprise vers le service connecté ; deux conteneurs ne transmettent jamais deux fois (test PostgreSQL existant).

- [ ] T-011 — Page Newsletter de l’espace  (US-001, US-002)
      Fichiers : (admin)/admin/newsletter/*, newsletter-actions.ts, AdminSidebar.tsx, data.ts, types.ts
      Fait quand : chaque action refuse sans propriétaire (actions.test.ts) ; aucune réponse ne contient la clé ; parcours complet en navigateur (vérifier, choisir la liste, activer, voir le bloc sur `/`, désactiver) ; captures 390 et 1440 px.

- [ ] T-012 — Statistiques  (US-004)
      Fichiers : (admin)/admin/stats/*
      Fait quand : compte lu par le connecteur, « — · service indisponible » en cas d’échec, « Newsletter désactivée » sinon.

## Retrait et publication

- [ ] T-013 — Retrait de Mautic  (US-005)
      Fait quand : `git grep -i mautic -- src scripts docker-compose.yml .env.example README.md` ne remonte rien ; `brand.test.ts` interdit le terme ; test de mise à jour v1.0.1 → nouvelle image passe.

- [ ] T-014 — 🔑 Essai réel avec au moins un service  (US-003)
      Fait quand : un vrai compte (Brevo gratuit, par exemple) reçoit une inscription faite sur la page.

- [ ] T-015 — Documentation et version `v1.1.0`  (toutes)
      Fichiers : README.md, CHANGELOG.md
      Fait quand : le README explique la page Newsletter et où trouver la clé chez chaque service ; CI verte ; étiquette `v1.1.0`.
