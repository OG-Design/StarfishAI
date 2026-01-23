import { IoAdapter } from "@nestjs/platform-socket.io";
import { INestApplication } from "@nestjs/common";
import { ServerOptions } from 'socket.io';
import { sessionMiddleware } from './session';
import { Server } from "http";

export class SessionIoAdapter extends IoAdapter {
    constructor(private app: INestApplication) {
        super(app);
    }

    createIOServer(port: number, options?: ServerOptions): any {
        const server = super.createIOServer(port, options);

        server.use((socket, next)=>{
            sessionMiddleware(socket.request, {} as any, next);
        });

        return server;
    }
}