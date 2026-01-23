import { Controller, Get, Post, Body, Req, Res, Session } from '@nestjs/common';

import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

import * as jwt from 'jsonwebtoken';

import { secretJWT } from 'src/secretJWT';

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}


    // handles route for login
    @Post('login')
    async login (@Body() body:  {username: string, password: string}, @Req() req: Request, @Res() res: Response) {
        const user: any = await this.authService.validateUser(body.username, body.password);

        // if no session
        if (!user) {
            console.log(user)
            return res.status(401).json({ message: 'Invalid credentials'});
        }

        // save session with user info
        req.session.user=user;

        console.log("Making JWT token for user,", user.username);

        // make jwt for the websocket connection etc
        const token = jwt.sign(
            {idUser: user.idUser, username: user.username}, //payload
            secretJWT, // token secret CHANGE
            {expiresIn: '1m'} // expiration time
        )

        console.log("Token generated:\n", token);

        return res.json({ message: "Logged in successfully", jwt: token });
    }

    // handles route and logout by session destruction
    @Post('logout')
    logout(@Req() req: Request, @Res() res: Response) {
        req.session.destroy( (err) => {
            // check for error
            if (err) {
                return res.status(500).json({ message: "Logout failed" });
            }

            // clears cookie
            res.clearCookie('sid');
            return res.json({ message: "Logged out"});

        });
    }

    @Get("check")
    isAuth(@Session() session: Record<string, any>): object {
        return this.authService.isAuth(session);
    }
}
