import { Module } from '@nestjs/common';

import { UserController } from './user.controller';
import { UserService } from './user.service';
import { SitesettingsModule } from '../sitesettings/sitesettings.module';

@Module({
    imports: [SitesettingsModule],
    controllers: [UserController],
    providers: [UserService]
})
export class UserModule {}
