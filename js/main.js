// Mobile menu toggle
const toggle = document.getElementById('navToggle');
const menu = document.getElementById('navMenu');
toggle.addEventListener('click', () => menu.classList.toggle('is-open'));
menu.querySelectorAll('a').forEach((link) =>
  link.addEventListener('click', () => menu.classList.remove('is-open'))
);

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

// Typewriter effect for name
const typed = document.getElementById('typed');
const caret = document.getElementById('caret');
if (typed) {
  const text = '丘伟栋';
  let i = 0;
  const tick = () => {
    if (i <= text.length) {
      typed.textContent = text.slice(0, i);
      i++;
      setTimeout(tick, 550);
    } else if (caret) {
      caret.classList.add('done');
    }
  };
  setTimeout(tick, 600);
}
