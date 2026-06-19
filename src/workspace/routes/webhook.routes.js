const express = require("express");
const { db } = require("../db");
const { verifyWebhookSecret } = require("../middleware");
const { writeAudit } = require("../audit");
const { toNumber } = require("../utils");

const router = express.Router();
router.use(verifyWebhookSecret);

router.post("/order", (req, res) => {
  const body = req.body || {};
  if (!body.order_number) return res.status(400).json({ error: "order_number ontbreekt." });
  const items = typeof body.order_items === "string" ? body.order_items : JSON.stringify(body.order_items || []);
  const existing = db.prepare("SELECT * FROM orders WHERE order_number = ?").get(body.order_number);
  if (existing) {
    db.prepare(`
      UPDATE orders SET customer_name=?, customer_email=?, customer_phone=?, customer_address=?, order_date=?, order_items=?,
      subtotal=?, shipping_cost=?, vat_rate=?, vat_amount=?, total=?, paypal_transaction_id=?, payment_status=?, payment_method=?
      WHERE order_number=?
    `).run(
      body.customer_name, body.customer_email, body.customer_phone, body.customer_address, body.order_date, items,
      toNumber(body.subtotal), toNumber(body.shipping_cost), toNumber(body.vat_rate || 21), toNumber(body.vat_amount), toNumber(body.total),
      body.paypal_transaction_id, body.payment_status, body.payment_method, body.order_number
    );
    writeAudit({ entityType: "order", entityId: body.order_number, action: "webhook_update", byUser: "webhook" });
    return res.json({ ok: true, duplicate: true });
  }
  db.prepare(`
    INSERT INTO orders (order_number, customer_name, customer_email, customer_phone, customer_address, order_date, order_items,
    subtotal, shipping_cost, vat_rate, vat_amount, total, paypal_transaction_id, payment_status, payment_method, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.order_number, body.customer_name, body.customer_email, body.customer_phone, body.customer_address, body.order_date, items,
    toNumber(body.subtotal), toNumber(body.shipping_cost), toNumber(body.vat_rate || 21), toNumber(body.vat_amount), toNumber(body.total),
    body.paypal_transaction_id, body.payment_status, body.payment_method, "Nieuw"
  );
  writeAudit({ entityType: "order", entityId: body.order_number, action: "webhook_create", byUser: "webhook" });
  res.json({ ok: true });
});

router.post("/contact", (req, res) => {
  const body = req.body || {};
  const result = db.prepare(`
    INSERT INTO contact_requests (name, email, phone, subject, message_type, message_body, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(body.name, body.email, body.phone, body.subject, body.message_type, body.message_body, "Nieuw");
  writeAudit({
    entityType: "contact",
    entityId: result.lastInsertRowid,
    action: body.message_body ? "webhook_create" : "webhook_create_warning",
    byUser: "webhook",
    reason: body.message_body ? "" : "message_body ontbreekt"
  });
  res.json({ ok: true });
});

router.post("/newsletter", (req, res) => {
  const body = req.body || {};
  const result = db.prepare("INSERT INTO newsletter_events (email, name, event_type) VALUES (?, ?, ?)").run(
    body.email,
    body.name,
    body.event_type || body.message_type || "aanmelding"
  );
  writeAudit({ entityType: "newsletter", entityId: result.lastInsertRowid, action: "webhook_create", byUser: "webhook" });
  res.json({ ok: true });
});

module.exports = router;
