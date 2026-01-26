const isDev = process.env.NODE_ENV !== 'production'; // set but npm start / start:dev

const PORT = 3000;

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import {sessionMiddleware} from './session';
import { SessionIoAdapter } from './socket-io.adapter';
import { type } from 'os';



async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: isDev
      ? true
      : ['https://yourdomain.com'],
    credentials: true
  });

  app.use(sessionMiddleware);

  app.useWebSocketAdapter(new SessionIoAdapter(app)) // websocket sessions

  await app.listen(process.env.PORT ?? PORT, '0.0.0.0');
}
bootstrap();
