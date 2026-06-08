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

// Typewriter effect: type hello line, then name line
const typed = document.getElementById('typed');
const typedHello = document.getElementById('typedHello');
const caret = document.getElementById('caret');
if (typed && typedHello) {
  const hello = 'hello,我是';
  const name = '丘伟栋';
  const speed = 50;

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
