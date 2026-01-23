const PORT_WEBAPP = 5173;
const ADRESS_HOST = "http://localhost";
import { Session, Body, UnauthorizedException} from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway, MessageBody, ConnectedSocket } from '@nestjs/websockets';

import * as jwt from "jsonwebtoken";
import { secretJWT } from "src/secretJWT";

import Database from 'better-sqlite3';

const db = new Database(process.cwd()+"/starfish.db");

import { Socket } from 'socket.io';
import ollama from 'ollama';
@WebSocketGateway({
  cors: {
    origin: `${ADRESS_HOST}:${PORT_WEBAPP}`, // change cors
    credentials: true
  }
})
export class ChateventGateway {
  @SubscribeMessage('prompt')
  async handlePrompt(
    @MessageBody() data: {
      thread: number,
      message: any,
      model: string
    },
    @ConnectedSocket() client: Socket,
  ) {
    console.log("Connection open on ChateventGateway, running for thread", data.thread)
    const message = data.message;
    const thread = data.thread;
    const model = data.model;

    const token = client.handshake.auth.token;
    if(!token) {
      client.disconnect();
      return
    }

    const userToken = jwt.verify(token.toString(), secretJWT);

    if (!userToken) {
      console.error("JWT not valid");
      return new UnauthorizedException("Invalid JWT");
    }

    const idUser = userToken.idUser;

    const thread_author = db.prepare('SELECT * FROM thread WHERE author_idUser = ? AND idThread = ? ').all(idUser, thread)

    console.log(thread_author);

    // check if author is valid
    if (thread_author.length == 0) {
      console.log("User ", userToken.username, "tried to access thread with id ", thread, ". They're not the author if the thread exists");
      return "You own no threads with id "+ thread;
    }


    // store messages as context
    let messages: any[] = [message];

    // console.log(thread, "\n", messages);

    db.prepare('INSERT INTO message (data, idThread) VALUES (?, ?)').run(JSON.stringify(message), thread);

    const context = db.prepare('SELECT * FROM message WHERE idThread = ? ORDER BY rowid DESC LIMIT 10').all(thread);
    context.reverse().forEach((me: any) => {
        try {
          // console.log("message", me)
        messages.push(JSON.parse(me.data));
        } catch (e) {
            console.error(e)
        }
    })

    // console.log("ALL MESSAGES", messages);




    
    const stream = await ollama.chat({
      model: model,
      messages: messages,
      stream: true
    });


    const allChunks: any[] = [];

    // iterate over each chunk from ollamas streaming response
    for await (const chunk of stream) {
      const content = chunk.message.content; // get current chunk
      if (content) {
        client.emit('ai_chunk', content); // emit chunk to client
        // debug: prints each chunk
        // console.log(content);
        allChunks.push(content);
      }
    }

    // debug: display complete prompt
    console.log("Complete stream:", allChunks.join(''));

    // structure message
    const messageResponse = {role:"assistant", content: allChunks.join('')};

    // insert message into db
    db.prepare("INSERT INTO message (data, idThread) VALUES (?, ?)").run(JSON.stringify(messageResponse), thread);


  }
}
