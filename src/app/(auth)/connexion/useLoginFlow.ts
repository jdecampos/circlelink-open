'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth/client';
import { EMAIL_RE } from '@/lib/links';
import type { FieldErr } from '@/components/forms';
import { useToast } from '@/components/Toasts';

export type View = 'login' | 'sent' | 'forgot';
type Busy = '' | 'pw' | 'pw-ok' | 'magic' | 'forgot';
type AuthError = { status?: number; message?: string } | null;

export function checkEmail(v: string) {
  const t = v.trim();
  if (!t) return 'Indique ton adresse email.';
  if (!EMAIL_RE.test(t)) return 'Adresse incomplète : vérifie le @ et le domaine (ex. prenom@example.com).';
  return '';
}
export function checkPw(v: string) {
  if (!v) return 'Indique ton mot de passe.';
  if (v.length < 8) return 'Le mot de passe fait au moins 8 caractères (' + v.length + ' saisis).';
  return '';
}

function frError(e: AuthError) {
  if (e?.status === 429) return 'Trop de demandes d’affilée. Patiente une minute avant de réessayer.';
  return 'Envoi impossible : ' + (e?.message || 'réessaie dans un instant.');
}

/** État et actions de l'écran de connexion (mot de passe, lien magique, mot de passe oublié). */
export function useLoginFlow() {
  const router = useRouter();
  const toast = useToast();
  const [view, setView] = useState<View>('login');
  const [magic, setMagic] = useState(false);
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(true);
  const [magicEmail, setMagicEmail] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [summary, setSummary] = useState<FieldErr[]>([]);
  const [summaryTitle, setSummaryTitle] = useState('Impossible de te connecter');
  const [busy, setBusy] = useState<Busy>('');
  const [sent, setSent] = useState({ title: '', text: '' });
  const [resendIn, setResendIn] = useState(0);
  const sentRef = useRef<HTMLElement>(null);
  const forgotTitle = useRef<HTMLHeadingElement>(null);

  const setErr = (k: string, m: string) => {
    setErrs((e) => ({ ...e, [k]: m }));
    return m;
  };
  const showSummary = (title: string, list: FieldErr[]) => {
    setSummaryTitle(title);
    setSummary(list);
  };

  // lien expiré, mot de passe changé, déjà connecté
  useEffect(() => {
    const q = new URLSearchParams(location.search);
    if (q.get('erreur') === 'lien') {
      // page statique : le paramètre n'est lisible qu'après hydratation
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSummaryTitle('Lien expiré');
      setSummary([{ id: 'email', msg: 'Ce lien n’est plus valable. Demande-en un nouveau.' }]);
    }
    if (q.get('mdp') === 'ok') toast('Mot de passe enregistré : connecte-toi');
    authClient.getSession().then(({ data }) => {
      if (!data) return;
      setEmail(data.user.email);
      toast('Tu es déjà connecté', { label: 'Ouvrir l’admin', run: () => router.push('/admin') });
    });
  }, [toast, router]);

  // compte à rebours « Renvoyer »
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((n) => n - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  useEffect(() => {
    if (view === 'sent') sentRef.current?.focus();
    if (view === 'forgot') forgotTitle.current?.focus();
  }, [view]);

  function setTab(m: boolean) {
    setMagic(m);
    setSummary([]);
    if (m && !magicEmail) setMagicEmail(email);
  }

  async function onPassword(e: React.FormEvent) {
    e.preventDefault();
    const list: FieldErr[] = [];
    const a = setErr('email', checkEmail(email));
    if (a) list.push({ id: 'email', msg: a });
    const b = setErr('password', checkPw(pw));
    if (b) list.push({ id: 'password', msg: b });
    if (list.length) return showSummary('Impossible de te connecter', list);
    setSummary([]);
    setBusy('pw');
    // rememberMe décoché : cookie de session sans date, effacé à la fermeture du navigateur
    const { error } = await authClient.signIn.email({ email: email.trim(), password: pw, rememberMe: remember });
    if (error) {
      setBusy('');
      const msg = error.status === 401 ? 'Email ou mot de passe incorrect.' : error.status === 429 ? frError(error) : 'Connexion impossible : ' + error.message;
      return showSummary('Impossible de te connecter', [{ id: 'password', msg }]);
    }
    setBusy('pw-ok');
    setTimeout(() => {
      router.push('/admin');
      router.refresh();
    }, 350);
  }

  const sendMagic = async () =>
    (await authClient.signIn.magicLink({ email: magicEmail.trim(), callbackURL: '/admin', errorCallbackURL: '/connexion?erreur=lien' })).error;
  const sendForgot = async () => (await authClient.requestPasswordReset({ email: forgotEmail.trim(), redirectTo: '/nouveau-mot-de-passe' })).error;

  async function onMagic(e: React.FormEvent) {
    e.preventDefault();
    const m = setErr('magicEmail', checkEmail(magicEmail));
    if (m) return showSummary('Impossible de te connecter', [{ id: 'magicEmail', msg: m }]);
    setSummary([]);
    setBusy('magic');
    const error = await sendMagic();
    setBusy('');
    if (error) return showSummary('Envoi impossible', [{ id: 'magicEmail', msg: frError(error) }]);
    setSent({
      title: 'Vérifie ta boîte mail',
      text: 'Un lien de connexion vient de partir vers ' + magicEmail.trim() + '. Ouvre-le dans ce navigateur. Il reste valable 15 minutes.',
    });
    setView('sent');
    setResendIn(30);
  }

  async function onForgot(e: React.FormEvent) {
    e.preventDefault();
    if (setErr('forgotEmail', checkEmail(forgotEmail))) return document.getElementById('forgotEmail')?.focus();
    setBusy('forgot');
    const error = await sendForgot();
    setBusy('');
    if (error) return setErr('forgotEmail', frError(error));
    setSent({
      title: 'Email envoyé',
      text: 'Si un compte existe pour ' + forgotEmail.trim() + ', tu vas recevoir un lien pour choisir un nouveau mot de passe. Il reste valable 15 minutes.',
    });
    setView('sent');
    setResendIn(30);
  }

  async function resend() {
    const error = sent.title === 'Email envoyé' ? await sendForgot() : await sendMagic();
    toast(error ? frError(error) : 'Nouveau lien envoyé');
    setResendIn(30);
  }

  function back() {
    setResendIn(0);
    setView('login');
    setTimeout(() => document.getElementById('email')?.focus());
  }

  // validation au blur, puis correction en direct une fois en erreur
  const live = (k: string, fn: (v: string) => string) => ({
    onBlur: (e: React.FocusEvent<HTMLInputElement>) => e.target.value && setErr(k, fn(e.target.value)),
    'aria-invalid': !!errs[k],
  });
  const fieldCls = (k: string) => 'field' + (errs[k] ? ' has-error' : '');

  return {
    view, setView, magic, setTab, email, setEmail, pw, setPw, showPw, setShowPw, remember, setRemember,
    magicEmail, setMagicEmail, forgotEmail, setForgotEmail, errs, setErr, summary, summaryTitle, busy, sent, resendIn,
    sentRef, forgotTitle, onPassword, onMagic, onForgot, resend, back, live, fieldCls,
  };
}

export type LoginFlow = ReturnType<typeof useLoginFlow>;
