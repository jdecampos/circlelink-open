import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { openApiDocument } from './index';

const doc = openApiDocument();

describe('document OpenAPI', () => {
  it('décrit chaque méthode de chaque route de /api/v1', async () => {
    const files = readdirSync('src/app/api/v1', { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('route.ts') && !f.startsWith('openapi.json'));
    const expected: string[] = [];
    for (const f of files) {
      const mod: Record<string, unknown> = await import('../../../app/api/v1/' + f);
      const path = '/' + f.replace(/\/?route\.ts$/, '').replace(/\[(\w+)\]/g, '{$1}');
      for (const m of Object.keys(mod).filter((k) => /^[A-Z]+$/.test(k))) expected.push(m.toLowerCase() + ' ' + path);
    }
    const documented = Object.entries(doc.paths).flatMap(([p, ops]) => Object.keys(ops).map((m) => m + ' ' + p));
    expect(documented.sort()).toEqual(expected.sort());
  });

  it('chaque $ref pointe vers un composant défini', () => {
    const refs = [...JSON.stringify(doc).matchAll(/"\$ref":"#\/components\/(\w+)\/(\w+)"/g)];
    expect(refs.length).toBeGreaterThan(10);
    const components: Record<string, Record<string, unknown>> = doc.components;
    for (const [, kind, name] of refs) expect(components[kind]?.[name], kind + '/' + name).toBeDefined();
  });

  it('serveur et authentification', () => {
    // relatif : jamais l'URL d'un autre environnement (staging appellerait la production)
    expect(doc.servers[0].url).toBe('/api/v1');
    expect(doc.components.securitySchemes.bearerAuth).toMatchObject({ type: 'http', scheme: 'bearer' });
  });
});
