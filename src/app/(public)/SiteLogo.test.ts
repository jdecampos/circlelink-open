import { describe, expect, it } from 'vitest';
import { logoFor } from './SiteLogo';

const L = 'https://cdn.example.com/logo.svg';
const D = 'https://cdn.example.com/logo-blanc.svg';

describe('logo en haut à gauche', () => {
  it('celui du thème de la page', () => {
    expect(logoFor({ theme: 'clair', logo_url: L, logo_dark_url: D })).toBe(L);
    expect(logoFor({ theme: 'sombre', logo_url: L, logo_dark_url: D })).toBe(D);
  });

  it('à défaut, celui de l’autre thème ; sinon rien (logo de CircleLink)', () => {
    expect(logoFor({ theme: 'sombre', logo_url: L, logo_dark_url: '' })).toBe(L);
    expect(logoFor({ theme: 'clair', logo_url: '', logo_dark_url: D })).toBe(D);
    expect(logoFor({ theme: 'clair', logo_url: '', logo_dark_url: '' })).toBe('');
  });
});
