import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('./page-data', () => ({
  getPage: async () => ({ profile: { name: 'Alex', bio: '', handle: '' }, categories: [], links: [] }),
}));

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
  it('absent sans Mautic, présent avec', async () => {
    const { default: Home } = await import('./page');
    vi.stubEnv('MAUTIC_URL', '');
    expect((await Home()).props.data.newsletter).toBe(false);
    vi.stubEnv('MAUTIC_URL', 'https://m.example.com');
    vi.stubEnv('MAUTIC_USERNAME', 'u');
    vi.stubEnv('MAUTIC_PASSWORD', 'p');
    expect((await Home()).props.data.newsletter).toBe(true);
  });
});
