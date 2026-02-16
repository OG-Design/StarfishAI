PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS user (
  idUser INTEGER NOT NULL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  hash TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS thread (
  idThread INTEGER NOT NULL PRIMARY KEY,
  title TEXT NOT NULL,
  author_idUser INTEGER NOT NULL,
  FOREIGN KEY (author_idUser) REFERENCES user(idUser)
);

-- create group
CREATE TABLE IF NOT EXISTS userGroup (
  idUserGroup INTEGER PRIMARY KEY,
  name TEXT,
  permissionLevel TEXT
);

-- default groups
INSERT OR IGNORE INTO userGroup (idUserGroup, name, permissionLevel)
VALUES
  (1, 'Administrator Group', 'admin'),
  (2, 'Public Group', 'public');

-- handles members of each group
CREATE TABLE IF NOT EXISTS groupMember (
  idGroupMember INTEGER PRIMARY KEY,
  user_idUser INTEGER,
  userGroup_idUserGroup INTEGER,
  permissionLevel TEXT,
  FOREIGN KEY (user_idUser) REFERENCES user(idUser),
  FOREIGN KEY (userGroup_idUserGroup) REFERENCES userGroup(idUserGroup)
);


-- ai model selection based on access level
CREATE TABLE IF NOT EXISTS model (
  idModel INTEGER NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  fullName TEXT,
  userGroup_idUserGroup INTEGER,
  FOREIGN KEY (userGroup_idUserGroup) REFERENCES userGroup(idUserGroup)
);

CREATE TABLE IF NOT EXISTS message (
  idMessage INTEGER NOT NULL PRIMARY KEY,
  data TEXT NOT NULL,
  idThread INTEGER NOT NULL,
  isSystem INTEGER,
  latestModel_idModel INTEGER,
  FOREIGN KEY (idThread) REFERENCES thread(idThread),
  FOREIGN KEY (latestModel_idModel) REFERENCES model(idModel)
);