const videos = document.querySelectorAll<HTMLVideoElement>('[data-preview-video]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

async function play(video: HTMLVideoElement): Promise<void> {
  try {
    await video.play();
  } catch (error) {
    // Autoplay can be blocked (e.g. low-power mode); the poster image stays visible.
    if (!(error instanceof DOMException && error.name === 'AbortError')) {
      console.warn('Preview video could not play', error);
    }
  }
}

if (videos.length > 0 && !reduceMotion && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const video = entry.target as HTMLVideoElement;
        if (entry.isIntersecting) void play(video);
        else video.pause();
      }
    },
    { threshold: 0.6 },
  );

  videos.forEach((video) => {
    video.addEventListener('playing', () => video.classList.add('is-playing'));
    video.addEventListener('error', () => video.classList.remove('is-playing'));
    observer.observe(video);
  });
}

export {};
