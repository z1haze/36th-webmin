require('dotenv').config();
require('./sentry').init();

const {Client} = require('discord.js');
const {syncUsers, syncRoles, syncUsersRoles, addUser, updateUser, syncUserRoles, addRole, updateRole, deleteRole} = require('./db/helpers');
const knex = require('./db/knex');

const BOT_TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
    intents : ['GUILDS', 'GUILD_PRESENCES', 'GUILD_MEMBERS']
});

/**
 * Handle adding new discord member to database on guild join
 */
client.on('guildMemberAdd', async (guildMember) => {
    console.log(`${guildMember.displayName} joined the server`);

    const userRows = await knex('discord_users')
        .where({ discord_user_id:  guildMember.id});

    // user exists in the database means they have been here before
    if (userRows.length === 1) {
        // update their user record
        await updateUser(guildMember, {
            discord_username: guildMember.user.username,
            discord_discriminator: guildMember.user.discriminator,
            discord_nickname: guildMember.nickname,
            quit_timestamp: null
        });

        // sync their roles
        await syncUserRoles(guildMember, userRows[0]);
    } else if (userRows.length > 1) {
        throw new Error(`Found user with id ${guildMember.id} and display name ${guildMember.displayName} in database more than once!`);
    } else {
        // brand new user, add them
        await addUser(guildMember);

        // sync their roles
        await syncUserRoles(guildMember);
    }
});

/**
 * Handle flagging guild member as quit and remove all roles in the database
 */
client.on('guildMemberRemove', async (guildMember) => {
    console.log(`${guildMember.displayName} left the server`);

    const userRows = await knex('discord_users')
        .where({ discord_user_id:  guildMember.id});

    if (userRows.length > 0) {
        await updateUser(guildMember, {quit_timestamp: knex.fn.now()});
        await knex('discord_roles_users').where('discord_user_id', userRows[0].discord_user_id).del();
    }
});

/**
 * Handle adding new roles to the database
 */
client.on('roleCreate', async (role) => {
    console.log(`${role.id} - ${role.name} was created.`);

    await addRole(role);
});

/**
 * Handle updating a role in the database
 */
client.on('roleUpdate', async (oldRole, newRole) => {
    console.log(`${oldRole.id} was updated.`);

    await updateRole(newRole);
});

/**
 * Handle deleting a role from the database
 */
client.on('roleDelete', async (role) => {
    console.log(`${role.name} was deleted.`);

    await deleteRole(role);
});

/**
 * Handle nickname role updates for a user
 */
client.on('guildMemberUpdate', async (oldGuildMember, newGuildMember) => {
    console.log(`Guild Member ${oldGuildMember.displayName} was updated.`);

    if (oldGuildMember.nickname !== newGuildMember.nickname) {
        await updateUser(newGuildMember, {
            discord_nickname: newGuildMember.nickname,
        });
    } else if (oldGuildMember.roles.cache.size !== newGuildMember.roles.cache.size) {
        await syncUserRoles(newGuildMember, {discord_user_id: newGuildMember.id});
    } else {
        console.warn(`Untracked guildMemberUpdate for ${newGuildMember.displayName}`)
    }
});

/**
 * Handle username or user  discriminator changes
 */
client.on('userUpdate', async (oldUser, newUser) => {
    console.log(`User ${oldUser.username} has updated.`);

    await updateUser(newUser, {
        discord_username: newUser.username,
        discord_discriminator: newUser.discriminator,
        discord_avatar_hash: newUser.avatar
    });
});

client.on('ready', async () => {
    // eslint-disable-next-line no-console
    console.info(`Logged in as ${client.user.tag}!`);

    const guild = client.guilds.cache.get(GUILD_ID);

    if (!guild) {
        throw new Error(`Incorrect guild id: ${GUILD_ID}`);
    }

    // update caches
    await guild.members.fetch();
    await guild.roles.fetch();

    // add users to db, deactivating users who left
    await syncUsers(guild);

    // sync roles to db
    await syncRoles(guild);

    // sync user roles
    await syncUsersRoles(guild);

    // sync user-roles to db
});

client.login(BOT_TOKEN);