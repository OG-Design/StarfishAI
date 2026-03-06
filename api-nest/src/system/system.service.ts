import { Injectable, InternalServerErrorException } from '@nestjs/common';

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';
@Injectable()
export class SystemService {
    constructor() {
        this.ollamaPath=path.join(process.cwd(), '../', 'ollama', 'docker-compose.yml');
    }
    private readonly ollamaPath: string;
    
    getComposeConfig() {

        if (process.env.ELECTRON_MODE === 'true') {
            
        } else {

        }
        
        try {        

            console.log("Ollama config path: ", this.ollamaPath);

            const ollamaConfig = yaml.load(fs.readFileSync(this.ollamaPath), 'utf-8');

            console.log("Ollama configuration loaded:", ollamaConfig);

            return ollamaConfig;

        } catch (err) {
            console.error("error getting ollama config:", err);
        }

    }

    postComposeConfig() {
        try {
            
        } catch (error) {
            console.error("error committing ollama config:", error);
            return new InternalServerErrorException("Internal server error");
        }
    }
}
