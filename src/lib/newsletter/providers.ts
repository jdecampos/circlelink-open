import type { ProviderId } from '@/lib/db/queries/newsletter-settings';

/* Ce que l'espace affiche de chaque service : nom, nom de la liste chez lui, où créer la clé.
   Sans 'server-only' : lu aussi par la page Newsletter, côté navigateur. */

export type ProviderInfo = {
  id: ProviderId;
  label: string;
  /** Nom de la liste chez ce service, au singulier : « liste », « audience »… */
  audienceLabel: string;
  keyHelp: { url: string; text: string };
};

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  brevo: {
    id: 'brevo',
    label: 'Brevo',
    audienceLabel: 'liste',
    keyHelp: { url: 'https://app.brevo.com/settings/keys/api', text: 'Brevo → Paramètres → SMTP & API → Clés API → « Générer une nouvelle clé API » (elle commence par xkeysib-).' },
  },
  mailchimp: {
    id: 'mailchimp',
    label: 'Mailchimp',
    audienceLabel: 'audience',
    keyHelp: { url: 'https://admin.mailchimp.com/account/api/', text: 'Mailchimp → Profil → Extras → Clés API → « Créer une clé » (elle se termine par -us21, par exemple).' },
  },
  mailerlite: {
    id: 'mailerlite',
    label: 'MailerLite',
    audienceLabel: 'groupe',
    keyHelp: { url: 'https://dashboard.mailerlite.com/integrations/api', text: 'MailerLite → Intégrations → API → « Générer un nouveau jeton ».' },
  },
  kit: {
    id: 'kit',
    label: 'Kit',
    audienceLabel: 'tag',
    keyHelp: { url: 'https://app.kit.com/account_settings/developer_settings', text: 'Kit → Paramètres → Développeur → « Ajouter une clé API v4 ». Les inscrits reçoivent le tag choisi.' },
  },
};

export const PROVIDER_LIST = Object.values(PROVIDERS);
