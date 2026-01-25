import { Injectable } from '@nestjs/common';

import thread from '../types/thread';

import ollama from 'ollama';

import Database from 'better-sqlite3';

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
}
