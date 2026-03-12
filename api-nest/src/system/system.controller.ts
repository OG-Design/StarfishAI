import { Body, Controller, Get, Post } from '@nestjs/common';
import { SystemService } from './system.service';

@Controller('system')
export class SystemController {

    constructor(private readonly systemService: SystemService) {}

    @Get('health')
    async checkSystemServices() {
        return await this.systemService.checkSystemServices();
    }

    @Get('compose/ollama/get')
    getComposeConfig() {
        return this.systemService.getComposeConfig();
    }

    @Post('compose/ollama/change')
    changeComposeConfig(@Body() body) {
        return this.systemService.changeComposeConfig(body.preset);
    }

    @Get('compose/ollama/restart')
    restartOllama() {
        return this.systemService.restartOllama();
    }
}
