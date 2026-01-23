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

@Module({
  imports: [UserModule, AuthModule],
  controllers: [AppController, UserController, AuthController, AiController],
  providers: [AppService, UserService, AuthService, AiService, ChateventGateway],
})
export class AppModule {}
