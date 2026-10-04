# Contribuer à CircleLink

Merci de vouloir améliorer CircleLink. Ce guide tient en une page.

## Avant de commencer

- Pour un bug : ouvre une *issue* avec les étapes pour le reproduire, ce que tu attendais, ce qui s’est passé (version, Coolify ou Docker).
- Pour une fonctionnalité : ouvre d’abord une *issue* pour en discuter. CircleLink reste volontairement simple : une page, une propriétaire, auto-hébergée.
- Une faille de sécurité ne se signale **pas** dans une issue publique : voir [SECURITY.md](SECURITY.md).

## Installer l’environnement

Prérequis : Docker, Node 22 ou plus, [pnpm](https://pnpm.io) (pas npm ni yarn : le dépôt n’a qu’un `pnpm-lock.yaml`).

```bash
pnpm install
cp .env.example .env.development.local   # puis BETTER_AUTH_SECRET=$(openssl rand -hex 32)
pnpm db:up && pnpm db:migrate
pnpm dev                                  # http://localhost:3000/installation, code affiché par db:migrate
```

## Les règles du projet

Elles sont dans [`specs/constitution.md`](specs/constitution.md). Chaque article a un **CONTRÔLE** qu’une PR doit passer. En bref :

1. **Test d’abord** : une PR qui change un comportement ajoute le test qui le prouve.
2. **TypeScript strict**, jamais `any`.
3. **Fichiers de `src/` sous 200 lignes.**
4. **Pas d’import entre `(public)`, `(auth)` et `(admin)`** : le code partagé va dans `src/lib` ou `src/components`.
5. **Erreurs en français**, qui nomment la cause.
6. **Aucune redirection** sur les liens publics.
7. **Seule la propriétaire écrit**, la page publique lit le cache, aucun secret ni variable `NEXT_PUBLIC_*`, aucune donnée personnelle (tests en `@example.com`).

L’interface est en français, au tutoiement, avec les apostrophes et espaces typographiques (`’`, `« … »`, espace avant `:`).

## Proposer une modification

1. Pars de `develop` : `git switch -c ma-correction develop`.
2. Vérifie avant de pousser :
   ```bash
   pnpm lint && pnpm typecheck && pnpm test && pnpm test:pg
   ```
3. Si tu modifies le schéma (`src/lib/db/schema/`) : `pnpm db:generate`, et commite la migration créée dans `drizzle/`. Ne modifie jamais une migration déjà publiée.
4. Ajoute une ligne à la section « Non publié » de [CHANGELOG.md](CHANGELOG.md).
5. Ouvre la PR vers `develop`. La CI relance tout, construit l’image Docker et cherche des secrets (gitleaks).

En contribuant, tu acceptes que ton code soit publié sous [licence MIT](LICENSE).
