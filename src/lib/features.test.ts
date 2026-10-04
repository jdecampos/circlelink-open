import { describe, expect, it } from 'vitest';
import { loginModes, mailEnabled } from './features';

describe('intégrations facultatives', () => {
  it('SMTP actif seulement avec SMTP_HOST et SMTP_FROM', () => {
    expect(mailEnabled({})).toBe(false);
    expect(mailEnabled({ SMTP_HOST: 'smtp.example.com' })).toBe(false);
    expect(mailEnabled({ SMTP_HOST: 'smtp.example.com', SMTP_FROM: 'Liens <liens@example.com>' })).toBe(true);
  });

  it('sans SMTP, l’écran de connexion n’a que le mot de passe', () => {
    expect(loginModes({})).toEqual({ magicLink: false, reset: false });
    expect(loginModes({ SMTP_HOST: 'h', SMTP_FROM: 'f' })).toEqual({ magicLink: true, reset: true });
  });
});
