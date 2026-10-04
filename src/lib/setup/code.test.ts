import type { PGlite } from '@electric-sql/pglite';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createTestDb } from '@/test/db';
import { generateSetupCode, hashSetupCode, normalizeSetupCode, prepareSetupCode, setupBanner, type Run } from './code';

let pg: PGlite;
let run: Run;
beforeAll(async () => {
  ({ pg } = await createTestDb());
  run = async (q, p) => (await pg.query<Record<string, unknown>>(q, p)).rows;
});
afterAll(() => pg.close());
beforeEach(async () => {
  await pg.exec('delete from app_setup; delete from app_owner;');
});

describe('code d’installation', () => {
  it('26 caractères sans ambiguïté, par groupes de 4, jamais deux fois le même', () => {
    const a = generateSetupCode();
    expect(a).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){6}[0-9A-HJKMNP-TV-Z]{2}$/);
    expect(generateSetupCode()).not.toBe(a);
  });

  it('se recopie sans souci de casse, de tirets ni de O/0', () => {
    expect(normalizeSetupCode(' 7kq2-o9pd ')).toBe('7KQ209PD');
    expect(hashSetupCode('7kq2 o9pd')).toBe(hashSetupCode('7KQ2-09PD'));
  });

  it('base vide : un code est journalisé, seule son empreinte est gardée', async () => {
    const code = await prepareSetupCode(run);
    expect(code).not.toBeNull();
    const rows = await run('select code_hash from app_setup');
    expect(rows).toEqual([{ code_hash: hashSetupCode(code!) }]);
    expect(JSON.stringify(rows)).not.toContain(normalizeSetupCode(code!));
  });

  it('un redémarrage sans propriétaire remplace le code', async () => {
    const first = await prepareSetupCode(run);
    const second = await prepareSetupCode(run);
    expect(second).not.toBe(first);
    expect(await run('select code_hash from app_setup')).toEqual([{ code_hash: hashSetupCode(second!) }]);
  });

  it('avec un propriétaire : aucun code, et l’ancien est effacé', async () => {
    await prepareSetupCode(run);
    await run(`insert into app_owner (email) values ('alex@example.com')`);
    expect(await prepareSetupCode(run)).toBeNull();
    expect(await run('select * from app_setup')).toEqual([]);
  });

  it('l’encadré donne l’adresse et le code', () => {
    const b = setupBanner('ABCD-EFGH', 'https://liens.example.com');
    expect(b).toContain('https://liens.example.com/installation');
    expect(b).toContain('Code d’installation : ABCD-EFGH');
  });
});
