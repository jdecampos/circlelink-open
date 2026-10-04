# Constitution du projet

> Ces principes sont NON-NÉGOCIABLES. Toute contribution doit les respecter, qu’elle vienne d’une personne ou d’un agent.
> Chaque article porte cinq champs. Le dernier, CONTRÔLE, est ce qui rend la règle opposable : il se vérifie par une commande ou un test.
> CircleLink est publié en open source depuis le 2026-10-04. Les dates ci-dessous sont celles du projet ouvert.

## Article I — Tests

DÉCISION  : Écris le test avant le code. Toute PR qui ajoute ou modifie un
            comportement ajoute d'abord le test qui le prouve, et le voit échouer.
DATE      : 2026-10-04
SYMPTÔME  : Choix initial du projet.
COÛT      : Sans test, une régression sur le comptage des clics, l'installation
            ou la connexion passe inaperçue jusqu'à ce qu'un visiteur ou les
            statistiques la révèlent, souvent des semaines plus tard.
CONTRÔLE  : `pnpm test` sort 0, et chaque PR contient au moins un fichier de test
            ajouté ou modifié. La CI lance aussi `pnpm test:pg` sur PostgreSQL 18.

## Article II — TypeScript

DÉCISION  : Type tout explicitement. N'utilise jamais `any`, ni `as any` ; préfère
            `unknown` puis un rétrécissement.
DATE      : 2026-10-04
SYMPTÔME  : Choix initial du projet.
COÛT      : Un `any` désactive le compilateur sur tout ce qu'il touche : des
            données non typées finissent dans l'interface sans contrôle.
CONTRÔLE  : `pnpm typecheck` sort 0 ; `grep -rnE ":\s*any\b|as any\b" src/`
            ne remonte rien.

## Article III — Taille du code

DÉCISION  : Garde chaque fichier de `src/` sous 200 lignes. Au-delà, découpe en
            composants ou fonctions nommés.
DATE      : 2026-10-04
SYMPTÔME  : Choix initial du projet.
COÛT      : Les gros fichiers mélangent rendu, état et effets ; chaque
            modification y risque un effet de bord.
CONTRÔLE  : `find src -name '*.ts*' -exec wc -l {} + | awk '$2 != "total" && $1 > 200'`
            ne remonte rien. Tout fichier touché par une PR repasse sous la limite.

## Article IV — Architecture

DÉCISION  : Chaque surface est un module isolé : `(public)`, `(auth)`, `(admin)`.
            Un module n'importe jamais un autre module ; le code partagé vit dans
            `src/lib` ou `src/components`.
DATE      : 2026-10-04
SYMPTÔME  : Choix initial du projet.
COÛT      : Un import croisé entre la page publique et l'admin fait embarquer du
            code d'admin dans le bundle public, et couple deux surfaces qui
            doivent évoluer séparément.
CONTRÔLE  : `grep -rnE "@/app/\(|from '\.\./\.\./\(" src/` ne remonte rien.

## Article V — Gestion des erreurs

DÉCISION  : Attrape les erreurs critiques (base, auth, réseau, configuration) et
            affiche un message en français qui nomme la cause. Une variable
            d'environnement obligatoire absente au démarrage est nommée dans
            l'erreur. Un `catch` volontairement muet porte un commentaire qui
            explique pourquoi.
DATE      : 2026-10-04
SYMPTÔME  : Choix initial du projet. Une instance installée par quelqu'un d'autre
            ne se débogue qu'à partir de ses journaux.
COÛT      : Une erreur avalée en silence fait croire à la propriétaire qu'un lien
            ou son profil est enregistré alors que rien n'est en base ; une
            variable manquante non nommée bloque une installation sans indice.
CONTRÔLE  : Toute action serveur renvoie `{ ok: false, error }` avec un message
            explicite (voir `dbError` dans `actions.ts`) ; `grep -rn -A1 "catch {" src`
            : chaque `catch` vide est suivi d'un commentaire ; le test de
            `src/lib/env.test.ts` vérifie que chaque variable obligatoire absente
            est nommée.

## Article VI — Liens publics sans redirection

