function requireAuthApi(req, res, next) {
  if (req.session && req.session.authed) return next();
  res.status(401).json({ error: 'Not authenticated' });
}

function requireAuthPage(req, res, next) {
  if (req.session && req.session.authed) return next();
  res.redirect('/login?redirect=' + encodeURIComponent(req.originalUrl));
}

module.exports = { requireAuthApi, requireAuthPage };
