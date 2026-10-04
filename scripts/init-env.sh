#!/bin/sh
# Prépare .env pour lancer CircleLink avec Docker, hors Coolify.
#   ./scripts/init-env.sh https://mondomaine.fr
#   docker compose up -d
# Les secrets sont tirés au hasard ; ne les modifie pas ensuite (la base est créée avec).
set -eu

cd "$(dirname "$0")/.."

url="${1:-}"
case "$url" in
  http://*|https://*) ;;
  *) echo "usage : $0 <url du site>   (par exemple https://mondomaine.fr)" >&2; exit 2 ;;
esac

if [ -e .env ]; then
  echo "erreur : .env existe déjà. Ses mots de passe sont ceux de la base : je ne l’écrase pas." >&2
  echo "Pour repartir de zéro : docker compose down -v (efface les données), puis supprime .env." >&2
  exit 1
fi

command -v openssl >/dev/null || { echo "erreur : openssl introuvable" >&2; exit 1; }

umask 077
cat > .env <<ENV
# Écrit par scripts/init-env.sh le $(date -u +%Y-%m-%d). Ne pas versionner.
# Mêmes noms que les variables générées par Coolify (voir docker-compose.yml).
COMPOSE_FILE=docker-compose.yml:compose.port.yaml
SERVICE_URL_APP=${url%/}
SERVICE_PASSWORD_POSTGRES=$(openssl rand -hex 24)
SERVICE_PASSWORD_APPDB=$(openssl rand -hex 24)
SERVICE_PASSWORD_64_AUTH=$(openssl rand -hex 32)

# Facultatif : emails de connexion (lien magique, mot de passe oublié)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
SMTP_FROM=

ENV

echo ".env écrit pour ${url%/}. Lance maintenant : docker compose up -d"
