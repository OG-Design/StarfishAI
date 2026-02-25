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
            console.log('No user returned from validateUser:', user);
            return res.status(401).json({ message: 'Invalid credentials'});
        }

        // save session with user info
        req.session.user = user;
        console.log('Session after login:', req.session);

        console.log("Making JWT token for user,", user.username);

        // make jwt for the websocket connection etc
        const token = jwt.sign(
            {idUser: user.idUser, username: user.username}, //payload
            secretJWT, // token secret CHANGE
            {expiresIn: '1h'} // expiration time
        );

        // set cookie http only
        res.cookie('jwt', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            path:'/',
            maxAge: 10 * 60 * 1000
        });

        console.log("Token generated:\n", token);
        return res.json({ message: "Logged in successfully" });
    }

    @Get('check/token')
    requestToken() {

    }

    @Get('check')
    check(@Req() req: Request, @Res() res: Response) {
        const user: any = req.session?.user;
        if(!user) return res.json({ isAuth: false});

        const token = jwt.sign({ idUser: user.idUser, username: user.username}, secretJWT, {expiresIn: '1h'});
        res.cookie('jwt', token, {
            httpOnly: true,
            sameSite: 'lax',
            secure: false,
            path: '/',
            maxAge: 60 * 60 * 1000
        });

        return res.json({ isAuth: true});
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
            res.clearCookie('jwt');
            return res.json({ message: "Logged out"});

        });
    }

    @Get("check")
    isAuth(@Session() session: Record<string, any>): object {
        return this.authService.isAuth(session);
    }
}
