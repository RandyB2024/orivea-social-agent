const express = require("express");
const { db } = require("../db");
const { writeAudit } = require("../audit");
const { toCsv } = require("../utils");

const router = express.Router();

router.get("/", (req, res) => {
  const q = `%${req.query.q || ""}%`;
  res.json(db.prepare(`
    SELECT * FROM contact_requests
    WHERE name LIKE ? OR email LIKE ? OR subject LIKE ? OR message_type LIKE ? OR status LIKE ?
    ORDER BY created_at DESC
  `).all(q, q, q, q, q));
});

router.get("/export", (req, res) => {
  const rows = db.prepare("SELECT * FROM contact_requests ORDER BY created_at DESC").all();
  res.header("Content-Type", "text/csv; charset=utf-8");
  res.attachment("orivea-contact.csv");
  res.send(toCsv(rows, [
    { key: "name", label: "Naam" },
    { key: "email", label: "E-mail" },
    { key: "subject", label: "Onderwerp" },
    { key: "message_type", label: "Type" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Aangemaakt" }
  ]));
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM contact_requests WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Contactaanvraag niet gevonden." });
  const status = req.body.status || existing.status;
  const notes = req.body.notes ?? existing.notes;
  db.prepare("UPDATE contact_requests SET status = ?, notes = ? WHERE id = ?").run(status, notes, req.params.id);
  writeAudit({
    entityType: "contact",
    entityId: req.params.id,
    action: "update",
    previousStatus: existing.status,
    newStatus: status,
    byUser: req.session.user.username
  });
  res.json(db.prepare("SELECT * FROM contact_requests WHERE id = ?").get(req.params.id));
});

module.exports = router;
