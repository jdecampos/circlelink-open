# Spec : CircleLink open source, déployable en un clic

> specs/001-open-source-2026-10-04 · créé le 2026-10-04 · constitution : specs/constitution.md
> Point de départ : copie de `circlelink` (`develop`, b40bd99), sans historique Git.

## Contexte

**Utilisateurs cibles**
- La **personne qui installe** : créatrice, coach, formateur… Elle a un serveur Coolify (ou n’importe quel hôte Docker), mais ne veut ni créer une base à la main, ni lire du code.
- La **propriétaire de l’instance**, une fois installée : elle gère sa page dans l’admin, comme aujourd’hui.
- Le **contributeur** qui clone le dépôt pour corriger ou proposer une fonctionnalité.

**Problème à résoudre**
CircleLink est taillé pour une seule instance : celle de Jérémy. Le compte propriétaire n’est créé que par l’import depuis Supabase, l’email `jeremy@kombiz.fr` et la marque Circle Builder sont écrits dans le code, Mautic et le SMTP sont obligatoires, la base PostgreSQL se crée à la main dans Coolify, et l’URL du site est figée au build de l’image. Personne d’autre ne peut l’installer.

**Objectifs (mesurables)**
- Sur Coolify, une installation demande **au plus 3 actions** : choisir le dépôt, renseigner le domaine, déployer. Aucune base, aucune variable obligatoire à créer à la main.
- Hors Coolify, deux commandes suffisent (`./scripts/init-env.sh <url>` puis `docker compose up -d`), sans écrire de secret à la main.
- De « Déployer » à « ma page affiche mon premier lien » : **moins de 10 minutes**.
- Sans SMTP ni Mautic, toutes les fonctions principales marchent : page, admin, connexion par mot de passe, statistiques, API.
- Le dépôt ne contient **aucune donnée personnelle** ni aucun secret, historique compris.
- Une nouvelle version s’installe en redéployant : migrations appliquées seules, données gardées.

## Périmètre

**Inclus**
- Un `docker-compose.yml` de production (app + PostgreSQL + volume), compatible avec les variables magiques de Coolify.
- Le premier lancement : un écran `/installation` qui crée le compte propriétaire, protégé par un code d’installation affiché dans les journaux du conteneur.
- L’URL du site lue à l’exécution (`SITE_URL`) au lieu d’être figée au build.
- SMTP facultatif ; Mautic facultatif ; reprise de la file newsletter faite par l’app elle-même, sans tâche planifiée à créer.
- Une marque neutre et configurable : nom du site, photo de profil par URL.
- Le retrait de tout ce qui est propre à l’instance de Jérémy : import Supabase, contenu, photo, email, outils personnels.
- La licence, le README d’installation, les guides de contribution et de sécurité, une CI GitHub Actions.
- La réécriture de la constitution pour un projet ouvert.

**Exclus**
- Le passage à SQLite (voir Clarifications).
- Plusieurs propriétaires ou plusieurs pages par instance.
- La traduction de l’interface : elle reste en français.
- D’autres fournisseurs de newsletter que Mautic (Brevo, webhook…) : une spec suivante.
- L’envoi de fichiers (photo stockée sur le serveur).
- Une offre hébergée (SaaS).

## User stories

### US-001 : Déployer sur Coolify en un clic  (P1, bloqué par —)
En tant que personne qui installe, je veux choisir le dépôt dans Coolify et déployer afin d’avoir ma page sans rien configurer d’autre.

Critères d’acceptation :
- [ ] Dans Coolify, « Public Repository » → l’URL du dépôt → type « Docker Compose » → Déployer : l’app et sa base démarrent, `/api/health` répond 200.
- [ ] Les mots de passe de la base et le secret d’authentification sont générés par Coolify (`SERVICE_PASSWORD_*`), jamais écrits dans le dépôt.
- [ ] Le domaine choisi dans Coolify devient l’URL du site (`SERVICE_FQDN_*`) : liens des emails, balises de partage, `robots.txt`, sitemap.
- [ ] Les données survivent à un redéploiement et à un redémarrage du serveur (volume nommé).
- [ ] Le rôle applicatif limité (`circlelink_app`) est créé au démarrage, comme aujourd’hui (constitution VII.1).

### US-002 : Déployer sans Coolify  (P1, bloqué par US-001)
En tant que personne qui installe ailleurs, je veux lancer CircleLink avec Docker seul.

