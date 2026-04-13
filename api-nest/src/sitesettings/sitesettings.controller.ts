import { Controller, Get, Query, UseGuards } from '@nestjs/common';

import { SitesettingsService } from './sitesettings.service';
import { SessionAuthGuard } from 'src/auth/session-auth.guard';

// @UseGuards(SessionAuthGuard)
@Controller('sitesettings')
export class SitesettingsController {

    constructor (private readonly sitesettingsService: SitesettingsService) {}


    @Get()
    checkSiteSettings() {
        return this.sitesettingsService.checkSiteSettings();
    }


    @Get('private-group/availability/toggle')
    togglePrivateGroupAvailability() {
        return this.sitesettingsService.togglePrivateGroupAvailability();
    }

    @Get('private-group/quota/alter')
    alterPrivateGroupQuota(@Query('quota') quota: number) {
        return this.sitesettingsService.alterPrivateGroupQuota(Number(quota));
    }
}
