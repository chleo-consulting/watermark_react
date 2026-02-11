import Database from "better-sqlite3";
import { mkdirSync } from "fs";
import { join } from "path";

const DB_PATH = join(process.cwd(), "data", "app.db");

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    mkdirSync(join(process.cwd(), "data"), { recursive: true });
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
  }
  return db;
}
