// Shared page shell for every route OUTSIDE the homepage (which stays a single
// self-contained file — public/index.html — since it's heavily interactive
// and already battle-tested; refactoring it onto this shell wasn't worth the
// risk). Every new top-level page (Work, Lines, AI Studio, Studio, Contact,
// Partners, Privacy, Terms) is assembled here so nav/footer/base styles live
// in exactly one place instead of being copy-pasted across ten files.
//
// Deliberately not a templating engine — just template literals and one
// string-building function. No new dependency, matches the rest of the app.

const NAV_LINKS = [
  { href: '/work', label: 'Work' },
  { href: '/lines', label: 'The Lines' },
  { href: '/ai-studio', label: 'AI Studio' },
  { href: '/studio', label: 'Studio' },
  { href: '/partners', label: 'Partners' },
  { href: '/contact', label: 'Contact' }
];

const FAVICON = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='195 335 155 130'%3E%3Cpath fill='%236bdb37' d='M268.65,351.18h62.57l-98.05,53.1v-17.62c0-19.59,15.88-35.48,35.48-35.48Z'/%3E%3Cpath fill='%236bdb37' d='M331.22,351.18v62.16c0,19.59-15.88,35.48-35.47,35.48h-62.58l98.05-97.64Z'/%3E%3C/svg%3E`;

const BASE_STYLE = `
  :root {
    --ease-apple: cubic-bezier(0.16, 1, 0.3, 1);
    --ease-spring: cubic-bezier(0.34, 1.56, 0.64, 1);
    --nav-h: 5rem;
  }
  @media (max-width: 767px) { :root { --nav-h: 4rem; } }
  html, body { overflow-x: hidden; max-width: 100%; }
  html { scroll-behavior: smooth; }
  body { font-family: 'Poppins', sans-serif; }
  h1, h2, h3, .font-display { font-family: 'Poppins', sans-serif; }

  .skip-link {
    position: absolute; left: 1rem; top: -3rem; z-index: 100;
    background: #6bdb37; color: #1c242a; padding: .6rem 1rem; border-radius: 9999px;
    font-size: .875rem; font-weight: 600; transition: top .25s var(--ease-apple);
  }
  .skip-link:focus { top: 1rem; }

  .reveal {
    opacity: 0; transform: translateY(28px) scale(.985); filter: blur(6px);
    transition: opacity 1s var(--ease-apple), transform 1s var(--ease-apple), filter 1s var(--ease-apple);
    will-change: opacity, transform, filter;
  }
  .reveal.in { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }

  .nav-link { position: relative; }
  .nav-link::after {
    content: ""; position: absolute; left: 0; bottom: -4px; height: 2px; width: 0%;
    background: #6bdb37; transition: width .3s var(--ease-apple);
  }
  .nav-link:hover::after, .nav-link.active::after { width: 100%; }

  #site-header { transition: box-shadow .4s var(--ease-apple), background-color .4s var(--ease-apple); }
  #site-header.is-scrolled { box-shadow: 0 12px 30px -14px rgba(0,0,0,.45); }
  #nav-row { height: var(--nav-h); transition: height .4s var(--ease-apple); }

  .grain {
    background-image: radial-gradient(circle at 20% 20%, rgba(107,219,55,0.18), transparent 40%),
                       radial-gradient(circle at 80% 0%, rgba(107,219,55,0.12), transparent 35%);
  }

  ::selection { background: #6bdb37; color: #1c242a; }
  .magnetic { display: inline-flex; will-change: transform; }
  .chip-btn { transition: border-color .3s var(--ease-apple), background-color .3s var(--ease-apple), color .3s var(--ease-apple); }
  .step-panel { transition: opacity .4s var(--ease-apple), transform .4s var(--ease-apple); }
  .step-panel.is-hidden { opacity: 0; transform: translateY(8px); position: absolute; inset: 0; pointer-events: none; }
  .step-panel.is-active { opacity: 1; transform: translateY(0); position: relative; }
  @keyframes pop { 0% { transform: scale(1); } 35% { transform: scale(1.07); } 100% { transform: scale(1); } }
  .pulse { animation: pop .4s var(--ease-spring); }
  input:focus, textarea:focus, select:focus { outline: none; }

  .portfolio-item { transition: opacity .4s var(--ease-apple), transform .4s var(--ease-apple); }
  .portfolio-item .thumb { transition: transform .6s var(--ease-apple); }
  .portfolio-item:hover .thumb { transform: scale(1.045); }

  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    .reveal { transition: none !important; opacity: 1 !important; transform: none !important; filter: none !important; }
    .magnetic { transition: none !important; }
    * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; }
  }
`;

function renderNav() {
  const desktopLinks = NAV_LINKS.map((l) => `<a href="${l.href}" class="nav-link hover:text-white">${l.label}</a>`).join('\n      ');
  const mobileLinks = NAV_LINKS.map((l) => `<a href="${l.href}" class="mobile-link py-3 border-b border-white/5">${l.label}</a>`).join('\n      ');
  return `
