const PORT = 3000;

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import {sessionMiddleware} from './session';
import { SessionIoAdapter } from './socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(sessionMiddleware);

  app.useWebSocketAdapter(new SessionIoAdapter(app)) // websocket sessions

  await app.listen(process.env.PORT ?? PORT);
}
bootstrap();
