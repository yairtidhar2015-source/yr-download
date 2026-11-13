// Free basic templates. Every template produces the same file layout so the
// free editor (theme colors, fonts, animations) and the AI work on any of them:
//   index.html (+ other pages) · styles.css · script.js

export const FONTS = [
  'Inter', 'Poppins', 'Playfair Display', 'DM Sans', 'Space Grotesk', 'Lora',
  'Montserrat', 'Rubik', 'Heebo', 'Assistant', 'Outfit', 'Merriweather',
];

export const ANIMATIONS = ['none', 'fade', 'fade-up', 'zoom', 'slide-left'];

export function fontImport(heading, body) {
  const fam = [...new Set([heading, body])]
    .map((f) => `family=${f.replace(/ /g, '+')}:wght@400;600;800`).join('&');
  return `@import url('https://fonts.googleapis.com/css2?${fam}&display=swap');`;
}

function baseCss({ primary, accent, bg, surface, text, muted, heading, body, radius = '14px' }) {
  return `${fontImport(heading, body)}

:root {
  --color-primary: ${primary};
  --color-accent: ${accent};
  --color-bg: ${bg};
  --color-surface: ${surface};
  --color-text: ${text};
  --color-muted: ${muted};
  --font-heading: '${heading}', system-ui, sans-serif;
  --font-body: '${body}', system-ui, sans-serif;
  --radius: ${radius};
  --max: 1120px;
}

* { box-sizing: border-box; }
html { scroll-behavior: smooth; }
body { margin: 0; background: var(--color-bg); color: var(--color-text); font-family: var(--font-body); line-height: 1.65; }
img { max-width: 100%; display: block; }
a { color: var(--color-primary); }
h1, h2, h3 { font-family: var(--font-heading); line-height: 1.15; margin: 0 0 .5em; }
h1 { font-size: clamp(2.2rem, 5vw, 3.8rem); letter-spacing: -0.02em; }
h2 { font-size: clamp(1.7rem, 3.4vw, 2.5rem); }
p { margin: 0 0 1em; }
.container { width: min(var(--max), 100% - 40px); margin-inline: auto; }
.muted { color: var(--color-muted); }

/* Header */
.site-header { position: sticky; top: 0; z-index: 10; background: color-mix(in srgb, var(--color-bg) 88%, transparent); backdrop-filter: blur(10px); border-bottom: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent); }
.site-header .container { display: flex; align-items: center; justify-content: space-between; height: 68px; }
.brand { font-family: var(--font-heading); font-weight: 800; font-size: 1.25rem; color: var(--color-text); text-decoration: none; }
.nav { display: flex; gap: 26px; }
.nav a { color: var(--color-text); text-decoration: none; font-weight: 600; opacity: .8; }
.nav a:hover, .nav a[aria-current="page"] { opacity: 1; color: var(--color-primary); }
.nav-toggle { display: none; background: none; border: 0; font-size: 1.6rem; color: var(--color-text); cursor: pointer; }

/* Buttons */
.btn { display: inline-block; padding: 14px 26px; border-radius: 999px; background: var(--color-primary); color: #fff; font-weight: 700; text-decoration: none; border: 0; cursor: pointer; transition: transform .2s, box-shadow .2s; }
.btn:hover { transform: translateY(-2px); box-shadow: 0 10px 30px color-mix(in srgb, var(--color-primary) 35%, transparent); }
.btn-outline { background: transparent; color: var(--color-text); border: 2px solid color-mix(in srgb, var(--color-text) 20%, transparent); }

/* Sections */
section { padding: 88px 0; }
.hero { padding: 110px 0 90px; }
.hero-grid { display: grid; grid-template-columns: 1.1fr .9fr; gap: 48px; align-items: center; }
.hero p.lead { font-size: 1.2rem; color: var(--color-muted); max-width: 560px; }
.hero .actions { display: flex; gap: 14px; flex-wrap: wrap; margin-top: 28px; }
.hero-art { aspect-ratio: 4/3; border-radius: calc(var(--radius) * 2); background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); box-shadow: 0 30px 80px color-mix(in srgb, var(--color-primary) 30%, transparent); overflow: hidden; }
.hero-art img { width: 100%; height: 100%; object-fit: cover; }
.section-head { text-align: center; max-width: 640px; margin: 0 auto 48px; }
.eyebrow { display: inline-block; font-size: .8rem; font-weight: 800; letter-spacing: .12em; text-transform: uppercase; color: var(--color-primary); margin-bottom: 10px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
.card { background: var(--color-surface); border-radius: var(--radius); padding: 30px; border: 1px solid color-mix(in srgb, var(--color-text) 7%, transparent); }
.card .icon { width: 48px; height: 48px; border-radius: 12px; display: grid; place-items: center; font-size: 1.4rem; background: color-mix(in srgb, var(--color-primary) 14%, transparent); margin-bottom: 16px; }
.alt { background: var(--color-surface); }
.cta-band { text-align: center; background: linear-gradient(135deg, var(--color-primary), var(--color-accent)); color: #fff; border-radius: calc(var(--radius) * 2); padding: 64px 28px; }
.cta-band .btn { background: #fff; color: var(--color-primary); }
.quote { font-size: 1.15rem; }
.quote footer { margin-top: 14px; font-weight: 700; }

/* Contact form */
form.contact { display: grid; gap: 14px; max-width: 560px; margin: 0 auto; }
form.contact input, form.contact textarea { width: 100%; padding: 14px 16px; border-radius: 12px; border: 1px solid color-mix(in srgb, var(--color-text) 15%, transparent); background: var(--color-surface); color: var(--color-text); font: inherit; }

.site-footer { padding: 40px 0; border-top: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent); color: var(--color-muted); font-size: .95rem; }
.site-footer .container { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 12px; }

/* Basic animations – set data-animate="fade | fade-up | zoom | slide-left" on any element */
.js [data-animate] { opacity: 0; transition: opacity .8s ease, transform .8s ease; }
.js [data-animate="fade-up"] { transform: translateY(36px); }
.js [data-animate="zoom"] { transform: scale(.94); }
.js [data-animate="slide-left"] { transform: translateX(-48px); }
.js [data-animate].is-visible, .js [data-animate="none"] { opacity: 1; transform: none; }
@media (prefers-reduced-motion: reduce) { .js [data-animate] { opacity: 1; transform: none; transition: none; } }

@media (max-width: 860px) {
  .hero-grid, .grid-3 { grid-template-columns: 1fr; }
  .nav { display: none; position: absolute; top: 68px; left: 0; right: 0; flex-direction: column; gap: 0; background: var(--color-bg); padding: 10px 20px 20px; border-bottom: 1px solid color-mix(in srgb, var(--color-text) 8%, transparent); }
  .nav.open { display: flex; }
  .nav a { padding: 12px 0; }
  .nav-toggle { display: block; }
  section { padding: 64px 0; }
}
`;
}

