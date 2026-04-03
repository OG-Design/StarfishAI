import Database from 'better-sqlite3';
import {Database as DatabaseType} from 'better-sqlite3';

import { join } from "path";

import { config } from 'dotenv';


// get env file: required due to imports loading before app.module
config({ path: join(process.cwd(), "../", ".env.secret")});

// get path from env
export const dbPath=process.env.DB_PATH??"./starfish.db";

// create the db
const db: DatabaseType = new Database(join(process.cwd(), dbPath));

// enable foreign key enforcement (SQLite defaults to OFF)
db.pragma('foreign_keys = ON');

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

export default db;