const fs = require("fs");
const path = require("path");
const express = require("express");
const multer = require("multer");
const { db } = require("../db");
const { writeAudit } = require("../audit");

const router = express.Router();
const appRoot = path.resolve(__dirname, "..", "..", "..");
const publicRoot = path.join(appRoot, "public");
const categories = new Set(["producten", "premium", "samples", "partnerprogramma", "lifestyle", "cadeau", "reels"]);
const allowedExt = new Set([".jpg", ".jpeg", ".png", ".webp", ".mp4", ".mov"]);

const storage = multer.diskStorage({
  destination(req, file, callback) {
    const category = categories.has(req.body.category) ? req.body.category : "lifestyle";
    const target = path.join(publicRoot, "uploads", category);
    fs.mkdirSync(target, { recursive: true });
    callback(null, target);
  },
  filename(req, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase();
    callback(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter(req, file, callback) {
    const ext = path.extname(file.originalname).toLowerCase();
    callback(allowedExt.has(ext) ? null : new Error("Bestandstype niet toegestaan."), allowedExt.has(ext));
  }
});

router.get("/", (req, res) => {
  const q = `%${req.query.q || ""}%`;
  res.json(db.prepare(`
    SELECT * FROM assets
    WHERE original_name LIKE ? OR category LIKE ? OR mime_type LIKE ?
    ORDER BY created_at DESC
  `).all(q, q, q));
});

router.post("/upload", upload.single("asset"), (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Geen bestand ontvangen." });
  const category = categories.has(req.body.category) ? req.body.category : "lifestyle";
  const url = `/uploads/${category}/${req.file.filename}`;
  const result = db.prepare(`
    INSERT INTO assets (filename, original_name, category, mime_type, size, url)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.file.filename, req.file.originalname, category, req.file.mimetype, req.file.size, url);
  writeAudit({ entityType: "asset", entityId: result.lastInsertRowid, action: "upload", byUser: req.session.user.username });
  res.json(db.prepare("SELECT * FROM assets WHERE id = ?").get(result.lastInsertRowid));
});

router.delete("/:id", (req, res) => {
  const asset = db.prepare("SELECT * FROM assets WHERE id = ?").get(req.params.id);
  if (!asset) return res.status(404).json({ error: "Asset niet gevonden." });
  const fullPath = path.resolve(publicRoot, asset.url.replace(/^\//, ""));
  if (fullPath.startsWith(publicRoot) && fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  db.prepare("DELETE FROM assets WHERE id = ?").run(req.params.id);
  writeAudit({ entityType: "asset", entityId: req.params.id, action: "delete", byUser: req.session.user.username });
  res.json({ ok: true });
});

module.exports = router;
