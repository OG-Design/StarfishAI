import type { Database } from 'better-sqlite3'

/**
 * Get's user's permission level from the group selected.
 * @param db - db connection
 * @param idUser - User ID
 * @param idGroup - Group's ID
 * @returns user permissions
 */
export function getUserGroupPermissions(db: Database, idUser: number, idGroup: number | undefined) {
    const getUserPermission: any = db.prepare(`
        SELECT
        -- groupMembers
        groupMember.idGroupMember, groupMember.user_idUser, groupMember.permissionLevel AS groupMemberPermissionLevel,
        -- userGroup
        userGroup.idUserGroup, userGroup.name AS groupName, userGroup.permissionLevel AS userGroupPermissionLevel
        FROM groupMember
        INNER JOIN userGroup
        ON userGroup.idUserGroup = groupMember.userGroup_idUserGroup
        WHERE groupMember.user_idUser = ? AND userGroup.idUserGroup = ?
    `).all(idUser, idGroup);
    return getUserPermission;
}