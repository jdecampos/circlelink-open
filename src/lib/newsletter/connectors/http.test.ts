import { describe, expect, it } from 'vitest';
import { classify, readOrThrow } from './http';
import { ConnectorError } from './types';

describe('classement des réponses des services', () => {
  it.each([
    [200, 'ok'],
    [201, 'ok'],
    [204, 'ok'],
    [408, 'retry'],
    [425, 'retry'],
    [429, 'retry'],
    [500, 'retry'],
    [503, 'retry'],
    [400, 'permanent'],
    [404, 'permanent'],
    [422, 'permanent'],
  ])('HTTP %i → %s', (status, kind) => {
    expect(classify({ status, json: null }).kind).toBe(kind);
  });

  it('401 et 403 : à réessayer, et la clé est signalée comme refusée', () => {
    expect(classify({ status: 401, json: null })).toEqual({ kind: 'retry', cause: 'clé refusée (HTTP 401)', keyRejected: true });
    expect(classify({ status: 403, json: null })).toMatchObject({ keyRejected: true });
  });

  it('délai et réseau : à réessayer', () => {
    expect(classify({ error: new DOMException('t', 'TimeoutError') })).toEqual({ kind: 'retry', cause: 'délai dépassé' });
    expect(classify({ error: new TypeError('fetch failed') })).toEqual({ kind: 'retry', cause: 'erreur réseau' });
  });

  it('les lectures lèvent une erreur qui nomme le service', () => {
    expect(() => readOrThrow({ status: 401, json: null }, 'Brevo')).toThrow('Clé refusée par Brevo');
    expect(() => readOrThrow({ status: 503, json: null }, 'Kit')).toThrow('Kit ne répond pas');
    expect(() => readOrThrow({ status: 404, json: null }, 'Mailchimp')).toThrow(ConnectorError);
    expect(readOrThrow({ status: 200, json: { a: 1 } }, 'Brevo')).toEqual({ a: 1 });
  });
});
