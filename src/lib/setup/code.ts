// Code d'installation : tiré au démarrage du conteneur tant qu'aucun propriétaire n'existe.
// Pas de 'server-only' ni d'alias '@/' : importé par scripts/db/migrate.ts, exécuté par Node.
import { createHash, randomBytes } from 'node:crypto';

/** Base 32 de Crockford : ni I, L, O, U, rien à confondre en recopiant le code. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/** 130 bits (26 caractères), affichés par groupes de 4 : « 7KQ2-X9PD-… ». */
export function generateSetupCode(): string {
  let acc = 0;
  let bits = 0;
  let out = '';
  for (const b of randomBytes(17)) {
    acc = ((acc << 8) | b) & 0xfff; // au plus 12 bits utiles entre deux tours
    bits += 8;
    while (bits >= 5 && out.length < 26) {
      bits -= 5;
      out += ALPHABET[(acc >> bits) & 31];
    }
  }
  return out.match(/.{1,4}/g)!.join('-');
}

/** Tolère la casse, les tirets, les espaces, et O/I/L tapés à la place de 0/1. */
export function normalizeSetupCode(code: string): string {
  return code.toUpperCase().replace(/[^0-9A-Z]/g, '').replace(/O/g, '0').replace(/[IL]/g, '1');
}

export const hashSetupCode = (code: string) => createHash('sha256').update(normalizeSetupCode(code)).digest('hex');

/** Exécute une requête paramétrée et renvoie ses lignes (postgres.js au démarrage, PGlite en test). */
export type Run = (query: string, params?: unknown[]) => Promise<Record<string, unknown>[]>;

/**
 * Au démarrage : sans propriétaire, remplace le code (empreinte seule) et le renvoie en clair,
 * pour les journaux ; avec un propriétaire, efface tout code restant et renvoie null.
 */
export async function prepareSetupCode(run: Run): Promise<string | null> {
  const [{ owned }] = await run('select exists (select 1 from app_owner) as owned');
  if (owned) {
    await run('delete from app_setup');
    return null;
  }
  const code = generateSetupCode();
  await run(
    `insert into app_setup (id, code_hash) values (1, $1)
     on conflict (id) do update set code_hash = excluded.code_hash, created_at = now()`,
    [hashSetupCode(code)],
  );
  return code;
}

/** Encadré repérable dans les journaux du conteneur. */
export function setupBanner(code: string, site: string): string {
  const line = '─'.repeat(54);
  return [line, ' CircleLink : installation', ` Ouvre ${site}/installation`, ` Code d’installation : ${code}`, line].join('\n');
}
