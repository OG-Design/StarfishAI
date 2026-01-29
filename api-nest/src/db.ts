import Database from 'better-sqlite3';
import {Database as DatabaseType} from 'better-sqlite3';

import { join } from "path";

import { config } from 'dotenv';


config({ path: join(process.cwd(), "../", ".env.secret")});

export const dbPath=process.env.DB_PATH??"./starfish.db";

const db: DatabaseType = new Database(join(process.cwd(), dbPath));

export default db;