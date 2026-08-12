const { createRouter, setSessionCookie, clearSessionCookie } = require('../http-helpers');
const router = createRouter();

// Very simple single-password auth — enough to keep the dashboard and content edits
// away from randoms, not a substitute for real user accounts. Set ADMIN_PASSWORD in .env.
router.post('/login', async (req, res) => {
  const { password } = req.body || {};
  const expected = process.env.ADMIN_PASSWORD || 'leafcut';
  if (typeof password === 'string' && password === expected) {
    setSessionCookie(res, { authed: true }, process.env.SESSION_SECRET || 'dev-insecure-secret-change-me');
    return res.status(200).json({ ok: true });
  }
  res.status(401).json({ ok: false, error: 'Incorrect password' });
});

router.post('/logout', async (req, res) => {
  clearSessionCookie(res);
  res.status(200).json({ ok: true });
});

router.get('/session', async (req, res) => {
  res.status(200).json({ authed: !!(req.session && req.session.authed) });
});

module.exports = router;
