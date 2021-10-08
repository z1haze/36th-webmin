const knex = require('../db/knex');

module.exports = {
    syncUsers: async (guild) => {
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
                await knex('discord_users').insert([{
                    discord_user_id: guildMember.user.id,
                    discord_username: guildMember.user.username,
                    discord_discriminator: guildMember.user.discriminator,
                    discord_nickname: guildMember.nickname,
                    discord_avatar_hash: null,
                    age: null,
                    is_bot: guildMember.user.bot,
                    join_date: guildMember.joinedAt,
                    inactivity_excused_until: null,
                    quit_timestamp: null
                }]);
            } else {
                // remove the users from the set so they wont be deleted
                usersToDelete.delete(guildMember.user.id);
            }
        });

        // soft delete users who left while the bot was down
        if (usersToDelete.size > 0) {
            const timestamp = Date.now();

            await knex('discord_members')
                .whereIn('discord_user_id', Array.from(usersToDelete))
                .update({quit_timestamp: timestamp});
        }

        console.log('Syncing Users Complete');
    },

    syncRoles: async (guild) => {
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
               await knex('discord_roles').insert([{
                   discord_role_id: role.id,
                   discord_role_name: role.name,
                   discord_role_position: role.position
               }])
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
    },

    syncUserRoles: async (guild) => {
        console.log('Syncing User Roles...');

        const dbUsers = await knex.select()
            .whereNull('quit_timestamp')
            .table('discord_users');

        for (const row of dbUsers) {
            const discordUser = guild.members.cache.get(row.discord_user_id);
            const roles = discordUser.roles.cache;

            // first clear the user's roles
            await knex('discord_roles_users').where('discord_user_id', row.discord_user_id).del();

            roles.each(async (role) => {
                await knex('discord_roles_users').insert([{
                    discord_user_id: row.discord_user_id,
                    discord_role_id: role.id
                }]);
            });
        }

        console.log('Syncing User Roles Complete');
    }
}