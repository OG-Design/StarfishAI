import type { Database } from "better-sqlite3";
export function checkModelExistsOnGroup(db: Database, idUser: number, idGroup: number | undefined, modelFullName: any, thinkingLevel?: any) {
    const hasThinkingFilter = thinkingLevel !== undefined && thinkingLevel !== null;
    const checkModelExists = db.prepare(`
        SELECT
        -- groupMembers
        groupMember.idGroupMember, username,
        -- model
        model.name AS modelName, model.fullName AS modelFullName, model.thinkingLevel,
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

        ${hasThinkingFilter ? '/* By thinkingLevel */ AND model.thinkingLevel = ?' : ''}
    `);
    return hasThinkingFilter
        ? checkModelExists.all(idUser, idGroup, modelFullName, String(thinkingLevel))
        : checkModelExists.all(idUser, idGroup, modelFullName);
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