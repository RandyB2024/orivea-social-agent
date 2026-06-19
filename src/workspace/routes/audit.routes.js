const express = require("express");
const { db } = require("../db");

const router = express.Router();

router.get("/", (req, res) => {
  res.json(db.prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT 500").all());
});

module.exports = router;
