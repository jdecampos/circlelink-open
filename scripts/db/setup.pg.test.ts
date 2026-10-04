import postgres from 'postgres';
import { afterAll, describe, expect, it } from 'vitest';
import { setupDatabase } from './setup';

// Initialisation au démarrage du conteneur : base, migrations, rôle applicatif. PostgreSQL réel
// (création de base et de rôle), d'où TEST_DATABASE_URL.
const url = process.env.TEST_DATABASE_URL;
const base = url ?? 'postgres://ignore@localhost/ignore'; // describe.skipIf évalue quand même le corps
const DB = 'circlelink_setup_test';
const ROLE = 'circlelink_app_setup_test';

const withDb = (u: string, db: string) => Object.assign(new URL(u), { pathname: '/' + db }).toString();
const asUser = (u: string, user: string, pw: string) => Object.assign(new URL(u), { username: user, password: pw }).toString();
const quiet = { max: 1, onnotice: () => {} } as const;

describe.skipIf(!url)('setupDatabase (PostgreSQL réel)', () => {
  const owner = withDb(base, DB);
  const admin = postgres(withDb(base, 'postgres'), quiet);
  const log: string[] = [];

  afterAll(async () => {
    await admin.unsafe(`drop database if exists ${DB} with (force)`);
    await admin.unsafe(`drop role if exists ${ROLE}`);
    await admin.end();
  });

  it('crée la base, les tables et le rôle applicatif sur un serveur vide', async () => {
    await admin.unsafe(`drop database if exists ${DB} with (force)`);
    await admin.unsafe(`drop role if exists ${ROLE}`);
    await setupDatabase({ migrationUrl: owner, appUrl: asUser(owner, ROLE, 'premier'), log: (m) => log.push(m) });

    const app = postgres(asUser(owner, ROLE, 'premier'), quiet);
    try {
      expect(await app`select count(*)::int as n from categories`).toEqual([{ n: 0 }]);
      await app`insert into categories (name, position) values ('Essai', 0)`;
      await expect(app.unsafe('create table intrus (id int)')).rejects.toThrow(/permission denied/);
      await expect(app.unsafe('truncate categories')).rejects.toThrow(/permission denied/);
    } finally {
      await app.end();
    }
    expect(log.join('\n')).toMatch(/base circlelink_setup_test créée/);
  });

  it('est rejouable et met à jour le mot de passe du rôle', async () => {
    await setupDatabase({ migrationUrl: owner, appUrl: asUser(owner, ROLE, 'second'), log: () => {} });
    const app = postgres(asUser(owner, ROLE, 'second'), quiet);
    try {
      expect(await app`select name from categories`).toEqual([{ name: 'Essai' }]);
    } finally {
      await app.end();
    }
  });

  it('refuse un nom de rôle qui ne serait pas un identifiant simple', async () => {
    await expect(setupDatabase({ migrationUrl: owner, appUrl: asUser(owner, 'x";drop', 'p'), log: () => {} })).rejects.toThrow(/nom de rôle/);
  });
});
