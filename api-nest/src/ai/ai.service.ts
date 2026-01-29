import { BadRequestException, ConflictException, Injectable, InternalServerErrorException } from '@nestjs/common';

import thread from '../types/thread';

import ollama from 'ollama';

import Database from 'better-sqlite3';
import { request } from 'http';

import { ConfigService } from '@nestjs/config';

const db = new Database(process.cwd()+"/starfish.db");

function parseJsonFromString(str: string): any | null {
    const match = str.match(/{[\s\S]*}/);
    if (match) {
        try {
            return JSON.parse(match[0]);
        } catch (e) {
            console.error("Invalid JSON:", e);
            return null;
        }
    }
    return null;
}


@Injectable()
export class AiService {

    constructor(private readonly config: ConfigService) {};

    getOllamaEndpoint() {
        return this.config.get<string>('OLLAMA_URL');
    }

    // make threads
    createThread(session: any) {
        const idUser = session.user.idUser;

        console.log("User", session.user.username, "is creating a new thread");

        const threads = db.prepare("INSERT INTO thread (title, author_idUser) VALUES ('Untitled', ?)").run(idUser);

        const systemPrompt = {
            role: "system",
            content: "You are a helpful assistant."
        };

        // insert system prompt as first message
        db.prepare("INSERT INTO message (data, idThread, isSystem) VALUES (?, ?, 1)").run(JSON.stringify(systemPrompt), threads.lastInsertRowid);

        console.log("Result of thread:", threads);

        const newThreads = db.prepare("SELECT idThread, title FROM thread WHERE title = 'Untitled'").all();

        console.log("\n", newThreads);

        const newThread = newThreads[newThreads.length-1];

        console.log("Latest thread created by user:", session.user.username, "thread:", newThread);

        return {idThread: newThread};
    }

    // alters the title of a thread
    alterThread(session: any, thread: number, title: string) {
        const idUser = session.user.idUser;

        console.log("User", session.user.username, "is altering a thread with id", thread);

        const alterThread = db.prepare("UPDATE thread SET title = ? WHERE author_idUser = ? AND idThread = ? ").run(title, idUser, thread);

    }

    // alters the system prompt 
    alterPersonality(session: any, thread: number, personality: string) { 
        const idUser = session.user.idUser;

        const isAuthor = db.prepare("SELECT * FROM thread WHERE author_idUser = ? AND idThread = ?").all(idUser, thread);
        console.log("User", session.user.idUser, "is trying to access thread", thread, "\n Result of isAuthor:", isAuthor);
        

        const structuredContent = {role:"system",content: personality}; 
        db.prepare("UPDATE message SET data = ? WHERE idThread = ? AND isSystem = 1 ").run(JSON.stringify(structuredContent), thread);
    }

    deleteThreads(session: any, threads: number[]) {
        const idUser = session.user.idUser;

        const one = threads[1];
        console.log(one)

        // make placeholders for query
        const placeholders = threads.map((p)=>"?").join(", ");
        console.log("Placeholders:", placeholders);

        // delete messages
        db.prepare(`
            DELETE FROM message WHERE idThread IN (${placeholders})
        `).run(...threads); // spread your threads!

        // delete threads after messages so the foreign keys don't fail
        db.prepare(`
            DELETE FROM thread WHERE idThread IN (${placeholders})
        `).run(...threads); // spread your threads!

        console.log("Threads "+threads+" have been deleted by "+session.user.username);
        return "Threads "+threads+" have been deleted.";
    }

    // get all threads based on user
    getAllThreads(session: any) {
        const idUser = session.user.idUser;
        // type threadsAvailable imported from global source between api and webapp
        const threads = db.prepare<thread>('SELECT idThread, title FROM thread WHERE author_idUser = ?').all(idUser);

        threads.map((thread: thread) => {

        })

        return threads;
    }

    // get thread, title idThread author etc
    getThread(session: any, thread: number) {
        const idUser = session.user.idUser;
        const threads = db.prepare('SELECT * FROM thread WHERE author_idUser = ? AND idThread = ?').all(idUser, thread);
        return threads;
    }

    // get messages from thread, return them to user
    getMessages(session: any, thread: number) {
        const idUser = session.user.idUser;
        const thread_author = db.prepare('SELECT author_idUser, idThread FROM thread WHERE author_idUser = ? AND idThread = ?').get(idUser, thread);
        if (!thread_author) {
            return thread_author;
        }
        const messages = db.prepare('SELECT * FROM message WHERE idThread = ?').all(thread);
        // console.log(messages);


        // defines constructedArray as an empty object array
        let constructedArray: object[] = [];

        // runs through each message and formats dataa
        messages.forEach((message: any) => {
            // pushes formated message to constructedArray
            constructedArray.push(parseJsonFromString(message.data));
        });

        // console.log(constructedArray);

        return constructedArray;
    }

