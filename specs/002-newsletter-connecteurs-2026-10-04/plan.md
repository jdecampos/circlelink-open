# Plan technique : newsletter par connecteurs

> Spec : ./spec.md · Constitution : ../constitution.md

## Vue d’ensemble

La newsletter passe d’un client Mautic configuré par l’environnement à des **connecteurs** configurés depuis l’espace. Tout ce qui ne dépend pas du service reste : formulaire public, validation de l’email, détection de la provenance, budget de 1,5 s, file `newsletter_queue`, reprise toutes les 15 min (`instrumentation.ts`), purge à 24 h, compteur de pertes. Seul le dernier maillon change : `deliver()` appelle le connecteur actif au lieu de Mautic.

## Décisions d’architecture

### 1. Interface commune des connecteurs

```ts
// src/lib/newsletter/connectors/types.ts
export type ConnectorId = 'brevo' | 'mailchimp' | 'mailerlite' | 'kit';
export type Audience = { id: string; name: string; count: number | null };
export type Connector = {
  id: ConnectorId;
  label: string;              // « Brevo »
  audienceLabel: string;      // « liste », « audience », « groupe », « tag »
  keyHelp: { url: string; text: string };
  checkKey(key: string): string | null;                         // format, avant tout appel
  listAudiences(key: string, opts: Call): Promise<Audience[]>;  // « Vérifier »
  subscribe(key: string, audienceId: string, sub: Subscriber, opts: Call): Promise<DeliveryOutcome>;
  countSubscribers(key: string, audienceId: string, opts: Call): Promise<number>;
};
```

Un fichier par service dans `src/lib/newsletter/connectors/`, sous 200 lignes, avec son test de contrat (`fetch` simulé). Classement commun des réponses dans `classify.ts` : 2xx → `ok` ; 408, 425, 429, 5xx, délai, réseau → `retry` ; 401, 403 → `retry` avec cause `clé refusée` (et drapeau d’alerte) ; autres 4xx → `permanent`.

| Service | Base | Auth | Inscription | Listes | Compte |
|---|---|---|---|---|---|
| Brevo | `https://api.brevo.com/v3` | en-tête `api-key` | `POST /contacts` `{ email, listIds:[id], updateEnabled:true }` (201/204) | `GET /contacts/lists` | `GET /contacts/lists/{id}` → `uniqueSubscribers` |
| Mailchimp | `https://{dc}.api.mailchimp.com/3.0`, `dc` = suffixe de la clé (`^[a-z]+\d+$`) | Basic `anystring:clé` | `PUT /lists/{id}/members/{md5(email)}` `{ email_address, status_if_new:'subscribed', tags }` | `GET /lists` | `GET /lists/{id}` → `stats.member_count` |
| MailerLite | `https://connect.mailerlite.com/api` | `Authorization: Bearer` | `POST /subscribers` `{ email, groups:[id] }` (200/201) | `GET /groups` | `GET /groups/{id}` → `active_count` |
| Kit | `https://api.kit.com/v4` | en-tête `X-Kit-Api-Key` | `POST /subscribers` `{ email_address }` puis `POST /tags/{id}/subscribers` `{ email_address }` | `GET /tags` | `GET /tags?include=subscriber_count` (à vérifier à l’implémentation) |

Les URL sont des constantes du code : aucune adresse saisie par l’utilisatrice n’est appelée (pas de SSRF). Le `dc` de Mailchimp est validé par expression régulière avant de construire l’hôte.

### 2. Réglages et clé chiffrée

- Table `newsletter_settings` (ligne unique) : `enabled`, `provider`, `key_ciphertext`, `key_hint` (4 derniers caractères), `audience_id`, `audience_name`, `key_rejected_at`.
- `src/lib/crypto/secret-box.ts` : AES-256-GCM (`node:crypto`), clé dérivée de `BETTER_AUTH_SECRET` par HKDF-SHA256 (sel fixe, info `circlelink:newsletter-key`). Format stocké : `v1.<iv>.<tag>.<chiffré>` en base64url. Déchiffrement impossible (secret changé) → réglage traité comme « déconnecté », message dans l’espace.
- La clé ne quitte jamais le serveur après enregistrement : les données de l’espace n’exposent que `{ enabled, provider, keyHint, audienceName, keyRejected }`.

### 3. Page Newsletter de l’espace

- `/admin/newsletter` (nouvelle entrée de `NAV`) : interrupteur, choix du service (4 cartes), champ clé + « Vérifier », choix de la liste, « Enregistrer », « Déconnecter ».
- Actions serveur dans `src/app/(admin)/admin/newsletter-actions.ts` (actions.ts approche les 200 lignes) : `checkNewsletterKey(provider, key)` → listes ; `saveNewsletter({ provider, key?, audienceId, enabled })` ; `setNewsletterEnabled(bool)` ; `disconnectNewsletter()`. Toutes par `owned()` (extrait dans un module partagé) et ajoutées à `actions.test.ts`.
- `checkNewsletterKey` est limité à 10 appels par minute (mémoire du processus) : ce n’est pas un proxy vers les API des services.

### 4. Page publique et inscription

- `PageData.newsletter` vient de `newsletter_settings.enabled && provider && audience_id`, lu dans `readPage()` donc **dans le cache** ; chaque action Newsletter fait `updateTag('public-page')`.
- `handleSubscription()` lit les réglages (en cache court, tag `newsletter`), refuse sans appel si désactivé, puis `deliver()` → connecteur actif. La reprise (`processQueue`) fait de même ; sans service connecté, elle ne fait rien et laisse la purge des 24 h s’appliquer.
- `instrumentation.ts` lance la reprise sans condition : elle s’arrête d’elle-même si rien n’est configuré (la configuration ne dépend plus du démarrage).

### 5. Retrait de Mautic

Supprimés : `mautic.ts`, `config.ts` (et tests), `MAUTIC_*` dans `docker-compose.yml`, `.env.example`, `init-env.sh`, `features.ts` (`newsletterEnabled` disparaît), README. `NEWSLETTER_RETRY_SECRET` et `/api/newsletter/retry` restent pour un déclenchement externe. `brand.test.ts` interdit `mautic`.

### 6. Constitution

Amendement de VII.3 : « Les clés de service saisies dans l’espace sont stockées chiffrées (AES-256-GCM, clé dérivée de `BETTER_AUTH_SECRET`), jamais renvoyées au navigateur ni journalisées. Le code n’appelle que des adresses fixes. » CONTRÔLE ajouté : test qui vérifie qu’aucune réponse d’action ni donnée de l’espace ne contient la clé, et que la colonne ne contient pas la clé en clair.

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/lib/db/schema/newsletter.ts`, `drizzle/0004_*.sql` | `newsletter_settings` |
| `src/lib/crypto/secret-box.ts` (+ test) | Chiffrement des clés |
| `src/lib/newsletter/connectors/{types,classify,brevo,mailchimp,mailerlite,kit,index}.ts` (+ tests) | Connecteurs |
| `src/lib/db/queries/newsletter-settings.ts` (+ test) | Lecture/écriture des réglages |
| `src/lib/newsletter/{deliver,subscription,retry,start}.ts` | Branchés sur le connecteur actif |
| `src/app/(admin)/admin/newsletter/*`, `newsletter-actions.ts`, `AdminSidebar.tsx` | Page Newsletter |
| `src/app/(admin)/admin/stats/*` | Compte d’inscrits par le connecteur |
| `specs/constitution.md`, `README.md`, `CHANGELOG.md`, `.env.example`, `docker-compose.yml`, `scripts/init-env.sh` | Doc, amendement, retrait de Mautic |