Critères d’acceptation :
- [ ] `./scripts/init-env.sh https://mondomaine.fr` écrit un `.env` avec `SITE_URL` et des secrets tirés au hasard ; `docker compose up -d` démarre l’app sur le port 3000.
- [ ] Relancer `init-env.sh` sur un `.env` existant refuse de l’écraser (les secrets de la base y sont liés).
- [ ] Sans `.env`, le démarrage échoue avec un message qui nomme la variable manquante (constitution V).
- [ ] Le README donne la même procédure pour un VPS nu, en 5 commandes au plus.

### US-003 : Créer le compte propriétaire au premier lancement  (P1, bloqué par US-001)
En tant que personne qui vient d’installer, je veux créer mon compte afin d’accéder à l’admin.

Critères d’acceptation :
- [ ] Tant qu’aucun propriétaire n’existe, `/connexion` et `/admin` mènent à `/installation`.
- [ ] Au premier démarrage, le conteneur écrit dans ses journaux un code d’installation à usage unique. `/installation` exige ce code, un email et un mot de passe (8 caractères au moins).
- [ ] Le code est faux : refus, sans indiquer si un propriétaire existe déjà ; 5 essais par adresse IP et par heure.
- [ ] Le compte est créé, son email ajouté à `app_owner`, la session ouverte, puis direction `/admin`.
- [ ] Une fois un propriétaire créé, `/installation` répond 404 et le code est effacé. Les inscriptions restent fermées.
- [ ] Le code n’est stocké qu’en empreinte ; il n’apparaît jamais dans une réponse HTTP.

### US-004 : Se connecter sans SMTP  (P1, bloqué par US-003)
En tant que propriétaire sans serveur d’email, je veux me connecter par mot de passe.

Critères d’acceptation :
- [ ] Sans `SMTP_HOST`, l’écran de connexion n’affiche que le mot de passe : ni lien magique, ni « mot de passe oublié ».
- [ ] Avec les variables `SMTP_*`, les trois modes de connexion reviennent, sans redéployer l’image (lecture à l’exécution).
- [ ] Sans SMTP, un mot de passe oublié se réinitialise par une commande documentée dans le README (`docker compose exec app node scripts/reset-password.mjs <email>`), qui affiche un lien à usage unique valable 15 minutes.

### US-005 : Newsletter facultative  (P2, bloqué par —)
En tant que propriétaire sans Mautic, je veux une page qui fonctionne sans bloc newsletter cassé.

Critères d’acceptation :
- [ ] Sans variables `MAUTIC_*`, la page publique n’affiche pas le bloc « Recevoir les nouveautés », et la carte « inscrits » des stats indique « Newsletter non configurée ».
- [ ] Avec Mautic configuré, le comportement de la feature newsletter actuelle est inchangé.
- [ ] La file d’attente est retentée toutes les 15 minutes par l’app elle-même : plus de tâche planifiée Coolify ni de `NEWSLETTER_RETRY_SECRET` à créer.
- [ ] Deux conteneurs en même temps (bascule de déploiement) ne transmettent jamais deux fois la même inscription.

### US-006 : Une page à son nom, pas à celui de Circle Builder  (P1, bloqué par US-003)
En tant que propriétaire, je veux que ma page, mon admin et mes emails portent mon nom.

Critères d’acceptation :
- [ ] Aucune occurrence de « Circle Builder », de `circlebuilder.fr`, `circlelink.fr`, `kombiz`, `lowkode` ni de « Jérémy » dans `src/`, `public/`, `docs/` et `README.md` (test qui parcourt les fichiers).
- [ ] Le nom affiché dans les titres, l’admin et les emails est le nom du profil, à défaut « CircleLink ».
- [ ] Le profil accepte une photo par URL `https:` (validée comme toute URL) ; sans photo, l’initiale du nom, comme avant.
- [ ] Le pied de page affiche « Propulsé par CircleLink », lien vers le dépôt, désactivable dans Apparence.
- [ ] Le thème par défaut garde la structure du design actuel ; ses couleurs et son logo deviennent ceux de CircleLink.
- [ ] Une instance neuve affiche une page vide avec, pour la propriétaire connectée, un appel « Ajoute ton premier lien ».

