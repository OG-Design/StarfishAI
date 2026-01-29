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

@Module({
  imports: [
    UserModule,
    AuthModule,
    // for dev: ../../../.env.development
    // for prod: ../../../.env.production
    ConfigModule.forRoot({
      envFilePath: `../../../.env.${process.env.NODE_ENV}`,
      isGlobal: true,          // Make ConfigService accessible everywhere
      ignoreEnvFile: false, // keeps .env from loading defaults
    })
  ],
  controllers: [AppController, UserController, AuthController, AiController],
  providers: [AppService, UserService, AuthService, AiService, ChateventGateway],
})
export class AppModule {}
