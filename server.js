require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const cors = require("cors");

const { initDb } = require("./src/workspace/db");
const { requireAuth } = require("./src/workspace/middleware");

const authRoutes = require("./src/workspace/routes/auth.routes");
const pageRoutes = require("./src/workspace/routes/page.routes");
const orderRoutes = require("./src/workspace/routes/orders.routes");
const contactRoutes = require("./src/workspace/routes/contact.routes");
const newsletterRoutes = require("./src/workspace/routes/newsletter.routes");
const socialRoutes = require("./src/workspace/routes/social.routes");
const assetsRoutes = require("./src/workspace/routes/assets.routes");
const auditRoutes = require("./src/workspace/routes/audit.routes");
const settingsRoutes = require("./src/workspace/routes/settings.routes");
const webhookRoutes = require("./src/workspace/routes/webhook.routes");

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "https://orivea.nl,https://www.orivea.nl,http://localhost:3000,http://127.0.0.1:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

initDb();

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error("Origin niet toegestaan."));
  }
}));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  name: "orivea_workspace.sid",
  secret: process.env.SESSION_SECRET || "replace-this-session-secret",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 8
  }
}));

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.get("/", (req, res) => res.redirect(req.session.user ? "/dashboard" : "/login"));

app.use(authRoutes);
app.use("/api/webhooks", webhookRoutes);

app.use(requireAuth);
app.use(pageRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/newsletter", newsletterRoutes);
app.use("/api/social", socialRoutes);
app.use("/api/assets", assetsRoutes);
app.use("/api/audit-log", auditRoutes);
app.use("/api/settings", settingsRoutes);

app.use((req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ error: "Niet gevonden." });
  return res.status(404).sendFile(path.join(__dirname, "views", "dashboard.html"));
});

app.use((err, req, res, next) => {
  console.error("[ORIVEA workspace]", err);
  if (res.headersSent) return next(err);
  return res.status(500).json({ error: "Er ging iets mis in de workspace." });
});

const port = process.env.PORT || 3000;
app.listen(port, "0.0.0.0", () => {
  console.log(`ORIVEA workspace actief op poort ${port}`);
});
