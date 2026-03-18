import { Controller, Get, Post, Body, Req, Res } from '@nestjs/common';

import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

import * as jwt from 'jsonwebtoken';

import { secretJWT } from 'src/secretJWT';
import { randomUUID } from 'crypto';

function cookieOptions(req: Request, maxAge: number) {
    const isSecure = req.secure || req.headers['x-forwarded-proto'] === 'https';
    const origin = req.headers.origin || '';
    const host = req.headers.host || '';
    // Cross-origin if Origin is present and doesn't match the backend host
    const isCrossOrigin = !!origin && !origin.includes(host);
    // SameSite=None requires Secure, which requires HTTPS
    const useNone = isCrossOrigin && isSecure;
    return {
        httpOnly: true,
        sameSite: useNone ? 'none' as const : 'lax' as const,
        secure: isSecure,
        path: '/',
        maxAge,
    };
}

@Controller('auth')
export class AuthController {
    constructor(private authService: AuthService) {}


    // handles route for login
    @Post('login')
    async login (@Body() body:  {username: string, password: string}, @Req() req: Request, @Res() res: Response) {
        try {
            // verify user credentials
            const authRes: any = await this.authService.validateUser(body.username, body.password);

            // if no session
            if (!authRes || !authRes.user) {
                console.log('No user returned from validateUser:', authRes);
                return res.status(401).json({ message: 'Invalid credentials'});
            }

            const user = authRes.user;

            // ensure session exists
            if (!req.session) req.session = {} as any;
            // save session with user info (store the actual user object)
            req.session.user = user;
            // console.log('Session after login:', req.session);


            const tokens = authRes.tokens;

            res.cookie('jwt', tokens.access, cookieOptions(req, 10 * 60 * 1000));
            res.cookie('refresh', tokens.refresh, cookieOptions(req, 7 * 24 * 60 * 60 * 1000));

            console.log("Token generated:\n", tokens);
            return res.json({ message: "Logged in successfully" });
        } catch (err) {
            console.error('Login error:', err);
            // If it's an UnauthorizedException we let Nest handle it by rethrowing
            return res.status(500).json({ message: 'Login failed', error: String(err) });
        }
    }

    // refresh token
    @Get('refresh/token')
    async refreshToken(@Req() req: Request, @Res() res: Response) {
        try {

            // check if refresh token exists
            const refreshToken = req.cookies?.refresh;
            if (!refreshToken) {
                return res.status(401).json({ message: 'No refresh token provided' });
            }

            // rotate refresh token
            const tokens = await this.authService.rotateRefresh(refreshToken);

            // set cookies for new tokens
            res.cookie('jwt', tokens.accessToken, cookieOptions(req, 10 * 60 * 1000));
            res.cookie('refresh', tokens.refreshToken, cookieOptions(req, 7 * 24 * 60 * 60 * 1000));

            return res.json({ message: 'Tokens refreshed' });
        } catch (err) {
            console.error('Refresh error:', err);
            return res.status(401).json({ message: 'Invalid refresh token' });
        }
    }

    // check session
    @Get('check')
    check(@Req() req: Request, @Res() res: Response) {
        const user: any = req.session?.user;
        if (!user) return res.json({ isAuth: false });

        // issue an access token with `sub` and `jti` so it can be revoked correctly
        const accessJti = randomUUID();
        const token = jwt.sign({ sub: user.idUser, username: user.username, jti: accessJti }, secretJWT, { expiresIn: '1h' });
        res.cookie('jwt', token, cookieOptions(req, 60 * 60 * 1000));

        return res.json({ isAuth: true });
    }

    // handles route and logout by session destruction
    @Post('logout')
    async logout(@Req() req: Request, @Res() res: Response) {
        console.log('user logged out.');
        try {
            const token = req.cookies?.jwt;
            console.log("cookies:", req.cookies);
            console.log("tokens received:", token);
            if (token && typeof token === 'string') {

                console.log('Starting token revokation.');

                // Prefer verify to ensure token integrity; fall back to decode if verify fails
                let payload: any = null;
                try {
                    payload = jwt.verify(token, secretJWT) as any;
                } catch (e) {
                    payload = jwt.decode(token) as any;
                }

                console.log('logout payload:', payload);

                const userId = payload?.sub ?? payload?.idUser;
                const accessJti = payload?.jti;


                if (userId) {
                    if (accessJti) {
                        // revoke token access
                        console.log('Revoking jwt access');
                        const now = Math.floor(Date.now() / 1000);
                        const ttl = Math.max(0, (payload.exp ?? now) - now);

                        // revoke access token jti
                        await this.authService.revokeAccess(userId, accessJti, ttl);
                    }
                    console.log('Revoking all refresh tokens for user', userId);
                    // revoke all refresh tokens for this user
                    await this.authService.revokeAllRefreshForUser(userId);
                }
            }

            // destroy session and clear cookies (await to ensure cleanup)
            await new Promise<void>((resolve, reject) => {
                req.session.destroy((err: any) => {
                    if (err) return reject(err);
                    resolve();
                });
            });

            res.clearCookie('sid');
            res.clearCookie('jwt');
            res.clearCookie('refresh');
            return res.json({ message: 'Logged out' });
        } catch (err) {
            console.error('Logout error', err);
            return res.status(500).json({ message: 'Logout failed' });
        }
    }

}