const BASE_JS = `// Site behaviour: mobile menu + scroll animations
document.documentElement.classList.add('js');
document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.nav');
  if (toggle && nav) toggle.addEventListener('click', () => nav.classList.toggle('open'));

  const items = document.querySelectorAll('[data-animate]');
  if (!('IntersectionObserver' in window)) { items.forEach((el) => el.classList.add('is-visible')); return; }
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('is-visible'); io.unobserve(e.target); } });
  }, { threshold: 0.12 });
  items.forEach((el) => io.observe(el));
});
`;

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function pageShell({ brand, pages, current, title, description, body, anim }) {
  const nav = pages.map((p) => `<a href="${p.file}"${p.file === current ? ' aria-current="page"' : ''}>${esc(p.label)}</a>`).join('\n        ');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(title)}</title>
  <meta name="description" content="${esc(description)}">
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  <header class="site-header">
    <div class="container">
      <a class="brand" href="index.html">${esc(brand)}</a>
      <button class="nav-toggle" aria-label="Open menu">&#9776;</button>
      <nav class="nav">
        ${nav}
      </nav>
    </div>
  </header>
  <main>
${body.replaceAll('{{anim}}', anim)}
  </main>
  <footer class="site-footer">
    <div class="container">
      <span>&copy; ${new Date().getFullYear()} ${esc(brand)}</span>
      <span>Made with SiteForge AI</span>
    </div>
  </footer>
  <script src="script.js"></script>
