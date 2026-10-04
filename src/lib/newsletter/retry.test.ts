import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { claimDue, purgeExpired, resolve } from '@/lib/db/queries/newsletter';
import { getActiveConnection } from '@/lib/db/queries/newsletter-settings';
import { deliver } from './deliver';
import { processQueue } from './retry';

vi.mock('./deliver', () => ({ deliver: vi.fn() }));
vi.mock('@/lib/db/queries/newsletter', () => ({ claimDue: vi.fn(), resolve: vi.fn(), purgeExpired: vi.fn() }));
vi.mock('@/lib/db/queries/newsletter-settings', () => ({ getActiveConnection: vi.fn() }));

const conn = { provider: 'brevo' as const, key: 'cle', audienceId: '7' };
const rows = [
  { id: 1, email: 'a@example.com', source: 'tiktok', attempts: 1 },
  { id: 2, email: 'b@example.com', source: 'instagram', attempts: 3 },
  { id: 3, email: 'c@example.com', source: 'direct', attempts: 2 },
  { id: 4, email: 'd@example.com', source: 'x', attempts: 1 },
];
let logs: unknown[][];

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(claimDue).mockResolvedValue(rows as Awaited<ReturnType<typeof claimDue>>);
  vi.mocked(resolve).mockResolvedValue();
  vi.mocked(getActiveConnection).mockResolvedValue(conn);
  logs = [];
  for (const m of ['log', 'info', 'warn', 'error'] as const) vi.spyOn(console, m).mockImplementation((...a) => void logs.push(a));
});
afterEach(() => {
  for (const r of rows) expect(JSON.stringify(logs)).not.toContain(r.email);
  vi.restoreAllMocks();
});

const resolves = () => vi.mocked(resolve).mock.calls;

describe('processQueue', () => {
  it('résout chaque ligne selon l’issue de la transmission', async () => {
    vi.mocked(deliver)
      .mockResolvedValueOnce({ kind: 'ok' })
      .mockResolvedValueOnce({ kind: 'permanent', cause: 'HTTP 422' })
      .mockResolvedValueOnce({ kind: 'retry', cause: 'HTTP 503' })
      .mockRejectedValueOnce(new Error('inattendu'));

    const report = await processQueue();

    expect(claimDue).toHaveBeenCalledWith(50);
    expect(deliver).toHaveBeenCalledWith(conn, { email: 'a@example.com', source: 'tiktok' }, { budgetMs: 5000 });
    expect(resolves()).toEqual([
      [1, 'sent', null],
      [2, 'lost', 'HTTP 422'],
      [3, 'retry', 'HTTP 503'],
      [4, 'retry', 'erreur inattendue'],
    ]);
    expect(report).toEqual({ claimed: 4, sent: 1, lost: 1, retried: 2 });
  });

  it('journalise l’identifiant de file, jamais l’email', async () => {
    vi.mocked(deliver).mockResolvedValue({ kind: 'permanent', cause: 'HTTP 400' });
    await processQueue();
    expect(logs.flat().map(String).join('\n')).toContain('"queueId":2');
  });

  it('remonte une erreur si la file est illisible', async () => {
    vi.mocked(claimDue).mockRejectedValue(Object.assign(new Error('forbidden'), { code: '42501' }));
    await expect(processQueue()).rejects.toThrow('newsletter_claim : 42501');
  });

  it('sans service connecté : ne réserve rien, purge seulement', async () => {
    vi.mocked(getActiveConnection).mockResolvedValue(null);
    expect(await processQueue()).toEqual({ claimed: 0, sent: 0, lost: 0, retried: 0 });
    expect(purgeExpired).toHaveBeenCalledOnce();
    expect(claimDue).not.toHaveBeenCalled();
    expect(deliver).not.toHaveBeenCalled();
  });
});
