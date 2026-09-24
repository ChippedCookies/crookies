const hero = document.querySelector<HTMLElement>('[data-hero]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

async function startHeroScroll(root: HTMLElement): Promise<void> {
  try {
    const [{ gsap }, { ScrollTrigger }] = await Promise.all([import('gsap'), import('gsap/ScrollTrigger')]);
    gsap.registerPlugin(ScrollTrigger);

    const scrollTrigger = { trigger: root, start: 'top top', end: 'bottom top', scrub: true };
    gsap.to(root.querySelector('[data-hero-title]'), { yPercent: -18, scale: 0.94, opacity: 0.25, ease: 'none', scrollTrigger });
    gsap.to(root.querySelector('[data-hero-timeline]'), { yPercent: -12, rotate: -2, ease: 'none', scrollTrigger });
  } catch (error) {
    // The hero is fully readable without this effect, so log and carry on.
    console.error('Hero scroll animation could not load', error);
  }
}

if (hero && !reduceMotion) {
  void startHeroScroll(hero);
}

export {};