    // use model and send message to thread (fallback)
    async useModel(model: string, message: string, thread: number, session: any) {

        const idUser = session.user.idUser;

        console.log(idUser, thread);

        const thread_author = db.prepare('SELECT * FROM thread WHERE author_idUser = ? AND idThread = ? ').all(idUser, thread)

        console.log(thread_author);

        // check if author is valid
        if (thread_author.length == 0) {
            console.log("User ", session.user.username, "tried to access thread with id ", thread, ". They're not the author if the thread exists");
            return "You own no threads with id "+ thread;
        }

        // store messages as context
        let messages: any[] = [message];

        console.log(thread, "\n", message);

        db.prepare('INSERT INTO message (data, idThread) VALUES (?, ?)').run(JSON.stringify(message), thread);

        const context = db.prepare('SELECT * FROM message WHERE idThread = ?').all(thread);
        context.forEach((me: any) => {
            try {
            messages.unshift(JSON.parse(me.data));
            } catch (e) {
                console.error(e)
            }
        })

        console.log(model, "\n", message);
        const res = await ollama.chat({
            model: model,
            messages: messages
        });


        db.prepare('INSERT INTO message (idThread, data) VALUES (?, ?)').run(thread, JSON.stringify(res.message));

        return res;
    }


    async addModel(
        model: {name: string, fullName: string},
        group: {name: string, idUserGroup?: number},
        session: any
    ) {
        const idUser = session.user.idUser;
        const modelName = model.name;
        const modelFullName = model.fullName;
        const idGroup = group.idUserGroup;
        const groupName = group.name;

        // logic for adding model (pull, add to db, etc)
        try {
            console.log("Trying to add a model, checking if it already exists on group", groupName);
            const checkModelExists = db.prepare(`
SELECT
-- groupMembers
groupMember.idGroupMember, username,
-- model
model.name AS modelName, model.fullName AS modelFullName,
-- userGroup
userGroup.idUserGroup, userGroup.name AS groupName
FROM groupMember
INNER JOIN userGroup
ON userGroup.idUserGroup = groupMember.userGroup_idUserGroup
INNER JOIN model
ON model.userGroup_idUserGroup = userGroup.idUserGroup
INNER JOIN user
ON user.idUser = groupMember.user_idUser

/* By user */
WHERE idUser = ?

/* By group */
AND idUserGroup = ?

/* By modelName */
AND model.name = ?
            `).all(idUser, idGroup, modelFullName);

            console.log("Table: checkModelExists");
            console.table(checkModelExists);

            // check if model exists in db
            if (checkModelExists.length!=0) {
                console.log("Model already exists!");
                throw new ConflictException("Model " + modelFullName + " already exists on group: " + groupName);
            }



            console.log("Adding model", modelFullName, "on group", groupName);
            const model = await ollama.pull({
                model: modelFullName,
                stream: true
            });

            let lastStatus = "";
            for await (const event of model as AsyncIterable<any>) {
                lastStatus= event?.status ?? lastStatus;
                console.log(lastStatus);
            }

            if (lastStatus !== "success") {
                throw new InternalServerErrorException("Ollama pull did not complete successfully");
            }

            db.prepare(`
            INSERT INTO model (name, fullname, userGroup_idUserGroup) VALUES (?, ?, ?)
            `).run(modelName, modelFullName, idGroup);

            console.log("Model added", modelFullName, "on group", groupName);
            return "Model added successfully!"

        } catch (err) {
            console.error("Error occured while adding model:", err);

            if (err instanceof ConflictException) throw err;
            if (err?.cause?.code === "UND_ERR_HEADERS_TIMEOUT") {
                throw new InternalServerErrorException("Internal server error: Adding model failed");
            }
            throw new InternalServerErrorException("Internal server error: Adding model failed");
        }



    }

    async getModelsByGroup(
    group: {
        name: string,
        idUserGroup: number
    },
    session: any) {
    
        const idUser = session.user.idUser;
        const idUserGroup = group.idUserGroup;

        console.log(group);

        const isUserGroup = db.prepare(`
SELECT idGroupMember, name, permissionLevel, username, userGroup_idUserGroup 
FROM groupMember
INNER JOIN userGroup -- join userGroup's (the permission level groups)
ON groupMember.userGroup_idUserGroup = userGroup.idUserGroup
INNER JOIN user -- join userdata
ON groupMember.user_idUser = user.idUser


/* By user's id */
WHERE idUser = ?

/* By userGroup id */
AND idUserGroup = ?
        `).all(idUser, idUserGroup);
        console.log("Result of isUserGroup:", isUserGroup);

        if (!isUserGroup) {
            throw new BadRequestException("You are not a member of", group.name);
        }

        const modelsByGroup = db.prepare(`
            SELECT 
-- groupMembers
groupMember.idGroupMember, groupMember.user_idUser, username,
-- model
model.name AS modelName, model.fullName AS modelFullName,
-- userGroup
userGroup.idUserGroup, userGroup.name AS groupName
FROM groupMember
INNER JOIN userGroup
ON userGroup.idUserGroup = groupMember.userGroup_idUserGroup
INNER JOIN model
ON model.userGroup_idUserGroup = userGroup.idUserGroup
INNER JOIN user
ON user.idUser = groupMember.user_idUser

/* By user */
 WHERE idUser = ?

/* By group */
AND idUserGroup = ?
        `).all(idUser, idUserGroup);

        console.log("Models found in group:", group.name);
        console.log(modelsByGroup);

        return modelsByGroup;
    
    }

}