</body>
</html>
`;
}

const features = (items) => items.map(([icon, h, p]) => `
        <div class="card" data-animate="{{anim}}"><div class="icon">${icon}</div><h3>${esc(h)}</h3><p class="muted">${esc(p)}</p></div>`).join('');

function contactSection(heading = 'Get in touch') {
  return `
    <section id="contact">
      <div class="container">
        <div class="section-head" data-animate="{{anim}}"><span class="eyebrow">Contact</span><h2>${esc(heading)}</h2><p class="muted">Leave a message and we'll reply within one business day.</p></div>
        <form class="contact" data-animate="{{anim}}" onsubmit="event.preventDefault(); this.innerHTML='<p>Thanks! We will be in touch soon.</p>';">
          <input name="name" placeholder="Your name" required>
          <input name="email" type="email" placeholder="Email" required>
          <textarea name="message" rows="5" placeholder="How can we help?"></textarea>
          <button class="btn" type="submit">Send message</button>
        </form>
      </div>
    </section>`;
}

const TEMPLATES = {
  blank: {
    name: 'Blank canvas',
    description: 'A clean one-page starting point.',
    theme: { primary: '#4f46e5', accent: '#06b6d4', bg: '#ffffff', surface: '#f5f6fa', text: '#111827', muted: '#6b7280', heading: 'Inter', body: 'Inter' },
    brand: 'My Website',
    pages: [{ file: 'index.html', label: 'Home', title: 'My Website', body: `
    <section class="hero">
      <div class="container" style="text-align:center">
        <h1 data-animate="{{anim}}">Your story starts here</h1>
        <p class="lead" style="margin-inline:auto" data-animate="{{anim}}">Click any text to edit it, or ask the AI to build something amazing.</p>
        <div class="actions" style="justify-content:center"><a class="btn" href="#contact">Get started</a></div>
      </div>
    </section>${contactSection()}` }],
  },
  business: {
    name: 'Business',
    description: 'Services company with features, testimonials and contact.',
    theme: { primary: '#2563eb', accent: '#7c3aed', bg: '#ffffff', surface: '#f4f6fb', text: '#0f172a', muted: '#64748b', heading: 'Poppins', body: 'Inter' },
    brand: 'Northwind Consulting',
    pages: [
      { file: 'index.html', label: 'Home', title: 'Northwind Consulting – Grow with confidence', body: `
    <section class="hero">
      <div class="container hero-grid">
        <div data-animate="{{anim}}">
          <span class="eyebrow">Strategy · Operations · Growth</span>
          <h1>Grow your business with clarity and confidence</h1>
          <p class="lead">We help small and mid-sized companies turn ambitious goals into simple, measurable plans.</p>
          <div class="actions"><a class="btn" href="#contact">Book a free call</a><a class="btn btn-outline" href="about.html">About us</a></div>
        </div>
        <div class="hero-art" data-animate="{{anim}}"></div>
      </div>
    </section>
    <section class="alt">
      <div class="container">
        <div class="section-head" data-animate="{{anim}}"><span class="eyebrow">What we do</span><h2>Services built around you</h2></div>
        <div class="grid-3">${features([['📈', 'Growth strategy', 'Find the fastest path to your next milestone.'], ['⚙️', 'Operations', 'Remove bottlenecks and free up your team.'], ['🤝', 'Coaching', 'Hands-on guidance for founders and managers.']])}
        </div>
      </div>
    </section>
    <section>
      <div class="container grid-3">
        <blockquote class="card quote" data-animate="{{anim}}">"Revenue up 40% in a year. Best decision we made."<footer>Dana L., CEO</footer></blockquote>
        <blockquote class="card quote" data-animate="{{anim}}">"Clear, practical and incredibly fast."<footer>Omer K., Founder</footer></blockquote>
        <blockquote class="card quote" data-animate="{{anim}}">"They feel like part of our team."<footer>Noa B., COO</footer></blockquote>
      </div>
    </section>${contactSection('Let’s talk about your goals')}` },
      { file: 'about.html', label: 'About', title: 'About – Northwind Consulting', body: `
    <section class="hero">
      <div class="container" data-animate="{{anim}}">
        <span class="eyebrow">About us</span>
        <h1>Practical advice from people who have built companies</h1>
        <p class="lead">Founded in 2015, our team of operators has helped more than 200 businesses grow.</p>
      </div>
    </section>
    <section class="alt"><div class="container grid-3">${features([['🎯', 'Focused', 'One clear plan instead of a 90-page report.'], ['⚡', 'Fast', 'First results within 30 days.'], ['🔍', 'Transparent', 'Fixed prices, no surprises.']])}
    </div></section>` },
    ],
  },
  portfolio: {
    name: 'Portfolio',
    description: 'Showcase for designers, photographers and creatives.',
    theme: { primary: '#f97316', accent: '#ec4899', bg: '#0f0f12', surface: '#18181d', text: '#f4f4f5', muted: '#a1a1aa', heading: 'Space Grotesk', body: 'DM Sans' },
    brand: 'Maya Levi',
    pages: [{ file: 'index.html', label: 'Work', title: 'Maya Levi – Designer', body: `
    <section class="hero">
      <div class="container" data-animate="{{anim}}">
        <span class="eyebrow">Product designer · Tel Aviv</span>
        <h1>I design calm, useful digital products.</h1>
        <p class="lead">Ten years crafting apps and brands for startups and studios.</p>
        <div class="actions"><a class="btn" href="#contact">Work with me</a></div>
      </div>
    </section>
    <section class="alt">
      <div class="container">
        <div class="section-head" data-animate="{{anim}}"><span class="eyebrow">Selected work</span><h2>Recent projects</h2></div>
        <div class="grid-3">${features([['🛒', 'Shoply app', 'E-commerce app redesign – +28% conversion.'], ['🏦', 'Bankit brand', 'Identity and design system for a neobank.'], ['🧘', 'Calm studio', 'Booking site for a yoga studio.']])}
        </div>
      </div>
    </section>${contactSection('Have a project in mind?')}` }],
  },
  restaurant: {
    name: 'Restaurant & Café',
    description: 'Menu highlights, opening hours and reservations.',
    theme: { primary: '#b45309', accent: '#dc2626', bg: '#fffaf3', surface: '#fbefdc', text: '#292524', muted: '#78716c', heading: 'Playfair Display', body: 'Lora' },
    brand: 'Olive & Thyme',
    pages: [
      { file: 'index.html', label: 'Home', title: 'Olive & Thyme – Mediterranean kitchen', body: `
    <section class="hero">
      <div class="container hero-grid">
        <div data-animate="{{anim}}">
          <span class="eyebrow">Mediterranean kitchen</span>
          <h1>Fresh food, made with love every day</h1>
          <p class="lead">Seasonal dishes, wood-fired bread and a warm table waiting for you.</p>
          <div class="actions"><a class="btn" href="#contact">Reserve a table</a><a class="btn btn-outline" href="menu.html">See the menu</a></div>
        </div>
        <div class="hero-art" data-animate="{{anim}}"></div>
      </div>
    </section>
    <section class="alt"><div class="container grid-3">${features([['🥗', 'Fresh daily', 'Vegetables from local farms every morning.'], ['🔥', 'Wood-fired', 'Bread and pizza from our stone oven.'], ['🍷', 'Great wine', 'A curated list of local wineries.']])}
    </div></section>
    <section><div class="container"><div class="cta-band" data-animate="{{anim}}"><h2>Open every day 12:00–23:00</h2><p>12 Harbor Street · 03-555-0123</p><a class="btn" href="#contact">Book now</a></div></div></section>${contactSection('Reserve a table')}` },
      { file: 'menu.html', label: 'Menu', title: 'Menu – Olive & Thyme', body: `
    <section class="hero"><div class="container" data-animate="{{anim}}"><span class="eyebrow">Our menu</span><h1>Made from scratch</h1></div></section>
    <section class="alt"><div class="container grid-3">${features([['🥙', 'Starters', 'Hummus, labneh, roasted eggplant – from ₪28'], ['🍝', 'Mains', 'Fresh pasta, grilled fish, slow lamb – from ₪62'], ['🍰', 'Desserts', 'Malabi, olive-oil cake – from ₪32']])}
    </div></section>` },
    ],
  },
  startup: {
    name: 'Startup / App',
    description: 'Product landing page with features and call to action.',
    theme: { primary: '#7c3aed', accent: '#22d3ee', bg: '#0b0b14', surface: '#141428', text: '#eef0ff', muted: '#9ca3c7', heading: 'Outfit', body: 'Inter' },
    brand: 'Flowly',
    pages: [{ file: 'index.html', label: 'Product', title: 'Flowly – Your team, in flow', body: `
    <section class="hero">
      <div class="container hero-grid">
        <div data-animate="{{anim}}">
          <span class="eyebrow">New · v2.0</span>
          <h1>Your team’s work, finally in flow</h1>
          <p class="lead">Plan, track and ship together – without the chaos of ten different tools.</p>
          <div class="actions"><a class="btn" href="#contact">Start free</a><a class="btn btn-outline" href="#features">See features</a></div>
        </div>
        <div class="hero-art" data-animate="{{anim}}"></div>
      </div>
    </section>
    <section id="features" class="alt"><div class="container">
      <div class="section-head" data-animate="{{anim}}"><span class="eyebrow">Features</span><h2>Everything in one place</h2></div>
      <div class="grid-3">${features([['🗂️', 'Boards', 'Visual boards that everyone understands.'], ['⏱️', 'Automations', 'Let routine work run itself.'], ['📊', 'Insights', 'See progress at a glance.']])}
      </div></div></section>
    <section><div class="container"><div class="cta-band" data-animate="{{anim}}"><h2>Join 3,000+ teams</h2><p>Free for up to 5 people.</p><a class="btn" href="#contact">Get started</a></div></div></section>${contactSection('Request a demo')}` }],
  },
};

export function listTemplates() {
  return Object.entries(TEMPLATES).map(([id, t]) => ({ id, name: t.name, description: t.description, theme: t.theme }));
}

export function buildTemplate(id, { brand } = {}) {
  const t = TEMPLATES[id];
  if (!t) return null;
  const name = (brand || t.brand).slice(0, 60);
  const files = { 'styles.css': baseCss(t.theme), 'script.js': BASE_JS };
  for (const p of t.pages) {
    files[p.file] = pageShell({
      brand: name, pages: t.pages, current: p.file, title: p.title.replace(t.brand, name),
      description: t.description, body: p.body, anim: 'fade-up',
    });
  }
  return files;
}
