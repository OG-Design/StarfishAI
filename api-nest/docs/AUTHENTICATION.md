# **Authentication**

## Session
The session handler is responsible for handling sessions, it is used to keep data on authenticated user sessions, and prevent unauthenticated access through the *guard* logic shown further down.

### ./src/main.ts
```ts
// ./src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import session from 'express-session';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(session({
    secret: "0", // replace
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false,
      maxAge: 3600000*24
    }
  }))

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
```

### The session setup

This imports session from *express-session*

```ts
import session from 'express-session';
```

The code below initializes and uses the `session` variable. `app.use` tells the `NestFactory` or `app` to use `express-session` as a global session handler. Look at the comments of the session object for an explanation of what they do

```ts
app.use(session({
  secret: "0", // replace
  resave: false,
  saveUninitialized: false, // ensures that unauthenticated sessions don't exist
  cookie: {
    httpOnly: true, // prevents access from clientside js
    secure: false, // true | false == https | http
    maxAge: 3600000*24 // time 1 day, the maximum age of a session
  }
}))
```

## The controller

This is responsible for the route `/auth`, it handles login and logout route requests, it also includes `JWT` authentication and checking and refreshing tokens. The logout is also responsible for destroying the `session` and blacklisting the `JWT` if it exists.

### ./src/auth/auth.controller.ts
```ts
// ./src/auth/auth.controller.ts
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


```

### The login route

The route to access login is `/auth/login` due to the controller's path. It requires a *@Body()* decorator with a body containing objects `username`, `password`. It also uses the imported `@Req()` and `Request` defined as req. Res is similarly structured. Its task is to create a session if the password matches the hash, as well as generating and serving `JWT`'s as COOKIES to the user for the websocket authentication.  

```ts
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

```

### The logout route

To access this route follow the same logic as in the login route so in this case `/auth/logout`. It requires no input parameters, but defines `@Req()`, `Request`, `@Res()`, `Response` as in the login route. It destroys the provided session and blacklists jwt's.

```ts
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
```

This destroys the session and clears cookies.

```ts
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
```

## The service

The service handles most of the login, logout & JWT logic.

