import { Injectable, UnauthorizedException, InternalServerErrorException, BadRequestException} from '@nestjs/common';

import jwt from 'jsonwebtoken';
import { secretJWT } from 'src/secretJWT';

import * as bcrypt from 'bcrypt';
import Database from 'better-sqlite3';

import db from '../db';

const saltRounds: number = 10;



@Injectable()
export class AuthService {
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


        if (session.user) {

            // make jwt for the websocket connection etc
            const token = jwt.sign(
                {idUser: user.idUser, username: user.username}, //payload
                secretJWT, // token secret CHANGE
                {expiresIn: '10m'} // expiration time
            );

            return {
                isAuth: true,
                jwt: token
            };
        } else {
            return {
                isAuth: false,
                jwt: {}
            };
        }
    }

}
