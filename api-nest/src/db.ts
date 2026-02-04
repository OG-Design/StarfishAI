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

export default db;