// Standalone top-level pages that exist for their own URL/title/meta-description
// (the whole point of splitting off the homepage's single-page sections) rather
// than being reached only by scrolling. Dynamic sections (Work's portfolio grid,
// Studio's team grid) are server-rendered here from the same store the homepage
// reads from, so content stays in sync and search engines see real HTML without
// needing to run JS.
const { createRouter } = require('../http-helpers');
const router = createRouter();
const store = require('../store');
const { renderPage } = require('../render');

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const CTA_BANNER = `
  <section class="py-16 md:py-20 bg-grey-50">
    <div class="max-w-3xl mx-auto px-5 sm:px-8 text-center reveal">
      <h2 class="font-display text-2xl sm:text-3xl font-700 tracking-tight">Tell us what you need to ship this quarter.</h2>
      <p class="mt-3 text-grey-600">Thirty minutes. We will map the volume, the formats and the turnaround, and tell you plainly whether we are the right floor for it.</p>
      <a href="/contact" class="magnetic mt-6 inline-flex items-center gap-2 rounded-full bg-leaf-500 hover:bg-leaf-400 text-ink-900 font-semibold px-7 py-3.5 transition-colors">Book a call</a>
    </div>
  </section>`;

const VIDEO_LIGHTBOX = `
<div id="video-lightbox" class="hidden fixed inset-0 z-[70] bg-ink-950/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8" onclick="if (event.target === this) closeVideoLightbox()">
  <div class="relative w-full max-w-3xl">
    <button type="button" class="absolute -top-10 right-0 text-white/80 hover:text-white text-sm font-medium" onclick="closeVideoLightbox()" aria-label="Close video">✕ Close</button>
    <div class="aspect-video rounded-xl overflow-hidden bg-black shadow-2xl">
      <iframe id="video-lightbox-frame" class="w-full h-full" src="" title="Project video" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>
  </div>
</div>`;

const VIDEO_LIGHTBOX_SCRIPT = `
  function toEmbedUrl(url) {
    if (!url) return '';
    let u; try { u = new URL(url); } catch { return ''; }
    const host = u.hostname.replace(/^www\\.|^m\\./, '');
    if (host === 'youtube.com') {
      if (u.pathname === '/watch') { const id = u.searchParams.get('v'); return id ? 'https://www.youtube.com/embed/' + id : ''; }
      if (u.pathname.startsWith('/embed/')) return url;
      if (u.pathname.startsWith('/shorts/')) { const id = u.pathname.split('/')[2]; return id ? 'https://www.youtube.com/embed/' + id : ''; }
      return '';
    }
    if (host === 'youtu.be') { const id = u.pathname.slice(1); return id ? 'https://www.youtube.com/embed/' + id : ''; }
    if (host === 'vimeo.com') { const id = u.pathname.split('/').filter(Boolean)[0]; return id && /^\\d+$/.test(id) ? 'https://player.vimeo.com/video/' + id : ''; }
    if (host === 'player.vimeo.com') return url;
    return '';
  }
  function openVideoLightbox(url) {
    const embed = toEmbedUrl(url);
    if (!embed) return;
    const frame = document.getElementById('video-lightbox-frame');
    frame.src = embed + (embed.includes('?') ? '&' : '?') + 'autoplay=1';
    document.getElementById('video-lightbox').classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  }
  function closeVideoLightbox() {
    document.getElementById('video-lightbox').classList.add('hidden');
    document.getElementById('video-lightbox-frame').src = '';
    document.body.classList.remove('overflow-hidden');
  }
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeVideoLightbox(); });
`;

// ===== Work =====
const CATEGORY_META = {
  explainer: { label: 'Explainer', grad: 'from-leaf-800 to-ink-900' },
  saas: { label: 'SaaS', grad: 'from-ink-700 to-leaf-900' },
  animation: { label: 'Animation', grad: 'from-leaf-700 to-ink-950' },
  social: { label: 'Social', grad: 'from-ink-900 to-leaf-800' }
};

function renderPortfolioCard(item) {
  const meta = CATEGORY_META[item.category] || CATEGORY_META.explainer;
  const hasThumb = !!item.thumbnailUrl;
  const hasVideo = !!item.videoUrl;
  return `
      <div class="portfolio-item reveal group" data-cat="${escapeHtml(item.category)}">
        <a href="#" class="block" onclick="event.preventDefault(); ${hasVideo ? `openVideoLightbox('${escapeHtml(item.videoUrl)}')` : ''}">
          <div class="thumb relative aspect-[4/3] rounded-2xl overflow-hidden ${hasThumb ? 'bg-ink-900' : `bg-gradient-to-br ${meta.grad}`} flex items-center justify-center bg-cover bg-center" ${hasThumb ? `style="background-image:url('${escapeHtml(item.thumbnailUrl)}')"` : ''}>
            ${hasThumb ? '<div class="absolute inset-0 bg-black/20"></div>' : ''}
            <svg class="relative w-9 h-9 text-white/70 group-hover:text-leaf-400 transition-colors" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>
            <span class="absolute top-3 left-3 text-[11px] uppercase tracking-wide font-semibold bg-black/40 text-white px-2.5 py-1 rounded-full">${meta.label}</span>
          </div>
          <h3 class="mt-3 font-medium text-base">${escapeHtml(item.title)}</h3>
          <p class="text-sm text-grey-500">${escapeHtml(item.subtitle)}</p>
        </a>
      </div>`;
}

