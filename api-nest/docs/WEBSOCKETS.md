# **Websocket connection**

This API uses `Websockets` to deliver live data, this as of writing this only includes streaming the responses to messages sent by the user, these are delivered in `chunks`. It uses a `Gateway` in `nestjs` to stream the data, here I also use `JWT's` to authenticate the stream and user's access to it. (*Stored in localStorage for now but that will change later due to security concerns*).

## Quick explanation:

This allows for websocket connections to the `ollama`. Below is a code block, beneath it is a more complete explanation of how it works.

```ts
const PORT_WEBAPP = 5173;
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS;

import { Session, Body, UnauthorizedException} from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway, MessageBody, ConnectedSocket } from '@nestjs/websockets';

import * as jwt from "jsonwebtoken";
import { secretJWT } from "src/secretJWT";

import { ConfigService } from '@nestjs/config';

import Database from 'better-sqlite3';

import db from '../db';




import { Socket } from 'socket.io';
import { Ollama } from 'ollama';
import { S } from 'ollama/dist/shared/ollama.1bfa89da.cjs';


@WebSocketGateway({
  cors: {
    origin: [ALLOWED_ORIGINS], // change cors
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



    console.log("db path:",process.env.DB_PATH);
    console.log("Connection open on ChateventGateway, running for thread", data.thread)

    const message = data.message;
    const thread = data.thread;
    const model = data.model;

    const token = client.handshake.auth.token;

    console.log("Token received:", token, "Type:", typeof token);

    // token type check
    if(!token || typeof token !== 'string') {
      console.error("Invalid or missing token");
      client.emit('error', {message: 'Authentication failed'});
      client.disconnect();
      return
    }

    // verify token
    const userToken = jwt.verify(token, secretJWT);

    // check verification
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
      console.log("Complete stream:", allChunks.join(''));

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

```


### @WebSocketGateway

The WebSocketGateway decorator sets the properties of `CORS` in this example, it uses the ALLOWED_ORIGINS from `.env`

```ts
@WebSocketGateway({
  cors: {
    origin: [ALLOWED_ORIGINS], // change cors
    credentials: true
  }
})
```

### ChateventGateway

This is used to declare the class `ChateventGateway` it initializes `ollamaURL` as a string for later use within the class. The constructor uses `ConfigService` declared as `config` to set `ollamaURL` to `OLLAMA_URL` from the `.env` file. 

```ts
export class ChateventGateway {
  private readonly ollamaURL:string;
  constructor(private readonly config: ConfigService) {
    this.ollamaURL = this.config.get<string>('OLLAMA_URL') ?? "";
  }
...existing code
}
```

### SubscribeMessage

This decorator is used to approve ws requests to `prompt` The `@MessageBody` takes in the data parameters shown below and uses them later. `@ConnectedSocket` is used to inject an instance of the socket into the gateway.

```ts
 @SubscribeMessage('prompt')
  async handlePrompt(
    @MessageBody() data: {
      thread: number,
      message: any,
      model: string
    },
    @ConnectedSocket() client: Socket,
  ) {
  }
  ...existing code
```

### token

This gets the client's token.

```ts
const token = client.handshake.auth.token;
``` 


### userToken

This is used to store the verification status of the token.

```ts
const userToken = jwt.verify(token, secretJWT);
```

Later this is used to check the token's validity here

```ts
if (!userToken) {
  console.error("JWT not valid");
  return new UnauthorizedException("Invalid JWT");
}
```

### Checking the author's claim to the thread they want to access

This gets the author's thread.

```ts
const thread_author = db.prepare('SELECT * FROM thread WHERE author_idUser = ? AND idThread = ? ').all(idUser, thread)
```

This checks the author's claim to the thread they want to get context from and write to.

```ts
if (thread_author.length == 0) {
  console.log("User ", userToken.username, "tried to access thread with id ", thread, ". They're not the author if the thread exists");
  return "You own no threads with id "+ thread;
}
```

---

### Getting and storing context

```ts
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
```

**What is happening?**

The `messages` variable is declared to store the messages retrieved from the `db`. The result of the db queries are then pushed to `messages`.   

---

### Running the model and streaming the data

```ts 
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
}
...existing code
```

**What is happening?**

`ollamaClient` is declared to make a connection to `Ollama` Ollama uses a `host` parameter derived from the `.env` file's `OLLAMA_URL`. `stream` then uses `ollamaClient` to chat. It checks if there is a stream and emits an error if there isn't, otherwise it starts streaming and pushes the `content` of the stream live. For each chunk of the stream it emits the result and pushes it to the `allChunks` array so it is stored to be inserted into the `db` later on.