### US-007 : Un dépôt public sans secret ni donnée personnelle  (P1, bloqué par US-006)
En tant que mainteneur, je veux publier le dépôt sans risque.

Critères d’acceptation :
- [ ] Le dépôt public part d’un historique neuf (pas celui de `circlelink`).
- [ ] `gitleaks detect` ne remonte rien, sur tout l’historique, avant la première publication et à chaque PR (CI).
- [ ] Sont retirés : `supabase/`, l’import Supabase (`scripts/db/import*`, `SUPABASE_DB_URL`), `public/avatar.jpg`, `.superset/`, les données d’exemple personnelles, les exemples qui citent de vraies personnes.
- [ ] Les tests n’utilisent que des adresses `@example.com`.

### US-008 : Documentation, licence, contribution  (P1, bloqué par US-001)
En tant que visiteur du dépôt, je veux comprendre ce qu’est CircleLink, l’installer et contribuer.

Critères d’acceptation :
- [ ] `LICENSE` (voir Clarifications), `README.md` (présentation, capture, installation Coolify et Docker, mise à jour, sauvegarde), `CONTRIBUTING.md`, `SECURITY.md` (signalement privé), `CHANGELOG.md`.
- [ ] Le README explique la sauvegarde et la restauration de la base en deux commandes (`pg_dump` / `psql`).
- [ ] La CI GitHub Actions lance, sur chaque PR : `pnpm install --frozen-lockfile`, lint, typecheck, tests, build de l’image Docker, gitleaks.
- [ ] Les versions sont étiquetées (`v1.0.0`…) ; le README dit comment passer d’une version à l’autre.

### US-009 : Mettre à jour son instance  (P2, bloqué par US-001)
En tant que propriétaire, je veux installer une nouvelle version sans perdre mes données.

Critères d’acceptation :
- [ ] Redéployer une version plus récente applique les migrations au démarrage et garde le contenu, les comptes, les clés API et les statistiques.
- [ ] Un test d’intégration démarre la version N, écrit du contenu, démarre la version N+1 sur le même volume et relit le contenu.

## Articles de la constitution qui s’appliquent

- **I — Tests :** l’installation (code, verrou après création, limite d’essais), le mode sans SMTP, le mode sans Mautic et la recherche de données personnelles ont chacun leur test.
- **V — Erreurs :** une variable manquante au démarrage nomme la variable ; une installation refusée nomme la cause sans rien révéler.
- **VII.1 — Seul le propriétaire écrit :** l’écran d’installation est la seule écriture possible sans session, une seule fois, avec le code.
- **VII.3 — Secrets :** `NEXT_PUBLIC_SITE_URL` disparaît : plus aucune variable publique. Aucun secret dans le dépôt ni dans l’image ; tous sont générés par Coolify ou fournis dans `.env`.
- **Constitution elle-même :** réécrite pour un projet ouvert : plus de nom de personne, dates d’origine du projet ouvert, contrôles inchangés quand ils restent valables.

## Clarifications

| Question | Réponse |
|---|---|
| SQLite au lieu de PostgreSQL ? | Non. Le « un clic » vient du `docker-compose.yml` qui embarque PostgreSQL. SQLite ferait perdre les contraintes de la base (regex, JSON), le rôle limité, et imposerait un volume que l’on peut oublier. |
| Nom du projet ? | **CircleLink**, dépôt public `circlelink-open`. |
| Licence ? | **MIT** (décidé le 2026-10-04) : chacun peut utiliser, modifier, revendre et héberger le code, y compris dans un produit fermé, en gardant la mention de copyright. La licence couvre le code, pas le nom. La police Nunito Sans garde sa licence OFL, jointe dans `public/fonts/`. |
| Branches ? | `main` (stable, étiquetée) et `develop`. Plus de `staging`/`master` propres à l’instance de Jérémy. |
| Langue ? | Interface en français. README en français, avec un résumé en anglais en tête. |
| Comment créer le premier compte ? | Écran `/installation` + code dans les journaux du conteneur. Évite qu’un inconnu qui ouvre l’instance avant sa propriétaire en prenne le contrôle. |
| Photo de profil ? | Par URL. L’envoi de fichier demanderait un stockage : exclu de cette version. |
| Que devient l’instance de Jérémy ? | `circlelink` reste un dépôt privé, inchangé. Elle pourra plus tard suivre la version ouverte. |
