import { describe, expect, it } from 'vitest';
import { readConfig } from './config';

const full = {
  MAUTIC_URL: 'https://auto.exemple.fr/',
  MAUTIC_USERNAME: 'api-user',
  MAUTIC_PASSWORD: 'mot-de-passe-secret',
  NEWSLETTER_RETRY_SECRET: 'secret-de-reprise',
};

describe('readConfig', () => {
  it('lit la configuration et retire le / final de l’URL', () => {
    const c = readConfig(full, { requireRetrySecret: true });
    expect(c.mauticUrl).toBe('https://auto.exemple.fr');
    expect(c.retrySecret).toBe('secret-de-reprise');
  });

  it('nomme la variable manquante sans afficher les autres valeurs', () => {
    const { MAUTIC_URL: _omit, ...rest } = full;
    void _omit;
    expect(() => readConfig(rest)).toThrowError('MAUTIC_URL manquante');
    try {
      readConfig(rest);
    } catch (e) {
      expect(String(e)).not.toContain('mot-de-passe-secret');
      expect(String(e)).not.toContain('api-user');
    }
  });

  it('prend le segment circlelink-joignables par défaut', () => {
    expect(readConfig(full).segmentAlias).toBe('circlelink-joignables');
    expect(readConfig({ ...full, MAUTIC_SEGMENT_ALIAS: 'autre' }).segmentAlias).toBe('autre');
  });

  it('n’exige le secret de reprise que pour l’endpoint de reprise', () => {
    const { NEWSLETTER_RETRY_SECRET: _omit, ...rest } = full;
    void _omit;
    expect(readConfig(rest).retrySecret).toBe('');
    expect(() => readConfig(rest, { requireRetrySecret: true })).toThrowError('NEWSLETTER_RETRY_SECRET manquante');
  });
});
