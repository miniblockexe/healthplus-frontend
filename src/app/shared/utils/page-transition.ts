import gsap from 'gsap';

const mm = gsap.matchMedia();
export function authEnter(): void {
  if (typeof window === 'undefined') return;

  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)',
    },
    (ctx) => {
      const { reduce } = ctx.conditions as { motion: boolean; reduce: boolean };

      if (reduce) {
        // Show everything instantly — GSAP still sets them so CSS opacity:0 is cleared
        gsap.set(
          [
            '.hp-auth-left',
            '.hp-auth-right',
            '.hp-auth-pill',
            '.hp-auth-stat',
            '.hp-auth-field',
            '.hp-auth-submit',
          ],
          { autoAlpha: 1, y: 0, x: 0, scale: 1 },
        );
        return;
      }

      const tl = gsap.timeline({
        defaults: { ease: 'power3.out', duration: 0.45 },
      });

      // Left panel
      const leftPanel = document.querySelector('.hp-auth-left');
      if (leftPanel) {
        tl.fromTo(
          leftPanel,
          { autoAlpha: 0, x: -36 },
          { autoAlpha: 1, x: 0 },
          0,
        );

        const pills = leftPanel.querySelectorAll('.hp-auth-pill');
        if (pills.length) {
          tl.fromTo(
            pills,
            { autoAlpha: 0, x: -14 },
            { autoAlpha: 1, x: 0, duration: 0.3, stagger: 0.065 },
            '<0.2',
          );
        }

        const stats = leftPanel.querySelectorAll('.hp-auth-stat');
        if (stats.length) {
          tl.fromTo(
            stats,
            { autoAlpha: 0, y: 8 },
            { autoAlpha: 1, y: 0, duration: 0.28, stagger: 0.07 },
            '<0.1',
          );
        }
      }

      // Right column
      const rightCol = document.querySelector('.hp-auth-right');
      if (rightCol) {
        tl.fromTo(
          rightCol,
          { autoAlpha: 0, y: 20 },
          { autoAlpha: 1, y: 0, duration: 0.4 },
          '<-0.3', // overlap: starts 0.3s before pills finish
        );
      }

      // Form fields stagger
      const fields = document.querySelectorAll('.hp-auth-field');
      if (fields.length) {
        tl.fromTo(
          fields,
          { autoAlpha: 0, y: 12 },
          { autoAlpha: 1, y: 0, duration: 0.3, stagger: 0.055 },
          '<0.08',
        );
      }

      // Submit button pops in last
      const submit = document.querySelector('.hp-auth-submit');
      if (submit) {
        tl.fromTo(
          submit,
          { autoAlpha: 0, scale: 0.95, y: 6 },
          {
            autoAlpha: 1,
            scale: 1,
            y: 0,
            duration: 0.26,
            ease: 'back.out(1.4)',
          },
          '<0.05',
        );
      }
    },
  );
}

export function mobileHeroEnter(): void {
  if (typeof window === 'undefined') return;

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const hero = document.querySelector('.hp-mobile-hero');
    if (!hero) return;

    const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });

    tl.fromTo(
      hero,
      { autoAlpha: 0, y: -18 },
      { autoAlpha: 1, y: 0, duration: 0.38 },
    );

    const chips = hero.querySelectorAll('.hp-hero-chip');
    if (chips.length) {
      tl.fromTo(
        chips,
        { autoAlpha: 0, scale: 0.82 },
        {
          autoAlpha: 1,
          scale: 1,
          duration: 0.26,
          stagger: 0.05,
          ease: 'back.out(1.5)',
        },
        '<0.18',
      );
    }
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    const hero = document.querySelector('.hp-mobile-hero');
    if (hero) gsap.set(hero, { autoAlpha: 1 });
    gsap.set('.hp-hero-chip', { autoAlpha: 1, scale: 1 });
  });
}

export function shakeError(selector = '.hp-error-msg'): void {
  if (typeof window === 'undefined') return;

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const el = document.querySelector<HTMLElement>(selector);
    if (!el) return;

    gsap.fromTo(
      el,
      { x: 0 },
      {
        x: 7,
        duration: 0.065,
        repeat: 5,
        yoyo: true,
        ease: 'power1.inOut',
        onComplete: () => gsap.set(el, { x: 0 }),
      },
    );
  });
}

