# Journal des modifications

Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/). Versions : [SemVer](https://semver.org/lang/fr/).

## [Non publié]

### Ajouté

- Newsletter par connecteurs : **Brevo, Mailchimp, MailerLite, Kit**, branchés depuis l’espace (Espace → Newsletter), clé API vérifiée auprès du service puis chiffrée en base.
- Interrupteur pour afficher ou masquer l’inscription sur la page, sans redémarrage.
- Logo personnalisable en haut à gauche de la page, un pour le thème clair et un pour le thème sombre (Profil & apparence → Logo ; champs `logo_url` et `logo_dark_url` de l’API).

### Modifié

- La mention « Propulsé par CircleLink » est toujours affichée en bas de la page : l’interrupteur de l’espace disparaît (et le champ `show_credit` de l’API).
- Formulaires : l’erreur d’un champ s’affiche à côté de son libellé, sans décaler la page ; l’aide de l’identifiant devient une icône.

### Retiré

- **Mautic** et ses variables `MAUTIC_*`. Après la mise à jour, la newsletter est désactivée tant qu’aucun service n’est connecté ; les inscriptions déjà en file sont gardées 24 h et partent vers le service connecté.

## [1.0.1]

### Modifié

- Écran d’installation et message de variable manquante : plus de référence à un hébergeur en particulier.

## [1.0.0] — première version publique

### Ajouté

- Déploiement en un clic sur Coolify : `docker-compose.yml` avec l’app, PostgreSQL 18 et un volume ; mots de passe, secret de session et domaine générés par Coolify.
- Déploiement Docker hors Coolify : `./scripts/init-env.sh <url>` puis `docker compose up -d`.
- Écran `/installation` : création du compte propriétaire au premier lancement, protégée par un code écrit dans les journaux du conteneur.
- Réinitialisation du mot de passe sans SMTP : `node scripts/reset-password.mjs <email>`.
- Photo de profil par URL, mention « Propulsé par CircleLink » désactivable, appel « Ajoute ton premier lien » sur une page vide.
- Reprise de la file newsletter par l’app elle-même, toutes les 15 minutes.
- Licence MIT, guides de contribution et de sécurité, CI GitHub Actions.

### Modifié

- L’URL du site (`SITE_URL`) est lue à l’exécution : une même image sert n’importe quel domaine. Plus aucune variable `NEXT_PUBLIC_*`.
- SMTP et Mautic deviennent facultatifs : sans SMTP, connexion par mot de passe ; sans Mautic, pas de bloc newsletter.
- Marque neutre : le nom affiché est celui du profil, à défaut « CircleLink ».

### Retiré

- Import depuis Supabase et données propres à une instance.
