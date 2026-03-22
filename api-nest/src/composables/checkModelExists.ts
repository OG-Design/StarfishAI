import type { Database } from "better-sqlite3";
export function checkModelExistsOnGroup(db: Database, idUser: number, idGroup: number | undefined, modelFullName: any) {
    const checkModelExists = db.prepare(`
        SELECT
        -- groupMembers
        groupMember.idGroupMember, username,
        -- model
        model.name AS modelName, model.fullName AS modelFullName,
        -- userGroup
        userGroup.idUserGroup, userGroup.name AS groupName
        FROM groupMember
        INNER JOIN userGroup
        ON userGroup.idUserGroup = groupMember.userGroup_idUserGroup
        INNER JOIN model
        ON model.userGroup_idUserGroup = userGroup.idUserGroup
        INNER JOIN user
        ON user.idUser = groupMember.user_idUser

        /* By user */
        WHERE idUser = ?

        /* By group */
        AND idUserGroup = ?

        /* By modelName */
        AND model.fullName = ?
    `).all(idUser, idGroup, modelFullName);
    return checkModelExists;
}

export function checkModelExistsOnAll(db: Database, idUser: number, idGroup: number | undefined, modelFullName: any) {
    const checkModelExists = db.prepare(`
        SELECT
        -- groupMembers
        groupMember.idGroupMember, username,
        -- model
        model.name AS modelName, model.fullName AS modelFullName,
        -- userGroup
        userGroup.idUserGroup, userGroup.name AS groupName
        FROM groupMember
        INNER JOIN userGroup
        ON userGroup.idUserGroup = groupMember.userGroup_idUserGroup
        INNER JOIN model
        ON model.userGroup_idUserGroup = userGroup.idUserGroup
        INNER JOIN user
        ON user.idUser = groupMember.user_idUser

        /* By modelName */
        WHERE model.fullName = ?
    `).all(idUser, idGroup, modelFullName);
    return checkModelExists;
}