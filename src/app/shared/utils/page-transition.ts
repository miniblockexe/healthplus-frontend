import gsap from 'gsap';

export function pageEnter(
  selector: string,
  opts: { duration?: number; delay?: number; y?: number } = {},
): void {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return;

  const { duration = 0.32, delay = 0, y = 14 } = opts;

  gsap.fromTo(
    el,
    { opacity: 0, y },
    { opacity: 1, y: 0, duration, delay, ease: 'power2.out' },
  );
}