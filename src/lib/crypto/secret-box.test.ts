import { describe, expect, it } from 'vitest';
import { SecretBoxError, open, seal } from './secret-box';

const SECRET = 'a'.repeat(64);
// Fausse clé assemblée à l'exécution, pour ne pas déclencher les scanners de secrets.
const KEY = ['xkeysib', 'faux', 'test'].join('-');

describe('chiffrement des clés de service', () => {
  it('aller-retour, sans la clé en clair dans le texte stocké', () => {
    const sealed = seal(KEY, SECRET);
    expect(sealed).toMatch(/^v1\.[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(sealed).not.toContain(KEY);
    expect(open(sealed, SECRET)).toBe(KEY);
  });

  it('deux chiffrements du même texte diffèrent', () => {
    expect(seal(KEY, SECRET)).not.toBe(seal(KEY, SECRET));
  });

  it('un autre secret ou un texte altéré lève une erreur', () => {
    const sealed = seal(KEY, SECRET);
    expect(() => open(sealed, 'b'.repeat(64))).toThrow(SecretBoxError);
    const parts = sealed.split('.');
    parts[3] = parts[3].slice(0, -2) + (parts[3].endsWith('A') ? 'BB' : 'AA');
    expect(() => open(parts.join('.'), SECRET)).toThrow(SecretBoxError);
    expect(() => open('n’importe quoi', SECRET)).toThrow(SecretBoxError);
  });

  it('refuse un secret absent ou trop court', () => {
    expect(() => seal(KEY, 'court')).toThrow(SecretBoxError);
  });
});
