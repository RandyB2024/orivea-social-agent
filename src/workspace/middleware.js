const attempts = new Map();

function requireAuth(req, res, next) {
  if (req.session && req.session.user) return next();
  if (req.path.startsWith("/api/")) return res.status(401).json({ error: "Niet ingelogd." });
  return res.redirect("/login");
}

function loginRateLimit(req, res, next) {
  const key = req.ip || "unknown";
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const current = (attempts.get(key) || []).filter((time) => now - time < windowMs);
  if (current.length >= 10) return res.status(429).send("Te veel pogingen. Probeer later opnieuw.");
  current.push(now);
  attempts.set(key, current);
  return next();
}

function verifyWebhookSecret(req, res, next) {
  const expected = process.env.WORKSPACE_WEBHOOK_SECRET;
  const provided = req.get("X-ORIVEA-WORKSPACE-SECRET");
  if (!expected || provided !== expected) return res.status(401).json({ error: "Ongeldige webhook secret." });
  return next();
}

module.exports = { requireAuth, loginRateLimit, verifyWebhookSecret };
