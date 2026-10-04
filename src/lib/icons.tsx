/* Icônes — une seule famille, trait 1.75 (repris de design/assets/store.js) */
const ICONS = {
  link: '<path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1"/><path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1"/>',
  arrow: '<path d="M7 17 17 7"/><path d="M8 7h9v9"/>',
  arrowRight: '<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>',
  star: '<path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8-4.3-4.1 5.9-.9z"/>',
  book: '<path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H11v16H5.5A1.5 1.5 0 0 1 4 18.5z"/><path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H13v16h5.5a1.5 1.5 0 0 0 1.5-1.5z"/>',
  share: '<path d="M12 15V4"/><path d="m7.5 8.5 4.5-4.5 4.5 4.5"/><path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13"/>',
  youtube: '<rect x="2.5" y="5.5" width="19" height="13" rx="4"/><path d="m10 9.25 5 2.75-5 2.75z"/>',
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M8 10.5V16"/><path d="M8 7.75v.01"/><path d="M12 16v-5.5"/><path d="M12 13a2.5 2.5 0 0 1 5 0v3"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><path d="M17.25 6.75v.01"/>',
  tiktok: '<path d="M14 3.5v11a4 4 0 1 1-4-4"/><path d="M14 3.5a5 5 0 0 0 5 5"/>',
  facebook: '<rect x="3" y="3" width="18" height="18" rx="5"/><path d="M15.5 7.5h-1.75A2.25 2.25 0 0 0 11.5 9.75V21"/><path d="M9 13h5.5"/>',
  x: '<path d="M4 4l16 16"/><path d="M20 4 4 20"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.4 12 21 12 21z"/><circle cx="12" cy="10" r="2.25"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  edit: '<path d="M4 20h4L19 9a2.83 2.83 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  trash: '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/>',
  up: '<path d="m6 14 6-6 6 6"/>',
  down: '<path d="m6 10 6 6 6-6"/>',
  close: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
  eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M3 3l18 18"/><path d="M10.6 5.6A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.9 3.7"/><path d="M6.3 6.8C3.9 8.4 2.5 12 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4.2-1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>',
  folder: '<path d="M3.5 7.5A1.5 1.5 0 0 1 5 6h4l2 2.5h8A1.5 1.5 0 0 1 20.5 10v7.5A1.5 1.5 0 0 1 19 19H5a1.5 1.5 0 0 1-1.5-1.5z"/>',
  palette: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.75-.8 1.75-1.75 0-.5-.2-.9-.5-1.25-.3-.35-.5-.75-.5-1.25 0-.95.8-1.75 1.75-1.75H16.5A4.5 4.5 0 0 0 21 10.5C21 6.4 17 3 12 3z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7.25" r="1"/><circle cx="15" cy="7.5" r="1"/>',
  chart: '<path d="M4 20V4"/><path d="M4 20h16"/><path d="M8 16v-4"/><path d="M12 16V8"/><path d="M16 16v-6"/>',
  logout: '<path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14"/><path d="M10 16l-4-4 4-4"/><path d="M6 12h10"/>',
  external: '<path d="M14 4h6v6"/><path d="M20 4 11 13"/><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5"/><path d="M12 16.25v.01"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="m4 7 8 6 8-6"/>',
  lock: '<rect x="4.5" y="10.5" width="15" height="10" rx="2"/><path d="M8 10.5V7.5a4 4 0 0 1 8 0v3"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  play: '<circle cx="12" cy="12" r="9"/><path d="m10 8.75 5 3.25-5 3.25z"/>',
  tool: '<path d="M14.5 6.5a4 4 0 0 0-5.3 5.3L4 17v3h3l5.2-5.2a4 4 0 0 0 5.3-5.3l-2.5 2.5-2.5-.5-.5-2.5z"/>',
  menu: '<path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.6-4.5L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16"/><path d="M20 20v-4h-4"/>',
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, sm, className }: { name: IconName; sm?: boolean; className?: string }) {
  return (
    <svg
      className={['icon', sm && 'icon-sm', className].filter(Boolean).join(' ')}
      viewBox="0 0 24 24"
      aria-hidden="true"
      // chaînes constantes définies ci-dessus, jamais de donnée utilisateur
      dangerouslySetInnerHTML={{ __html: ICONS[name] }}
    />
  );
}

/** Marque CircleLink : deux anneaux enlacés, encre et vert */
export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg className="cb-mark" width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle className="c" cx="18" cy="24" r="11" />
      <circle className="b" cx="30" cy="24" r="11" />
    </svg>
  );
}
