# Spec : Newsletter par connecteurs (Brevo, Mailchimp, MailerLite, Kit)

> specs/002-newsletter-connecteurs-2026-10-04 · créé le 2026-10-04 · constitution : specs/constitution.md
> Point de départ : v1.0.1 (newsletter Mautic seulement, configurée par variables d’environnement).

## Contexte

**Utilisateurs cibles**
- La **propriétaire** de l’instance : elle a déjà un compte chez un service d’emailing (Brevo, Mailchimp, MailerLite, Kit) et veut que les inscrits de sa page y arrivent.
- Le **visiteur** de la page, qui s’inscrit.

**Problème à résoudre**
La newsletter ne parle qu’à Mautic, que peu de créatrices utilisent, et elle se configure par variables d’environnement : il faut redéployer, et savoir le faire. Personne ne peut brancher le service qu’il utilise déjà, ni couper le bloc d’inscription sans toucher au serveur.

**Objectifs (mesurables)**
- Brancher son service se fait **depuis l’espace**, sans redémarrer : choisir le service, coller sa clé API, choisir la liste, enregistrer. Moins de 2 minutes.
- Le bloc « Recevoir les nouveautés » s’active et se désactive **depuis l’espace**, effet immédiat sur la page publique.
- Quatre connecteurs à la sortie : **Brevo, Mailchimp, MailerLite, Kit**.
- Aucune clé de service n’apparaît en clair : ni en base, ni dans une réponse HTTP, ni dans les journaux.
- Mautic disparaît du code, de la configuration et de la documentation.

## Périmètre

**Inclus**
- Une page **Newsletter** dans l’espace : interrupteur, choix du service, clé API, liste de destination, test de connexion, déconnexion.
- Les connecteurs Brevo, Mailchimp, MailerLite et Kit, derrière une interface commune.
- Le stockage chiffré des clés saisies dans l’espace.
- La file d’attente et la reprise toutes les 15 minutes, gardées, branchées sur le connecteur actif.
- Le nombre d’inscrits de la liste dans les statistiques.
- Le retrait complet de Mautic.

**Exclus**
- Le double opt-in (email de confirmation envoyé par le service) : version suivante, voir Clarifications.
- Plusieurs services en même temps, plusieurs listes.
- La connexion OAuth (« Se connecter avec Mailchimp ») : la clé API suffit pour une instance auto-hébergée, OAuth demanderait une application déclarée chez chaque service.
- D’autres services (Sendinblue = Brevo ; Systeme.io, Substack, Beehiiv, ConvertKit v3…) : un connecteur par PR, sur la même interface.
- Le réglage de la newsletter par l’API `/api/v1` (elle porterait une clé de service).

## User stories

### US-001 : Activer ou couper l’inscription  (P1, bloqué par —)
En tant que propriétaire, je veux afficher ou masquer le bloc d’inscription depuis l’espace.

Critères d’acceptation :
- [ ] Espace → **Newsletter** : un interrupteur « Afficher l’inscription sur ma page ».
- [ ] Il ne peut être activé que si un service est connecté ; sinon il est désactivé, avec « Connecte d’abord un service ».
- [ ] Activé : la page publique affiche le bloc dans la seconde qui suit l’enregistrement (cache invalidé). Désactivé : le bloc disparaît, et l’action d’inscription refuse sans appel réseau.
- [ ] Une instance neuve démarre désactivée.

### US-002 : Connecter son service  (P1, bloqué par —)
En tant que propriétaire, je veux brancher le service que j’utilise déjà.

Critères d’acceptation :
- [ ] Je choisis Brevo, Mailchimp, MailerLite ou Kit ; pour chacun, un lien vers la page du service où créer la clé, et ce qu’elle doit pouvoir faire.
- [ ] Je colle la clé, puis « Vérifier » : CircleLink appelle le service, et affiche soit la liste de mes listes (Brevo : listes ; Mailchimp : audiences ; MailerLite : groupes ; Kit : tags), soit une erreur qui nomme la cause (« Clé refusée par Brevo », « Brevo ne répond pas »).
- [ ] Je choisis une liste et j’enregistre. La clé est chiffrée avant d’être écrite ; l’écran n’affiche ensuite que « Clé enregistrée · …a1b2 » (4 derniers caractères).
- [ ] « Déconnecter » efface la clé et coupe l’inscription.
- [ ] Changer de service remplace l’ancien ; les inscriptions en file partent vers le nouveau.

