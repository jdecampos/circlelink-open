import { afterEach, describe, expect, it, vi } from 'vitest';

const page = { profile: { name: 'Alex', bio: '', handle: '' }, categories: [], links: [], newsletter: false };
vi.mock('./page-data', () => ({ getPage: async () => page }));

const { generateMetadata } = await import('./page');

afterEach(() => vi.unstubAllEnvs());

describe('métadonnées de la page publique', () => {
  it('suivent SITE_URL lue à chaque requête : une même image sert deux domaines', async () => {
    vi.stubEnv('SITE_URL', 'https://un.example.com');
    expect(String((await generateMetadata()).metadataBase)).toBe('https://un.example.com/');
    vi.stubEnv('SITE_URL', 'https://deux.example.com/');
    expect(String((await generateMetadata()).metadataBase)).toBe('https://deux.example.com/');
  });
});

describe('bloc newsletter', () => {
  it('suit le réglage de l’espace, lu dans les données en cache', async () => {
    const { default: Home } = await import('./page');
    expect((await Home()).props.data.newsletter).toBe(false);
    page.newsletter = true;
    expect((await Home()).props.data.newsletter).toBe(true);
  });
});