DÉCISION  : Chaque lien de la page publique pointe directement vers sa vraie
            destination. N'ajoute jamais de route de redirection (`/go/…`, `/r/…`)
            ni de raccourcisseur ; le comptage des clics passe par `sendBeacon`
            vers `/api/click`, en arrière-plan.
DATE      : 2026-10-04
SYMPTÔME  : Choix initial du projet : TikTok, Instagram et Facebook affichent
            « lien dangereux » ou bloquent les liens qui passent par une
            redirection ou un domaine partagé.
COÛT      : Le lien en bio devient inutilisable sur les réseaux, ce qui est la
            raison d'être du produit.
CONTRÔLE  : `grep -rnE "redirect\(|NextResponse\.redirect|/go/" "src/app/(public)" src/app/api`
            ne remonte rien ; dans le HTML de `/`, chaque `href` de lien est l'URL
            stockée en base.

## Article VII — Principes additionnels

### VII.1 — Seul le propriétaire écrit

DÉCISION  : Toute écriture de l'admin passe par une action serveur dont la première
            instruction est `requireOwner()` : session Better Auth valide ET email
            présent dans `app_owner`. Une route de `/api/v1` n'écrit qu'après
            `requireApiOwner()` : clé API valide (comparée par son empreinte
            SHA-256, jamais stockée en clair) ET compte dont l'email est dans
            `app_owner`.
            Une seule écriture se fait sans session : l'installation
            (`install()`), une seule fois, tant qu'aucun propriétaire n'existe,
            avec le code d'installation écrit dans les journaux du conteneur
            (stocké en empreinte seulement, 5 essais par IP et par heure).
            Un visiteur n'écrit que deux choses : un clic sur un lien visible
            (`trackClick`) et une inscription newsletter (`enqueue`).
            L'application se connecte à PostgreSQL avec le rôle `circlelink_app`,
            qui lit et écrit les données mais ne peut ni modifier le schéma ni
            créer de rôle. Les contraintes de données (formats, longueurs,
            unicités) restent portées par la base.
DATE      : 2026-10-04
SYMPTÔME  : Choix initial du projet. Une instance neuve n'a pas de propriétaire :
            sans code, le premier inconnu qui l'ouvre en prendrait le contrôle.
COÛT      : Une action sans `requireOwner()` laisse n'importe qui défigurer la
            page. Un rôle applicatif propriétaire du schéma transforme une
            injection SQL en perte totale de la base. Une installation rejouable
            permet de s'ajouter comme second propriétaire.
CONTRÔLE  : le test qui parcourt toutes les fonctions exportées de
            `src/app/(admin)/admin/actions.ts` et vérifie que, sans session
            propriétaire, chacune renvoie une erreur sans rien écrire, passe ;
            chaque route d'écriture de `/api/v1` répond 401 sans clé ou avec une
            clé inconnue, sans rien écrire (`src/app/api/v1/auth.test.ts`) ;
            les tests de `src/lib/setup/` vérifient qu'`install()` refuse un code
            faux, le 6ᵉ essai, et tout appel une fois un propriétaire créé ;
            connecté en `circlelink_app`, `create table t(x int)` et
            `create role r` échouent, et
            `select rolsuper from pg_roles where rolname = 'circlelink_app'` renvoie
            `false` (`scripts/db/setup.pg.test.ts`).

### VII.2 — Page publique servie depuis le cache

DÉCISION  : `/` ne lit pas la base à chaque visite : ses données viennent du
            cache de Next (tag `public-page`), invalidé par l'admin et l'API, et
            régénéré au plus toutes les heures. Pour un visiteur, la page ne fait
            aucun appel réseau lié à la connexion. N'utilise ni `cookies()`, ni
            `headers()`, ni `searchParams` dans le rendu de `(public)` : ce qui
            dépend du visiteur se fait côté client après hydratation.
DATE      : 2026-10-04
SYMPTÔME  : Choix initial du projet : le navigateur intégré de TikTok et
            d'Instagram est lent, une page qui attend la base s'affiche en retard.
            L'image Docker se construit sans base, donc `/` est dynamique : c'est
            le cache, pas le pré-rendu, qui évite la requête par visite.
COÛT      : Chaque visite déclenche une requête en base ; le premier affichage
            ralentit et la charge suit le trafic.
