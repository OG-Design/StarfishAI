const PORT_WEBAPP = 5173;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);

import { Session, Body, UnauthorizedException, BadRequestException} from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway, MessageBody, ConnectedSocket } from '@nestjs/websockets';

import * as jwt from "jsonwebtoken";
import { secretJWT } from "src/secretJWT";

import { ConfigService } from '@nestjs/config';
import { AuthService } from 'src/auth/auth.service';

import db from '../db';


import { checkModelExistsOnGroup } from 'src/composables/checkModelExists';

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
  constructor(private readonly config: ConfigService, private readonly authService: AuthService) {
    this.ollamaURL = this.config.get<string>('OLLAMA_URL') ?? "";
  }

  /**
   * Handles the prompt stream, reading and writing to the db, JWT authentication to prevent unauthorized access
   * @param data - contains the id of the thread, the message, the model the user wants to use
   * @param client - contains the socket
   * @returns 
   */
  @SubscribeMessage('prompt')
  async handlePrompt(
    @MessageBody() data: {
      thread: number,
      message: any,
      model: string,
      idGroup: number
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
    const refresh = cookies.refresh;

    console.log("Token received in handlePrompt:", token);

    let idUser: any;

    if (process.env.ELECTRON_MODE === 'true') {
      idUser=1;
    } else {

      // token type check
      if(!token || typeof token !== 'string') {
        console.error("Invalid or missing token");
        client.emit('error', {message: 'Authentication failed'});
        client.disconnect();
        return
      }

      let userToken: any;

      try {
        // verify token
        userToken = jwt.verify(token, secretJWT) as any;
        // check if this access token has been revoked
        if (userToken && userToken.sub && userToken.jti) {
          const revoked = await this.authService.isAccessRevoked(userToken.sub, userToken.jti);
          console.log("Token revoked status:", revoked);
          if (revoked) {
            console.error('Access token revoked for user', userToken.sub, 'jti', userToken.jti);
            client.emit('error', { message: 'Token revoked' });
            client.disconnect();
            return;
          }
        }
      } catch (err) {
        console.error("JWT not valid", err);
        // try to rotate with refresh token if available
        if (refresh && typeof refresh === 'string') {
          try {
            const tokens = await this.authService.rotateRefresh(refresh);
            // use new access token for this request
            userToken = jwt.verify(tokens.accessToken, secretJWT) as any;
            // NOTE: we can't set cookies on the websocket handshake here; client should call /auth/refresh/token to update cookies
            if (userToken && userToken.sub && userToken.jti) {
              const revoked = await this.authService.isAccessRevoked(userToken.sub, userToken.jti);
              if (revoked) {
                console.error('Access token revoked after refresh for user', userToken.sub);
                client.emit('error', { message: 'Token revoked' });
                client.disconnect();
                return;
              }
            }
          } catch (e) {
            console.error('Refresh failed', e);
            client.emit('error', { message: 'Authentication failed' });
            client.disconnect();
            return;
          }
        } else {
          client.emit('error', {message: 'Invalid JWT'});
          client.disconnect();
          return;
        }
      }

      idUser = (userToken as any).sub ?? (userToken as any).idUser;
    }

    console.log("User ID resolved:", idUser);

    const thread_author = db.prepare('SELECT * FROM thread WHERE author_idUser = ? AND idThread = ? ').all(idUser, data.thread)

    console.log("Thread author validation result:", thread_author);

    // check if author is valid
    if (thread_author.length == 0) {
      console.log("User ", "userToken.username", "tried to access thread with id ", data.thread, ". They're not the author if the thread exists");
      client.emit('error', { message: 'You do not own this thread' });
      return;
    }

    // store messages as context
    let messages: any[] = [data.message];

    db.prepare('INSERT INTO message (data, idThread) VALUES (?, ?)').run(JSON.stringify(data.message), data.thread);

    const context = db.prepare('SELECT * FROM message WHERE idThread = ? ORDER BY rowid DESC LIMIT 25').all(data.thread);
    const systemPrompt: any = db.prepare('SELECT * FROM message WHERE idThread = ? AND isSystem = 1').get(data.thread);

    messages.push(JSON.parse(systemPrompt.data));
    context.reverse().forEach((me: any) => {
        try {
          messages.push(JSON.parse(me.data));
        } catch (e) {
            console.error(e)
        }
    })

    const checkModelExists = checkModelExistsOnGroup(db, idUser, data.idGroup, data.model);
    console.log("idGroup:", data.idGroup);
    console.log("checkModelExists:", checkModelExists);

    if (checkModelExists.length<=0) {
      client.emit('error', { message: 'Model either not downloaded or permission denied' });
      return;
    }

    // create new ollama and make connection via env
    const ollamaClient = new Ollama({ host: this.ollamaURL });

    try {
      const stream = await ollamaClient.chat({
        model: data.model,
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
          allChunks.push(content);
        }
      }

      console.log("Message completed at thread with author, thread + author:", thread_author);

      // structure message
      const messageResponse = { role: "assistant", content: allChunks.join('') };

      // insert message into db
      db.prepare("INSERT INTO message (data, idThread) VALUES (?, ?)").run(JSON.stringify(messageResponse), data.thread);

      client.emit('ai_complete');
    } catch (err: any) {
      console.error("Ollama error:", err);
      client.emit('error', {
        message: err.error || 'Failed to process your request',
        status_code: err.status_code || 500
      });
    }
  }
}
