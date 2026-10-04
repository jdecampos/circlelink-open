# Sécurité

## Signaler une faille

Ne publie pas de faille dans une *issue* : elle serait visible de tous avant d’être corrigée.

Utilise le **signalement privé de GitHub** : onglet **Security** du dépôt → **Report a vulnerability**. Décris la faille, les étapes pour la reproduire et son impact. Tu recevras une réponse sous 7 jours ; un correctif et une version sont publiés dès que possible, puis la faille est rendue publique avec ton accord et ton nom si tu le souhaites.

## Versions suivies

Seule la dernière version publiée (étiquette `vX.Y.Z` sur `main`) reçoit des correctifs de sécurité. Mets ton instance à jour en redéployant (voir le README).

## Ce qui est dans le périmètre

- prendre la main sur une instance sans le compte propriétaire (écriture sans session, contournement de l’installation, de la clé API) ;
- lire ou modifier des données d’une instance (injection SQL, XSS sur la page publique) ;
- obtenir un secret de l’instance ou un email d’inscrit.

## Bonnes pratiques pour ton instance

- Garde le code d’installation pour toi : il ne sert qu’une fois, au premier lancement.
- Sers ta page en HTTPS (Coolify le fait seul).
- Ne publie pas le port de la base : le `docker-compose.yml` ne l’expose pas.
- Mets ton instance à jour.
