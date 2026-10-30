// Warstwa bazy danych z dwoma sterownikami: PostgreSQL (produkcja) i wbudowany SQLite (praca lokalna, testy).
// Zapytania piszemy raz, z parametrami "?"; dla PostgreSQL zamieniamy je na $1, $2…
import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { MIGRATIONS } from './migrations.js';

export type Row = Record<string, any>;
export interface Db {
  kind: 'pg' | 'sqlite';
  all(sql: string, params?: unknown[]): Promise<Row[]>;
  one(sql: string, params?: unknown[]): Promise<Row | undefined>;
  run(sql: string, params?: unknown[]): Promise<number>;
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}

const toPg = (sql: string) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); };

function pgDb(url: string): Db {
  const pool = new pg.Pool({ connectionString: url, max: 10 });
  const make = (q: (sql: string, p: unknown[]) => Promise<pg.QueryResult>): Omit<Db, 'tx' | 'close'> => ({
    kind: 'pg',
    async all(sql, p = []) { return (await q(toPg(sql), p)).rows; },
    async one(sql, p = []) { return (await q(toPg(sql), p)).rows[0]; },
    async run(sql, p = []) { return (await q(toPg(sql), p)).rowCount ?? 0; }
  });
  const base = make((s, p) => pool.query(s, p as any[]));
  return {
    ...base,
    async tx(fn) {
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        const inner = { ...make((s, p) => c.query(s, p as any[])), tx: (f: any) => f(inner), close: async () => {} } as Db;
        const r = await fn(inner);
        await c.query('COMMIT');
        return r;
      } catch (e) { await c.query('ROLLBACK'); throw e; } finally { c.release(); }
    },
    async close() { await pool.end(); }
  };
}

async function sqliteDb(file: string): Promise<Db> {
  const { DatabaseSync } = await import('node:sqlite');
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const d = new DatabaseSync(file);
  d.exec('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  const norm = (p: unknown[]) => p.map(v => (typeof v === 'boolean' ? (v ? 1 : 0) : v === undefined ? null : v)) as any[];
  let depth = 0;
  const db: Db = {
    kind: 'sqlite',
    async all(sql, p = []) { return d.prepare(sql).all(...norm(p)) as Row[]; },
    async one(sql, p = []) { return d.prepare(sql).get(...norm(p)) as Row | undefined; },
    async run(sql, p = []) { return Number(d.prepare(sql).run(...norm(p)).changes); },
    async tx(fn) {
      if (depth) return fn(db);
      depth++; d.exec('BEGIN');
      try { const r = await fn(db); d.exec('COMMIT'); return r; }
      catch (e) { d.exec('ROLLBACK'); throw e; } finally { depth--; }
    },
    async close() { d.close(); }
  };
  return db;
}

export async function openDb(opts: { databaseUrl?: string; sqlitePath?: string }): Promise<Db> {
  const db = opts.databaseUrl ? pgDb(opts.databaseUrl) : await sqliteDb(opts.sqlitePath || ':memory:');
  await migrate(db);
  return db;
}

/** Uruchamia brakujące migracje po kolei. Każda migracja to lista instrukcji SQL wspólnych dla obu baz. */
export async function migrate(db: Db) {
  await db.run('CREATE TABLE IF NOT EXISTS schema_migrations (id INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL)');
  const done = new Set((await db.all('SELECT id FROM schema_migrations')).map(r => Number(r.id)));
  for (const m of MIGRATIONS) {
    if (done.has(m.id)) continue;
    await db.tx(async t => {
      for (const sql of m.up) await t.run(sql);
      await t.run('INSERT INTO schema_migrations (id, name, applied_at) VALUES (?, ?, ?)', [m.id, m.name, new Date().toISOString()]);
    });
  }
}
