const express = require("express");
const { db } = require("../db");
const { toCsv } = require("../utils");

const router = express.Router();

router.get("/", (req, res) => {
  const q = `%${req.query.q || ""}%`;
  res.json(db.prepare(`
    SELECT * FROM newsletter_events
    WHERE email LIKE ? OR name LIKE ? OR event_type LIKE ?
    ORDER BY created_at DESC
  `).all(q, q, q));
});

router.get("/export", (req, res) => {
  const rows = db.prepare("SELECT * FROM newsletter_events ORDER BY created_at DESC").all();
  res.header("Content-Type", "text/csv; charset=utf-8");
  res.attachment("orivea-nieuwsbrief.csv");
  res.send(toCsv(rows, [
    { key: "email", label: "E-mail" },
    { key: "name", label: "Naam" },
    { key: "event_type", label: "Event" },
    { key: "created_at", label: "Aangemaakt" }
  ]));
});

module.exports = router;
