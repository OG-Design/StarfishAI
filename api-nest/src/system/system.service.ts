import { Injectable, InternalServerErrorException } from '@nestjs/common';

import { type OllamaComposeConfig } from 'src/types/OllamaComposeBase';

import settings from "../settings.json";

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { stderr, stdout } from 'process';

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

    async checkSystemServices(): Promise<any[]> {
        const PORTS = [process.env.OLLAMA_PORT, process.env.REDIS_PORT];
        const command = 'docker ps --format "{{.Names}} {{.Ports}} {{.Status}}"';
        const checks = PORTS.map(port => new Promise(resolve => {
            exec(command, (error, stdout) => {
                if (error) return resolve([]);
                const lines = stdout.split('\n').filter(Boolean);
                const result = lines
                    .filter(line => line.includes(`:${port}->`))
                    .map(line => {
                        const [name, ...rest] = line.split(' ');
                        const portEndIdx = rest.findIndex(r => r.endsWith('/tcp') || r.endsWith('/udp'));
                        const ports = rest.slice(0, portEndIdx + 1).join(' ').split(',').map(p => p.trim()).filter(Boolean);
                        const status = rest.slice(portEndIdx + 1).join(' ').trim();
                        return { name, ports, status };
                    });
                resolve(result);
            });
        }));
        const containers = await Promise.all(checks);
        const flat = containers.flat().filter(Boolean);
        return flat;
    }

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
        const currentPath = process.cwd();
        const fullPath = path.join(currentPath, "../", "ollama");
        const command = `cd ${fullPath} && docker-compose down && docker-compose up -d`;
        exec(command, (error, stdout, stderr) => {
            if(error) {
                console.error('Error:', error);
                return
            }
            if(stderr) {
                console.error('Error:', stderr);
                return
            }
            console.log('stdout:', stdout);
        });
        return {message: 'success'};
    }
}
