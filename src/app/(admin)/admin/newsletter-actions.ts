'use server';

import {
  disconnectNewsletter as dbDisconnect,
  getNewsletterView,
  isProvider,
  saveNewsletterSettings,
  setNewsletterEnabled as dbSetEnabled,
  storedKey,
  type ProviderId,
} from '@/lib/db/queries/newsletter-settings';
import { connector } from '@/lib/newsletter/connectors';
import { ConnectorError, type Audience } from '@/lib/newsletter/connectors/types';
import type { ActionResult } from '@/lib/types';
import { done, fail, owned } from './action-helpers';

/* Page Newsletter de l'espace. Constitution VII.1 : requireOwner() d'abord (owned) ;
   VII.3 : la clé du service n'est jamais renvoyée, seules les adresses fixes des connecteurs
   sont appelées. */

const CHECK_TIMEOUT_MS = 5000;
const CHECKS_PER_MINUTE = 10;
let checks: number[] = [];

/** « Vérifier » appelle le service : limité, pour ne pas servir de relais vers son API. */
function takeCheck(now = Date.now()): boolean {
  checks = checks.filter((t) => now - t < 60_000);
  if (checks.length >= CHECKS_PER_MINUTE) return false;
  checks.push(now);
  return true;
}

/** Clé saisie (nettoyée), ou clé déjà enregistrée pour ce service si le champ est vide. */
async function keyFor(provider: ProviderId, raw: unknown): Promise<string | { error: string }> {
  const typed = String(raw ?? '').trim();
  const key = typed || (await storedKey(provider));
  if (!key) return { error: `Colle ta clé ${connector(provider).label}.` };
  const problem = connector(provider).checkKey(key);
  return problem ? { error: problem } : key;
}

async function audiencesOf(provider: ProviderId, key: string): Promise<Audience[] | { error: string }> {
  if (!takeCheck()) return { error: 'Trop de vérifications d’affilée. Patiente une minute.' };
  try {
    return await connector(provider).listAudiences(key, { timeoutMs: CHECK_TIMEOUT_MS });
  } catch (e) {
    if (e instanceof ConnectorError) return { error: e.message };
    throw e;
  }
}

export type CheckResult = { ok: true; audiences: Audience[] } | { ok: false; error: string };

/** Vérifie la clé auprès du service et renvoie ses listes (jamais la clé). */
export async function checkNewsletterKey(provider: ProviderId, key: string): Promise<CheckResult> {
  return owned<CheckResult>(async () => {
    if (!isProvider(provider)) return fail('Service inconnu.');
    const k = await keyFor(provider, key);
    if (typeof k !== 'string') return fail(k.error);
    const audiences = await audiencesOf(provider, k);
    if (!Array.isArray(audiences)) return fail(audiences.error);
    if (!audiences.length) return fail(`Aucune ${connector(provider).audienceLabel} dans ce compte ${connector(provider).label} : crée-en une, puis vérifie à nouveau.`);
    return { ok: true, audiences };
  }) as Promise<CheckResult>;
}

export type NewsletterInput = { provider: ProviderId; key?: string; audienceId: string; enabled: boolean };

/** Enregistre le service, sa clé (chiffrée) et la liste, après les avoir vérifiés auprès du service. */
export async function saveNewsletter(input: NewsletterInput): Promise<ActionResult> {
  return owned(async () => {
    if (!isProvider(input?.provider)) return fail('Choisis un service.');
    const audienceId = String(input.audienceId ?? '').trim();
    if (!audienceId) return fail(`Choisis une ${connector(input.provider).audienceLabel}.`);
    const key = await keyFor(input.provider, input.key);
    if (typeof key !== 'string') return fail(key.error);
    const audiences = await audiencesOf(input.provider, key);
    if (!Array.isArray(audiences)) return fail(audiences.error);
    const audience = audiences.find((a) => a.id === audienceId);
    if (!audience) return fail(`Cette ${connector(input.provider).audienceLabel} n’existe plus chez ${connector(input.provider).label}. Vérifie à nouveau.`);
    await saveNewsletterSettings({ provider: input.provider, key, audienceId, audienceName: audience.name, enabled: input.enabled === true });
    return done();
  });
}

/** Affiche ou masque l'inscription sur la page publique. */
export async function setNewsletterEnabled(enabled: boolean): Promise<ActionResult> {
  return owned(async () => {
    if (enabled === true) {
      const view = await getNewsletterView();
      if (!view.provider || view.keyUnreadable) return fail('Connecte d’abord un service.');
    }
    await dbSetEnabled(enabled === true);
    return done();
  });
}

/** Efface la clé et coupe l'inscription. */
export async function disconnectNewsletter(): Promise<ActionResult> {
  return owned(async () => {
    await dbDisconnect();
    return done();
  });
}
