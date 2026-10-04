import 'server-only';
import { PROVIDERS } from '../providers';
import { classify, num, readOrThrow, request } from './http';
import { ConnectorError, type Connector } from './types';

// Nouvelle API de MailerLite : https://developers.mailerlite.com/docs/
const BASE = 'https://connect.mailerlite.com/api';
const LABEL = PROVIDERS.mailerlite.label;
const headers = (key: string) => ({ Authorization: 'Bearer ' + key });

type Group = { id?: unknown; name?: unknown; active_count?: unknown };

async function groups(key: string, timeoutMs: number): Promise<Group[]> {
  const json = readOrThrow(await request(`${BASE}/groups?limit=100&sort=name`, { headers: headers(key), timeoutMs }), LABEL);
  const data = (json as { data?: Group[] } | null)?.data;
  return Array.isArray(data) ? data : [];
}

export const mailerlite: Connector = {
  ...PROVIDERS.mailerlite,

  checkKey: (key) => (key.length >= 40 ? null : 'Jeton MailerLite trop court : copie-le en entier.'),

  async listAudiences(key, { timeoutMs }) {
    return (await groups(key, timeoutMs)).map((g) => ({ id: String(g.id), name: String(g.name ?? g.id), count: Number.isFinite(Number(g.active_count)) ? Number(g.active_count) : null }));
  },

  async subscribe(key, audienceId, sub, { timeoutMs }) {
    // crée ou met à jour (opération non destructive), et ajoute au groupe sans retirer les autres
    return classify(await request(`${BASE}/subscribers`, { method: 'POST', headers: headers(key), body: { email: sub.email, groups: [audienceId] }, timeoutMs }));
  },

  async countSubscribers(key, audienceId, { timeoutMs }) {
    const group = (await groups(key, timeoutMs)).find((g) => String(g.id) === audienceId);
    if (!group) throw new ConnectorError('unexpected', `Le groupe choisi n’existe plus chez ${LABEL}.`);
    return num(group.active_count, LABEL);
  },
};
