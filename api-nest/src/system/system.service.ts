import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { type OllamaComposeConfig } from 'src/types/OllamaComposeBase';

import settings from "../settings.json";

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
@Injectable()
export class SystemService {
    constructor() {
        this.ollamaPath=path.join(process.cwd(), '../', 'ollama', 'docker-compose.yml');
        this.ollamaConfig = yaml.load(fs.readFileSync(this.ollamaPath), 'utf-8');
        this.presets = settings.api.systemSettings['compose-ollama'].presets;
    }
    private readonly ollamaPath: string;


    private ollamaConfig: OllamaComposeConfig | any;
    private presets: any;

    getComposeConfig() {

        if (process.env.ELECTRON_MODE === 'true') {

        } else {

        }

        try {
            let presetNames: string[] = []
            this.presets.forEach(preset => {
                presetNames.push(preset.name);
            });
            return presetNames;
        } catch (err) {
            console.error("error getting ollama config:", err);
            return new InternalServerErrorException('Internal server error');
        }

    }

    changeComposeConfig(preset: string) {
        try {
            const presets = this.presets;
            const selectedPreset = presets.find(conf => conf.name === preset);
            const configData = selectedPreset.configFile;
            console.log("Updating ollama config to:", preset + ".\nConfig find result:", selectedPreset);

            fs.writeFileSync(this.ollamaPath, yaml.dump(configData));

            return {message: 'success'};

        } catch (error) {
            console.error("error committing ollama config:", error);
            return new InternalServerErrorException("Internal server error");
        }
    }

    restartOllama() {

    }
}
