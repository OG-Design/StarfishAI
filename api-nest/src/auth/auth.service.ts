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

    // validates user credentials
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

            // make jwt for the websocket connection etc
            // const token = jwt.sign(
            //     {idUser: user.idUser, username: user.username}, //payload
            //     secretJWT, // token secret CHANGE
            //     {expiresIn: '10h'} // expiration time
            // );

            return {
                isAuth: false,

            };
        }

        // this.rotateRefresh(token);

        return {
            isAuth: true,
        };
    }

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

    // generate jwt token
    private hashToken(token: string) {
        return createHash("sha256").update(token).digest('hex');
    }

    // refresh jwt token
    private refreshKey(idUser: number, jti: string) {
        return `refresh:${idUser}:${jti}`;
    }

    // issue jwt token
    // issue jwt token (returns both access and refresh JTIs)
    private issueTokens(idUser: number, username: string) {
        const accessJti = randomUUID();
        const refreshJti = randomUUID();
        const accessToken = jwt.sign({ sub: idUser, username, jti: accessJti}, secretJWT, {expiresIn: '15m'});
        const refreshToken = jwt.sign({ sub: idUser, jti: refreshJti}, secretJWT, {expiresIn: '7d'});
        return { accessToken, refreshToken, accessJti, refreshJti };
    }

    // save refresh token (uses Redis if available, otherwise in-memory Map)
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

    // check if access jti is revoked
    async isAccessRevoked(idUser: number, accessJti: string) {
        const key = `blacklist:access:${idUser}:${accessJti}`;
        if (this.useRedis && this.redis) {
            const v = await this.redis.get(key);
            return !!v;
        }
        return this.inMemoryRefresh.has(key);
    }

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

    // rotate the refresh token and return new tokens
    async rotateRefresh(refreshToken: string) {
        let payload: { sub: number; jti: string };
        try {
            payload = jwt.verify(refreshToken, secretJWT) as { sub: number; jti: string };
        } catch (err) {
            throw new UnauthorizedException('Invalid refresh token');
        }

        const key = this.refreshKey(payload.sub, payload.jti);
        let stored: string | null = null;
        if (this.useRedis && this.redis) {
            stored = await this.redis.get(key);
        } else {
            stored = this.inMemoryRefresh.get(key) ?? null;
        }

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
