import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';
import { siteUrl } from '@/lib/site';
import { renderMail, type Mail } from './mail-layout';

/* Emails de connexion, par SMTP (Resend, Brevo… : seules les variables SMTP_* changent).
   Règle de journalisation : jamais l'email du destinataire dans les journaux. */

export type { Mail };

export const magicLinkMail = (url: string, site = siteUrl(), brand?: string) =>
  renderMail(
    { subject: 'Ton lien de connexion', title: 'Ton lien de connexion', intro: 'Un clic sur le bouton ci-dessous et tu retrouves ton espace, sans mot de passe.', cta: 'Me connecter', url },
    site,
    brand,
  );

export const resetPasswordMail = (url: string, site = siteUrl(), brand?: string) =>
  renderMail(
    { subject: 'Choisis un nouveau mot de passe', title: 'Choisis un nouveau mot de passe', intro: 'Tu as demandé à changer de mot de passe. Clique sur le bouton pour en choisir un nouveau, puis reconnecte-toi.', cta: 'Choisir mon mot de passe', url },
    site,
    brand,
  );

let transport: Transporter | null = null;

function getTransport(): Transporter {
  if (transport) return transport;
  const host = process.env.SMTP_HOST;
  if (!host) throw new Error('SMTP_HOST manquante');
  const port = Number(process.env.SMTP_PORT ?? 587);
  transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD ?? '' } : undefined,
  });
  return transport;
}

export async function sendMail(to: string, mail: Mail): Promise<void> {
  const from = process.env.SMTP_FROM;
  if (!from) throw new Error('SMTP_FROM manquante');
  await getTransport().sendMail({ from, to, ...mail });
}
