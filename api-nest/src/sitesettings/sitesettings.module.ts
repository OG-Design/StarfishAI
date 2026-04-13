import { Module } from '@nestjs/common';

import {SitesettingsController} from './sitesettings.controller';
import { SitesettingsService } from './sitesettings.service';
import { Sitesettings } from './sitesettings';

@Module({
    providers: [SitesettingsService, Sitesettings],
    controllers: [SitesettingsController],
    exports: [SitesettingsService]
})
export class SitesettingsModule {
}
