import { Injectable, InternalServerErrorException } from '@nestjs/common';
import fs from 'fs'
import path from 'path'
@Injectable()
export class SitesettingsService {

    settingsPath = path.join(process.cwd(), 'settings-data', 'settings.json');

    constructor() {
        this.initializeSettings();
    }

    private initializeSettings() {
        const dir = path.join(process.cwd(), 'settings-data');
        if (!fs.existsSync(this.settingsPath)) {
            fs.mkdirSync(dir, { recursive: true });
            const defaultPath = path.join(process.cwd(), 'settings.json');
            if (fs.existsSync(defaultPath)) {
                fs.copyFileSync(defaultPath, this.settingsPath);
            }
        }
    }

    checkSiteSettings() {
        const settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
        return settings;
    }

    togglePrivateGroupAvailability() {

        console.log("Trying to toggle PrivateGroup availability:");

        try {
            const settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
            settings.user.privateGroup.isEnabled = !settings.user.privateGroup.isEnabled;

            fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), 'utf8');

            console.log("Successfully changed PrivateGroup availability, isEnabled set to:", settings.user.privateGroup.isEnabled);

            return this.checkSiteSettings();

        } catch (err) {
            console.error("Error occured:", err);
            throw new InternalServerErrorException("Internal server error");
        }

    }

    alterPrivateGroupQuota(quota: number) {
        const settings = JSON.parse(fs.readFileSync(this.settingsPath, 'utf8'));
        settings.user.privateGroup.modelQuota = Number(quota);
        fs.writeFileSync(this.settingsPath, JSON.stringify(settings, null, 2), 'utf8');
        return this.checkSiteSettings();
    }
}
