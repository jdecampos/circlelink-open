# Contracts : newsletter par connecteurs

## Actions serveur (espace, `requireOwner()` en premier)

```ts
// src/app/(admin)/admin/newsletter-actions.ts
checkNewsletterKey(provider: ConnectorId, key: string): Promise<{ ok: true; audiences: Audience[] } | { ok: false; error: string }>;
saveNewsletter(input: { provider: ConnectorId; key?: string; audienceId: string; enabled: boolean }): Promise<ActionResult>;
//   key absente : garde la clé déjà enregistrée (même service seulement)
setNewsletterEnabled(enabled: boolean): Promise<ActionResult>;
disconnectNewsletter(): Promise<ActionResult>;
```

Messages : « Clé refusée par Brevo : vérifie qu’elle est complète et active. », « Mailchimp ne répond pas. Réessaie dans un instant. », « Format de clé Mailchimp inattendu : elle se termine par -us21 (par exemple). », « Choisis une liste. », « Connecte d’abord un service. »

## Données de l’espace

```ts
// AdminData gagne :
newsletterSettings: { enabled: boolean; provider: ConnectorId | null; keyHint: string | null; audienceName: string | null; keyRejected: boolean; keyUnreadable: boolean };
```
Jamais la clé, ni chiffrée ni en clair.

## Page publique

`PageData.newsletter: boolean` (inchangé), calculé depuis `newsletter_settings`.

## Variables d’environnement

Retirées : `MAUTIC_URL`, `MAUTIC_USERNAME`, `MAUTIC_PASSWORD`, `MAUTIC_SEGMENT_ALIAS`. Inchangée : `NEWSLETTER_RETRY_SECRET` (facultative).
