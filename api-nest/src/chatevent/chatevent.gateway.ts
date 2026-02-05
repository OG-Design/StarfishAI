const PORT_WEBAPP = 5173;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);

import { Session, Body, UnauthorizedException} from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway, MessageBody, ConnectedSocket } from '@nestjs/websockets';

import * as jwt from "jsonwebtoken";
import { secretJWT } from "src/secretJWT";

import { ConfigService } from '@nestjs/config';

import db from '../db';




import { Socket } from 'socket.io';
import { Ollama } from 'ollama';
import { threadId } from 'worker_threads';



@WebSocketGateway({
  cors: {
    origin: ALLOWED_ORIGINS, // change cors
    credentials: true
  }
})
export class ChateventGateway {
  private readonly ollamaURL:string;
  constructor(private readonly config: ConfigService) {
    this.ollamaURL = this.config.get<string>('OLLAMA_URL') ?? "";
  }

  @SubscribeMessage('prompt')
  async handlePrompt(
    @MessageBody() data: {
      thread: number,
      message: any,
      model: string
    },
    @ConnectedSocket() client: Socket,
  ) {


    const cookieHeader = client.handshake.headers.cookie ?? '';

    console.log("Cookie header:", cookieHeader);
    /* 
      ---parse cookies--- 
      split removes ; reduce uses an accumilator-
      -to store the key value pair as k and ...v
      if the key is invalid it returns acc.
      else it decodes the value and returns that.
    */
    const cookies = cookieHeader.split(';').reduce((acc: any, part: any) => {
      const [k, ...v] = part.trim().split('=');
      if (!k) return acc;
      acc[k] = decodeURIComponent(v.join('='));
      return acc;
    }, {} as Record<string, string>);

    const token = cookies.jwt;

    console.log("db path:",process.env.DB_PATH);
    console.log("Connection open on ChateventGateway, running for thread", data.thread)

    const message = data.message;
    const thread = data.thread;
    const model = data.model;

    // const token = client.handshake.auth.token;

    console.log("Token received:", token, "Type:", typeof token);

    // token type check
    if(!token || typeof token !== 'string') {
      console.error("Invalid or missing token");
      console.log("Token:", token)
      client.emit('error', {message: 'Authentication failed'});
      client.disconnect();
      return
    }

    let userToken: any;

    try {
      // verify token
      userToken = jwt.verify(token, secretJWT);
    } catch (err) {
      console.error("JWT not valid");
      client.emit('error', {message: 'Invalid JWT'});
      client.disconnect();
      return;
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

    const context = db.prepare('SELECT * FROM message WHERE idThread = ? ORDER BY rowid DESC LIMIT 25').all(thread);
    const systemPrompt: any = db.prepare('SELECT * FROM message WHERE idThread = ? AND isSystem = 1').get(thread);


    messages.push(JSON.parse(systemPrompt.data));
    context.reverse().forEach((me: any) => {
        try {
          // console.log("message", me)
        messages.push(JSON.parse(me.data));
        } catch (e) {
            console.error(e)
        }
    })

    // console.log("ALL MESSAGES", messages);


    // create new ollama and make connection via env
    const ollamaClient = new Ollama({host: this.ollamaURL});

    try {
      const stream = await ollamaClient.chat({
        model: model,
        messages: messages,
        stream: true
      });

      if (!stream) {
        client.emit('error', (err: any) => {
          console.error("Stream error:", err);
        });
      }


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
      // console.log("Complete stream:", allChunks.join(''));
      console.log("Message completed at thread with author, thread + author:", thread_author);

      // structure message
      const messageResponse = {role:"assistant", content: allChunks.join('')};

      // insert message into db
      db.prepare("INSERT INTO message (data, idThread) VALUES (?, ?)").run(JSON.stringify(messageResponse), thread);

      client.emit('ai_complete');
    } catch (err) {
      console.error("Ollama error:", err);
      client.emit('error', {
        message: err.error || 'Failed to process your request',
        status_code: err.status_code || 500
      });
    }
  }
}
