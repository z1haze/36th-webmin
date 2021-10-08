require('dotenv').config();
require('./sentry').init();

const {Client} = require('discord.js');
const {syncUsers, syncRoles, syncUserRoles} = require('./db/sync');

const BOT_TOKEN = process.env.BOT_TOKEN;
const GUILD_ID = process.env.GUILD_ID;

const client = new Client({
    intents : ['GUILDS', 'GUILD_PRESENCES', 'GUILD_MEMBERS']
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

    // sync roles to db
    await syncRoles(guild);

    // add users to db, deactivating users who left
    await syncUsers(guild);

    // sync user roles
    await syncUserRoles(guild);

    // sync user-roles to db
});

client.login(BOT_TOKEN);