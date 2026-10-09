/** Lite YouTube facade: replaces the poster link with a youtube-nocookie iframe on click. */
const ID = /^[\w-]{11}$/;

export function initYouTube(root: Document = document) {
  for (const box of root.querySelectorAll<HTMLElement>('[data-yt]')) {
    const id = box.dataset.yt ?? '';
    const play = box.querySelector<HTMLAnchorElement>('[data-yt-play]');
    if (!play || !ID.test(id)) continue;
    play.addEventListener('click', (event) => {
      event.preventDefault();
      const frame = document.createElement('iframe');
      frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`;
      frame.title = play.dataset.ytTitle ?? 'YouTube video';
      frame.allow = 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
      frame.allowFullscreen = true;
      frame.className = 'absolute inset-0 size-full border-0';
      play.replaceWith(frame);
      frame.focus();
    });
  }
}
