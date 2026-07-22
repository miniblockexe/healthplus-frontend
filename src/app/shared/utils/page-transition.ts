import gsap from 'gsap';

const reduced = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function pageEnter(
  selector: string,
  opts: { duration?: number; delay?: number; y?: number } = {},
): void {
  if (typeof window === 'undefined' || reduced()) return;

  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return;

  const { duration = 0.38, delay = 0, y = 18 } = opts;

  gsap.fromTo(
    el,
    { opacity: 0, y },
    { opacity: 1, y: 0, duration, delay, ease: 'power2.out' },
  );
}

export function authEnter(): void {
  if (typeof window === 'undefined' || reduced()) return;

  const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

  const leftPanel = document.querySelector<HTMLElement>('.hp-auth-left');
  if (leftPanel) {
    tl.fromTo(
      leftPanel,
      { opacity: 0, x: -40 },
      { opacity: 1, x: 0, duration: 0.55 },
      0,
    );

    const pills = leftPanel.querySelectorAll('.hp-auth-pill');
    if (pills.length) {
      tl.fromTo(
        pills,
        { opacity: 0, x: -16 },
        { opacity: 1, x: 0, duration: 0.35, stagger: 0.07 },
        0.25,
      );
    }

    const stats = leftPanel.querySelectorAll('.hp-auth-stat');
    if (stats.length) {
      tl.fromTo(
        stats,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, stagger: 0.08 },
        0.45,
      );
    }
  }

  const rightCol = document.querySelector<HTMLElement>('.hp-auth-right');
  if (rightCol) {
    tl.fromTo(
      rightCol,
      { opacity: 0, y: 24 },
      { opacity: 1, y: 0, duration: 0.45 },
      0.1,
    );
  }

  // Form fields stagger up inside the visible wrapper
  const formFields = document.querySelectorAll<HTMLElement>('.hp-auth-field');
  if (formFields.length) {
    tl.fromTo(
      formFields,
      { opacity: 0, y: 14 },
      { opacity: 1, y: 0, duration: 0.32, stagger: 0.06 },
      0.28,
    );
  }

  const submitBtn = document.querySelector<HTMLElement>('.hp-auth-submit');
  if (submitBtn) {
    tl.fromTo(
      submitBtn,
      { opacity: 0, scale: 0.96, y: 8 },
      { opacity: 1, scale: 1, y: 0, duration: 0.28 },
      0.52,
    );
  }
}

/* ─── Mobile hero slides down ────────────────────────────────── */
export function mobileHeroEnter(): void {
  if (typeof window === 'undefined' || reduced()) return;

  const hero = document.querySelector<HTMLElement>('.hp-mobile-hero');
  if (!hero) return;

  gsap.fromTo(
    hero,
    { opacity: 0, y: -20 },
    { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
  );

  const chips = hero.querySelectorAll<HTMLElement>('.hp-hero-chip');
  if (chips.length) {
    gsap.fromTo(
      chips,
      { opacity: 0, scale: 0.88 },
      {
        opacity: 1,
        scale: 1,
        duration: 0.28,
        stagger: 0.055,
        delay: 0.22,
        ease: 'back.out(1.4)',
      },
    );
  }
}

/* ─── Dashboard / feature pages: cards stagger in ────────────── */
export function dashboardEnter(cardSelector = '.hp-card'): void {
  if (typeof window === 'undefined' || reduced()) return;

  const cards = document.querySelectorAll<HTMLElement>(cardSelector);
  if (!cards.length) return;

  gsap.fromTo(
    cards,
    { opacity: 0, y: 20 },
    {
      opacity: 1,
      y: 0,
      duration: 0.38,
      stagger: 0.055,
      ease: 'power2.out',
      delay: 0.08,
    },
  );
}

export function sidebarEnter(itemSelector = '.hp-nav-item'): void {
  if (typeof window === 'undefined' || reduced()) return;

  const items = document.querySelectorAll<HTMLElement>(itemSelector);
  if (!items.length) return;

  gsap.fromTo(
    items,
    { opacity: 0, x: -12 },
    {
      opacity: 1,
      x: 0,
      duration: 0.28,
      stagger: 0.045,
      ease: 'power2.out',
      delay: 0.05,
    },
  );
}

export function routeEnter(mainSelector = '.hp-main-content'): void {
  if (typeof window === 'undefined' || reduced()) return;

  const el = document.querySelector<HTMLElement>(mainSelector);
  if (!el) return;

  gsap.fromTo(
    el,
    { opacity: 0, y: 12 },
    { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' },
  );
}

export function shakeError(selector = '.hp-error-msg'): void {
  if (typeof window === 'undefined') return;

  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return;

  gsap.fromTo(
    el,
    { x: 0 },
    {
      x: 8,
      duration: 0.07,
      repeat: 5,
      yoyo: true,
      ease: 'power1.inOut',
      onComplete: () => gsap.set(el, { x: 0 }),
    },
  );
}
