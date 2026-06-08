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
