import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { processQueue } from '@/lib/newsletter/retry';
import { POST } from './route';

vi.mock('@/lib/newsletter/retry', () => ({ processQueue: vi.fn() }));

const SECRET = 'a'.repeat(64);
const req = (auth?: string) => new Request('http://localhost/api/newsletter/retry', { method: 'POST', headers: auth ? { Authorization: auth } : {} });

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('NEWSLETTER_RETRY_SECRET', SECRET);
  vi.mocked(processQueue).mockResolvedValue({ claimed: 2, sent: 1, lost: 0, retried: 1 });
});
afterEach(() => vi.unstubAllEnvs());

describe('POST /api/newsletter/retry', () => {
  it('401 sans Bearer, sans toucher à la file', async () => {
    expect((await POST(req())).status).toBe(401);
    expect(processQueue).not.toHaveBeenCalled();
  });

  it('401 avec un mauvais Bearer', async () => {
    expect((await POST(req('Bearer ' + 'b'.repeat(64)))).status).toBe(401);
    expect((await POST(req('Bearer court'))).status).toBe(401);
    expect(processQueue).not.toHaveBeenCalled();
  });

  it('200 avec le rapport quand le Bearer est bon', async () => {
    const res = await POST(req('Bearer ' + SECRET));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ claimed: 2, sent: 1, lost: 0, retried: 1 });
    expect(processQueue).toHaveBeenCalledWith({ limit: 10 });
  });

  it('404 sans NEWSLETTER_RETRY_SECRET : reprise externe désactivée', async () => {
    vi.stubEnv('NEWSLETTER_RETRY_SECRET', '');
    const res = await POST(req('Bearer ' + SECRET));
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('NEWSLETTER_RETRY_SECRET');
    expect(processQueue).not.toHaveBeenCalled();
  });

  it('502 si la file est illisible', async () => {
    vi.mocked(processQueue).mockRejectedValue(new Error('newsletter_claim : 42501'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect((await POST(req('Bearer ' + SECRET))).status).toBe(502);
  });
});
