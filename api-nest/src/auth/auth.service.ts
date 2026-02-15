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
    private redis: Redis;

    constructor(private config: ConfigService) {
        const redisUrl = this.config.get<string>('REDIS_URL');
        if(!redisUrl) throw new Error('REDIS_URL is not set');
        this.redis = new Redis(redisUrl);
    }

    // validates user credentials
    async validateUser(username: string, password: string) {

        try {

            const user: any = db.prepare('SELECT idUser, username, hash FROM user WHERE username = ?').get(username);

            console.log(user);

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

            return user;

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
        console.log("Session user", user);

        // const cookieHeader = session.handshake.headers.cookie ?? '';

        // console.log("Cookie header:", cookieHeader);
        /*
        ---parse cookies---
        split removes ; reduce uses an accumilator-
        -to store the key value pair as k and ...v
        if the key is invalid it returns acc.
        else it decodes the value and returns that.
        */
        // const cookies = cookieHeader.split(';').reduce((acc: any, part: any) => {
        // const [k, ...v] = part.trim().split('=');
        // if (!k) return acc;
        // acc[k] = decodeURIComponent(v.join('='));
        // return acc;
        // }, {} as Record<string, string>);

        // const token = cookies.jwt;


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

    private hashToken(token: string) {
        return createHash("sha256").update(token).digest('hex');
    }

    private refreshKey(idUser: number, jti: string) {
        return `refresh:${idUser}:${jti}`;
    }

    private issueTokens(idUser: number, username: string) {
        const jti = randomUUID();
        const accessToken = jwt.sign({ sub: idUser, username}, secretJWT, {expiresIn: '15m'});
        const refreshToken = jwt.sign({ sub: idUser, jti}, secretJWT, {expiresIn: '7d'});
        return {accessToken, refreshToken, jti};
    }

    private async saveRefresh(idUser: number, jti: string, refreshToken: string) {
        const ttlSeconds = 7 * 24 * 60 * 60;
        await this.redis.set(this.refreshKey(idUser, jti), this.hashToken(refreshToken), 'EX', ttlSeconds);
    }

    private async rotateRefresh(refreshToken: string) {
        const payload = jwt.verify(refreshToken, secretJWT) as { sub: number; jti: string };
        const key = this.refreshKey(payload.sub, payload.jti);
        const stored = await this.redis.get(key);

        if (!stored || stored !== this.hashToken(refreshToken)) throw new Error('Invalid refresh');

        await this.redis.del(key);
        const { accessToken, refreshToken: newRefresh, jti: newJti } = this.issueTokens(payload.sub, '');
        await this.saveRefresh(payload.sub, newJti, newRefresh);

    }


}
