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

function needsCascade(table: string, from: string, target: string) {
  const fkInfo = db.pragma(`foreign_key_list(${table})`) as any[];
  const fk = fkInfo.find((row: any) => row.from === from && row.table === target);
  return !fk || fk.on_delete !== 'CASCADE';
}

// migrate thread.author_idUser -> user(idUser) to ON DELETE CASCADE
if (needsCascade('thread', 'author_idUser', 'user')) {
  const threadColumns = db.pragma('table_info(thread)') as any[];
  const hasAiGeneratedTitle = threadColumns.some((col: any) => col.name === 'aiGeneratedTitle');
  const hasTitleLastMessageCount = threadColumns.some((col: any) => col.name === 'titleLastMessageCount');

  const aiValue = hasAiGeneratedTitle ? 'aiGeneratedTitle' : '0';
  const titleCountValue = hasTitleLastMessageCount ? 'titleLastMessageCount' : '0';

  db.exec(`
    CREATE TABLE IF NOT EXISTS thread_new (
      idThread INTEGER NOT NULL PRIMARY KEY,
      title TEXT NOT NULL,
      aiGeneratedTitle INTEGER NOT NULL DEFAULT 0,
      titleLastMessageCount INTEGER NOT NULL DEFAULT 0,
      author_idUser INTEGER NOT NULL,
      FOREIGN KEY (author_idUser) REFERENCES user(idUser) ON DELETE CASCADE
    );
    INSERT INTO thread_new (idThread, title, aiGeneratedTitle, titleLastMessageCount, author_idUser)
      SELECT idThread, title, ${aiValue}, ${titleCountValue}, author_idUser FROM thread;
    DROP TABLE thread;
    ALTER TABLE thread_new RENAME TO thread;
  `);
}

// migrate groupMember.user_idUser and groupMember.userGroup_idUserGroup to ON DELETE CASCADE
if (needsCascade('groupMember', 'user_idUser', 'user') || needsCascade('groupMember', 'userGroup_idUserGroup', 'userGroup')) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS groupMember_new (
      idGroupMember INTEGER PRIMARY KEY,
      user_idUser INTEGER,
      userGroup_idUserGroup INTEGER,
      permissionLevel TEXT,
      FOREIGN KEY (user_idUser) REFERENCES user(idUser) ON DELETE CASCADE,
      FOREIGN KEY (userGroup_idUserGroup) REFERENCES userGroup(idUserGroup) ON DELETE CASCADE
    );
    INSERT INTO groupMember_new (idGroupMember, user_idUser, userGroup_idUserGroup, permissionLevel)
      SELECT idGroupMember, user_idUser, userGroup_idUserGroup, permissionLevel FROM groupMember;
    DROP TABLE groupMember;
    ALTER TABLE groupMember_new RENAME TO groupMember;
  `);
}

// migrate model.userGroup_idUserGroup -> userGroup(idUserGroup) to ON DELETE CASCADE
if (needsCascade('model', 'userGroup_idUserGroup', 'userGroup')) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS model_new (
      idModel INTEGER NOT NULL PRIMARY KEY,
      name TEXT NOT NULL,
      userGroup_idUserGroup INTEGER,
      fullName TEXT,
      thinkingLevel TEXT,
      technology TEXT,
      modelType TEXT,
      FOREIGN KEY (userGroup_idUserGroup) REFERENCES userGroup(idUserGroup) ON DELETE CASCADE
    );
    INSERT INTO model_new (idModel, name, userGroup_idUserGroup, fullName, thinkingLevel, technology, modelType)
      SELECT idModel, name, userGroup_idUserGroup, fullName, thinkingLevel, technology, modelType FROM model;
    DROP TABLE model;
    ALTER TABLE model_new RENAME TO model;
  `);
}

// migrate file.user_idUser -> user(idUser) to ON DELETE CASCADE
if (needsCascade('file', 'user_idUser', 'user')) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS file_new (
      idFile INTEGER NOT NULL PRIMARY KEY,
      path TEXT NOT NULL,
      fileName TEXT,
      mimetype TEXT,
      alt TEXT,
      originalName TEXT,
      user_idUser INTEGER NOT NULL,
      FOREIGN KEY (user_idUser) REFERENCES user(idUser) ON DELETE CASCADE
    );
    INSERT INTO file_new (idFile, path, fileName, mimetype, alt, originalName, user_idUser)
      SELECT idFile, path, fileName, mimetype, alt, originalName, user_idUser FROM file;
    DROP TABLE file;
    ALTER TABLE file_new RENAME TO file;
  `);
}

// migrate message_files to add ON DELETE CASCADE if missing
if (needsCascade('message_files', 'message_idMessage', 'message') || needsCascade('message_files', 'file_idFile', 'file')) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS message_files_new (
      idMessage_files INTEGER NOT NULL PRIMARY KEY,
      message_idMessage INTEGER,
      file_idFile INTEGER NOT NULL,
      FOREIGN KEY (message_idMessage) REFERENCES message(idMessage) ON DELETE CASCADE,
      FOREIGN KEY (file_idFile) REFERENCES file(idFile) ON DELETE CASCADE
    );
    INSERT INTO message_files_new (idMessage_files, message_idMessage, file_idFile)
      SELECT idMessage_files, message_idMessage, file_idFile FROM message_files;
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