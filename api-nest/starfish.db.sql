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



-- ai model selection based on access level (updated structure)
CREATE TABLE IF NOT EXISTS model (
  idModel INTEGER NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  userGroup_idUserGroup INTEGER,
  fullName TEXT,
  thinkingLevel TEXT,
  technology TEXT,
  modelType TEXT, -- llm, tts, img, maybe object's instead for more configuration
  FOREIGN KEY (userGroup_idUserGroup) REFERENCES userGroup(idUserGroup)
);

-- stores messsages
CREATE TABLE IF NOT EXISTS message (
  idMessage INTEGER NOT NULL PRIMARY KEY,
  data TEXT NOT NULL,
  idThread INTEGER NOT NULL,
  isSystem INTEGER,
  latestModel_idModel INTEGER,
  FOREIGN KEY (idThread) REFERENCES thread(idThread) ON DELETE CASCADE,
  FOREIGN KEY (latestModel_idModel) REFERENCES model(idModel)
);

-- stores paths and mimetype / other metadata
CREATE TABLE IF NOT EXISTS file (
  idFile INTEGER NOT NULL PRIMARY KEY,
  path TEXT NOT NULL,
  fileName TEXT,
  mimetype TEXT,
  alt TEXT,
  originalName TEXT,
  user_idUser INTEGER NOT NULL,
  FOREIGN KEY (user_idUser) REFERENCES user(idUser)
);

-- links a file to a message in a many to many relationship many messages may have the same file, and many files may be used in one message
CREATE TABLE IF NOT EXISTS message_files (
  idMessage_files INTEGER NOT NULL PRIMARY KEY,
  message_idMessage INTEGER,
  file_idFile INTEGER NOT NULL,
  FOREIGN KEY (message_idMessage) REFERENCES message(idMessage),
  FOREIGN KEY (file_idFile) REFERENCES file(idFile)
);