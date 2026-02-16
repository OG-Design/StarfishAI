import { Injectable, InternalServerErrorException, Session, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

console.log(process.cwd()+"/starfish.db");

import db from '../db';

const saltRounds: number = 10;

import settings from 'src/settings.json';

const isRegisterable = settings.user.register.isRegisterable;

@Injectable()
export class UserService {

    // checks setting isRegisterable: enables registration if true, blocks if false
    isRegisterable(): object {
        return { isRegisterable: settings.user.register.isRegisterable };
    }

    async register(username: string, password: string, password_confirm: string): Promise<string> {

        // check registration ability throw 404 if is not registerable
        if (!isRegisterable) {
            throw new NotFoundException;
        }

        // check password & confirm matches
        if(password !== password_confirm) {
            throw new BadRequestException();
        }


        const userExists = db.prepare("SELECT username FROM user WHERE username = ?").get(username);
        if (userExists) {
            console.log("User tried to register with an already existing username", username + ". Existing:", userExists);
            return "User with username " + username + " already exists."
        }

        // try to hash and insert userdata
        try {

            const hash = await bcrypt.hash(password, saltRounds);
            db.prepare('INSERT INTO user (username, hash) VALUES (?, ?)').run(username, hash);
            console.log("Registered user: ", username);

            const user: any = db.prepare("SELECT idUser FROM user WHERE username = ?").get(username);
            console.log(user.idUser);

            db.prepare("INSERT INTO groupMember (user_idUser, userGroup_idUserGroup) VALUES (?, 2)").run(user.idUser);

            const newUserGroup: any = db.prepare(`INSERT INTO userGroup (name, permissionLevel) VALUES ('Private Group', 'admin') RETURNING idUserGroup`).get();
            
            db.prepare(`INSERT INTO groupMember (user_idUser, userGroup_idUserGroup, permissionLevel) VALUES (?, ?, 'admin')`).run(user.idUser, newUserGroup.idUserGroup);

            return "User has been registered";
        } catch (err) {
            console.error("error: ", err);

            throw new InternalServerErrorException('Internal server error');

        }
    }

    async delete(session: Record<string, any>): Promise<string> {

        console.log("deleting user: ", session.user.username);

        try {
            db.prepare('DELETE FROM user WHERE idUser = ?').run(session.user.idUser);
            return "User has been deleted";
        } catch (err) {
            console.error("error: ", err);
            throw new InternalServerErrorException('Internal server error');
        }
    }

    getGroup(session: any): any {
        const idUser = session.user.idUser;

        const groups = db.prepare(`
SELECT idGroupMember, userGroup.name, userGroup.permissionLevel, username, userGroup_idUserGroup, user_idUser
FROM groupMember
INNER JOIN userGroup -- join userGroup's (the permission level groups)
ON groupMember.userGroup_idUserGroup = userGroup.idUserGroup
INNER JOIN user -- join userdata
ON groupMember.user_idUser = user.idUser
WHERE idUser = ?
        `).all(idUser);
        console.log(groups);
        return groups;
    }

}

