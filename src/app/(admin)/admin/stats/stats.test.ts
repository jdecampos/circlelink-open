import { afterEach, describe, expect, it, vi } from 'vitest';
import { getActiveConnection } from '@/lib/db/queries/newsletter-settings';
import { connector } from '@/lib/newsletter/connectors';
import StatsPage from './page';

vi.mock('@/lib/db/queries/newsletter-settings', () => ({ getActiveConnection: vi.fn() }));
vi.mock('@/lib/newsletter/connectors', () => ({ connector: vi.fn() }));

const countSubscribers = vi.fn();
afterEach(() => vi.clearAllMocks());

describe('statistiques', () => {
  it('newsletter coupée : aucun appel réseau, pas de compte d’inscrits', async () => {
    vi.mocked(getActiveConnection).mockResolvedValue(null);
    expect((await StatsPage()).props.segmentCount).toBeNull();
    expect(connector).not.toHaveBeenCalled();
  });

  it('service connecté : le compte vient de sa liste', async () => {
    vi.mocked(getActiveConnection).mockResolvedValue({ provider: 'brevo', key: 'k', audienceId: '7' });
    vi.mocked(connector).mockReturnValue({ countSubscribers } as unknown as ReturnType<typeof connector>);
    countSubscribers.mockResolvedValue(42);
    expect((await StatsPage()).props.segmentCount).toBe(42);
    expect(countSubscribers).toHaveBeenCalledWith('k', '7', { timeoutMs: 1500 });
  });

  it('service injoignable : null (« service indisponible »)', async () => {
    vi.mocked(getActiveConnection).mockResolvedValue({ provider: 'kit', key: 'k', audienceId: '5' });
    vi.mocked(connector).mockReturnValue({ countSubscribers } as unknown as ReturnType<typeof connector>);
    countSubscribers.mockRejectedValue(new Error('Kit ne répond pas.'));
    expect((await StatsPage()).props.segmentCount).toBeNull();
  });
});
