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

type StyleProps = { theme: Theme; shape: LinkShape; credit: boolean; onTheme: (t: Theme) => void; onShape: (s: LinkShape) => void; onCredit: (v: boolean) => void };

export function StyleCard({ theme, shape, credit, onTheme, onShape, onCredit }: StyleProps) {
  return (
    <section className="card" aria-labelledby="apA">
      <div className="card-head">
        <h2 id="apA">Apparence</h2>
        <p>Thème, forme des liens et mention en pied de page.</p>
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
      <label className="switch">
        <input type="checkbox" checked={credit} onChange={(e) => onCredit(e.target.checked)} />
        <span className="switch-track" aria-hidden="true" />
        <span>Afficher « Propulsé par CircleLink » en bas de ma page</span>
      </label>
    </section>
  );
}
