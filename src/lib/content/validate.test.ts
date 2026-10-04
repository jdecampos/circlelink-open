import { describe, expect, it } from 'vitest';
import { categoryNameFrom, linkFrom, profileFrom } from './validate';

const CAT = '00000000-0000-0000-0000-000000000001';
const link = { title: 'Ma formation', url: 'https://a.fr', category_id: CAT };
const profile = { name: 'Alex', handle: 'alex', bio: '', location: '', socials: {}, theme: 'clair', link_shape: 'pilule' };

describe('linkFrom', () => {
  it('complète les valeurs par défaut et ajoute https://', () => {
    expect(linkFrom({ ...link, url: 'tiktok.com/@moi' })).toEqual({
      type: 'link', title: 'Ma formation', url: 'https://tiktok.com/@moi', categoryId: CAT, description: '', price: '', visible: true,
    });
  });

  it('refuse javascript:, un titre vide, un type inconnu, une catégorie absente', () => {
    expect(linkFrom({ ...link, url: 'javascript:alert(1)' })).toBe('Adresse invalide. Exemple : https://monsite.fr/page');
    expect(linkFrom({ ...link, title: '  ' })).toMatch(/titre/);
    expect(linkFrom({ ...link, type: 'video' })).toMatch(/Type de lien inconnu/);
    expect(linkFrom({ ...link, category_id: 'x' })).toMatch(/catégorie/);
    expect(linkFrom({ ...link, visible: 'non' })).toMatch(/visible/);
  });

  it('ne garde la description et le prix que pour les types qui les affichent', () => {
    expect(linkFrom({ ...link, description: 'd', price: '9 €' })).toMatchObject({ description: '', price: '' });
    expect(linkFrom({ ...link, type: 'product', description: 'd', price: '9 €' })).toMatchObject({ description: 'd', price: '9 €' });
  });
});

describe('categoryNameFrom', () => {
  it('refuse un nom vide ou de 25 caractères', () => {
    expect(categoryNameFrom(' ')).toEqual({ error: 'Donne un nom à la catégorie.' });
    expect(categoryNameFrom('x'.repeat(25))).toEqual({ error: '24 caractères maximum.' });
    expect(categoryNameFrom(' Podcast ')).toBe('Podcast');
  });
});

describe('profileFrom', () => {
  it('normalise les réseaux sociaux', () => {
    const p = profileFrom({ ...profile, socials: { email: 'moi@example.com', tiktok: 'tiktok.com/@moi' } });
    expect(p).toMatchObject({ socials: { email: 'mailto:moi@example.com', tiktok: 'https://tiktok.com/@moi', x: '' } });
  });

  it('refuse un réseau invalide, un thème ou une forme inconnus', () => {
    expect(profileFrom({ ...profile, socials: { email: 'pas-un-email' } })).toBe('Adresse email de contact invalide.');
    expect(profileFrom({ ...profile, socials: { x: 'javascript:alert(1)' } })).toBe('Adresse X invalide.');
    expect(profileFrom({ ...profile, theme: 'bleu' })).toMatch(/Thème/);
    expect(profileFrom({ ...profile, link_shape: 'rond' })).toMatch(/Forme/);
    expect(profileFrom({ ...profile, handle: 'a b' })).toMatch(/2 à 30/);
  });
});

describe('photo de profil', () => {
  it('accepte une photo https:, https:// ajouté si besoin ; vide = initiale', () => {
    expect(profileFrom({ ...profile, avatar_url: 'https://cdn.example.com/alex.jpg' })).toMatchObject({ avatar_url: 'https://cdn.example.com/alex.jpg' });
    expect(profileFrom({ ...profile, avatar_url: 'cdn.example.com/alex.jpg' })).toMatchObject({ avatar_url: 'https://cdn.example.com/alex.jpg' });
    expect(profileFrom(profile)).toMatchObject({ avatar_url: '' });
  });

  it('refuse une photo javascript: ou http:', () => {
    expect(profileFrom({ ...profile, avatar_url: 'javascript:alert(1)' })).toMatch(/^Photo/);
    expect(profileFrom({ ...profile, avatar_url: 'http://cdn.example.com/alex.jpg' })).toMatch(/^Photo/);
  });

});
