const path = require("path");
const express = require("express");
const { db } = require("../db");

const router = express.Router();
const pageMap = {
  "/dashboard": "dashboard.html",
  "/orders": "orders.html",
  "/contact": "contact.html",
  "/newsletter": "newsletter.html",
  "/social": "social.html",
  "/assets": "assets.html",
  "/audit": "audit.html",
  "/settings": "settings.html"
};

Object.entries(pageMap).forEach(([route, file]) => {
  router.get(route, (req, res) => res.sendFile(path.resolve(process.cwd(), "views", file)));
});

router.get("/api/summary", (req, res) => {
  const one = (sql) => db.prepare(sql).get()?.count || 0;
  const revenue = db.prepare("SELECT COALESCE(SUM(total),0) AS total FROM orders WHERE payment_status IN ('COMPLETED','Betaald','PAID')").get().total;
  res.json({
    orders: one("SELECT COUNT(*) AS count FROM orders"),
    openOrders: one("SELECT COUNT(*) AS count FROM orders WHERE status NOT IN ('Afgerond','Geannuleerd')"),
    contacts: one("SELECT COUNT(*) AS count FROM contact_requests"),
    newsletter: one("SELECT COUNT(*) AS count FROM newsletter_events"),
    socialDrafts: one("SELECT COUNT(*) AS count FROM social_posts WHERE status IN ('concept','drafts','draft')"),
    revenue
  });
});

module.exports = router;
