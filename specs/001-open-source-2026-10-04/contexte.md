# Contexte : d’où vient ce dépôt, ce qui est décidé

> Note de passation, écrite le 2026-10-04 à la fin de la session qui a créé ce dépôt.
> À lire avant de reprendre la spec 001. Ne contient aucun secret.

## Origine

`circlelink-open` est une copie de `circlelink` (dépôt privé, instance personnelle déployée sur Coolify), prise sur `develop` au commit `b40bd99`, **sans son historique Git** : aucun secret passé dans un ancien commit ne peut fuiter. `circlelink` continue de vivre à part, inchangé.

Ce que la copie contient déjà, hérité de `circlelink` :
- la page de liens, l’admin, Better Auth, PostgreSQL + Drizzle, la newsletter Mautic ;
- **l’API d’écriture par clé** (spec 003 de `circlelink`, en production depuis le 2026-10-04) : clé générée dans Admin → Apparence, routes `/api/v1/*`, doc Scalar sur `/api/docs`. Voir la section API de `CLAUDE.md` et du `README.md`.

Les specs 001 à 003 de `circlelink` n’ont pas été copiées : la numérotation repart à 001. Seule la constitution est gardée (à réécrire : T-003).

## Décisions prises (avec le mainteneur)

| Sujet | Décision | Pourquoi |
|---|---|---|
| Base de données | **PostgreSQL gardé**, pas SQLite | Le « un clic » vient d’un `docker-compose.yml` qui embarque PostgreSQL ; Coolify le déploie seul. SQLite ferait perdre les contraintes de la base (regex, JSON), le rôle limité `circlelink_app`, et exigerait un volume qu’on peut oublier. Il y aurait aussi deux conteneurs sur le même fichier pendant les bascules. |
| Licence | **MIT** | Objectif : que chacun puisse faire ce qu’il veut du code, y compris un produit fermé. AGPL écartée (oblige à publier les modifications). |
| Dépôt public | **`circlelink-open`** | — |
| Premier compte | Écran `/installation` + code à usage unique dans les journaux du conteneur | Dans `circlelink`, le compte propriétaire n’était créé **que** par l’import Supabase : une instance neuve n’avait aucun moyen d’avoir un propriétaire. Le code évite qu’un inconnu prenne l’instance avant sa propriétaire. |
| URL du site | `SITE_URL` lue à l’exécution | `NEXT_PUBLIC_SITE_URL` était figée au build. Sur staging, le site annonçait `https://circlelink.fr` (production). Elle n’est lue que côté serveur, donc rien n’empêche de la lire au démarrage. |
| Intégrations | SMTP et Mautic facultatifs | Sans SMTP : connexion par mot de passe, réinitialisation en ligne de commande. Sans Mautic : pas de bloc newsletter. |

## État d’avancement (mis à jour le 2026-10-04, fin de la seconde session)

- Faits et commités : T-001 à T-012, T-014. T-013 : CI écrite et vérifiée en local, reste à la voir passer sur GitHub.
- Restent, tous 🔑 : T-013 (exécution GitHub), T-015 (déploiement réel sur un Coolify de test), T-016 (publication et `v1.0.0`).
- **Avant de publier : l’historique Git contient encore des données personnelles.** Le commit de copie (`eecd47d`) et les suivants jusqu’à T-010 contiennent `public/avatar.jpg`, le seed Supabase, l’email du propriétaire dans les tests et la doc. `gitleaks` ne remonte aucun secret (13 commits), mais la spec (US-007) exige un historique sans donnée personnelle : publier un historique neuf (un commit orphelin `v1.0.0`, ou un squash), pas cet historique-ci.
- `pnpm test` (209 tests), `pnpm test:pg` (217), `pnpm typecheck`, `pnpm lint` passent ; le test de mise à jour (image de 4d18776 → image courante) passe.
- Deux fichiers dépassent encore 200 lignes (constitution III), hérités et non touchés : `LinkEditor.tsx` (334), `categories/page.tsx` (205).
- Décisions prises pendant la seconde session : pnpm 11 épinglé ; le compose ne référence que les variables `SERVICE_*` de Coolify (pas de défaut imbriqué), `init-env.sh` écrit ces mêmes noms ; la reprise newsletter tourne dans `instrumentation.ts` ; palette CircleLink « papier · encre · vert lien » (#2e7d67) et logo à deux anneaux ; URL du dépôt dans `src/lib/brand.ts` = `github.com/jdecampos/circlelink-open` (à confirmer à T-016).
- Dev local : `.env.development.local` (non versionné) contient un compte de test `dev@example.com`.

## À retenir de la session précédente

- **Coolify bascule en douceur** : pendant environ une minute après un déploiement, l’ancien et le nouveau conteneur répondent tous les deux. Un test juste après un push peut tomber sur l’ancienne version : relancer plusieurs requêtes avant de conclure. Les migrations et la reprise de la file newsletter doivent tolérer deux conteneurs en même temps.
- **Next 16** : hors server action, invalider le cache avec `revalidateTag(tag, { expire: 0 })` (`updateTag` n’existe que dans les actions). Lire `node_modules/next/dist/docs/` avant d’écrire du code Next (voir `AGENTS.md`).
- **Scalar** est chargé depuis jsDelivr, version épinglée avec empreinte SRI (`src/app/api/docs/route.ts`) : pour monter de version, recalculer l’empreinte.
- **pnpm** uniquement. `pnpm-workspace.yaml` doit porter `minimumReleaseAge: 1440` en clair (T-013).
- Les données personnelles ont quitté l’arbre (T-010, T-011), **pas l’historique** : voir ci-dessus.
- Titulaire du copyright dans `LICENSE` : Jérémy de Campos (confirmé le 2026-10-04). Publication : un commit orphelin `v1.0.0` ; l’historique de travail reste local, sur la branche `historique-prive`, jamais poussée.
