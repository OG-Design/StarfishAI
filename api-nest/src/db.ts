import Database from 'better-sqlite3';
import {Database as DatabaseType} from 'better-sqlite3';

import { join, isAbsolute } from "path";
import { readFileSync } from "fs";

import { config } from 'dotenv';


// get env file: required due to imports loading before app.module
config({ path: join(process.cwd(), "../", ".env.secret")});

// get path from env
export const dbPath=process.env.DB_PATH??"./starfish.db";

console.log(dbPath);

// create the db — use path as-is if absolute, otherwise resolve relative to cwd
const resolvedDbPath = isAbsolute(dbPath) ? dbPath : join(process.cwd(), dbPath);
const db: DatabaseType = new Database(resolvedDbPath);

// enable foreign key enforcement (SQLite defaults to OFF)
db.pragma('foreign_keys = ON');

// initialize schema if tables don't exist (e.g. fresh volume)
const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='user'").get();
if (!tableCheck) {
  console.log('Initializing database schema...');
  const schema = readFileSync(join(process.cwd(), 'starfish.db.sql'), 'utf-8');
  db.exec(schema);
}

// migrate message_files to add ON DELETE CASCADE if missing
const fkInfo = db.pragma('foreign_key_list(message_files)') as any[];
const messageFk = fkInfo.find((fk: any) => fk.table === 'message' && fk.from === 'message_idMessage');
if (messageFk && messageFk.on_delete !== 'CASCADE') {
  db.exec(`
    CREATE TABLE IF NOT EXISTS message_files_new (
      idMessage_files INTEGER NOT NULL PRIMARY KEY,
      message_idMessage INTEGER,
      file_idFile INTEGER NOT NULL,
      FOREIGN KEY (message_idMessage) REFERENCES message(idMessage) ON DELETE CASCADE,
      FOREIGN KEY (file_idFile) REFERENCES file(idFile)
    );
    INSERT OR IGNORE INTO message_files_new SELECT * FROM message_files;
    DROP TABLE message_files;
    ALTER TABLE message_files_new RENAME TO message_files;
  `);
}

// migrate thread table to include aiGeneratedTitle flag
const threadColumns = db.pragma('table_info(thread)') as any[];
const hasAiGeneratedTitle = threadColumns.some((col: any) => col.name === 'aiGeneratedTitle');
if (!hasAiGeneratedTitle) {
  db.exec('ALTER TABLE thread ADD COLUMN aiGeneratedTitle INTEGER NOT NULL DEFAULT 0');
}

const hasTitleLastMessageCount = threadColumns.some((col: any) => col.name === 'titleLastMessageCount');
if (!hasTitleLastMessageCount) {
  db.exec('ALTER TABLE thread ADD COLUMN titleLastMessageCount INTEGER NOT NULL DEFAULT 0');
}

export default db;