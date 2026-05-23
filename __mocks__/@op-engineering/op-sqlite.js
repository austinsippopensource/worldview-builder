/**
 * In-memory mock for @op-engineering/op-sqlite.
 *
 * Handles the exact SQL patterns used in this codebase so DB unit tests run in
 * Node without any native SQLite build. Call __reset() in beforeEach to clear
 * all table data between tests.
 */

// tableName → array of row objects
const tables = new Map();

function getTable(name) {
  if (!tables.has(name)) tables.set(name, []);
  return tables.get(name);
}

/** Minimal SQL executor — supports CREATE TABLE, INSERT, UPDATE, DELETE, SELECT. */
function execute(sql, params = []) {
  // Normalise whitespace so regex matching is consistent
  const s = sql.trim().replace(/\s+/g, ' ');

  // ── CREATE TABLE IF NOT EXISTS <name> (...) ──────────────────────────────
  if (/^CREATE TABLE/i.test(s)) {
    const m = s.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
    if (m) getTable(m[1]);
    return { rows: [] };
  }

  // ── INSERT INTO <table> (<col,...>) VALUES (?,?,...) ──────────────────────
  if (/^INSERT INTO/i.test(s)) {
    const m = s.match(/^INSERT INTO (\w+) \(([^)]+)\) VALUES/i);
    if (m) {
      const cols = m[2].split(',').map(c => c.trim());
      const row = {};
      cols.forEach((col, i) => { row[col] = params[i] !== undefined ? params[i] : null; });
      getTable(m[1]).push(row);
    }
    return { rows: [] };
  }

  // ── UPDATE <table> SET col=?,... WHERE id=? ───────────────────────────────
  if (/^UPDATE/i.test(s)) {
    const m = s.match(/^UPDATE (\w+) SET (.+?) WHERE id = \?$/i);
    if (m) {
      const tbl = m[1];
      // Split "col1 = ?, col2 = ?" into column names
      const cols = m[2].split(', ').map(c => c.replace(/\s*=\s*\?$/, '').trim());
      const id = params[params.length - 1];
      getTable(tbl).forEach(row => {
        if (row.id === id) {
          cols.forEach((col, i) => { row[col] = params[i]; });
        }
      });
    }
    return { rows: [] };
  }

  // ── DELETE FROM <table> WHERE id=? ───────────────────────────────────────
  if (/^DELETE FROM \w+ WHERE id = \?$/i.test(s)) {
    const m = s.match(/^DELETE FROM (\w+)/i);
    if (m) tables.set(m[1], getTable(m[1]).filter(r => r.id !== params[0]));
    return { rows: [] };
  }

  // ── DELETE FROM <table>  (no WHERE — wipe entire table) ──────────────────
  if (/^DELETE FROM \w+$/i.test(s)) {
    const m = s.match(/^DELETE FROM (\w+)$/i);
    if (m) tables.set(m[1], []);
    return { rows: [] };
  }

  // ── SELECT <cols> FROM <table> [WHERE col=?] [ORDER BY col DESC] [LIMIT ?] ─
  if (/^SELECT/i.test(s)) {
    const m = s.match(/^SELECT (.+?) FROM (\w+)(.*)?$/i);
    if (!m) return { rows: [] };

    const colSpec = m[1].trim();
    const tbl = m[2];
    const rest = (m[3] || '').trim();

    let rows = [...getTable(tbl)];

    // WHERE <col> = ?  (single equality condition)
    const whereM = rest.match(/WHERE (\w+) = \?/i);
    if (whereM) {
      const col = whereM[1];
      rows = rows.filter(r => r[col] === params[0]);
    }

    // ORDER BY <col> ASC|DESC
    const orderM = rest.match(/ORDER BY (\w+)\s*(ASC|DESC)?/i);
    if (orderM) {
      const col = orderM[1];
      const desc = (orderM[2] || 'ASC').toUpperCase() === 'DESC';
      rows.sort((a, b) => {
        const av = a[col] ?? 0, bv = b[col] ?? 0;
        if (typeof av === 'string') return desc ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
        return desc ? (Number(bv) - Number(av)) : (Number(av) - Number(bv));
      });
    }

    // LIMIT ?  — last param in the array
    if (/LIMIT \?/i.test(rest)) {
      rows = rows.slice(0, Number(params[params.length - 1]));
    }

    // Project specific columns if not SELECT *
    if (colSpec !== '*') {
      const cols = colSpec.split(',').map(c => c.trim());
      rows = rows.map(row => Object.fromEntries(cols.map(col => [col, row[col]])));
    }

    return { rows };
  }

  console.warn('[op-sqlite mock] Unhandled SQL:', sql);
  return { rows: [] };
}

// Single shared db instance — schema.ts caches the result of open(), so using
// one object means __reset() clears the data that cached reference still points to.
const db = { execute };

module.exports = {
  open: jest.fn(() => db),
  /** Call in beforeEach to wipe all table data between tests. */
  __reset: () => tables.clear(),
};