### ./src/auth/auth.service.ts
```ts
import { Injectable, UnauthorizedException, InternalServerErrorException, BadRequestException} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import jwt from 'jsonwebtoken';
import { secretJWT } from 'src/secretJWT';

import { randomUUID, createHash } from 'crypto';
import Redis from 'ioredis';

import * as bcrypt from 'bcrypt';
import Database from 'better-sqlite3';

import db from '../db';

const saltRounds: number = 10;

// const redis = new Redis(process.env.REDIS_URL);

@Injectable()
export class AuthService {
    // init redis (optional) - fall back to in-memory store if redis not configured
    private redis: Redis | null = null;
    private inMemoryRefresh = new Map<string, string>();
    private useRedis = true;

    constructor(private config: ConfigService) {
        const redisUrl = this.config.get<string>('REDIS_URL');
        if (redisUrl) {
            try {
                console.log("using REDIS")
                this.redis = new Redis(redisUrl);
                this.useRedis = true;
                // watch for runtime errors and fall back to in-memory store
                this.redis.on('error', (err) => {
                    console.warn('Redis runtime error, falling back to in-memory store', err);
                    try {
                        this.redis?.disconnect?.();
                    } catch {}
                    this.redis = null;
                    this.useRedis = false;
                });
            } catch (err) {
                console.warn('Failed to connect to Redis, falling back to in-memory store', err);
                this.redis = null;
                this.useRedis = false;
            }
        } else {
            console.warn('REDIS_URL not set — using in-memory refresh store');
            this.redis = null;
            this.useRedis = false;
        }
    }

    /**
     * Validates user credentials and issues tokens if valid
     * @param username - The username of the user
     * @param pasword - The password of the user
     * @returns - An object containing user details and tokens
    */
    async validateUser(username: string, password: string) {

        try {

            const user: any = db.prepare('SELECT idUser, username, hash FROM user WHERE username = ?').get(username);

            // console.log(user);

            if (!user) {
                throw new UnauthorizedException("Username or password incorrect");
            }

            console.log("\n\n", user.username, " is logged in.\n");

            // compare password
            const isValid = await bcrypt.compare(password, user.hash);
            console.log("Login is", await isValid, "\n");

            if(!isValid) {
                throw new UnauthorizedException("Username or password incorrect");
            }


            const it = this.issueTokens(user.idUser, user.username);
            const accessToken = it.accessToken;
            const refreshToken = it.refreshToken;
            const refreshJti = it.refreshJti;

            await this.saveRefresh(user.idUser, refreshJti, refreshToken);

            const authRes: any = {
                user,
                tokens: {
                    access: accessToken,
                    refresh: refreshToken
                }
            }

            return authRes;

        } catch (err) {
            if (err instanceof UnauthorizedException) {
                throw err;
            }
            console.error("error: ", err);
            throw new InternalServerErrorException("Internal server error");
        }
    }


    /**
     * Validates session
     * @param session
     * @returns An object with a boolean value - isAuth
     */
    isAuth(session: Record<string, any>): object {
        const user = session.user;
        // console.log("Session check ", session);
        // console.log("Session user", user);

        const cookieHeader = session.handshake.headers.cookie ?? '';

        console.log("Cookie header:", cookieHeader);
        /*
        ---parse cookies---
        split removes ; reduce uses an accumilator-
        -to store the key value pair as k and ...v
        if the key is invalid it returns acc.
        else it decodes the value and returns that.
        */
        const cookies = cookieHeader.split(';').reduce((acc: any, part: any) => {
        const [k, ...v] = part.trim().split('=');
        if (!k) return acc;
        acc[k] = decodeURIComponent(v.join('='));
        return acc;
        }, {} as Record<string, string>);

        const token = cookies.jwt;


        if (!session.user) {

            return {
                isAuth: false,

            };
        }

        // this.rotateRefresh(token);

        return {
            isAuth: true,
        };
    }

    /**
     * Destroys session, revokes / blacklists jwt's and logs user out
     * @param req - The request body
    */
    logout(req: any, res: any) {
        req.session.destroy( (err: any) => {
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

    /**
     * Hashes tokens
     * @param token - the token pre hash
     * @returns hash
     */
    private hashToken(token: string) {
        return createHash("sha256").update(token).digest('hex');
    }

    /**
     * Formats the refresh key
     * @param idUser - The user's ID
     * @param jti - The jwt's ID
     * @returns formated: `refresh:<idUser>:<jti>`
    */
    private refreshKey(idUser: number, jti: string) {
        return `refresh:${idUser}:${jti}`;
    }

    /**
     * Issue JWT tokens for authentication with websockets
     * @param idUser - The user's ID
     * @param username - The user's username
     * @returns accessToken, refreshToken, accessJti, refreshJti
    */
    private issueTokens(idUser: number, username: string) {
        const accessJti = randomUUID();
        const refreshJti = randomUUID();
        const accessToken = jwt.sign({ sub: idUser, username, jti: accessJti}, secretJWT, {expiresIn: '15m'});
        const refreshToken = jwt.sign({ sub: idUser, jti: refreshJti}, secretJWT, {expiresIn: '7d'});
        return { accessToken, refreshToken, accessJti, refreshJti };
    }

    /**
     * Save the refresh as hashed value, idUser and jti as the value (uses Redis if available, otherwise in-memory map)
     * @param idUser - The user's ID
     * @param jti
     * @param refreshToken
     * @returns nothing
     */
    private async saveRefresh(idUser: number, jti: string, refreshToken: string) {
        const ttlSeconds = 7 * 24 * 60 * 60;
        const key = this.refreshKey(idUser, jti);
        const hashed = this.hashToken(refreshToken);
        if (this.useRedis && this.redis) {
            console.log('AuthService.saveRefresh -> setting', key);
            await this.redis.set(key, hashed, 'EX', ttlSeconds);
            return;
        }
        // store with a basic expiry via a timeout
        this.inMemoryRefresh.set(key, hashed);
        setTimeout(() => this.inMemoryRefresh.delete(key), ttlSeconds * 1000).unref?.();
    }

    /**
     * Revokes access to a JWT
     * @param idUser - The user's ID
     * @param accessJti
     * @param ttlSeconds
     * @returns nothing
     */
    // revoke a specific access token by jti (blacklist)
    async revokeAccess(idUser: number, accessJti: string, ttlSeconds: number) {
        const key = `blacklist:access:${idUser}:${accessJti}`;
        if (this.useRedis && this.redis) {
            console.log('AuthService.revokeAccess -> setting blacklist key', key, 'ttl', ttlSeconds);
            await this.redis.set(key, '1', 'EX', ttlSeconds);
            return;
        }
        this.inMemoryRefresh.set(key, '1');
        setTimeout(() => this.inMemoryRefresh.delete(key), ttlSeconds * 1000).unref?.();
    }

    /**
     * Checkt the validity of an access token
     * @param idUser - The user's ID
     * @param accessJti
     * @returns blacklist or null
     */
    // check if access jti is revoked
    async isAccessRevoked(idUser: number, accessJti: string) {
        const key = `blacklist:access:${idUser}:${accessJti}`;
        if (this.useRedis && this.redis) {
            const v = await this.redis.get(key);
            return !!v;
        }
        return this.inMemoryRefresh.has(key);
    }

    /**
     * Revokes all refresh tokens for a user
     * @param idUser - The user's ID
     * @returns nothing
     */
    // revoke all refresh tokens for a user
    async revokeAllRefreshForUser(idUser: number) {
        const pattern = `refresh:${idUser}:*`;
        if (this.useRedis && this.redis) {
            console.log('AuthService.revokeAllRefreshForUser -> scanning for', pattern);
            const stream = this.redis.scanStream({ match: pattern, count: 100 });
            for await (const keys of stream as AsyncIterable<string[]>) {
                if (keys.length) {
                    console.log('AuthService.revokeAllRefreshForUser -> deleting keys', keys);
                    await this.redis.del(...keys);
                }
            }
            return;
        }
        for (const k of Array.from(this.inMemoryRefresh.keys())) {
            if (k.startsWith(`refresh:${idUser}:`)) this.inMemoryRefresh.delete(k);
        }
    }

    /**
     * Rotates the tokens
     * @param refreshToken
     * @returns An object containting accessToken & refreshToken
     */
    // rotate the refresh token and return new tokens
    async rotateRefresh(refreshToken: string) {
        let payload: { sub: number; jti: string };
        try {
            payload = jwt.verify(refreshToken, secretJWT) as { sub: number; jti: string };
        } catch (err) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        // format payload
        const key = this.refreshKey(payload.sub, payload.jti);


        let stored: string | null = null;

        // check if redis is used
        if (this.useRedis && this.redis) {
            stored = await this.redis.get(key);
        } else {
            stored = this.inMemoryRefresh.get(key) ?? null;
        }

        // throw error if stored is invalid
        if (!stored || stored !== this.hashToken(refreshToken)) throw new UnauthorizedException('Invalid refresh');

        // invalidate old refresh
        if (this.useRedis && this.redis) {
            await this.redis.del(key);
        } else {
            this.inMemoryRefresh.delete(key);
        }

        // try to fetch username for access token payload
        const row: any = db.prepare('SELECT username FROM user WHERE idUser = ?').get(payload.sub);
        const username = row?.username ?? '';

        const { accessToken, refreshToken: newRefresh, refreshJti: newJti } = this.issueTokens(payload.sub, username);

        await this.saveRefresh(payload.sub, newJti, newRefresh);

        return { accessToken, refreshToken: newRefresh };
    }


}
```

## The session auth guard

The session-auth guard is responsible for checking the sessions. This is imported in the scripts requiring authentication, one example of this is inside of the `./user/user.service.ts` script. Inside the user service it is used on the `delete` route, which is responsible for deleting users from the database.

---
# **WIP**
# **Incomplete description of how it works**
---

### ./src/auth/session-auth.guard.ts

```ts
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";


// checks for session
@Injectable()
export class SessionAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {

        if (process.env.ELECTRON_MODE === 'true') {
            return true; // Disable auth for Electron
        }

        const req = context.switchToHttp().getRequest();
        if (!req.session?.user) {
            throw new UnauthorizedException('Not authenticated');
        }

        return true;
    }
}
```
