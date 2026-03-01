import { Injectable } from '@nestjs/common';

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
@Injectable()
export class SystemService {
    getComposeConfig() {
        let ollamaPath: string;

        if (process.env.ELECTRON_MODE === 'true') {
            
        } else {

        }
        
        try {

        ollamaPath = path.join(process.cwd(), '../', 'ollama', 'docker-compose.yml')

        console.log("Ollama config path: ", ollamaPath);

        const ollamaConfig = yaml.load(fs.readFileSync(ollamaPath), 'utf-8');

        console.log("Ollama configuration loaded:", ollamaConfig);

        return ollamaConfig;
        } catch (err) {
            console.error("eror getting ollama config:", err);
        }

    }
}
