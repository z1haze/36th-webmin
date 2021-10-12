const knex = require('./knex');

/**
 * Handle syncing users from discord to database on startup
 *
 * @param guild
 * @returns {Promise<void>}
 */
async function syncUsers (guild) {
    console.log('Syncing Users...');

    const dbUsers = await knex.select().table('discord_users');

    const usersToDelete = new Set();
    const dbUsersMap = new Map();

    // initialize our sets with database members
    dbUsers.forEach((row) => {
        usersToDelete.add(row.discord_user_id);
        dbUsersMap.set(row.discord_user_id, row);
    });

    guild.members.cache.each(async (guildMember) => {
        // insert members who have joined while the bot was down
        if (!dbUsersMap.has(guildMember.user.id)) {
            await addUser(guildMember);
        } else {
            // remove the users from the set so they wont be deleted
            usersToDelete.delete(guildMember.user.id);
        }
    });

    if (usersToDelete.size > 0) {
        // flag user as quit
        await knex('discord_users')
            .whereIn('discord_user_id', Array.from(usersToDelete))
            .update({quit_timestamp: Date.now()});

        // delete user's roles
        await knex('discord_roles_users').whereIn('discord_user_id', Array.from(usersToDelete)).del();
    }

    console.log('Syncing Users Complete');
}

/**
 * Handle syncing roles from discord to database on startup
 *
 * @param guild
 * @returns {Promise<void>}
 */
async function syncRoles (guild) {
    console.log('Syncing Users...');

    const dbRoles = await knex.select().table('discord_roles');

    const rolesToDelete = new Set();
    const dbRolesMap = new Map();

    // initialize our sets with database roles
    dbRoles.forEach((row) => {
        rolesToDelete.add(row.discord_role_id);
        dbRolesMap.set(row.discord_role_id, row);
    });

    guild.roles.cache.each(async (role) => {
        // insert roles which were created while the bot was down
        if (!dbRolesMap.has(role.id)) {
            await addRole(role);
        } else {
            // remove the users from the set so they wont be deleted
            rolesToDelete.delete(role.id);
        }
    });

    // delete roles that were deleted while the bot was down
    if (rolesToDelete.size > 0) {
        await knex('discord_roles')
            .delete()
            .whereIn('discord_role_id', Array.from(rolesToDelete));
    }

    console.log('Syncing Roles Complete');
}

/**
 * Handle syncing all users roles from discord to database on startup
 *
 * @param guild
 * @returns {Promise<void>}
 */
async function syncUsersRoles (guild) {
    console.log('Syncing Users Roles...');

    const dbUsers = await knex.select()
        .whereNull('quit_timestamp')
        .table('discord_users');

    for (const row of dbUsers) {
        const guildMember = guild.members.cache.get(row.discord_user_id);

        await syncUserRoles(guildMember, row);
    }

    console.log('Syncing Users Roles Complete');
}

/**
 * Add a new role to the database
 *
 * @param role
 * @returns {Knex.QueryBuilder<{discord_role_id, discord_role_name, discord_role_position}, number[]>}
 */
function addRole (role) {
    return knex('discord_roles').insert([{
        discord_role_id: role.id,
        discord_role_name: role.name,
        discord_role_position: role.position
    }]);
}

/**
 * Update an existing role in the database
 *
 * @param role
 * @returns {Knex.QueryBuilder<TRecord, number>}
 */
function updateRole (role) {
    return knex('discord_roles')
        .where('discord_role_id', role.id)
        .update({
            discord_role_name: role.name,
            discord_role_position: role.position
        });
}

/**
 * Delete a role from the database
 *
 * @param role
 * @returns {Knex.QueryBuilder<TRecord, number>}
 */
function deleteRole (role) {
    return knex('discord_roles')
        .where('discord_role_id', role.id)
        .del();
}

/**
 * Add a new member to the database
 *
 * @param guildMember
 * @returns {Knex.QueryBuilder<{discord_nickname: string, inactivity_excused_until: null, discord_user_id, discord_avatar_hash: null, join_date: Date, quit_timestamp: null, discord_username, is_bot: boolean | APIUser | User, discord_discriminator: string, age: null}, number[]>}
 */
function addUser (guildMember) {
    return knex('discord_users').insert([{
        discord_user_id: guildMember.user.id,
        discord_username: guildMember.user.username,
        discord_discriminator: guildMember.user.discriminator,
        discord_nickname: guildMember.nickname,
        discord_avatar_hash: guildMember.user.avatar,
        age: null,
        is_bot: guildMember.user.bot,
        join_date: guildMember.joinedAt,
        inactivity_excused_until: null,
        quit_timestamp: null
    }]);
}

/**
 * Update a database use with new fields
 *
 * @param guildMember
 * @param fields
 * @returns {Knex.QueryBuilder<TRecord, number>}
 */
function updateUser (guildMember, fields) {
    return knex('discord_users')
        .where('discord_user_id', guildMember.id)
        .update(fields);
}

/**
 * Sync a discord member's roles to the database
 *
 * @param guildMember
 * @param existingUser
 * @returns {Promise<void>}
 */
async function syncUserRoles (guildMember, existingUser = null) {
    const start = Date.now();
    const roles = guildMember.roles.cache;

    if (existingUser) {
        await knex('discord_roles_users').where('discord_user_id', existingUser.discord_user_id).del();
    }

    // build the user roles
    const entries = roles.map((role) => {
        return {
            discord_user_id: guildMember.id,
            discord_role_id: role.id
        };
    });

    await knex('discord_roles_users').insert(entries);

    console.log(`Syncing Roles For ${guildMember.displayName} took ${Date.now() - start}ms`);
}

module.exports = {
    syncUsers,
    syncRoles,
    syncUsersRoles,
    addUser,
    updateUser,
    syncUserRoles,
    addRole,
    updateRole,
    deleteRole
}