/* ══════════════════════════════════════════════════════════════════
   SIDEBAR NAV ITEMS  (stagger trái → phải)
══════════════════════════════════════════════════════════════════ */
export function sidebarEnter(itemSelector = '.hp-nav-item'): void {
  if (typeof window === 'undefined') return;

  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)',
    },
    (ctx) => {
      const { reduce } = ctx.conditions as { motion: boolean; reduce: boolean };
      const items = document.querySelectorAll(itemSelector);
      if (!items.length) return;

      if (reduce) {
        gsap.set(items, { autoAlpha: 1, x: 0 });
        return;
      }

      gsap.fromTo(
        items,
        { autoAlpha: 0, x: -10 },
        {
          autoAlpha: 1,
          x: 0,
          duration: 0.26,
          stagger: { each: 0.042, from: 'start' },
          ease: 'power2.out',
        },
      );
    },
  );
}

export function dashboardEnter(cardSelector = '.hp-card'): void {
  if (typeof window === 'undefined') return;

  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)',
    },
    (ctx) => {
      const { reduce } = ctx.conditions as { motion: boolean; reduce: boolean };
      const cards = document.querySelectorAll(cardSelector);
      if (!cards.length) return;

      if (reduce) {
        gsap.set(cards, { autoAlpha: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        cards,
        { autoAlpha: 0, y: 16 },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.35,
          stagger: { each: 0.05, from: 'start' },
          ease: 'power2.out',
          delay: 0.05,
        },
      );
    },
  );
}

export function routeLeave(mainSelector = '.hp-main-content'): void {
  if (typeof window === 'undefined') return;

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const el = document.querySelector<HTMLElement>(mainSelector);
    if (!el) return;
    gsap.killTweensOf(el);
    gsap.to(el, { autoAlpha: 0, y: -5, duration: 0.13, ease: 'power2.in' });
  });
}

export function routeEnter(mainSelector = '.hp-main-content'): void {
  if (typeof window === 'undefined') return;

  mm.add(
    {
      motion: '(prefers-reduced-motion: no-preference)',
      reduce: '(prefers-reduced-motion: reduce)',
    },
    (ctx) => {
      const { reduce } = ctx.conditions as { motion: boolean; reduce: boolean };
      const el = document.querySelector<HTMLElement>(mainSelector);
      if (!el) return;

      gsap.killTweensOf(el);

      if (reduce) {
        gsap.set(el, { autoAlpha: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        el,
        { autoAlpha: 0, y: 10 },
        { autoAlpha: 1, y: 0, duration: 0.28, ease: 'power2.out' },
      );
    },
  );
}

export function heartbeatPulse(selector = '.hp-heartbeat-icon'): void {
  if (typeof window === 'undefined') return;

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const el = document.querySelector(selector);
    if (!el) return;

    gsap.to(el, {
      scale: 1.18,
      duration: 0.22,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      repeatDelay: 0.65, // ~72bpm rhythm — tự nhiên, không loạn mắt
    });
  });
}

export function countUp(
  el: HTMLElement,
  endValue: number,
  opts: { duration?: number; decimals?: number; suffix?: string } = {},
): void {
  if (typeof window === 'undefined' || !el) return;

  const { duration = 0.9, decimals = 0, suffix = '' } = opts;

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const obj = { val: 0 };
    gsap.to(obj, {
      val: endValue,
      duration,
      ease: 'power2.out',
      onUpdate() {
        el.textContent = obj.val.toFixed(decimals) + suffix;
      },
      onComplete() {
        el.textContent = endValue.toFixed(decimals) + suffix;
      },
    });
  });

  mm.add('(prefers-reduced-motion: reduce)', () => {
    el.textContent = endValue.toFixed(decimals) + suffix;
  });
}

export function badgePop(selector = '.hp-badge'): void {
  if (typeof window === 'undefined') return;

  mm.add('(prefers-reduced-motion: no-preference)', () => {
    const el = document.querySelector(selector);
    if (!el) return;

    gsap.fromTo(
      el,
      { scale: 0, autoAlpha: 0 },
      { scale: 1, autoAlpha: 1, duration: 0.22, ease: 'back.out(2)' },
    );
  });
}
