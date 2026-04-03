const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS ?? '').split(',').map(s => s.trim()).filter(Boolean);

import { SubscribeMessage, WebSocketGateway, MessageBody, ConnectedSocket } from '@nestjs/websockets';

import * as jwt from "jsonwebtoken";
import { secretJWT } from "src/secretJWT";

import { ConfigService } from '@nestjs/config';
import { AuthService } from 'src/auth/auth.service';

import db from '../db';

import { FilestorageService } from 'src/filestorage/filestorage.service'

import { checkModelExistsOnGroup } from 'src/composables/checkModelExists';
import { isCodeFile } from 'src/composables/isCodeFile';

import { Socket } from 'socket.io';
import { Ollama } from 'ollama';



@WebSocketGateway({
  cors: {
    origin: ALLOWED_ORIGINS, // change cors
    credentials: true
  }
})
export class ChateventGateway {
  private readonly ollamaURL:string;
  constructor(private readonly config: ConfigService, private readonly authService: AuthService, private readonly fileStorageService: FilestorageService) {
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
      model: { modelFullName: string, thinkingLevel?: any },
      idGroup: number,
      fileIds?: number[]
    },
    @ConnectedSocket() client: Socket,
  ) {

    console.log("getting files from", data.fileIds);

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

    // Insert the new user message first so it's included in the context fetch below
    const messageResult = db.prepare('INSERT INTO message (data, idThread) VALUES (?, ?)').run(JSON.stringify(data.message), data.thread);
    const idMessage = Number(messageResult.lastInsertRowid);

    // Link uploaded files to this message
    if (data.fileIds && data.fileIds.length > 0) {
      const insertMessageFile = db.prepare('INSERT INTO message_files (message_idMessage, file_idFile) VALUES (?, ?)');
      for (const fileId of data.fileIds) {
        insertMessageFile.run(idMessage, fileId);
      }
    }

    const context = db.prepare('SELECT * FROM message WHERE idThread = ? ORDER BY rowid ASC LIMIT 25').all(data.thread);
    const systemPrompt: any = db.prepare('SELECT * FROM message WHERE idThread = ? AND isSystem = 1').get(data.thread);

    // System prompt must be first; then conversation history in chronological order
    let messages: any[] = [JSON.parse(systemPrompt.data)];
    context.forEach((me: any) => {
        try {
          const parsed = JSON.parse(me.data);
          // Exclude thinking and system messages — Ollama only understands system/user/assistant roles
          if (parsed.role !== 'thinking' && parsed.role !== 'system') {
            messages.push(parsed);
          }
        } catch (e) {
            console.error(e)
        }
    })

    // Attach uploaded files to the last user message as images or injected text context
    if (data.fileIds && data.fileIds.length > 0) {
      const imageBuffers: string[] = [];
      const textContextParts: string[] = [];

      for (const fileId of data.fileIds) {
        const fileRecord: any = db.prepare('SELECT * FROM file WHERE idFile = ? AND user_idUser = ?').get(fileId, idUser);
        if (!fileRecord) continue;

        try {
          const { buffer, mimetype } = this.fileStorageService.getUserFile(idUser, fileRecord.fileName);

          if (mimetype?.startsWith('image/')) {
            // Vision-capable models: attach as base64 image
            imageBuffers.push(buffer.toString('base64'));

          } else if (isCodeFile(mimetype, fileRecord.originalName)) {
            // Text-based file: inject as readable context block
            const text = buffer.toString('utf-8');
            textContextParts.push(
              `--- File: ${fileRecord.originalName} ---\n${text}\n--- End of file ---`
            );

          } else {
            // Unknown / binary: inform the model the file exists but can't be read as text
            textContextParts.push(
              `--- File: ${fileRecord.originalName} (${mimetype ?? 'unknown type'}) ---\n[Binary file attached — content not readable as text]\n--- End of file ---`
            );
          }
        } catch (e) {
          console.error('Failed to load file for id', fileId, e);
        }
      }

      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMsg) {
        if (imageBuffers.length > 0) {
          lastUserMsg.images = imageBuffers;
        }
        if (textContextParts.length > 0) {
          lastUserMsg.content = `${lastUserMsg.content ?? ''}\n\n${textContextParts.join('\n\n')}`.trim();
        }
      }
    }

    const checkModelExists: any = checkModelExistsOnGroup(db, idUser, data.idGroup, data.model.modelFullName, data.model.thinkingLevel);
    console.log("idGroup:", data.idGroup);
    console.log("checkModelExists:", checkModelExists);

    if (checkModelExists.length<=0) {
      client.emit('error', { message: 'Model either not downloaded or permission denied' });
      return;
    }

    // create new ollama and make connection via env
    const ollamaClient = new Ollama({ host: this.ollamaURL });

    // Allow the client to abort the running stream
    const abortController = new AbortController();
    let aborted = false;
    const onAbort = () => { aborted = true; abortController.abort(); };
    client.once('abort', onAbort);

    try {
      const rawThinking = checkModelExists[0]?.thinkingLevel;
      const think = rawThinking === 'true' ? true
                  : rawThinking === 'false' ? false
                  : rawThinking ?? false; // pass "high"/"medium"/"low" through as-is

      const stream = await ollamaClient.chat({
        model: data.model.modelFullName,
        messages: messages,
        stream: true,
        think,
      });

      if (!stream) {
        client.emit('error', (err: any) => {
          console.error("Stream error:", err);
        });
      }

      const allChunks: any[] = [];
      const allThinkingChunks: any[] = [];

      // iterate over each chunk from ollamas streaming response
      for await (const chunk of stream) {
        if (aborted) break;

        const thinking = (chunk as any)?.message?.thinking ?? (chunk as any)?.thinking;
        if (thinking) {
          client.emit('ai_thinking_chunk', thinking);
          allThinkingChunks.push(thinking);
        }


        const content = chunk.message.content; // get current chunk
        if (content) {
          client.emit('ai_chunk', content); // emit chunk to client
          allChunks.push(content);
        }
      }

      client.off('abort', onAbort);

      console.log("Thinking message response:", allThinkingChunks);

      console.log("Message completed at thread with author, thread + author:", thread_author);

      // Save thinking message to db (before the assistant response so rowid order is preserved)
      if (allThinkingChunks.length > 0) {
        const thinkingMessageResponse = { role: 'thinking', content: allThinkingChunks.join('') };
        db.prepare("INSERT INTO message (data, idThread) VALUES (?, ?)").run(JSON.stringify(thinkingMessageResponse), data.thread);
      }

      // Save whatever content was generated (even if aborted mid-stream)
      const fullContent = allChunks.join('');
      if (fullContent) {
        const messageResponse = { role: "assistant", content: fullContent };
        db.prepare("INSERT INTO message (data, idThread) VALUES (?, ?)").run(JSON.stringify(messageResponse), data.thread);
      }

      client.emit('ai_thinking_complete');
      client.emit('ai_complete');

    } catch (err: any) {
      client.off('abort', onAbort);
      if (aborted) {
        // User aborted — still save partial content if any
        client.emit('ai_thinking_complete');
        client.emit('ai_complete');
        return;
      }
      console.error("Ollama error:", err);
      client.emit('error', {
        message: err.error || 'Failed to process your request',
        status_code: err.status_code || 500
      });
    }
  }
}
