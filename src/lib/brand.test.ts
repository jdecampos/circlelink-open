import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PRODUCT_NAME, displayName } from './brand';

// Constitution VII.4 et US-006 : aucune marque ni donnée d'une instance réelle dans le dépôt.
// Mautic : retiré par la spec 002, il ne doit pas revenir dans le code ni la documentation.
const FORBIDDEN = [/circle\s*builder/i, /circlebuilder\.fr/i, /circlelink\.fr/i, /kombiz/i, /lowkode/i, /j[ée]r[ée]my/i, /mautic/i];
const ROOTS = ['src', 'public', 'docs', 'README.md'];
const TEXT = /\.(tsx?|css|svg|md|json|txt|html|mjs|js)$/;

function files(path: string): string[] {
  try {
    if (statSync(path).isFile()) return [path];
  } catch {
    // dossier absent (docs/ facultatif) : rien à parcourir
    return [];
  }
  return readdirSync(path).flatMap((name) => files(join(path, name)));
}

describe('marque neutre', () => {
  it('aucun terme interdit dans src/, public/, docs/ ni README.md', () => {
    const hits: string[] = [];
    for (const f of ROOTS.flatMap(files).filter((f) => TEXT.test(f) && !f.endsWith('brand.test.ts'))) {
      const text = readFileSync(f, 'utf8');
      for (const re of FORBIDDEN) if (re.test(text)) hits.push(`${f} : ${re}`);
    }
    expect(hits).toEqual([]);
  });

  it('le nom affiché est celui du profil, à défaut CircleLink', () => {
    expect(displayName('Alex Martin')).toBe('Alex Martin');
    expect(displayName('  ')).toBe(PRODUCT_NAME);
    expect(displayName(undefined)).toBe('CircleLink');
  });
});
