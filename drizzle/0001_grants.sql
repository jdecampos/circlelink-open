-- Données et droits hors schéma Drizzle.

-- Ligne unique du compteur de pertes de la file newsletter.
insert into "newsletter_stats" ("id") values (1) on conflict do nothing;
--> statement-breakpoint

-- Rôle applicatif (constitution VII.1) : lecture et écriture des données, rien sur le schéma.
-- Le rôle est créé par scripts/db/bootstrap.sql ; s'il n'existe pas encore, le bootstrap
-- accordera ces mêmes droits.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'circlelink_app') then
    grant usage on schema public to circlelink_app;
    grant select, insert, update, delete on all tables in schema public to circlelink_app;
    grant usage, select on all sequences in schema public to circlelink_app;
    alter default privileges in schema public grant select, insert, update, delete on tables to circlelink_app;
    alter default privileges in schema public grant usage, select on sequences to circlelink_app;
  end if;
end $$;
