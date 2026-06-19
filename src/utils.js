const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const STATUS_DIRS = ["drafts", "approved", "rejected", "scheduled", "published"];

function resolveRoot(...parts) {
  return path.join(ROOT, ...parts);
}

function readJson(relativePath, fallback = null) {
  const filePath = resolveRoot(relativePath);
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(relativePath, data) {
  const filePath = resolveRoot(relativePath);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseDateArg(name, fallbackDate = new Date()) {
  const prefix = `--${name}=`;
  const found = process.argv.find((arg) => arg.startsWith(prefix));
  if (!found) return fallbackDate;
  const value = found.slice(prefix.length);
  const parsed = new Date(`${value}T12:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`Ongeldige datum voor --${name}. Gebruik YYYY-MM-DD.`);
  }
  return parsed;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

function getMonthKey(dateString) {
  return dateString.slice(0, 7);
}

function ensureProjectDirs() {
  ["content-calendar", "assets", "logs", "config", ...STATUS_DIRS].forEach((dir) => {
    fs.mkdirSync(resolveRoot(dir), { recursive: true });
  });
  if (!fs.existsSync(resolveRoot("audit-log.json"))) {
    writeJson("audit-log.json", []);
  }
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(value) {
  return normalizeText(value).split(" ").filter(Boolean);
}

function unique(items) {
  return Array.from(new Set(items));
}

function findPostFile(postId) {
  for (const dir of STATUS_DIRS) {
    const filePath = resolveRoot(dir, `${postId}.json`);
    if (fs.existsSync(filePath)) return { filePath, dir };
  }
  return null;
}

function getAllPostFiles(dirs = STATUS_DIRS) {
  return dirs.flatMap((dir) => {
    const absolute = resolveRoot(dir);
    if (!fs.existsSync(absolute)) return [];
    return fs.readdirSync(absolute)
      .filter((name) => name.endsWith(".json"))
      .map((name) => ({ dir, filePath: path.join(absolute, name) }));
  });
}

function appendAudit(entry) {
  const log = readJson("audit-log.json", []);
  log.push({ timestamp: new Date().toISOString(), ...entry });
  writeJson("audit-log.json", log);
}

function updateCalendar(post) {
  const monthKey = getMonthKey(post.date);
  const calendarPath = `content-calendar/${monthKey}.json`;
  const calendar = readJson(calendarPath, { month: monthKey, posts: [] });
  const existingIndex = calendar.posts.findIndex((item) => item.id === post.id);
  const fileDir = STATUS_DIRS.includes(post.status) ? post.status : "drafts";
  const summary = {
    id: post.id,
    date: post.date,
    category: post.category,
    theme: post.theme,
    status: post.status,
    file: `${fileDir}/${post.id}.json`
  };
  if (existingIndex >= 0) calendar.posts[existingIndex] = summary;
  else calendar.posts.push(summary);
  calendar.posts.sort((a, b) => a.date.localeCompare(b.date));
  writeJson(calendarPath, calendar);
}

function savePost(post) {
  const dir = post.status === "rejected" ? "rejected" : "drafts";
  for (const statusDir of STATUS_DIRS) {
    const oldPath = resolveRoot(statusDir, `${post.id}.json`);
    if (statusDir !== dir && fs.existsSync(oldPath)) {
      fs.unlinkSync(oldPath);
    }
  }
  writeJson(`${dir}/${post.id}.json`, post);
  updateCalendar(post);
  appendAudit({
    postId: post.id,
    action: "generated",
    by: "agent",
    previousStatus: null,
    newStatus: post.status,
    reason: post.complianceCheck.reason || post.toneWarning || ""
  });
}

module.exports = {
  ROOT,
  STATUS_DIRS,
  resolveRoot,
  readJson,
  writeJson,
  formatDate,
  parseDateArg,
  addDays,
  ensureProjectDirs,
  normalizeText,
  tokenize,
  unique,
  findPostFile,
  getAllPostFiles,
  appendAudit,
  updateCalendar,
  savePost
};