<header id="site-header" class="fixed top-0 inset-x-0 z-50 bg-ink-800/95 backdrop-blur border-b border-white/10">
  <div id="nav-row" class="max-w-7xl mx-auto px-5 sm:px-8 flex items-center justify-between">
    <a href="/" class="flex items-center gap-2 font-display font-700 text-xl tracking-tight text-white">
      <svg class="h-8 w-8" viewBox="195 335 155 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
        <path fill="#6bdb37" d="M268.65,351.18h62.57l-98.05,53.1v-17.62c0-19.59,15.88-35.48,35.48-35.48Z"/>
        <path fill="#6bdb37" d="M331.22,351.18v62.16c0,19.59-15.88,35.48-35.47,35.48h-62.58l98.05-97.64Z"/>
      </svg>
      <span>leafcut</span>
    </a>

    <nav class="hidden md:flex items-center gap-8 text-sm font-medium text-grey-200" aria-label="Primary">
      ${desktopLinks}
    </nav>

    <a href="/contact" class="magnetic hidden md:inline-flex items-center gap-2 rounded-full bg-leaf-500 hover:bg-leaf-400 text-grey-950 text-sm font-semibold px-5 py-2.5 transition-colors">
      Book a call
    </a>

    <button id="menu-btn" aria-label="Toggle menu" aria-expanded="false" aria-controls="mobile-menu" class="md:hidden text-white p-2 -mr-2">
      <svg id="icon-open" class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/></svg>
      <svg id="icon-close" class="w-6 h-6 hidden" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
    </button>
  </div>

  <div id="mobile-menu" class="md:hidden hidden border-t border-white/10 bg-ink-800">
    <nav class="flex flex-col px-5 py-4 gap-1 text-grey-200" aria-label="Mobile">
      ${mobileLinks}
      <a href="/contact" class="mobile-link mt-3 inline-flex justify-center items-center rounded-full bg-leaf-500 text-grey-950 text-sm font-semibold px-5 py-3">Book a call</a>
    </nav>
  </div>
</header>`;
}

function renderFooter() {
  return `
<footer class="bg-ink-800 text-ink-200">
  <div class="max-w-7xl mx-auto px-5 sm:px-8 py-16 grid md:grid-cols-12 gap-12">

    <div class="md:col-span-5 reveal">
      <a href="/" class="flex items-center gap-2 font-display font-700 text-lg text-white">
        <svg class="h-7 w-7" viewBox="195 335 155 130" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <path fill="#6bdb37" d="M268.65,351.18h62.57l-98.05,53.1v-17.62c0-19.59,15.88-35.48,35.48-35.48Z"/>
          <path fill="#6bdb37" d="M331.22,351.18v62.16c0,19.59-15.88,35.48-35.47,35.48h-62.58l98.05-97.64Z"/>
        </svg>
        <span>leafcut</span>
      </a>
      <p class="mt-4 text-sm leading-relaxed text-ink-300 max-w-sm">The best product companies in the world do not own their factories. They hire the best one. Leafcut is that floor for video — 50,000 finished videos, one system, delivered in as little as 24 hours.</p>
    </div>

    <div class="md:col-span-3 reveal" style="transition-delay:.05s">
      <p class="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-4">Navigate</p>
      <nav class="flex flex-col gap-3 text-sm" aria-label="Footer">
        <a href="/work" class="hover:text-white transition-colors">Work</a>
        <a href="/lines" class="hover:text-white transition-colors">The Lines</a>
        <a href="/ai-studio" class="hover:text-white transition-colors">AI Studio</a>
        <a href="/studio" class="hover:text-white transition-colors">Studio</a>
        <a href="/partners" class="hover:text-white transition-colors">Partners</a>
        <a href="/contact" class="hover:text-white transition-colors">Contact</a>
      </nav>
    </div>

    <div class="md:col-span-4 reveal" style="transition-delay:.1s">
      <p class="text-xs font-semibold tracking-widest uppercase text-ink-400 mb-4">Get in touch</p>
      <a href="mailto:hello@leafcut.studio" class="text-sm hover:text-white transition-colors">hello@leafcut.studio</a>
      <p class="mt-2 text-sm text-ink-300">24-hour delivery available</p>
      <a href="/contact" class="magnetic mt-6 inline-flex items-center gap-2 rounded-full bg-leaf-500 hover:bg-leaf-400 text-grey-950 text-sm font-semibold px-5 py-2.5 transition-colors">
        Book a call
      </a>
    </div>

  </div>

  <div class="border-t border-white/10">
    <div class="max-w-7xl mx-auto px-5 sm:px-8 py-6 flex flex-col-reverse sm:flex-row items-center justify-between gap-4 text-xs text-ink-400">
      <p>© <span id="year"></span> Leafcut. All rights reserved.</p>
      <div class="flex items-center gap-6">
        <a href="/privacy" class="hover:text-white transition-colors">Privacy policy</a>
        <a href="/terms" class="hover:text-white transition-colors">Terms of service</a>
      </div>
    </div>
  </div>
