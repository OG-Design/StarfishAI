import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserService } from './user/user.service';
import { UserController } from './user/user.controller';
import { UserModule } from './user/user.module';
import { AuthController } from './auth/auth.controller';
import { AuthService } from './auth/auth.service';
import { AuthModule } from './auth/auth.module';
import { AiController } from './ai/ai.controller';
import { AiService } from './ai/ai.service';
import { ChateventGateway } from './chatevent/chatevent.gateway';
import { ConfigModule } from '@nestjs/config';
import { SystemService } from './system/system.service';
import { SystemController } from './system/system.controller';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    UserModule,
    AuthModule,
    // for dev: ../../../.env.development
    // for prod: ../../../.env.production
    ConfigModule.forRoot({
      envFilePath: [
        `../.env.${process.env.NODE_ENV ?? 'development'}`,
        '../.env',
        '../.env.secret'
      ],
      isGlobal: true,          // Make ConfigService accessible everywhere
      ignoreEnvFile: false, // keeps .env from loading defaults
    }),
    // Serve the built Vue app so frontend + API share one origin.
    // Requests to /api/* and /socket.io/* are handled by NestJS first.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', '..', 'webapp', 'dist'),
      exclude: ['/api/(.*)', '/socket.io/(.*)'],
    }),
  ],
  controllers: [AppController, UserController, AuthController, AiController, SystemController],
  providers: [AppService, UserService, AuthService, AiService, ChateventGateway, SystemService],
})
export class AppModule {}
