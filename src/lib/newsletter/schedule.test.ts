import { afterEach, describe, expect, it, vi } from 'vitest';
import { RETRY_INTERVAL_MS, scheduleQueueRetry } from './schedule';

afterEach(() => vi.useRealTimers());

describe('reprise interne de la file', () => {
  it('tourne toutes les 15 minutes', async () => {
    vi.useFakeTimers();
    const run = vi.fn().mockResolvedValue(undefined);
    scheduleQueueRetry(run, () => {});
    expect(run).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(RETRY_INTERVAL_MS);
    expect(run).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(2 * RETRY_INTERVAL_MS);
    expect(run).toHaveBeenCalledTimes(3);
    expect(RETRY_INTERVAL_MS).toBe(15 * 60 * 1000);
  });

  it('ne se chevauche pas, et une erreur n’arrête pas la reprise', async () => {
    vi.useFakeTimers();
    let release!: () => void;
    const run = vi
      .fn()
      .mockImplementationOnce(() => new Promise<void>((r) => (release = r)))
      .mockRejectedValueOnce(new Error('Mautic injoignable'))
      .mockResolvedValue(undefined);
    const onError = vi.fn();
    scheduleQueueRetry(run, onError);
    await vi.advanceTimersByTimeAsync(2 * RETRY_INTERVAL_MS);
    expect(run).toHaveBeenCalledTimes(1); // le premier passage n'est pas fini
    release();
    await vi.advanceTimersByTimeAsync(RETRY_INTERVAL_MS);
    expect(onError).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(RETRY_INTERVAL_MS);
    expect(run).toHaveBeenCalledTimes(3);
  });
});