### US-003 : Les inscrits arrivent dans le service  (P1, bloqué par US-002)
En tant que propriétaire, je veux retrouver chaque inscrit dans ma liste.

Critères d’acceptation :
- [ ] Une inscription crée le contact dans la liste choisie, ou le met à jour s’il existe (sans doublon).
- [ ] La provenance (TikTok, Instagram…) est transmise quand le service sait la porter : tag `source-tiktok` chez Mailchimp ; ailleurs, elle reste dans les statistiques de CircleLink.
- [ ] Le visiteur a sa réponse en moins de 2 s. Si le service est lent ou en panne (délai, 429, 5xx), l’inscription part dans la file, retentée toutes les 15 minutes pendant 24 h, comme aujourd’hui.
- [ ] Clé refusée (401/403) : l’inscription part en file et la page Newsletter de l’espace affiche « Ton service refuse la clé : reconnecte-le ».
- [ ] Adresse refusée par le service (invalide, désinscrite définitivement, conformité) : pas de nouvel essai, le visiteur voit un message générique.

### US-004 : Voir le nombre d’inscrits  (P2, bloqué par US-002)
Critères d’acceptation :
- [ ] Statistiques : la carte « inscrits » affiche le nombre d’abonnés actifs de la liste, lu chez le service (délai 1,5 s), sinon « — · service indisponible ».
- [ ] Newsletter désactivée ou non connectée : « Newsletter désactivée ».

### US-005 : Plus de Mautic  (P1, bloqué par US-003)
Critères d’acceptation :
- [ ] Plus aucun fichier, variable (`MAUTIC_*`), test ni mention de Mautic dans `src/`, `scripts/`, `docker-compose.yml`, `.env.example`, `README.md` (test `brand.test.ts` étendu).
- [ ] Une instance v1.0.x qui avait Mautic démarre sans erreur ; la newsletter y est désactivée jusqu’à ce qu’un service soit connecté. Le CHANGELOG le dit.

## Articles de la constitution qui s’appliquent

- **I — Tests :** chaque connecteur a ses tests de contrat (requêtes envoyées, réponses du service simulées d’après sa documentation) ; chiffrement, interrupteur, refus sans propriétaire testés.
- **V — Erreurs :** chaque erreur nomme le service et la cause ; jamais la clé, jamais l’email de l’inscrit.
- **VII.1 :** les actions de la page Newsletter commencent par `requireOwner()` et entrent dans `actions.test.ts`.
- **VII.2 :** le drapeau « newsletter active » vit dans les données en cache de la page publique.
- **VII.3 (à amender) :** les clés de service saisies dans l’espace sont des secrets **stockés en base, chiffrés** (AES-256-GCM), jamais renvoyés au navigateur. Les appels sortants ne vont qu’aux adresses fixes des services (aucune URL saisie, donc pas de requête vers un serveur interne).

## Clarifications

| Question | Réponse |
|---|---|
| Garder Mautic comme connecteur ? | Non (décidé le 2026-10-04) : retrait complet. |
| Quels services d’abord ? | Brevo, Mailchimp, MailerLite, Kit (décidé le 2026-10-04). |
| Clé API ou OAuth ? | Clé API : chaque service la propose, et OAuth demanderait une application déclarée par instance. |
| Où vit la clé ? | En base, chiffrée avec une clé dérivée de `BETTER_AUTH_SECRET` (HKDF). Changer ce secret oblige à reconnecter le service : l’écran le signale. |
| Double opt-in ? | Pas en v1 (retenu le 2026-10-04, au lancement de l’implémentation) (inscription directe, comme avec Mautic). Mailchimp le permet par un simple statut `pending`, Brevo exige un modèle d’email : on l’ajoutera service par service. |
| Où est la page de réglage ? | Retenu le 2026-10-04 : une entrée « Newsletter » dans le menu de l’espace, entre « Profil & apparence » et « Statistiques ». |
