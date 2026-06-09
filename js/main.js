// Mobile menu toggle
const toggle = document.getElementById('navToggle');
const menu = document.getElementById('navMenu');
toggle.addEventListener('click', () => menu.classList.toggle('is-open'));
menu.querySelectorAll('a').forEach((link) =>
  link.addEventListener('click', () => menu.classList.remove('is-open'))
);

// Keep browser scroll restoration on (refresh returns to last viewed position)
if ('scrollRestoration' in history) history.scrollRestoration = 'auto';

// Scrollspy: highlight active nav card
const cards = Array.from(document.querySelectorAll('.nav__card'));
const spy = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        cards.forEach((c) => c.classList.toggle('active', c.dataset.target === e.target.id));
      }
    });
  },
  { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
);
cards.forEach((c) => {
  const sec = document.getElementById(c.dataset.target);
  if (sec) spy.observe(sec);
  // Smooth-scroll without leaving a #hash in the URL, so refresh
  // restores the last scrolled position instead of jumping to the anchor.
  c.addEventListener('click', (e) => {
    e.preventDefault();
    menu.classList.remove('is-open');
    if (sec) sec.scrollIntoView({ behavior: 'smooth' });
    history.replaceState(null, '', location.pathname + location.search);
  });
});

// If the page was opened with a #hash, jump once then strip it so future
// refreshes use scroll-position restoration.
if (location.hash) {
  const target = document.getElementById(location.hash.slice(1));
  if (target) {
    requestAnimationFrame(() => {
      target.scrollIntoView();
      history.replaceState(null, '', location.pathname + location.search);
    });
  }
}

// Scroll reveal
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add('is-visible');
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.15 }
);
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// Footer year
document.getElementById('year').textContent = new Date().getFullYear();

// Typewriter effect: type hello line, then name line
const typed = document.getElementById('typed');
const typedHello = document.getElementById('typedHello');
const caret = document.getElementById('caret');
if (typed && typedHello) {
  const hello = 'hello,我是';
  const name = '丘伟栋';
  const speed = 30;

  const typeName = () => {
    let i = 0;
    const tick = () => {
      typed.textContent = name.slice(0, i);
      if (i < name.length) { i++; setTimeout(tick, speed); }
      else if (caret) { caret.classList.add('done'); }
    };
    tick();
  };

  const typeHello = () => {
    let i = 0;
    if (caret) caret.style.display = 'none';
    typedHello.classList.add('typing');
    const tick = () => {
      typedHello.textContent = hello.slice(0, i);
      if (i < hello.length) { i++; setTimeout(tick, speed); }
      else { typedHello.classList.remove('typing'); if (caret) caret.style.display = ''; setTimeout(typeName, speed); }
    };
    tick();
  };

  setTimeout(typeHello, 500);
}
