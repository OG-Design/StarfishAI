import 'dotenv/config';
const isDev = process.env.NODE_ENV !== 'production'; // set but npm start / start:dev

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import {sessionMiddleware} from './session';
import { SessionIoAdapter } from './socket-io.adapter';
import { type } from 'os';

import { ConfigService } from '@nestjs/config';



async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("/api")
  const configService = app.get(ConfigService);
  const PORT = configService.get<string>('API_PORT') ?? 3000;

  console.log("NODE_ENV", process.env.NODE_ENV);
  console.log("API_PORT", configService.get('API_PORT'));

  const allowedOrigins = (configService.get<string>('ALLOWED_ORIGINS') ?? '').split(',').map(s => s.trim()).filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin || origin === 'file://' || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  });

  app.use(sessionMiddleware);

  // Check electron mode
  app.use((req: any, res: any, next: any) => {
    if (process.env.ELECTRON_MODE === 'true' && !req.session.user) {
      req.session.user = { idUser: 1, username: 'electron', hash: '' };
    }
    next();
  });

  app.useWebSocketAdapter(new SessionIoAdapter(app)) // websocket sessions

  app.use((req, res, next) => {
    console.log('Session:', req.session);
    next();
  });

  await app.listen(PORT, '0.0.0.0'); // listen on all network interfaces
}
bootstrap();
