import { describe, expect, it } from 'vitest';
import { siteUrl } from './site';

describe('siteUrl', () => {
  it('lit SITE_URL à l’exécution, sans barre finale', () => {
    expect(siteUrl({ SITE_URL: 'https://a.example.com/' })).toBe('https://a.example.com');
    expect(siteUrl({ SITE_URL: 'https://b.example.com' })).toBe('https://b.example.com');
  });

  it('retombe sur localhost en développement', () => {
    expect(siteUrl({})).toBe('http://localhost:3000');
    expect(siteUrl({ SITE_URL: '  ' })).toBe('http://localhost:3000');
  });
});
