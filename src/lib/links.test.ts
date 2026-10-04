import { describe, expect, it } from 'vitest';
import { isSafeUrl, normalizeUrl } from './links';

describe('isSafeUrl', () => {
  it('refuse les schémas dangereux', () => {
    expect(isSafeUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeUrl('data:text/html,<b>x</b>')).toBe(false);
  });

  it('accepte https, http et mailto', () => {
    expect(isSafeUrl('https://a.fr')).toBe(true);
    expect(isSafeUrl('http://a.fr/page')).toBe(true);
    expect(isSafeUrl('mailto:contact@example.com')).toBe(true);
  });
});

describe('normalizeUrl', () => {
  it('ajoute https:// quand le schéma manque', () => {
    expect(normalizeUrl(' tiktok.com/@moi ')).toBe('https://tiktok.com/@moi');
  });
});
