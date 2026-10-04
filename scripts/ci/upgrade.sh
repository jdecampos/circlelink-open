#!/bin/sh
# Mise à jour N → N+1 (US-009) : démarre l'image N, écrit du contenu, la remplace par
# l'image N+1 sur le même volume, puis relit le contenu (page publique et base).
#   ./scripts/ci/upgrade.sh <image N> <image N+1>
set -eu

OLD="$1"
NEW="$2"
ID="cl-upgrade-$$"
PORT="${UPGRADE_PORT:-3999}"
OWNER_PW="upgrade-owner-pw"
APP_PW="upgrade-app-pw"
SECRET="$(openssl rand -hex 32)"
SITE="http://localhost:$PORT"

cleanup() {
  docker rm -f "$ID-app" "$ID-db" >/dev/null 2>&1 || true
  docker network rm "$ID" >/dev/null 2>&1 || true
  docker volume rm "$ID" >/dev/null 2>&1 || true
}
trap cleanup EXIT

psql() { docker exec -i "$ID-db" psql -U circlelink_owner -d circlelink -v ON_ERROR_STOP=1 -tA "$@"; }

wait_for() { # $1 : description, $2… : commande
  what="$1"; shift
  for _ in $(seq 1 90); do "$@" >/dev/null 2>&1 && return 0; sleep 2; done
  echo "échec : $what ne répond pas" >&2
  docker logs "$ID-app" 2>&1 | tail -30 >&2 || true
  exit 1
}

start_app() {
  docker rm -f "$ID-app" >/dev/null 2>&1 || true
  # Variables de la version N (BETTER_AUTH_URL) et N+1 (SITE_URL) : chacune ignore l'autre.
  docker run -d --name "$ID-app" --network "$ID" -p "$PORT:3000" \
    -e SITE_URL="$SITE" -e BETTER_AUTH_URL="$SITE" -e BETTER_AUTH_SECRET="$SECRET" \
    -e DATABASE_MIGRATION_URL="postgres://circlelink_owner:$OWNER_PW@$ID-db:5432/circlelink" \
    -e DATABASE_URL="postgres://circlelink_app:$APP_PW@$ID-db:5432/circlelink" \
    "$1" >/dev/null
  wait_for "$1" curl -sf "$SITE/api/health"
}

docker network create "$ID" >/dev/null
docker volume create "$ID" >/dev/null
docker run -d --name "$ID-db" --network "$ID" -v "$ID:/var/lib/postgresql" \
  -e POSTGRES_USER=circlelink_owner -e POSTGRES_PASSWORD="$OWNER_PW" -e POSTGRES_DB=circlelink \
  postgres:18-alpine >/dev/null
wait_for "PostgreSQL" docker exec "$ID-db" pg_isready -U circlelink_owner -d circlelink

echo "1. version N : $OLD"
start_app "$OLD"
psql <<'SQL' >/dev/null
insert into "user" (id, name, email, email_verified) values ('u-upgrade', 'Alex', 'alex@example.com', true);
insert into app_owner (email) values ('alex@example.com');
insert into profile (id, name, handle) values (1, 'Alex Martin', 'alex.martin');
insert into categories (id, name) values ('00000000-0000-0000-0000-00000000000a', 'Persistance');
insert into links (category_id, title, url) values ('00000000-0000-0000-0000-00000000000a', 'Lien écrit en version N', 'https://example.com/n');
insert into link_clicks (link_id) select id from links;
SQL
before="$(psql -c "select (select count(*) from links) || '/' || (select count(*) from link_clicks) || '/' || (select count(*) from app_owner)")"

echo "2. version N+1 : $NEW (même volume)"
start_app "$NEW"
after="$(psql -c "select (select count(*) from links) || '/' || (select count(*) from link_clicks) || '/' || (select count(*) from app_owner)")"
page="$(curl -sf "$SITE/")"

echo "   liens/clics/propriétaires avant : $before, après : $after"
[ "$before" = "$after" ] || { echo "échec : des données ont changé" >&2; exit 1; }
echo "$page" | grep -q "Lien écrit en version N" || { echo "échec : le lien n’apparaît plus sur la page" >&2; exit 1; }
echo "$page" | grep -q "Alex Martin" || { echo "échec : le profil n’apparaît plus sur la page" >&2; exit 1; }
if docker logs "$ID-app" 2>&1 | grep -q "Code d’installation"; then
  echo "échec : la version N+1 propose une installation alors qu’un propriétaire existe" >&2
  exit 1
fi
echo "mise à jour réussie : contenu, compte et statistiques gardés"
