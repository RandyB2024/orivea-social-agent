const express = require("express");
const { db } = require("../db");
const { writeAudit } = require("../audit");

const router = express.Router();

router.get("/", (req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings ORDER BY key").all();
  res.json(Object.fromEntries(rows.map((row) => [row.key, row.value])));
});

router.put("/", (req, res) => {
  const upsert = db.prepare(`
    INSERT INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
  `);
  Object.entries(req.body || {}).forEach(([key, value]) => upsert.run(key, String(value)));
  writeAudit({ entityType: "settings", entityId: "workspace", action: "update", byUser: req.session.user.username, metadata: req.body });
  res.json(Object.fromEntries(db.prepare("SELECT key, value FROM settings ORDER BY key").all().map((row) => [row.key, row.value])));
});

module.exports = router;
