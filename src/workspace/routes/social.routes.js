const fs = require("fs");
const express = require("express");
const { db } = require("../db");
const { writeAudit } = require("../audit");
const { getAllPostFiles, readJson, writeJson, findPostFile } = require("../../utils");
const { generatePostForDate } = require("../../generate-daily-post");
const { addDays, formatDate } = require("../../utils");
const { approvePost, rejectPost, schedulePost, markPublished } = require("../../status-manager");

const router = express.Router();

function syncPost(post) {
  db.prepare(`
    INSERT INTO social_posts (id, date, category, theme, status, platform_payload, asset_id, approved_by, approved_at, scheduled_at, published_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      date=excluded.date,
      category=excluded.category,
      theme=excluded.theme,
      status=excluded.status,
      platform_payload=excluded.platform_payload,
      asset_id=excluded.asset_id,
      approved_by=excluded.approved_by,
      approved_at=excluded.approved_at,
      scheduled_at=excluded.scheduled_at,
      published_at=excluded.published_at,
      updated_at=CURRENT_TIMESTAMP
  `).run(
    post.id,
    post.date,
    post.category,
    post.theme,
    post.status,
    JSON.stringify(post),
    post.assetId || post.asset_id || null,
    post.approvedBy || null,
    post.approvedAt || null,
    post.scheduledAt || null,
    post.publishedAt || null
  );
}

function readPost(postId) {
  const found = findPostFile(postId);
  if (!found) return null;
  return JSON.parse(fs.readFileSync(found.filePath, "utf8"));
}

router.get("/posts/:status?", (req, res) => {
  const status = req.params.status;
  const dirs = status && status !== "all" ? [status] : undefined;
  const posts = getAllPostFiles(dirs)
    .map(({ filePath }) => JSON.parse(fs.readFileSync(filePath, "utf8")))
    .sort((a, b) => `${b.date}`.localeCompare(`${a.date}`));
  posts.forEach(syncPost);
  res.json(posts);
});

router.get("/post/:id", (req, res) => {
  const post = readPost(req.params.id);
  if (!post) return res.status(404).json({ error: "Post niet gevonden." });
  return res.json(post);
});

router.put("/post/:id", (req, res) => {
  const found = findPostFile(req.params.id);
  if (!found) return res.status(404).json({ error: "Post niet gevonden." });
  const post = JSON.parse(fs.readFileSync(found.filePath, "utf8"));
  const updated = { ...post, ...req.body, id: post.id, updatedAt: new Date().toISOString() };
  writeJson(`${found.dir}/${post.id}.json`, updated);
  syncPost(updated);
  writeAudit({ entityType: "social", entityId: post.id, action: "edit", byUser: req.session.user.username });
  res.json(updated);
});

router.post("/generate/daily", (req, res) => {
  const date = req.body.date ? new Date(`${req.body.date}T12:00:00Z`) : new Date();
  const post = generatePostForDate(date);
  syncPost(post);
  writeAudit({ entityType: "social", entityId: post.id, action: "generate_daily", byUser: req.session.user.username });
  res.json(post);
});

router.post("/generate/week", (req, res) => {
  const start = req.body.start ? new Date(`${req.body.start}T12:00:00Z`) : new Date();
  const posts = Array.from({ length: 7 }, (_, index) => {
    const post = generatePostForDate(addDays(start, index));
    syncPost(post);
    return post;
  });
  writeAudit({ entityType: "social", entityId: formatDate(start), action: "generate_week", byUser: req.session.user.username });
  res.json(posts);
});

router.post("/post/:id/approve", (req, res) => {
  const post = approvePost(req.params.id, req.session.user.username);
  syncPost(post);
  writeAudit({ entityType: "social", entityId: post.id, action: "approve", byUser: req.session.user.username });
  res.json(post);
});

router.post("/post/:id/reject", (req, res) => {
  const post = rejectPost(req.params.id, req.session.user.username, req.body.reason || "Handmatig afgekeurd.");
  syncPost(post);
  writeAudit({ entityType: "social", entityId: post.id, action: "reject", byUser: req.session.user.username, reason: req.body.reason });
  res.json(post);
});

router.post("/post/:id/schedule", (req, res) => {
  const post = schedulePost(req.params.id, req.session.user.username, req.body.scheduledAt);
  syncPost(post);
  writeAudit({ entityType: "social", entityId: post.id, action: "schedule", byUser: req.session.user.username });
  res.json(post);
});

router.post("/post/:id/published", (req, res) => {
  const post = markPublished(req.params.id, req.session.user.username);
  syncPost(post);
  writeAudit({ entityType: "social", entityId: post.id, action: "published", byUser: req.session.user.username });
  res.json(post);
});

module.exports = router;
