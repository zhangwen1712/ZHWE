const viewer = document.querySelector('.image-viewer');

if (viewer && typeof viewer.showModal === 'function') {
  const enlarged = viewer.querySelector('img');
  const close = viewer.querySelector('.image-viewer-close');
  let trigger = null;

  for (const button of document.querySelectorAll('.entry-content .wp-lightbox-container .lightbox-trigger')) {
    const image = button.parentElement.querySelector('img');
    if (!image) continue;
    button.setAttribute('aria-label', viewer.dataset.enlargeLabel);
    button.addEventListener('click', () => {
      trigger = button;
      enlarged.src = image.currentSrc || image.src;
      enlarged.alt = image.alt;
      viewer.showModal();
      close.focus();
    });
    button.parentElement.classList.add('image-viewer-ready');
  }

  close.addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => {
    if (event.target === viewer) viewer.close();
  });
  viewer.addEventListener('close', () => {
    enlarged.removeAttribute('src');
    trigger?.focus();
  });
}
