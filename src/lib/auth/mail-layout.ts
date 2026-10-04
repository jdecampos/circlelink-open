/* Gabarit HTML des emails de connexion. Mise en page en tableaux et styles en ligne : c'est
   ce qui tient dans Gmail, Outlook et Apple Mail. Couleurs et polices reprises du design
   (src/styles/cb.css). Le logo est un PNG servi par le site : les messageries ignorent le SVG. */

import { PRODUCT_NAME } from '@/lib/brand';

export type Mail = { subject: string; text: string; html: string };

export type MailContent = {
  subject: string;
  title: string;
  intro: string;
  cta: string;
  url: string;
};

const C = { bg: '#f4f5f1', surface: '#fafbf8', line: '#e2e5dd', fg: '#141413', fg2: '#393c38', muted: '#5b5e59', accent: '#2e7d67', accentSoft: '#dcefe7', onInk: '#fafbf8' };
const SERIF = `'Iowan Old Style','Palatino Linotype',Georgia,'Times New Roman',serif`;
const SANS = `'Nunito Sans',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif`;
const VALIDITY = 'Il reste valable 15 minutes.';
const IGNORE = 'Si tu n’es pas à l’origine de cette demande, ignore simplement cet email : ton compte reste protégé.';

export const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export function renderMail({ subject, title, intro, cta, url }: MailContent, site: string, brand = PRODUCT_NAME): Mail {
  const b = esc(brand);
  const base = site.replace(/\/+$/, '');
  const host = base.replace(/^https?:\/\//, '');
  const u = esc(url);
  const text = `${title}\n\n${intro}\n\n${cta} :\n${url}\n\n${VALIDITY} Le lien ne fonctionne qu’une fois.\n\n${IGNORE}\n\n— ${brand} · ${host}`;

  const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.bg}">${esc(intro)} ${VALIDITY}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg}">
<tr><td align="center" style="padding:40px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:520px">
  <tr><td style="padding:0 8px 24px">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="vertical-align:middle;padding-right:10px"><img src="${esc(base)}/email/logo.png" width="36" height="36" alt="${b}" style="display:block;border:0;width:36px;height:36px"></td>
      <td style="vertical-align:middle;font-family:${SERIF};font-size:21px;letter-spacing:-0.02em;color:${C.fg}">${b}</td>
    </tr></table>
  </td></tr>
  <tr><td style="background:${C.surface};border:1px solid ${C.line};border-radius:20px;overflow:hidden">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
    <tr><td style="height:6px;line-height:6px;font-size:0;background:${C.accent};border-radius:20px 20px 0 0">&nbsp;</td></tr>
    <tr><td style="padding:36px 32px 8px;font-family:${SANS}">
      <h1 style="margin:0 0 14px;font-family:${SERIF};font-weight:500;font-size:30px;line-height:1.2;letter-spacing:-0.01em;color:${C.fg}">${esc(title)}</h1>
      <p style="margin:0 0 28px;font-size:16px;line-height:1.6;color:${C.fg2}">${esc(intro)}</p>
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="border-radius:999px;background:${C.fg}"><a href="${u}" style="display:inline-block;padding:15px 30px;font-family:${SANS};font-size:16px;font-weight:700;color:${C.onInk};text-decoration:none;border-radius:999px">${esc(cta)}&nbsp;&nbsp;→</a></td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:24px 32px 0;font-family:${SANS}">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
        <td style="background:${C.accentSoft};border-radius:12px;padding:14px 16px;font-size:14px;line-height:1.5;color:${C.fg}">
          <strong>${VALIDITY}</strong> Le lien ne fonctionne qu’une fois : au besoin, demandes-en un nouveau depuis la page de connexion.
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:24px 32px 32px;font-family:${SANS}">
      <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:${C.muted}">Le bouton ne s’ouvre pas ? Copie ce lien dans ton navigateur :</p>
      <p style="margin:0 0 20px;font-size:13px;line-height:1.5;word-break:break-all"><a href="${u}" style="color:${C.muted};text-decoration:underline">${u}</a></p>
      <p style="margin:0;padding-top:20px;border-top:1px solid ${C.line};font-size:13px;line-height:1.5;color:${C.muted}">${IGNORE}</p>
    </td></tr>
    </table>
  </td></tr>
  <tr><td align="center" style="padding:24px 8px 0;font-family:${SANS};font-size:12px;line-height:1.5;color:${C.muted}">
    ${b} · <a href="${esc(base)}" style="color:${C.muted};text-decoration:none">${esc(host)}</a>
  </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
  return { subject, text, html };
}
