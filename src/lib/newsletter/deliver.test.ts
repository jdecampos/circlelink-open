import { beforeEach, describe, expect, it, vi } from 'vitest';
import { markKeyRejected } from '@/lib/db/queries/newsletter-settings';
import { connector } from './connectors';
import { deliver } from './deliver';

vi.mock('@/lib/db/queries/newsletter-settings', () => ({ markKeyRejected: vi.fn() }));
vi.mock('./connectors', () => ({ connector: vi.fn() }));

const subscribe = vi.fn();
const conn = { provider: 'mailchimp' as const, key: 'cle', audienceId: 'abc' };
const sub = { email: 'marie@example.com', source: 'instagram' } as const;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(connector).mockReturnValue({ subscribe } as unknown as ReturnType<typeof connector>);
  vi.mocked(markKeyRejected).mockResolvedValue();
});

describe('deliver', () => {
  it('passe par le connecteur du service choisi, avec sa clé, sa liste et le budget', async () => {
    subscribe.mockResolvedValue({ kind: 'ok' });
    expect(await deliver(conn, sub, { budgetMs: 1500 })).toEqual({ kind: 'ok' });
    expect(connector).toHaveBeenCalledWith('mailchimp');
    expect(subscribe).toHaveBeenCalledWith('cle', 'abc', sub, { timeoutMs: 1500 });
    expect(markKeyRejected).not.toHaveBeenCalled();
  });

  it('clé refusée : l’espace est prévenu, l’issue reste « à réessayer »', async () => {
    subscribe.mockResolvedValue({ kind: 'retry', cause: 'clé refusée (HTTP 401)', keyRejected: true });
    expect(await deliver(conn, sub, { budgetMs: 1500 })).toMatchObject({ kind: 'retry' });
    expect(markKeyRejected).toHaveBeenCalledOnce();
  });
});
