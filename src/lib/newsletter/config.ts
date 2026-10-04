import 'server-only';

export type NewsletterConfig = {
  mauticUrl: string;
  mauticUsername: string;
  mauticPassword: string;
  segmentAlias: string;
  /** Vide sauf si `requireRetrySecret` : seul l'endpoint de reprise en a besoin. */
  retrySecret: string;
};

type Env = Record<string, string | undefined>;

/** Lit la configuration serveur. L'erreur nomme la variable manquante, jamais une valeur. */
export function readConfig(env: Env = process.env, opts: { requireRetrySecret?: boolean } = {}): NewsletterConfig {
  const need = (name: string) => {
    const v = env[name]?.trim();
    if (!v) throw new Error(name + ' manquante');
    return v;
  };
  return {
    mauticUrl: need('MAUTIC_URL').replace(/\/+$/, ''),
    mauticUsername: need('MAUTIC_USERNAME'),
    mauticPassword: need('MAUTIC_PASSWORD'),
    segmentAlias: env.MAUTIC_SEGMENT_ALIAS?.trim() || 'circlelink-joignables',
    retrySecret: opts.requireRetrySecret ? need('NEWSLETTER_RETRY_SECRET') : (env.NEWSLETTER_RETRY_SECRET?.trim() ?? ''),
  };
}
