import { afterEach, describe, expect, it, vi } from 'vitest';
import { countSubscribers } from '@/lib/newsletter/mautic';
import StatsPage from './page';

vi.mock('@/lib/newsletter/mautic', () => ({ countSubscribers: vi.fn() }));

afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

describe('statistiques', () => {
  it('sans Mautic : aucun appel réseau, pas de compte d’inscrits', async () => {
    vi.stubEnv('MAUTIC_URL', '');
    expect((await StatsPage()).props.segmentCount).toBeNull();
    expect(countSubscribers).not.toHaveBeenCalled();
  });

  it('avec Mautic : le compte vient du segment', async () => {
    vi.stubEnv('MAUTIC_URL', 'https://m.example.com');
    vi.stubEnv('MAUTIC_USERNAME', 'u');
    vi.stubEnv('MAUTIC_PASSWORD', 'p');
    vi.mocked(countSubscribers).mockResolvedValue(42);
    expect((await StatsPage()).props.segmentCount).toBe(42);
  });
});
