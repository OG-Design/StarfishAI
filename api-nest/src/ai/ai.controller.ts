import { Controller, Get, Post, Param, Body, Session, UseGuards} from '@nestjs/common';

import { SessionAuthGuard } from 'src/auth/session-auth.guard';

import { AiService } from './ai.service';
import session from 'express-session';

@Controller('ai')
@UseGuards(SessionAuthGuard)
export class AiController {
    constructor(private readonly aiService: AiService) {}

    // make new thread
    @Get('thread/create')
    createThread(@Session() session: Record<string, any>) {
        console.log("debug: running thread/create");
        return this.aiService.createThread(session);
    }

    @Post('thread/alter')
    alterThread(@Session() session: Record<string, any>, @Body('thread') thread: number, @Body('title') title: string) {
        return this.aiService.alterThread(session, thread, title);
    }
    @Post('thread/alter/personality')
    alterPersonality(@Session() session: Record<string, any>, @Body('thread') thread: number, @Body('personality') personality: string) {
        return this.aiService.alterPersonality(session, thread, personality);
    }

    @Post('thread/deleteSelected')
    deleteThreads(@Session() session: Record<string, any>, @Body('threads') threads: number[]) {
        return this.aiService.deleteThreads(session, threads);
    }

    // get all threads for user
    @Get('thread/all')
    getAllThreads(@Session() session: Record<string, any>) {
        return this.aiService.getAllThreads(session);
    }

    // get thread by id WIP
    @Get('thread/id/:thread')
    getThread(@Param('thread') thread: number, @Session() session: Record<string, any>) {
        console.log("User", session.user.username, "accessing thread with id:", thread);
        return this.aiService.getThread(session, thread);
    }

    @Post('thread/id/:thread')
    postMessage(@Param('thread') thread: number, @Session() session: Record<string, any>) {

    }

    @Get('thread/id/:thread/messages')
    getMessages(@Param('thread') thread: number, @Session() session: Record<string, any>) {
        return this.aiService.getMessages(session, thread);
    }

    @Post('chat')
    async useModel(@Body() body:{model: string, message: string, thread: number}, @Session() session: Record<string, any>) {
        return await this.aiService.useModel(body.model, body.message, body.thread, session);
    }

}
