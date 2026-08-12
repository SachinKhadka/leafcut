const { createRouter } = require('../http-helpers');
const router = createRouter();
const store = require('../store');
const { requireAuthApi } = require('../auth');

function uid() {
  return 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Auth required — leads contain PII (name/email), only the dashboard should read them.
router.get('/', requireAuthApi, async (req, res, next) => {
  try {
    const leads = await store.getLeads();
    res.json(leads);
  } catch (err) { next(err); }
});

// Public on purpose — this is how the site's quote form actually submits a lead.
router.post('/', async (req, res, next) => {
  try {
    const { name, email, type, length, addons, estimate, status } = req.body || {};
    if (!name || !String(name).trim()) return res.status(400).json({ error: 'Name is required' });
    if (!email || !EMAIL_RE.test(String(email).trim())) return res.status(400).json({ error: 'A valid email is required' });

    const lead = {
      id: uid(),
      name: String(name).trim(),
      email: String(email).trim(),
      type: type || '',
      length: length || '',
      addons: Array.isArray(addons) ? addons : [],
      estimate: estimate || '',
      status: status || 'new',
      date: new Date().toISOString()
    };
    const leads = await store.getLeads();
    leads.unshift(lead);
    await store.saveLeads(leads);
    res.status(201).json(lead);
  } catch (err) { next(err); }
});

router.put('/:id', requireAuthApi, async (req, res, next) => {
  try {
    const leads = await store.getLeads();
    const idx = leads.findIndex((l) => l.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Not found' });
    leads[idx] = { ...leads[idx], ...req.body, id: req.params.id };
    await store.saveLeads(leads);
    res.json(leads[idx]);
  } catch (err) { next(err); }
});

router.delete('/:id', requireAuthApi, async (req, res, next) => {
  try {
    const leads = await store.getLeads();
    const before = leads.length;
    const next_ = leads.filter((l) => l.id !== req.params.id);
    if (next_.length === before) return res.status(404).json({ error: 'Not found' });
    await store.saveLeads(next_);
    res.status(204).end();
  } catch (err) { next(err); }
});

module.exports = router;
