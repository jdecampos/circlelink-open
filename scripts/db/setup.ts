// Initialisation de la base au démarrage du conteneur, sans aucune commande manuelle :
// 1. crée la base si elle n'existe pas ; 2. applique les migrations de drizzle/ ;
// 3. crée (ou met à jour) le rôle applicatif lu dans DATABASE_URL, avec ses seuls droits
//    sur les données (constitution VII.1). Rejouable à chaque démarrage.
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

type Options = { migrationUrl: string; appUrl?: string; migrationsFolder?: string; log?: (m: string) => void };

const quiet = { max: 1, onnotice: () => {} } as const;
const ROLE_RE = /^[a-z_][a-z0-9_]{0,62}$/;

const parts = (url: string) => {
  const u = new URL(url);
  return { user: decodeURIComponent(u.username), password: decodeURIComponent(u.password), db: decodeURIComponent(u.pathname.slice(1)) || 'postgres' };
};

async function ensureDatabase(url: string, log: (m: string) => void): Promise<void> {
  const sql = postgres(url, quiet);
  try {
    await sql`select 1`;
    return;
  } catch (e) {
    // 3D000 : la base n'existe pas ; toute autre erreur (mot de passe, réseau) remonte telle quelle
    if ((e as { code?: string }).code !== '3D000') throw e;
  } finally {
    await sql.end();
  }
  const { db } = parts(url);
  const admin = postgres(Object.assign(new URL(url), { pathname: '/postgres' }).toString(), quiet);
  try {
    const [{ q }] = await admin`select format('create database %I', ${db}::text) as q`;
    await admin.unsafe(q);
    log(`base ${db} créée`);
  } finally {
    await admin.end();
  }
}

async function ensureAppRole(sql: postgres.Sql, role: string, password: string): Promise<void> {
  const [{ exists }] = await sql`select exists (select 1 from pg_roles where rolname = ${role}) as exists`;
  const [{ q }] = exists
    ? await sql`select format('alter role %I password %L', ${role}::text, ${password}::text) as q`
    : await sql`select format('create role %I login password %L nosuperuser nocreatedb nocreaterole noinherit', ${role}::text, ${password}::text) as q`;
  await sql.unsafe(q);
  // lecture et écriture des données, rien sur le schéma (ni CREATE, ni TRUNCATE, ni DROP)
  const r = `"${role}"`;
  await sql.unsafe(`
    revoke create on schema public from public;
    revoke create on schema public from ${r};
    grant usage on schema public to ${r};
    grant select, insert, update, delete on all tables in schema public to ${r};
    grant usage, select on all sequences in schema public to ${r};
    alter default privileges in schema public grant select, insert, update, delete on tables to ${r};
    alter default privileges in schema public grant usage, select on sequences to ${r};
  `);
}

export async function setupDatabase({ migrationUrl, appUrl, migrationsFolder = 'drizzle', log = console.log }: Options): Promise<void> {
  const owner = parts(migrationUrl);
  const app = appUrl ? parts(appUrl) : null;
  if (app && app.user !== owner.user && !ROLE_RE.test(app.user)) throw new Error(`nom de rôle invalide dans DATABASE_URL : minuscules, chiffres et _ seulement`);

  await ensureDatabase(migrationUrl, log);
  const sql = postgres(migrationUrl, quiet);
  try {
    await migrate(drizzle(sql), { migrationsFolder });
    log('migrations : à jour');
    if (!app) return;
    if (app.user === owner.user) {
      log('attention : DATABASE_URL utilise le rôle propriétaire ; aucun rôle applicatif limité');
      return;
    }
    if (!app.password) throw new Error('mot de passe manquant dans DATABASE_URL');
    await ensureAppRole(sql, app.user, app.password);
    log(`rôle applicatif ${app.user} : prêt`);
  } finally {
    await sql.end();
  }
}
