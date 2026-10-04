import { Icon } from '@/lib/icons';
import { NETWORKS } from '@/lib/links';
import type { LinkShape, Theme } from '@/lib/types';

/* Champ photo, cartes « Réseaux sociaux » et « Apparence » du formulaire de la page Apparence. */

export function PhotoField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="field span-2">
      <label className="label" htmlFor="apPhoto">
        Photo
      </label>
      <input
        className="input"
        id="apPhoto"
        type="url"
        inputMode="url"
        maxLength={2048}
        placeholder="https://"
        aria-describedby="apPhotoHint"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <p className="hint" id="apPhotoHint">
        Adresse https:// d’une image carrée. Laisse vide pour afficher l’initiale de ton nom.
      </p>
    </div>
  );
}

const LOGO_FIELDS = [
  { id: 'logo_url', label: 'Logo pour le thème clair', hint: 'Sur fond clair : un logo foncé.' },
  { id: 'logo_dark_url', label: 'Logo pour le thème sombre', hint: 'Sur fond sombre : un logo clair. Vide : celui du thème clair.' },
] as const;

type Logos = { logo_url: string; logo_dark_url: string };

/** Logo en haut à gauche de la page, un par thème ; vides : le logo de CircleLink. */
export function LogoCard({ logos, onChange }: { logos: Logos; onChange: (k: keyof Logos, v: string) => void }) {
  return (
    <section className="card" aria-labelledby="apL">
      <div className="card-head">
        <h2 id="apL">Logo</h2>
        <p>En haut à gauche de ta page. Adresse https:// d’une image (SVG ou PNG transparent). Vide : le logo de CircleLink.</p>
      </div>
      <div className="form-grid two">
        {LOGO_FIELDS.map((f) => (
          <div className="field" key={f.id}>
            <label className="label" htmlFor={'ap-' + f.id}>
              {f.label}
            </label>
            <input
              className="input"
              id={'ap-' + f.id}
              type="url"
              inputMode="url"
              maxLength={2048}
              placeholder="https://"
              aria-describedby={'ap-' + f.id + '-hint'}
              value={logos[f.id]}
              onChange={(e) => onChange(f.id, e.target.value)}
            />
            <p className="hint" id={'ap-' + f.id + '-hint'}>
              {f.hint}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SocialsCard({ socials, onChange }: { socials: Record<string, string>; onChange: (s: Record<string, string>) => void }) {
  return (
    <section className="card" aria-labelledby="apS">
      <div className="card-head">
        <h2 id="apS">Réseaux sociaux</h2>
        <p>Laisse un champ vide pour masquer l’icône.</p>
      </div>
      <div className="form-grid two">
        {NETWORKS.map((n) => (
          <div className="field" key={n.id}>
            <label className="label" htmlFor={'so-' + n.id}>
              {n.label}
            </label>
            <input
              className="input"
              id={'so-' + n.id}
              {...(n.id === 'email' ? { type: 'email', placeholder: 'contact@example.com' } : { type: 'url', inputMode: 'url' as const, placeholder: 'https://' })}
              value={socials[n.id]}
              onChange={(e) => onChange({ ...socials, [n.id]: e.target.value })}
            />
          </div>
        ))}
      </div>
    </section>
  );
}

const tick = (
  <span className="choice-tick">
    <Icon name="check" />
  </span>
);

type StyleProps = { theme: Theme; shape: LinkShape; onTheme: (t: Theme) => void; onShape: (s: LinkShape) => void };

export function StyleCard({ theme, shape, onTheme, onShape }: StyleProps) {
  return (
    <section className="card" aria-labelledby="apA">
      <div className="card-head">
        <h2 id="apA">Apparence</h2>
        <p>Thème et forme des liens.</p>
      </div>
      <fieldset className="choices">
        <legend>Thème</legend>
        {(
          [
            ['clair', 'Clair', 'swatch-light'],
            ['sombre', 'Sombre', 'swatch-dark'],
          ] as [Theme, string, string][]
        ).map(([v, label, sw]) => (
          <label className="choice" key={v}>
            <input type="radio" name="theme" value={v} checked={theme === v} onChange={() => onTheme(v)} />
            <span className={'swatch ' + sw} aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
            <span className="choice-row">
              <span>{label}</span>
              {tick}
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset className="choices">
        <legend>Forme des liens</legend>
        {(
          [
            ['pilule', 'Pilule', '999px'],
            ['arrondi', 'Arrondi', '8px'],
            ['carre', 'Carré', '3px'],
          ] as [LinkShape, string, string][]
        ).map(([v, label, r]) => (
          <label className="choice" key={v}>
            <input type="radio" name="links" value={v} checked={shape === v} onChange={() => onShape(v)} />
            <span className="shape" aria-hidden="true">
              <i style={{ borderRadius: r }} />
              <i style={{ borderRadius: r }} />
            </span>
            <span className="choice-row">
              <span>{label}</span>
              {tick}
            </span>
          </label>
        ))}
      </fieldset>
    </section>
  );
}
