import { describe, expect, it } from 'vitest';
import { REQUIRED_ENV, envProblems } from './env';

const OK = {
  SITE_URL: 'https://liens.example.com',
  DATABASE_URL: 'postgres://circlelink_app:x@db:5432/circlelink',
  DATABASE_MIGRATION_URL: 'postgres://circlelink_owner:y@db:5432/circlelink',
  BETTER_AUTH_SECRET: 'a'.repeat(64),
};

describe('variables obligatoires', () => {
  it('rien à signaler quand tout est là', () => {
    expect(envProblems(OK)).toEqual([]);
  });

  it.each(REQUIRED_ENV)('%s absente : l’erreur la nomme', (name) => {
    const problems = envProblems({ ...OK, [name]: '' });
    expect(problems).toHaveLength(1);
    expect(problems[0]).toContain(name);
  });

  it('SITE_URL sans schéma est refusée', () => {
    expect(envProblems({ ...OK, SITE_URL: 'liens.example.com' })[0]).toMatch(/^SITE_URL invalide/);
  });

  it('secret trop court refusé', () => {
    expect(envProblems({ ...OK, BETTER_AUTH_SECRET: 'court' })[0]).toMatch(/^BETTER_AUTH_SECRET trop court/);
  });
});
