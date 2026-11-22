for (const section of document.querySelectorAll('.comment-form-section')) {
  const texts = JSON.parse(section.dataset.texts || '[]');
  const form = section.querySelector('form');
  const status = section.querySelector('.comment-status');
  const list = section.querySelector('.live-comments');
  const button = form.querySelector('button[type="submit"]');
  const post = Number(section.dataset.postId);
  let widgetId;
  let token = '';
  const setStatus = message => { status.textContent = message; };
  fetch(`/api/comments?post=${post}`).then(async response => {
    if (!response.ok || !response.headers.get('content-type')?.includes('application/json')) throw new Error();
    const data = await response.json();
    for (const comment of data.comments) {
      const item = document.createElement('article'); item.className = 'comment-body';
      const name = document.createElement('strong'); name.textContent = comment.author;
      const body = document.createElement('p'); body.textContent = comment.body;
      item.append(name, body); list.append(item);
    }
  }).catch(() => setStatus(texts[5]));
  const sitekey = section.dataset.sitekey;
  if (!sitekey) { setStatus(texts[5]); continue; }
  const script = document.createElement('script');
  script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
  script.async = true;
  script.onload = () => {
    if (!window.turnstile) { setStatus(texts[8]); return; }
    widgetId = window.turnstile.render(section.querySelector('.comment-turnstile'), {
      sitekey, action: 'comment',
      callback(value) { token = value; button.disabled = false; },
      'expired-callback'() { token = ''; button.disabled = true; },
      'error-callback'() { token = ''; button.disabled = true; setStatus(texts[8]); }
    });
  };
  script.onerror = () => setStatus(texts[8]);
  document.head.append(script);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (!token) return;
    button.disabled = true; setStatus(texts[6]);
    const data = new FormData(form);
    try {
      const response = await fetch('/api/comments', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ post, author: data.get('author'), body: data.get('body'), website: data.get('website'), token }) });
      if (!response.ok) throw new Error();
      form.reset(); setStatus(texts[7]);
    } catch { setStatus(texts[8]); }
    finally {
      token = '';
      if (widgetId !== undefined) window.turnstile?.reset(widgetId);
    }
  });
}
