function toNumber(value) {
  const parsed = Number(String(value ?? 0).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toCurrency(value) {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: "EUR" }).format(toNumber(value));
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function toCsv(rows, columns) {
  const header = columns.map((column) => csvEscape(column.label)).join(",");
  const body = rows.map((row) => columns.map((column) => csvEscape(row[column.key])).join(",")).join("\n");
  return `${header}\n${body}\n`;
}

module.exports = { toNumber, toCurrency, csvEscape, toCsv };
