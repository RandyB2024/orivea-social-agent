const { db } = require("./db");

function writeAudit({ entityType, entityId, action, previousStatus = null, newStatus = null, byUser = "system", reason = "", metadata = null }) {
  db.prepare(`
    INSERT INTO audit_log (entity_type, entity_id, action, previous_status, new_status, by_user, reason, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    entityType,
    entityId == null ? null : String(entityId),
    action,
    previousStatus,
    newStatus,
    byUser,
    reason,
    metadata ? JSON.stringify(metadata) : null
  );
}

module.exports = { writeAudit };
