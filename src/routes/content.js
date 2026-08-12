const { createRouter } = require('../http-helpers');
const router = createRouter();
const store = require('../store');
const { requireAuthApi } = require('../auth');

function uid(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const COLLECTIONS = ['portfolio', 'services', 'team'];

// Public — the site itself needs this to render for every visitor, logged in or not.
router.get('/', async (req, res, next) => {
  try {
    const content = await store.getContent();
    res.json(content);
  } catch (err) { next(err); }
});

// Singleton text fields (hero, about, testimonial, contact copy).
router.put('/site', requireAuthApi, async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== 'object') return res.status(400).json({ error: 'Invalid body' });
    const content = await store.getContent();
    content.site = { ...content.site, ...req.body };
    await store.saveContent(content);
    res.json(content.site);
  } catch (err) { next(err); }
});

COLLECTIONS.forEach((type) => {
  router.post(`/${type}`, requireAuthApi, async (req, res, next) => {
    try {
      const content = await store.getContent();
      const item = { ...req.body, id: uid(type[0]) };
      content[type].push(item);
      await store.saveContent(content);
      res.status(201).json(item);
    } catch (err) { next(err); }
  });

  router.put(`/${type}/:id`, requireAuthApi, async (req, res, next) => {
    try {
      const content = await store.getContent();
      const idx = content[type].findIndex((i) => i.id === req.params.id);
      if (idx === -1) return res.status(404).json({ error: 'Not found' });
      content[type][idx] = { ...content[type][idx], ...req.body, id: req.params.id };
      await store.saveContent(content);
      res.json(content[type][idx]);
    } catch (err) { next(err); }
  });

  router.delete(`/${type}/:id`, requireAuthApi, async (req, res, next) => {
    try {
      const content = await store.getContent();
      const before = content[type].length;
      content[type] = content[type].filter((i) => i.id !== req.params.id);
      if (content[type].length === before) return res.status(404).json({ error: 'Not found' });
      await store.saveContent(content);
      res.status(204).end();
    } catch (err) { next(err); }
  });
});

module.exports = router;
