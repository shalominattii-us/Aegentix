import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const dbPathResolved = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.resolve(projectRoot, 'data', 'prosurance.db');

const dataDir = path.dirname(dbPathResolved);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new DatabaseSync(dbPathResolved);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

const schemaPath = path.resolve(__dirname, 'schema.sql');
const schemaSql = fs.readFileSync(schemaPath, 'utf8');
db.exec(schemaSql);

export function writeAuditLog(dbInstance, { actor_id, actor_email, action, entity, entity_id, summary, meta = {}, ip = null }) {
  try {
    const stmt = dbInstance.prepare(`
      INSERT INTO audit_log (actor_id, actor_email, action, entity, entity_id, summary, meta, ip, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const metaStr = typeof meta === 'string' ? meta : JSON.stringify(meta);
    stmt.run(
      actor_id || null,
      actor_email || null,
      action,
      entity,
      entity_id || null,
      summary || '',
      metaStr,
      ip || null,
      new Date().toISOString()
    );
  } catch (err) {
    console.error('Audit log write error:', err);
  }
}
