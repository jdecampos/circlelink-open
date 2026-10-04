import 'server-only';
import type { SQL } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import * as schema from './schema';

/** Type commun aux pilotes postgres.js (app) et PGlite (tests). */
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

let instance: Db | null = null;

/** Base de l'application : rôle `circlelink_app` (DATABASE_URL), créée au premier appel. */
export function getDb(): Db {
  if (instance) return instance;
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL manquante');
  instance = drizzle(postgres(url, { max: 10, onnotice: () => {} }), { schema });
  return instance;
}

/** Tests uniquement : remplace la base par une base PGlite migrée. */
export function setDbForTests(db: Db | null) {
  instance = db;
}

/**
 * Requête SQL brute, pour ce que le constructeur ne sait pas exprimer
 * (insert … select partiel, for update skip locked). postgres.js renvoie un
 * tableau, PGlite un objet { rows } : on ramène les deux au tableau de lignes.
 */
export async function exec<T extends Record<string, unknown>>(query: SQL, db: Db = getDb()): Promise<T[]> {
  const result: unknown = await db.execute(query);
  if (Array.isArray(result)) return result as T[];
  const rows = (result as { rows?: unknown }).rows;
  return Array.isArray(rows) ? (rows as T[]) : [];
}

/** Code d'erreur PostgreSQL (23505 doublon, 23503 clé étrangère…), même enveloppé par Drizzle. */
export function pgErrorCode(e: unknown): string | null {
  for (let cur: unknown = e, i = 0; cur && i < 5; cur = (cur as { cause?: unknown }).cause, i++) {
    const code = (cur as { code?: unknown }).code;
    if (typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code)) return code;
  }
  return null;
}
