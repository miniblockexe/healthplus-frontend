import gsap from 'gsap';

const mm = gsap.matchMedia();

/* ══════════════════════════════════════════════════════════════════
   AUTH ENTER 
══════════════════════════════════════════════════════════════════ */
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
        gsap.set(
          [
            '.hp-anim-brand',
            '.hp-anim-copy',
            '.hp-anim-features > *',
            '.hp-anim-stats',
            '.hp-form-panel',
            '.hp-anim-form-head',
            '.hp-anim-fields .hp-field',
            '.hp-anim-fields .hp-field-row',
            '.hp-btn-primary',
            '.hp-divider',
            '.hp-btn-google',
            '.hp-form-footer',
          ],
          { autoAlpha: 1, x: 0, y: 0, scale: 1 },
        );
        return;
      }

      // ── MOBILE HERO — brand + headline + chips vào trước form ────────────
      const mobileHero = document.querySelector('.hp-hero__mobile');
      if (mobileHero) {
        gsap.from(
          '.hp-anim-mobile-hero .hp-hero__mobile-headline, .hp-anim-mobile-hero .hp-hero__mobile-sub',
          {
            y: 10,
            autoAlpha: 0,
            duration: 0.32,
            stagger: 0.08,
            ease: 'power2.out',
          },
        );
        gsap.from('.hp-anim-mobile-hero .hp-chip', {
          scale: 0.85,
          autoAlpha: 0,
          duration: 0.24,
          stagger: 0.05,
          ease: 'back.out(1.4)',
          delay: 0.18,
        });
      }

      const formTl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        delay: 0.1,
      });

      formTl.from('.hp-form-panel', {
        x: 28,
        autoAlpha: 0,
        duration: 0.35,
      });

      formTl.from(
        '.hp-anim-form-head',
        { y: 10, autoAlpha: 0, duration: 0.28 },
        '-=0.18',
      );

      formTl.from(
        '.hp-anim-fields .hp-field, .hp-anim-fields .hp-field-row',
        { y: 10, autoAlpha: 0, duration: 0.28, stagger: 0.045 },
        '-=0.18',
      );

      formTl.from(
        ['.hp-btn-primary', '.hp-divider', '.hp-btn-google', '.hp-form-footer'],
        { y: 8, autoAlpha: 0, duration: 0.24, stagger: 0.04 },
        '-=0.15',
      );
      const heroTl = gsap.timeline({
        defaults: { ease: 'power2.out' },
        delay: 0.05,
      });

      heroTl.from('.hp-hero__orb', {
        scale: 0.5,
        autoAlpha: 0,
        duration: 0.8,
        stagger: 0.12,
        ease: 'power1.out',
      });

      heroTl.from(
        '.hp-anim-brand',
        { y: -12, autoAlpha: 0, duration: 0.4 },
        '-=0.55',
      );

      heroTl.from(
        '.hp-anim-copy',
        { y: 16, autoAlpha: 0, duration: 0.38, stagger: 0.08 },
        '-=0.28',
      );

      heroTl.from(
        '.hp-anim-features > *',
        { x: -14, autoAlpha: 0, duration: 0.35, stagger: 0.07 },
        '-=0.2',
      );

      heroTl.from(
        '.hp-anim-stats',
        { y: 8, autoAlpha: 0, duration: 0.3 },
        '-=0.15',
      );
    },
  );
}

/* ══════════════════════════════════════════════════════════════════
   MOBILE HERO ENTER  
══════════════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════════════
   SHAKE ERROR  
══════════════════════════════════════════════════════════════════ */
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
   SIDEBAR NAV ITEMS  
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

/* ══════════════════════════════════════════════════════════════════
   DASHBOARD CARDS  
══════════════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════════════
   ROUTE TRANSITIONS  
══════════════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════════════
   HEARTBEAT PULSE  —  cập nhật selector mặc định cho logo mới
══════════════════════════════════════════════════════════════════ */
export function heartbeatPulse(selector = '.hp-logo'): void {
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
      repeatDelay: 0.65,
    });
  });
}

/* ══════════════════════════════════════════════════════════════════
   COUNT UP  
══════════════════════════════════════════════════════════════════ */
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

/* ══════════════════════════════════════════════════════════════════
   BADGE POP  
══════════════════════════════════════════════════════════════════ */
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
