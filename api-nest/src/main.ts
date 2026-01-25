const PORT = 3000;

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import {sessionMiddleware} from './session';
import { SessionIoAdapter } from './socket-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      "http://192.168.1.11:5173"
    ],
    credentials: true
  });

  app.use(sessionMiddleware);

  app.useWebSocketAdapter(new SessionIoAdapter(app)) // websocket sessions

  await app.listen(process.env.PORT ?? PORT, '0.0.0.0');
}
bootstrap();