router.get('/work', async (req, res, next) => {
  try {
    const content = await store.getContent();
    const cards = (content.portfolio || []).map(renderPortfolioCard).join('');
    const body = `
  <section class="pt-40 pb-16 md:pt-48 md:pb-20 bg-ink-800 text-white grain">
    <div class="max-w-7xl mx-auto px-5 sm:px-8 reveal">
      <p class="text-xs font-semibold tracking-widest uppercase text-leaf-400 mb-3">Work</p>
      <h1 class="font-display text-4xl sm:text-5xl font-700 tracking-tight max-w-2xl">Off the line.</h1>
      <p class="mt-5 text-grey-300 text-lg max-w-2xl leading-relaxed">Case studies from the floor, filterable by format. Every one of these ran through the same four-checkpoint system: producer, editor, quality lead, creative lead.</p>
    </div>
  </section>

  <section class="py-16 md:py-20 bg-white">
    <div class="max-w-7xl mx-auto px-5 sm:px-8">
      <div id="filters" class="flex flex-wrap gap-2 mb-10 reveal" role="group" aria-label="Filter by category">
        <button data-filter="all" aria-pressed="true" class="filter-btn active-filter text-sm font-medium px-4 py-2 rounded-full border border-grey-900 bg-grey-900 text-white transition-colors">All</button>
        <button data-filter="explainer" aria-pressed="false" class="filter-btn text-sm font-medium px-4 py-2 rounded-full border border-grey-300 text-grey-600 hover:border-grey-900 transition-colors">Explainer</button>
        <button data-filter="saas" aria-pressed="false" class="filter-btn text-sm font-medium px-4 py-2 rounded-full border border-grey-300 text-grey-600 hover:border-grey-900 transition-colors">SaaS</button>
        <button data-filter="animation" aria-pressed="false" class="filter-btn text-sm font-medium px-4 py-2 rounded-full border border-grey-300 text-grey-600 hover:border-grey-900 transition-colors">Animation</button>
        <button data-filter="social" aria-pressed="false" class="filter-btn text-sm font-medium px-4 py-2 rounded-full border border-grey-300 text-grey-600 hover:border-grey-900 transition-colors">Social</button>
      </div>
      <div id="portfolio-grid" class="relative grid sm:grid-cols-2 lg:grid-cols-3 gap-6">${cards}</div>
      <p class="mt-6 text-xs text-grey-400">Thumbnails shown are placeholders where a real still hasn't been added yet.</p>
    </div>
  </section>
  ${CTA_BANNER}
  ${VIDEO_LIGHTBOX}`;

    const html = renderPage({
      title: 'Work — Case Studies by Line | Leafcut',
      description: 'Video production case studies from Leafcut’s floor, filterable by format — explainer, SaaS demo, animation and social.',
      path: '/work',
      bodyHtml: body,
      extraScripts: `<script>
        ${VIDEO_LIGHTBOX_SCRIPT}
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
          btn.addEventListener('click', () => {
            filterBtns.forEach(b => {
              b.classList.remove('active-filter', 'bg-grey-900', 'text-white', 'border-grey-900');
              b.classList.add('border-grey-300', 'text-grey-600');
              b.setAttribute('aria-pressed', 'false');
            });
            btn.classList.add('active-filter', 'bg-grey-900', 'text-white', 'border-grey-900');
            btn.classList.remove('border-grey-300', 'text-grey-600');
            btn.setAttribute('aria-pressed', 'true');
            const filter = btn.dataset.filter;
            document.querySelectorAll('.portfolio-item').forEach(item => {
              item.style.display = (filter === 'all' || item.dataset.cat === filter) ? '' : 'none';
            });
          });
        });
      </script>`
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  } catch (err) { next(err); }
});

// ===== The Lines =====
const LINES = [
  {
    id: 's1', slug: 'product-explainer', number: '01', title: 'Product & Explainer',
    tagline: 'The 60 to 120 seconds that makes a complicated product obvious.',
    summary: 'Demos, feature videos, onboarding walkthroughs.',
    body: [
      'This is usually the first line a product marketing team runs with us, and often the door into the rest of the floor. The brief is simple to state and hard to execute at volume: take something a customer doesn’t understand yet, and make it obvious in under two minutes.',
      'Every explainer goes through the same system as everything else on the floor — a producer who owns the brief, a script pass, storyboarded visuals, and a final cut checked against your brand system before it ships. What changes release to release is the product; what doesn’t change is the process, which is why the fortieth explainer looks like the first.',
      'Built for teams shipping a feature roadmap, not a single video: onboarding walkthroughs, feature announcements, landing-page heroes, sales-enablement clips — all cut from the same brand system so your library reads as one product, not six different vendors.'
    ]
  },
  {
    id: 's2', slug: 'brand-launch-film', number: '02', title: 'Brand & Launch Film',
    tagline: 'The piece the whole company watches on launch day.',
    summary: 'Live-action feel, cinematic finish, no shoot day required.',
    body: [
      'This is the flagship line — the film that plays at the all-hands, opens the funding announcement, or leads the campaign. It carries more weight than any other single asset a marketing team commissions in a year, and it’s treated that way on our floor: a creative lead is attached from the first brief, not just the final sign-off.',
      'The cinematic, live-action feel comes from our AI production stack rather than a shoot day — no crew, no location, no reshoot when the script changes two days before launch. The craft standard doesn’t move; what changes is how fast you can get there and how much a change of direction costs you.',
      'Ideal for launch days, funding rounds, brand refreshes, and the handful of moments a year where the video has to be right the first time, because there isn’t a second showing.'
    ]
  },
  {
    id: 's3', slug: 'training-enablement', number: '03', title: 'Training & Enablement',
    tagline: 'Onboarding, compliance and enablement libraries, delivered LMS-ready.',
    summary: 'Built to be refreshed rather than remade.',
    body: [
      'L&D libraries are where most video vendors quietly fail — not on the first module, but on the fortieth, when the process drifts and the library stops looking like it came from one company. That’s the exact failure mode a production line is built to prevent.',
      'Every module is delivered LMS-ready and built on the same brand system and template set, so when your process changes — a new tool, an updated policy, a re-org — you refresh the module instead of remaking the library from scratch. That’s a materially different cost structure than commissioning each module as a one-off.',
      'Built for heads of L&D running libraries at scale: onboarding tracks, compliance training, product enablement, and internal certification content that needs to stay current without a full re-shoot every time something changes.'
    ]
  },
  {
    id: 's4', slug: 'localisation', number: '04', title: 'Localisation',
    tagline: 'One master film, every market you sell into.',
    summary: 'Translated, voiced, lip-synced, with a human checking every language.',
    body: [
      'A film that only exists in one language is a film that only sells in one market. This line takes a single master and produces market-ready versions across the languages you actually sell in — translated, voiced, and lip-synced, with a human checking every language rather than shipping raw machine output.',
      'The AI production stack is what makes twenty language versions of the same film commercially realistic instead of a budget line that gets cut. The quality bar doesn’t drop per language — every version goes through the same four-checkpoint system as the master.',
      'Built for global marketing teams who currently choose between paying per-market agency rates or simply not localising at all. This line exists so that isn’t the choice.'
    ]
  },
  {
    id: 's5', slug: 'content-operations', number: '05', title: 'Content Operations',
    tagline: 'Standing editing capacity for channels and content teams.',
    summary: 'Your backlog cleared every week, at an agreed monthly output.',
    body: [
      'Not every video is a project — for teams running an always-on channel, video is a queue. This line is standing capacity rather than a one-off engagement: an agreed monthly output, a named editor who knows your format, and a backlog that actually gets cleared instead of growing.',
      'This is the line most similar to what a well-run in-house team provides, minus the hiring, the sick days, and the ramp-up time on a new hire’s fourth week. Capacity is agreed in writing before the first delivery, so you know what a normal week looks like.',
      'Built for content leads running YouTube channels, social programmes, podcast cutdowns, or any format where the volume is the point — consistent output, on a schedule, without re-briefing from zero each time.'
    ]
  }
];
const LINE_BY_SLUG = Object.fromEntries(LINES.map((l) => [l.slug, l]));

router.get('/lines', async (req, res) => {
  const cards = LINES.map((line, i) => `
      <a href="/lines/${line.slug}" class="reveal card-hover block bg-white border border-grey-200 rounded-2xl p-7" style="transition-delay:${(i * 0.05).toFixed(2)}s">
        <p class="text-xs font-semibold tracking-widest uppercase text-leaf-600 mb-3">Line ${line.number}</p>
        <h3 class="font-display text-lg font-700">${escapeHtml(line.title)}</h3>
        <p class="mt-2 text-sm text-grey-600 leading-relaxed">${escapeHtml(line.tagline)}</p>
        <span class="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-leaf-600">Learn more <span aria-hidden="true">&rarr;</span></span>
      </a>`).join('');

  const body = `
  <section class="pt-40 pb-16 md:pt-48 md:pb-20 bg-ink-800 text-white grain">
    <div class="max-w-7xl mx-auto px-5 sm:px-8 reveal">
      <p class="text-xs font-semibold tracking-widest uppercase text-leaf-400 mb-3">The Lines</p>
      <h1 class="font-display text-4xl sm:text-5xl font-700 tracking-tight max-w-2xl">Five lines. One floor.</h1>
      <p class="mt-5 text-grey-300 text-lg max-w-2xl leading-relaxed">Each line is a production system in its own right — its own specialists, its own templates, its own delivery spec. Run one. Run all five.</p>
    </div>
  </section>
  <section class="py-16 md:py-20 bg-grey-50">
    <div class="max-w-7xl mx-auto px-5 sm:px-8">
      <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">${cards}</div>
    </div>
  </section>
  ${CTA_BANNER}`;

  const html = renderPage({
    title: 'The Lines — Five Production Lines | Leafcut',
    description: 'Five production lines, one floor: Product & Explainer, Brand & Launch Film, Training & Enablement, Localisation, and Content Operations.',
    path: '/lines',
    bodyHtml: body
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
});

router.get('/lines/:slug', async (req, res) => {
  const line = LINE_BY_SLUG[req.params.slug];
  if (!line) { res.status(404); return res.end('Not found'); }

  const others = LINES.filter((l) => l.slug !== line.slug);
  const paragraphs = line.body.map((p) => `<p class="mt-5 text-grey-600 text-lg leading-relaxed">${escapeHtml(p)}</p>`).join('');
  const otherLinks = others.map((l) => `<a href="/lines/${l.slug}" class="text-sm font-medium text-grey-600 hover:text-leaf-600 transition-colors">Line ${l.number} · ${escapeHtml(l.title)}</a>`).join('');

  const body = `
  <section class="pt-40 pb-16 md:pt-48 md:pb-20 bg-ink-800 text-white grain">
    <div class="max-w-7xl mx-auto px-5 sm:px-8 reveal">
      <p class="text-xs font-semibold tracking-widest uppercase text-leaf-400 mb-3">Line ${line.number} &middot; <a href="/lines" class="hover:text-white transition-colors">The Lines</a></p>
      <h1 class="font-display text-4xl sm:text-5xl font-700 tracking-tight max-w-2xl">${escapeHtml(line.title)}</h1>
      <p class="mt-5 text-grey-300 text-lg max-w-2xl leading-relaxed">${escapeHtml(line.tagline)}</p>
      <a href="/contact" class="magnetic mt-8 inline-flex items-center gap-2 rounded-full bg-leaf-500 hover:bg-leaf-400 text-ink-900 font-semibold px-7 py-3.5 transition-colors">Book a call</a>
    </div>
  </section>
  <section class="py-16 md:py-20 bg-white">
    <div class="max-w-3xl mx-auto px-5 sm:px-8 reveal">
      ${paragraphs}
    </div>
  </section>
  <section class="py-14 bg-grey-50">
    <div class="max-w-7xl mx-auto px-5 sm:px-8">
      <p class="text-xs font-semibold tracking-widest uppercase text-grey-500 mb-4">Other lines</p>
      <div class="flex flex-wrap gap-x-8 gap-y-3">${otherLinks}</div>
    </div>
  </section>
  ${CTA_BANNER}`;

  const html = renderPage({
    title: `${line.title} — Line ${line.number} | Leafcut`,
    description: `${line.tagline} ${line.summary}`,
    path: `/lines/${line.slug}`,
    bodyHtml: body
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
});

// ===== AI Studio =====
router.get('/ai-studio', async (req, res) => {
  const body = `
  <section class="pt-40 pb-16 md:pt-48 md:pb-20 bg-ink-800 text-white grain">
    <div class="max-w-7xl mx-auto px-5 sm:px-8 reveal">
      <p class="text-xs font-semibold tracking-widest uppercase text-leaf-400 mb-3">The AI Studio</p>
      <h1 class="font-display text-4xl sm:text-5xl font-700 tracking-tight max-w-2xl">The budget stopped being the ceiling.</h1>
    </div>
  </section>

  <section class="py-16 md:py-20 bg-white">
    <div class="max-w-7xl mx-auto px-5 sm:px-8">
      <div class="max-w-3xl reveal">
        <p class="text-grey-600 text-lg leading-relaxed">Three years ago the video in your head needed a crew, a soundstage, a VFX house and a six-figure budget. Most of those ideas were never made — not because they were wrong, but because the number came back and the answer was no.</p>
        <p class="mt-5 text-grey-600 text-lg leading-relaxed">That constraint has collapsed. Work that sat in the hundred-thousand bracket now sits inside a normal campaign budget. Cinematic sequences, synthetic presenters, full animation, twenty language versions of the same film — produced on our floor, directed by people who were making this work before the tools existed.</p>
        <p class="mt-5 text-grey-800 text-lg leading-relaxed font-semibold">The ceiling on what you can make is no longer the budget. It is the brief.</p>
      </div>

      <div class="mt-14 grid sm:grid-cols-3 gap-6">
        <div class="reveal rounded-2xl bg-grey-50 border border-grey-200 p-7" style="transition-delay:.1s">
          <p class="text-sm text-grey-400 line-through">$100,000 production</p>
          <p class="mt-1.5 font-display text-2xl font-700 text-leaf-700">now $10,000 bracket</p>
        </div>
        <div class="reveal rounded-2xl bg-grey-50 border border-grey-200 p-7" style="transition-delay:.15s">
          <p class="text-sm text-grey-400 line-through">$10,000 video</p>
          <p class="mt-1.5 font-display text-2xl font-700 text-leaf-700">now $1,000 bracket</p>
        </div>
        <div class="reveal rounded-2xl bg-grey-50 border border-grey-200 p-7" style="transition-delay:.2s">
          <p class="text-sm text-grey-400 line-through">Six weeks</p>
          <p class="mt-1.5 font-display text-2xl font-700 text-leaf-700">now 72 hours</p>
        </div>
      </div>
      <p class="mt-6 max-w-3xl text-grey-500 reveal">The saving is not a discount. It is a different production model — no crew, no location, no reshoots, and a floor in Kathmandu instead of a studio in London. The craft standard does not move.</p>

      <div class="mt-16 max-w-2xl reveal">
        <h2 class="font-display text-2xl sm:text-3xl font-700 tracking-tight">What comes out of it</h2>
      </div>
      <div class="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <div class="reveal bg-white border border-grey-200 rounded-2xl p-7" style="transition-delay:.1s">
          <h3 class="font-display text-lg font-700">Cinematic brand film</h3>
          <p class="mt-2 text-sm text-grey-600 leading-relaxed">Scale, scope and finish that used to require a shoot week and a crew of thirty.</p>
        </div>
        <div class="reveal bg-white border border-grey-200 rounded-2xl p-7" style="transition-delay:.15s">
          <h3 class="font-display text-lg font-700">Full animation &amp; motion</h3>
          <p class="mt-2 text-sm text-grey-600 leading-relaxed">Character work, 2D and 3D sequences, at a fraction of a traditional animation house.</p>
        </div>
        <div class="reveal bg-white border border-grey-200 rounded-2xl p-7" style="transition-delay:.2s">
          <h3 class="font-display text-lg font-700">Synthetic presenters</h3>
          <p class="mt-2 text-sm text-grey-600 leading-relaxed">A named, consistent on-screen presenter across a whole library, in every language you sell in.</p>
        </div>
        <div class="reveal bg-white border border-grey-200 rounded-2xl p-7" style="transition-delay:.25s">
          <h3 class="font-display text-lg font-700">Twenty markets, one master</h3>
          <p class="mt-2 text-sm text-grey-600 leading-relaxed">Translated, voiced, lip-synced, and quality-checked by a human in every language.</p>
        </div>
        <div class="reveal bg-white border border-grey-200 rounded-2xl p-7" style="transition-delay:.3s">
          <h3 class="font-display text-lg font-700">Concepts that were never affordable</h3>
          <p class="mt-2 text-sm text-grey-600 leading-relaxed">The idea that got cut from the deck because the quote came back too high. Bring it back.</p>
        </div>
      </div>

      <div class="mt-16 rounded-2xl bg-ink-800 text-white p-8 sm:p-10 reveal">
        <p class="text-xs font-semibold tracking-widest uppercase text-leaf-400 mb-4">The AI trust block</p>
        <p class="font-display text-xl sm:text-2xl font-700 leading-snug mb-6">Human creative direction on every project, without exception.</p>
        <ul class="space-y-3 text-grey-300 text-base sm:text-lg">
          <li class="flex gap-3"><span class="text-leaf-400 mt-1" aria-hidden="true">&mdash;</span><span>Human final cut. Nothing reaches you that a creative lead has not signed off.</span></li>
          <li class="flex gap-3"><span class="text-leaf-400 mt-1" aria-hidden="true">&mdash;</span><span>Your material is never used to train third-party models.</span></li>
          <li class="flex gap-3"><span class="text-leaf-400 mt-1" aria-hidden="true">&mdash;</span><span>Licensed assets and licensed voices only. Full written disclosure of AI use on request, and on any project where you need it for your own compliance.</span></li>
        </ul>
      </div>
    </div>
  </section>
  ${CTA_BANNER}`;

  const html = renderPage({
    title: 'The AI Studio — Cinematic Work at a Fraction of the Cost | Leafcut',
    description: 'Cinematic sequences, synthetic presenters, full animation and twenty-language versions — produced on our floor, directed by humans, at a fraction of traditional cost.',
    path: '/ai-studio',
    bodyHtml: body
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
});

// ===== Studio =====
const TEAM_COLORS = {
  c1: 'from-leaf-500 to-leaf-800', c2: 'from-ink-600 to-ink-900',
  c3: 'from-leaf-600 to-ink-800', c4: 'from-ink-700 to-leaf-900'
};
function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
}
function renderTeamCard(item) {
  return `
      <div class="reveal text-center">
        <div class="mx-auto h-28 w-28 rounded-full bg-gradient-to-br ${TEAM_COLORS[item.color] || TEAM_COLORS.c1} flex items-center justify-center text-white font-display text-2xl font-700">${initials(item.name)}</div>
        <h3 class="mt-4 font-display font-700 text-base">${escapeHtml(item.name)}</h3>
        <p class="text-sm text-grey-500">${escapeHtml(item.role)}</p>
        <p class="mt-1.5 text-xs text-grey-400 leading-relaxed">${escapeHtml(item.bio || '')}</p>
      </div>`;
}

router.get('/studio', async (req, res, next) => {
  try {
    const content = await store.getContent();
    const site = content.site || {};
    const teamCards = (content.team || []).map(renderTeamCard).join('');
    const body = `
  <section class="pt-40 pb-16 md:pt-48 md:pb-20 bg-ink-800 text-white grain">
    <div class="max-w-7xl mx-auto px-5 sm:px-8 reveal">
      <p class="text-xs font-semibold tracking-widest uppercase text-leaf-400 mb-3">Studio</p>
      <h1 class="font-display text-4xl sm:text-5xl font-700 tracking-tight max-w-2xl">${escapeHtml(site.studioHeading || 'A production floor in Kathmandu, running for the world.')}</h1>
    </div>
  </section>

  <section class="py-16 md:py-20 bg-white">
    <div class="max-w-7xl mx-auto px-5 sm:px-8">
      <div class="max-w-3xl reveal">
        <p class="text-grey-600 text-lg leading-relaxed">${escapeHtml(site.studioPara1 || '')}</p>
        <p class="mt-5 text-grey-600 text-lg leading-relaxed">${escapeHtml(site.studioPara2 || '')}</p>
      </div>

      <div class="mt-16 max-w-2xl reveal">
        <p class="text-xs font-semibold tracking-widest uppercase text-leaf-600 mb-3">Who runs the floor</p>
        <h2 class="font-display text-2xl sm:text-3xl font-700 tracking-tight">A senior team, in one studio, on one system.</h2>
        <p class="mt-4 text-grey-600 text-lg">Every account has a named producer and a named creative lead from the first brief to final delivery — and they do not rotate.</p>
      </div>
      <div class="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">${teamCards}</div>
    </div>
  </section>
  ${CTA_BANNER}`;

    const html = renderPage({
      title: 'Studio — The Floor, The Team | Leafcut',
      description: 'Leafcut is a production floor in Kathmandu, Nepal — 30 to 50 producers, editors, animators and creative leads running one system built for volume.',
      path: '/studio',
      bodyHtml: body
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end(html);
  } catch (err) { next(err); }
});

// ===== Contact =====
router.get('/contact', async (req, res) => {
  const body = `
  <section class="pt-40 pb-16 md:pt-48 md:pb-20 bg-ink-800 text-white grain">
    <div class="max-w-7xl mx-auto px-5 sm:px-8 reveal">
      <p class="text-xs font-semibold tracking-widest uppercase text-leaf-400 mb-3">Contact</p>
      <h1 class="font-display text-4xl sm:text-5xl font-700 tracking-tight max-w-2xl">Tell us what you need to ship this quarter.</h1>
      <p class="mt-5 text-grey-300 text-lg max-w-2xl leading-relaxed">Thirty minutes. We will map the volume, the formats and the turnaround, and tell you plainly whether we are the right floor for it. Every enquiry answered within one business day.</p>
    </div>
  </section>

  <section class="py-16 md:py-20 bg-white">
    <div class="max-w-3xl mx-auto px-5 sm:px-8">
      <form id="contact-form" class="reveal bg-grey-50 border border-grey-200 rounded-2xl overflow-hidden">
        <div class="p-6 sm:p-7 pb-0">
          <div class="flex items-center justify-between gap-4">
            <h2 class="font-display text-lg font-700">Tell us the volume. We will tell you the number.</h2>
            <span class="text-xs text-grey-500 whitespace-nowrap">Step <span id="step-current">1</span>/4</span>
          </div>
          <p class="text-sm text-grey-500 mt-1 mb-5">No pricing on the site — every engagement is quoted at a fixed price against a fixed spec, on the call.</p>

          <div class="flex gap-1.5 mb-6" aria-label="Qualifier progress, step 1 of 4">
            <button type="button" class="step-dot h-1 flex-1 rounded-full bg-leaf-500" data-step="1" aria-label="Go to step 1: line"></button>
            <button type="button" class="step-dot h-1 flex-1 rounded-full bg-grey-200" data-step="2" aria-label="Go to step 2: volume"></button>
            <button type="button" class="step-dot h-1 flex-1 rounded-full bg-grey-200" data-step="3" aria-label="Go to step 3: turnaround"></button>
            <button type="button" class="step-dot h-1 flex-1 rounded-full bg-grey-200" data-step="4" aria-label="Go to step 4: your details"></button>
          </div>

          <div class="relative min-h-[104px] sm:min-h-[84px]" id="step-wrap">
            <div class="step-panel is-active" data-step="1">
              <p class="text-xs font-semibold text-grey-500 uppercase tracking-wide mb-3">Which line do you need?</p>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="line-btn chip-btn text-sm font-medium px-3.5 py-2 rounded-full border-2 border-grey-300 bg-white hover:border-leaf-500">Product &amp; Explainer</button>
                <button type="button" class="line-btn chip-btn text-sm font-medium px-3.5 py-2 rounded-full border-2 border-grey-300 bg-white hover:border-leaf-500">Brand &amp; Launch Film</button>
                <button type="button" class="line-btn chip-btn text-sm font-medium px-3.5 py-2 rounded-full border-2 border-grey-300 bg-white hover:border-leaf-500">Training &amp; Enablement</button>
                <button type="button" class="line-btn chip-btn text-sm font-medium px-3.5 py-2 rounded-full border-2 border-grey-300 bg-white hover:border-leaf-500">Localisation</button>
                <button type="button" class="line-btn chip-btn text-sm font-medium px-3.5 py-2 rounded-full border-2 border-grey-300 bg-white hover:border-leaf-500">Content Operations</button>
              </div>
            </div>
            <div class="step-panel is-hidden" data-step="2">
              <p class="text-xs font-semibold text-grey-500 uppercase tracking-wide mb-3">Monthly volume</p>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="volume-btn chip-btn text-sm font-medium px-3.5 py-2 rounded-full border-2 border-grey-300 bg-white hover:border-leaf-500">1–10 videos</button>
                <button type="button" class="volume-btn chip-btn text-sm font-medium px-3.5 py-2 rounded-full border-2 border-grey-300 bg-white hover:border-leaf-500">10–40 videos</button>
                <button type="button" class="volume-btn chip-btn text-sm font-medium px-3.5 py-2 rounded-full border-2 border-grey-300 bg-white hover:border-leaf-500">40–100 videos</button>
                <button type="button" class="volume-btn chip-btn text-sm font-medium px-3.5 py-2 rounded-full border-2 border-grey-300 bg-white hover:border-leaf-500">100+ videos</button>
              </div>
            </div>
            <div class="step-panel is-hidden" data-step="3">
              <p class="text-xs font-semibold text-grey-500 uppercase tracking-wide mb-3">Turnaround</p>
              <div class="flex flex-wrap gap-2">
                <button type="button" class="turnaround-btn chip-btn text-sm font-medium px-3.5 py-2 rounded-full border-2 border-grey-300 bg-white hover:border-leaf-500">24 hours</button>
                <button type="button" class="turnaround-btn chip-btn text-sm font-medium px-3.5 py-2 rounded-full border-2 border-grey-300 bg-white hover:border-leaf-500">48 hours</button>
                <button type="button" class="turnaround-btn chip-btn text-sm font-medium px-3.5 py-2 rounded-full border-2 border-grey-300 bg-white hover:border-leaf-500">72 hours</button>
                <button type="button" class="turnaround-btn chip-btn text-sm font-medium px-3.5 py-2 rounded-full border-2 border-grey-300 bg-white hover:border-leaf-500">Standard (5 business days)</button>
              </div>
            </div>
            <div class="step-panel is-hidden" data-step="4">
              <p class="text-xs font-semibold text-grey-500 uppercase tracking-wide mb-3">Your details</p>
              <div class="grid sm:grid-cols-2 gap-3">
                <div><label class="sr-only" for="name">Name</label><input required id="name" name="name" type="text" placeholder="Your name" class="w-full rounded-lg border border-grey-300 bg-white px-4 py-2.5 text-sm focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/20"></div>
                <div><label class="sr-only" for="email">Email</label><input required id="email" name="email" type="email" placeholder="you@company.com" class="w-full rounded-lg border border-grey-300 bg-white px-4 py-2.5 text-sm focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/20"></div>
                <div class="sm:col-span-2"><label class="sr-only" for="company">Company</label><input id="company" name="company" type="text" placeholder="Company" class="w-full rounded-lg border border-grey-300 bg-white px-4 py-2.5 text-sm focus:border-leaf-500 focus:ring-2 focus:ring-leaf-500/20"></div>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-6 bg-ink-800 text-white px-6 sm:px-7 py-4 flex items-center justify-between gap-4">
          <div>
            <p class="text-[10px] uppercase tracking-wide text-leaf-400 font-semibold leading-none">On the call</p>
            <p id="qualifier-summary" class="font-display text-base sm:text-lg font-700 leading-tight mt-1">We&#39;ll confirm capacity and quote against your spec.</p>
          </div>
          <div class="flex items-center gap-2">
            <button type="button" id="step-back" class="hidden text-sm font-medium px-4 py-2.5 rounded-full border border-white/25 hover:border-white transition-colors">Back</button>
            <button type="button" id="step-next" class="magnetic text-sm font-semibold px-5 py-2.5 rounded-full bg-leaf-500 text-ink-900 hover:bg-leaf-400 transition-colors">Next</button>
            <button type="submit" id="step-submit" class="magnetic hidden text-sm font-semibold px-5 py-2.5 rounded-full bg-leaf-500 text-ink-900 hover:bg-leaf-400 transition-colors">Book a call</button>
          </div>
        </div>

        <div class="px-6 sm:px-7 pb-6 sm:pb-7">
          <p id="form-success" class="hidden mt-4 text-sm text-leaf-700 font-medium"></p>
          <p class="mt-4 text-xs text-grey-400">No hourly billing, no scope-creep invoices — every engagement is quoted at a fixed price against a fixed spec, confirmed on the call.</p>
        </div>
      </form>
      <p class="mt-6 text-center text-sm text-grey-500">Or email us directly at <a href="mailto:hello@leafcut.studio" class="text-leaf-600 hover:text-leaf-700 font-medium">hello@leafcut.studio</a></p>
    </div>
  </section>`;

  const html = renderPage({
    title: 'Contact — Book a Call | Leafcut',
    description: 'Tell us the volume, the formats and the turnaround. We will tell you in one call whether the floor can hold it.',
    path: '/contact',
    bodyHtml: body,
    extraScripts: `<script>
      async function apiFetch(path, options) {
        const res = await fetch('/api' + path, {
          credentials: 'same-origin',
          headers: options && options.body ? { 'Content-Type': 'application/json' } : undefined,
          ...options
        });
        if (!res.ok) {
          let msg = res.statusText;
          try { const body = await res.json(); if (body && body.error) msg = body.error; } catch {}
          throw new Error(msg || ('Request failed: ' + res.status));
        }
        if (res.status === 204) return null;
        return res.json();
      }

      const lineBtns = document.querySelectorAll('.line-btn');
      const volumeBtns = document.querySelectorAll('.volume-btn');
      const turnaroundBtns = document.querySelectorAll('.turnaround-btn');
      const qualifierSummary = document.getElementById('qualifier-summary');
      const ACTIVE = ['border-leaf-500', 'bg-leaf-500/10', 'text-leaf-700'];
      const INACTIVE = ['border-grey-300'];
      function setActive(btn, group) {
        group.forEach(b => { b.classList.remove(...ACTIVE); b.classList.add(...INACTIVE); });
        btn.classList.remove(...INACTIVE);
        btn.classList.add(...ACTIVE);
      }
      function updateQualifierSummary() {
        const line = document.querySelector('.line-btn.border-leaf-500');
        const volume = document.querySelector('.volume-btn.border-leaf-500');
        const turnaround = document.querySelector('.turnaround-btn.border-leaf-500');
        const parts = [line, volume, turnaround].filter(Boolean).map(b => b.textContent.trim());
        qualifierSummary.textContent = parts.length ? parts.join(' \\u00b7 ') : "We'll confirm capacity and quote against your spec.";
      }
      lineBtns.forEach(btn => btn.addEventListener('click', () => { setActive(btn, lineBtns); updateQualifierSummary(); }));
      volumeBtns.forEach(btn => btn.addEventListener('click', () => { setActive(btn, volumeBtns); updateQualifierSummary(); }));
      turnaroundBtns.forEach(btn => btn.addEventListener('click', () => { setActive(btn, turnaroundBtns); updateQualifierSummary(); }));

      const stepPanels = document.querySelectorAll('.step-panel');
      const stepDots = document.querySelectorAll('.step-dot');
      const stepCurrent = document.getElementById('step-current');
      const stepBack = document.getElementById('step-back');
      const stepNext = document.getElementById('step-next');
      const stepSubmit = document.getElementById('step-submit');
      let currentStep = 1;
      function goToStep(n) {
        currentStep = Math.min(4, Math.max(1, n));
        stepPanels.forEach(p => {
          const active = parseInt(p.dataset.step, 10) === currentStep;
          p.classList.toggle('is-active', active);
          p.classList.toggle('is-hidden', !active);
        });
        stepDots.forEach((d, i) => {
          d.classList.toggle('bg-leaf-500', i < currentStep);
          d.classList.toggle('bg-grey-200', i >= currentStep);
        });
        stepCurrent.textContent = currentStep;
        stepBack.classList.toggle('hidden', currentStep === 1);
        stepNext.classList.toggle('hidden', currentStep === 4);
        stepSubmit.classList.toggle('hidden', currentStep !== 4);
      }
      stepNext.addEventListener('click', () => goToStep(currentStep + 1));
      stepBack.addEventListener('click', () => goToStep(currentStep - 1));
      stepDots.forEach(dot => dot.addEventListener('click', () => goToStep(parseInt(dot.dataset.step, 10))));
      goToStep(1);

      const form = document.getElementById('contact-form');
      const success = document.getElementById('form-success');
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        const activeLineBtn = document.querySelector('.line-btn.border-leaf-500');
        const activeVolumeBtn = document.querySelector('.volume-btn.border-leaf-500');
        const activeTurnaroundBtn = document.querySelector('.turnaround-btn.border-leaf-500');
        const payload = {
          name: form.querySelector('#name').value.trim(),
          email: form.querySelector('#email').value.trim(),
          company: form.querySelector('#company').value.trim(),
          line: activeLineBtn ? activeLineBtn.textContent.trim() : '',
          volume: activeVolumeBtn ? activeVolumeBtn.textContent.trim() : '',
          turnaround: activeTurnaroundBtn ? activeTurnaroundBtn.textContent.trim() : '',
          status: 'new'
        };
        const submitBtn = document.getElementById('step-submit');
        const originalLabel = submitBtn.textContent;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending\\u2026';
        success.classList.remove('hidden', 'text-leaf-700', 'text-red-600');
        try {
          await apiFetch('/leads', { method: 'POST', body: JSON.stringify(payload) });
          success.textContent = "Thanks \\u2014 that's been logged. We will map the volume, formats and turnaround, and follow up within one business day to book a call.";
          success.classList.add('text-leaf-700');
          form.querySelector('#name').value = '';
          form.querySelector('#email').value = '';
          form.querySelector('#company').value = '';
        } catch (err) {
          success.textContent = err.message || 'Something went wrong \\u2014 please try again or email us directly.';
          success.classList.add('text-red-600');
        } finally {
          submitBtn.disabled = false;
          submitBtn.textContent = originalLabel;
        }
      });
    </script>`
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
});

// ===== Partners =====
router.get('/partners', async (req, res) => {
  const body = `
  <section class="pt-40 pb-16 md:pt-48 md:pb-20 bg-ink-800 text-white grain">
    <div class="max-w-7xl mx-auto px-5 sm:px-8 reveal">
      <p class="text-xs font-semibold tracking-widest uppercase text-leaf-400 mb-3">Partners</p>
      <h1 class="font-display text-4xl sm:text-5xl font-700 tracking-tight max-w-2xl">Your brand. Our floor.</h1>
      <p class="mt-5 text-grey-300 text-lg max-w-2xl leading-relaxed">White-label production capacity for agencies who want to offer video at scale without building or staffing a floor of their own.</p>
      <a href="/contact" class="magnetic mt-8 inline-flex items-center gap-2 rounded-full bg-leaf-500 hover:bg-leaf-400 text-ink-900 font-semibold px-7 py-3.5 transition-colors">Book a call</a>
    </div>
  </section>

  <section class="py-16 md:py-20 bg-white">
    <div class="max-w-7xl mx-auto px-5 sm:px-8">
      <div class="max-w-3xl reveal">
        <p class="text-grey-600 text-lg leading-relaxed">Most agencies that pitch video either subcontract it ad hoc — different vendor per project, no consistent quality bar — or try to build production in-house, which means carrying editors and producers through the slow months to cover the busy ones. Neither is a good position to sell from.</p>
        <p class="mt-5 text-grey-600 text-lg leading-relaxed">Leafcut runs as your production floor instead. Work ships under your brand, to your client, on your account management — we’re the floor behind it, not a name on the invoice. You keep the relationship and the margin; we hold the capacity, the system, and the four-checkpoint quality process on every delivery.</p>
      </div>

      <div class="mt-14 grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <div class="reveal rounded-2xl bg-grey-50 border border-grey-200 p-7" style="transition-delay:.1s">
          <h3 class="font-display text-lg font-700">White-label delivery</h3>
          <p class="mt-2 text-sm text-grey-600 leading-relaxed">No Leafcut branding on anything your client sees. Files, comms and delivery specs match your agency’s standard.</p>
        </div>
        <div class="reveal rounded-2xl bg-grey-50 border border-grey-200 p-7" style="transition-delay:.15s">
          <h3 class="font-display text-lg font-700">A dedicated partner producer</h3>
          <p class="mt-2 text-sm text-grey-600 leading-relaxed">One producer who knows your accounts and your standards, so briefs don’t start from zero each time.</p>
        </div>
        <div class="reveal rounded-2xl bg-grey-50 border border-grey-200 p-7" style="transition-delay:.2s">
          <h3 class="font-display text-lg font-700">Overflow capacity, on demand</h3>
          <p class="mt-2 text-sm text-grey-600 leading-relaxed">Absorb a busy quarter without hiring for it, and scale back down without a layoff.</p>
        </div>
        <div class="reveal rounded-2xl bg-grey-50 border border-grey-200 p-7" style="transition-delay:.25s">
          <h3 class="font-display text-lg font-700">Same system, every time</h3>
          <p class="mt-2 text-sm text-grey-600 leading-relaxed">The same four-checkpoint process as every other line on the floor — your client never sees a quality dip.</p>
        </div>
      </div>
    </div>
  </section>
  ${CTA_BANNER}`;

  const html = renderPage({
    title: 'Partners — White-Label Video Production | Leafcut',
    description: 'White-label video production capacity for agencies — your brand, your client relationship, our floor and four-checkpoint quality system behind it.',
    path: '/partners',
    bodyHtml: body
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
});

// ===== Legal =====
const LEGAL_NOTICE = `<p class="text-sm text-leaf-800 bg-leaf-50 border border-leaf-200 rounded-xl px-5 py-4 mb-10">This is a standard draft, not yet reviewed by counsel. Do not treat it as final legal advice or a binding policy until Operations and counsel have signed off — see the ownership table in the site brief.</p>`;

router.get('/privacy', async (req, res) => {
  const body = `
  <section class="pt-40 pb-16 md:pt-48 md:pb-20 bg-ink-800 text-white grain">
    <div class="max-w-7xl mx-auto px-5 sm:px-8 reveal">
      <p class="text-xs font-semibold tracking-widest uppercase text-leaf-400 mb-3">Legal</p>
      <h1 class="font-display text-4xl sm:text-5xl font-700 tracking-tight max-w-2xl">Privacy Policy</h1>
      <p class="mt-5 text-grey-300 text-lg max-w-2xl">Last updated: draft — pending legal review.</p>
    </div>
  </section>

  <section class="py-16 md:py-20 bg-white">
    <div class="max-w-3xl mx-auto px-5 sm:px-8 reveal">
      ${LEGAL_NOTICE}
      <div class="prose-legal space-y-8 text-grey-600 leading-relaxed">
        <div>
          <h2 class="font-display text-xl font-700 text-grey-900 mb-2">1. Information we collect</h2>
          <p>When you get in touch — through the contact form, by email, or on a call — we collect what you give us directly: your name, email address, company, and details about the project you’re enquiring about (line, volume, turnaround). If you become a client, we additionally hold the project material and brand assets you share with us for the purpose of producing your work.</p>
        </div>
        <div>
          <h2 class="font-display text-xl font-700 text-grey-900 mb-2">2. How we use it</h2>
          <p>We use your information to respond to your enquiry, scope and deliver projects, and communicate about active or prospective work. We do not sell your information to third parties. Project material you share with us is used only to produce the work you’ve commissioned.</p>
        </div>
        <div>
          <h2 class="font-display text-xl font-700 text-grey-900 mb-2">3. AI and your material</h2>
          <p>Where AI tools are part of a project’s production, your material is never used to train third-party models. This applies to every engagement, without exception. Full written disclosure of how AI is used on your project is available on request.</p>
        </div>
        <div>
          <h2 class="font-display text-xl font-700 text-grey-900 mb-2">4. Data sharing</h2>
          <p>We share information with the sub-processors and tools necessary to run the business — for example, email and calendar tools for scheduling, and secure file storage for project delivery. We do not share your information with third parties for their own marketing purposes.</p>
        </div>
        <div>
          <h2 class="font-display text-xl font-700 text-grey-900 mb-2">5. Cookies</h2>
          <p>This site uses only the cookies necessary for it to function (for example, keeping you signed in to the dashboard if you’re a team member). We do not currently run third-party advertising or tracking cookies.</p>
        </div>
        <div>
          <h2 class="font-display text-xl font-700 text-grey-900 mb-2">6. Data retention</h2>
          <p>We retain enquiry and project information for as long as reasonably necessary to deliver the work and meet any legal, accounting, or reporting requirements, after which it is deleted or anonymised.</p>
        </div>
        <div>
          <h2 class="font-display text-xl font-700 text-grey-900 mb-2">7. Your rights</h2>
          <p>You can ask us what information we hold about you, ask us to correct it, or ask us to delete it, subject to any legal obligation we have to retain it. To make a request, contact us using the details below.</p>
        </div>
        <div>
          <h2 class="font-display text-xl font-700 text-grey-900 mb-2">8. Contact</h2>
          <p>Questions about this policy can be sent to <a href="mailto:hello@leafcut.studio" class="text-leaf-600 hover:text-leaf-700 font-medium">hello@leafcut.studio</a>.</p>
        </div>
      </div>
    </div>
  </section>`;

  const html = renderPage({
    title: 'Privacy Policy | Leafcut',
    description: 'How Leafcut collects, uses and protects information shared with us.',
    path: '/privacy',
    bodyHtml: body
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
});

router.get('/terms', async (req, res) => {
  const body = `
  <section class="pt-40 pb-16 md:pt-48 md:pb-20 bg-ink-800 text-white grain">
    <div class="max-w-7xl mx-auto px-5 sm:px-8 reveal">
      <p class="text-xs font-semibold tracking-widest uppercase text-leaf-400 mb-3">Legal</p>
      <h1 class="font-display text-4xl sm:text-5xl font-700 tracking-tight max-w-2xl">Terms of Service</h1>
      <p class="mt-5 text-grey-300 text-lg max-w-2xl">Last updated: draft — pending legal review.</p>
    </div>
  </section>

  <section class="py-16 md:py-20 bg-white">
    <div class="max-w-3xl mx-auto px-5 sm:px-8 reveal">
      ${LEGAL_NOTICE}
      <div class="prose-legal space-y-8 text-grey-600 leading-relaxed">
        <div>
          <h2 class="font-display text-xl font-700 text-grey-900 mb-2">1. Acceptance of terms</h2>
          <p>These terms govern the video production services provided by Leafcut. By commissioning work through us, you agree to these terms alongside the specific quote and delivery spec agreed for your engagement.</p>
        </div>
        <div>
          <h2 class="font-display text-xl font-700 text-grey-900 mb-2">2. Services</h2>
          <p>Leafcut produces video content across our five production lines — Product &amp; Explainer, Brand &amp; Launch Film, Training &amp; Enablement, Localisation, and Content Operations — as scoped in each engagement’s brief and delivery spec.</p>
        </div>
        <div>
          <h2 class="font-display text-xl font-700 text-grey-900 mb-2">3. Pricing and payment</h2>
          <p>We do not publish prices. Every engagement is quoted at a fixed price against a fixed spec — volume, formats and turnaround — agreed before work begins. Payment terms are set out in each engagement’s agreement.</p>
        </div>
        <div>
          <h2 class="font-display text-xl font-700 text-grey-900 mb-2">4. Revisions and delivery</h2>
          <p>The number of revision rounds and the delivery turnaround (24, 48 or 72 hours, or standard delivery) are agreed at the point of brief and confirmed in your quote.</p>
        </div>
        <div>
          <h2 class="font-display text-xl font-700 text-grey-900 mb-2">5. Intellectual property</h2>
          <p>Ownership of final delivered assets transfers to you on full payment, as set out in your engagement agreement. Leafcut retains the right to display finished work in our own portfolio unless you request otherwise in writing.</p>
        </div>
        <div>
          <h2 class="font-display text-xl font-700 text-grey-900 mb-2">6. Confidentiality</h2>
          <p>An NDA is signed before any brief is shared, as standard. Your material and project details are treated as confidential and are never used to train third-party AI models.</p>
        </div>
        <div>
          <h2 class="font-display text-xl font-700 text-grey-900 mb-2">7. Limitation of liability</h2>
          <p>Leafcut’s liability in connection with any engagement is limited to the fees paid for that engagement, except where liability cannot be limited by law.</p>
        </div>
        <div>
          <h2 class="font-display text-xl font-700 text-grey-900 mb-2">8. Termination</h2>
          <p>Either party may terminate an ongoing engagement in line with the notice period set out in that engagement’s agreement. Work delivered up to the point of termination is payable.</p>
        </div>
        <div>
          <h2 class="font-display text-xl font-700 text-grey-900 mb-2">9. Contact</h2>
          <p>Questions about these terms can be sent to <a href="mailto:hello@leafcut.studio" class="text-leaf-600 hover:text-leaf-700 font-medium">hello@leafcut.studio</a>.</p>
        </div>
      </div>
    </div>
  </section>`;

  const html = renderPage({
    title: 'Terms of Service | Leafcut',
    description: 'The terms governing video production engagements with Leafcut.',
    path: '/terms',
    bodyHtml: body
  });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.end(html);
});

module.exports = router;