</footer>`;
}

const BASE_SCRIPT = `
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const menuBtn = document.getElementById('menu-btn');
  const mobileMenu = document.getElementById('mobile-menu');
  const iconOpen = document.getElementById('icon-open');
  const iconClose = document.getElementById('icon-close');
  menuBtn.addEventListener('click', () => {
    const isHidden = mobileMenu.classList.contains('hidden');
    mobileMenu.classList.toggle('hidden');
    iconOpen.classList.toggle('hidden', isHidden);
    iconClose.classList.toggle('hidden', !isHidden);
    menuBtn.setAttribute('aria-expanded', String(isHidden));
  });
  document.querySelectorAll('.mobile-link').forEach(link => {
    link.addEventListener('click', () => {
      mobileMenu.classList.add('hidden');
      iconOpen.classList.remove('hidden');
      iconClose.classList.add('hidden');
      menuBtn.setAttribute('aria-expanded', 'false');
    });
  });

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.add('in'); io.unobserve(entry.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal').forEach(el => io.observe(el));

  // Active nav link — page-level match (these are separate pages, not
  // anchor sections within one page, so this is pathname equality rather
  // than the homepage's scroll-position IntersectionObserver).
  document.querySelectorAll('.nav-link, .mobile-link').forEach(link => {
    if (link.getAttribute('href') === location.pathname) link.classList.add('active');
  });

  const header = document.getElementById('site-header');
  window.addEventListener('scroll', () => {
    header.classList.toggle('is-scrolled', window.scrollY > 40);
  }, { passive: true });

  if (!prefersReducedMotion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    document.querySelectorAll('.magnetic').forEach(el => {
      let targetX = 0, targetY = 0, curX = 0, curY = 0, raf = null;
      function tick() {
        curX += (targetX - curX) * 0.18;
        curY += (targetY - curY) * 0.18;
        el.style.transform = \`translate(\${curX.toFixed(2)}px, \${curY.toFixed(2)}px)\`;
        if (Math.abs(targetX - curX) > 0.05 || Math.abs(targetY - curY) > 0.05) raf = requestAnimationFrame(tick);
        else { curX = targetX; curY = targetY; el.style.transform = \`translate(\${curX}px, \${curY}px)\`; raf = null; }
      }
      function startLoop() { if (!raf) raf = requestAnimationFrame(tick); }
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        targetX = (e.clientX - r.left - r.width / 2) * 0.3;
        targetY = (e.clientY - r.top - r.height / 2) * 0.4;
        startLoop();
      });
      el.addEventListener('mouseleave', () => { targetX = 0; targetY = 0; startLoop(); });
    });
  }

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();
`;

// title/description: page-specific SEO metadata (the whole point of the multi-
// page split — one title tag and one heading per page, so each can rank for
// one thing). path: used for canonical URL + og:url. bodyHtml: page content,
// rendered inside <main>. extraHead/extraScripts: page-specific additions
// (e.g. the Work page's portfolio-fetching script, the Contact page's
// qualifier-form script) appended after the shared block.
function renderPage({ title, description, path, bodyHtml, extraHead = '', extraScripts = '' }) {
  const canonical = `https://leafcut.studio${path}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>
<meta name="description" content="${description}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${canonical}">
<meta name="theme-color" content="#36454f">

<meta property="og:type" content="website">
<meta property="og:site_name" content="Leafcut">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${canonical}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">

<script src="https://cdn.tailwindcss.com"></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
<link rel="icon" type="image/svg+xml" href="${FAVICON}">

<script>
  tailwind.config = {
    theme: {
      extend: {
        colors: {
          leaf: { 50: '#f1fce9', 100: '#ddf7c9', 200: '#bdef99', 300: '#96e563', 400: '#7fe04a', 500: '#6bdb37', 600: '#54b52c', 700: '#428f23', 800: '#356f1e', 900: '#2b591b', 950: '#15300c' },
          grey: { 50: '#f7f7f7', 100: '#eeeeee', 200: '#d9d9d9', 300: '#bfbfbf', 400: '#999999', 500: '#666666', 600: '#595959', 700: '#4a4a4a', 800: '#333333', 900: '#1f1f1f', 950: '#141414' },
          ink: { 50: '#eef1f3', 100: '#dde4e8', 200: '#b9c5cc', 300: '#93a4ad', 400: '#71828c', 500: '#56656f', 600: '#46525b', 700: '#3d4750', 800: '#36454f', 900: '#2a353d', 950: '#1c242a' }
        },
        fontFamily: { display: ['Poppins', 'sans-serif'], sans: ['Poppins', 'sans-serif'] }
      }
    }
  }
</script>

<style>${BASE_STYLE}</style>
${extraHead}
</head>

<body class="bg-white text-grey-900 antialiased">
<a href="#main-content" class="skip-link">Skip to content</a>
${renderNav()}
<main id="main-content">
${bodyHtml}
</main>
${renderFooter()}
<script>${BASE_SCRIPT}</script>
${extraScripts}
</body>
</html>`;
}

module.exports = { renderPage, NAV_LINKS };
