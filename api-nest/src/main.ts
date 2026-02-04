const isDev = process.env.NODE_ENV !== 'production'; // set but npm start / start:dev



import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import {sessionMiddleware} from './session';
import { SessionIoAdapter } from './socket-io.adapter';
import { type } from 'os';

import { ConfigService } from '@nestjs/config';



async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const PORT = configService.get<string>('API_PORT') ?? 3000;

  console.log("NODE_ENV", process.env.NODE_ENV);
  console.log("API_PORT", configService.get('API_PORT'));

  app.enableCors({
    origin: (configService.get<string>('ALLOWED_ORIGINS') ?? '').split(',').map(s => s.trim()).filter(Boolean),
    credentials: true
  });

  app.use(sessionMiddleware);

  app.useWebSocketAdapter(new SessionIoAdapter(app)) // websocket sessions

  await app.listen(PORT, '0.0.0.0'); // listen on all network interfaces
}
bootstrap();