CONTRÔLE  : un test compte les requêtes : 20 rendus consécutifs de `/` déclenchent
            au plus 1 lecture du contenu en base ; pour un visiteur sans cookie, le
            journal réseau de `/` ne contient aucun appel à `/api/auth/*` ;
            `grep -rnE "cookies\(|headers\(\)|searchParams" "src/app/(public)"` ne
            remonte rien.

### VII.3 — Secrets et URLs sûrs

DÉCISION  : Aucune variable `NEXT_PUBLIC_*` : tout, y compris `SITE_URL`, est lu
            à l'exécution côté serveur, pour qu'une même image serve n'importe
            quel domaine. Les secrets ne sont ni des arguments de build, ni des
            fichiers de l'image, ni écrits dans le dépôt : ils sont générés par
            Coolify (`SERVICE_PASSWORD_*`) ou par `scripts/init-env.sh` dans un
            `.env` non versionné. N'accepte dans un `href` que les URL `https:`,
            `http:` et `mailto:`, et pour la photo de profil que `https:`,
            validées côté serveur et en base.
DATE      : 2026-10-04
SYMPTÔME  : Choix initial du projet. Une URL figée au build faisait annoncer le
            domaine de production par une instance de préproduction.
COÛT      : Un secret en `NEXT_PUBLIC_` part dans le bundle de chaque visiteur ; un
            secret passé au build reste dans une couche de l'image ; un secret
            versionné est public pour toujours. Une URL `javascript:` enregistrée
            devient une faille XSS sur la page publique.
CONTRÔLE  : `grep -rn NEXT_PUBLIC_ src Dockerfile .env.example` ne remonte rien ;
            `docker history --no-trunc` de l'image ne contient aucun secret ;
            `gitleaks detect` (CI) ne remonte rien sur tout l'historique ; chaque
            écriture d'URL dans `actions.ts` passe par `isSafeUrl` ; les
            contraintes `links_url_check` et `profile_avatar_url_check` existent
            en base.

### VII.4 — Aucune donnée personnelle dans le dépôt

DÉCISION  : Le dépôt ne contient ni donnée, ni nom, ni email, ni marque d'une
            personne ou d'une instance réelle. Les tests n'utilisent que des
            adresses `@example.com`. Le nom affiché vient du profil, à défaut
            « CircleLink ».
DATE      : 2026-10-04
SYMPTÔME  : Le projet est né comme l'instance d'une seule personne ; son code
            portait son email, sa marque et son contenu.
COÛT      : Une donnée personnelle publiée reste dans les forks et les caches ;
            une marque écrite en dur s'affiche sur l'instance de quelqu'un d'autre.
CONTRÔLE  : `src/lib/brand.test.ts` parcourt `src/`, `public/`, `docs/` et
            `README.md` et ne trouve aucun terme interdit ;
            `grep -rnoE "[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}" src scripts | grep -vi example.com`
            ne remonte rien.

---

## Checklist de validation

Avant chaque commit, on vérifie (cette liste est la somme des CONTRÔLE ci-dessus) :

- [ ] I — `pnpm test` sort 0 et la PR ajoute ou modifie un test
- [ ] II — `pnpm typecheck` sort 0 ; aucun `any` dans `src/`
- [ ] III — aucun fichier de `src/` ne dépasse 200 lignes
- [ ] IV — aucun import entre `(public)`, `(auth)` et `(admin)`
- [ ] V — chaque erreur remontée nomme sa cause ; chaque `catch` vide est commenté ; une variable manquante est nommée
- [ ] VI — aucune redirection côté public ; les `href` sont les URL en base
- [ ] VII.1 — actions de l'admin et routes de `/api/v1` refusées sans propriétaire ; `install()` refusée hors première installation ; `circlelink_app` ne peut pas modifier le schéma
- [ ] VII.2 — 20 rendus de `/` → au plus 1 lecture en base ; aucun appel `/api/auth/*` pour un visiteur ; pas d'API dynamique dans `(public)`
- [ ] VII.3 — aucune variable `NEXT_PUBLIC_*` ; aucun secret dans l'image ni dans le dépôt ; URL passées par `isSafeUrl`
- [ ] VII.4 — aucun terme interdit ni email réel dans le dépôt
