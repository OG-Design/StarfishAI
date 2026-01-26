import { Controller, Get, Post, Body, UseGuards, Session } from '@nestjs/common';
import { UserService } from './user.service';
import { SessionAuthGuard } from 'src/auth/session-auth.guard';

@Controller('user')
export class UserController {
    constructor(private userService: UserService) {}

    // sends setting isRegisterable to client
    @Get('isRegisterable')
    isRegisterable(): object {
        return this.userService.isRegisterable();
    }

    // register user
    @Post('register')
    register(@Body("username") username: string, @Body("password") password: string, @Body("password_confirm") password_confirm: string) {
        return this.userService.register(username, password, password_confirm);
    }

    // deletes account
    @Post('delete')
    @UseGuards(SessionAuthGuard)
    delete(@Session() session: Record<string, any>) {
        return this.userService.delete(session);
    }

    @Get('userGroup')
    getGroup(@Session() session: Record<string, any>) {
        return this.userService.getGroup(session);
    }
}
