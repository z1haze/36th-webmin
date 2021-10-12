exports.up = function (knex) {
    return knex.schema.createTable('discord_users', function (table) {
        // their discord user unique id
        table.string('discord_user_id').primary();

        // their discord username
        table.string('discord_username');

        // their discord discriminator (the #number following their name)
        table.string('discord_discriminator');

        // their discord nickname as set in the guild
        table.string('discord_nickname');

        // their discord avatar hash
        table.string('discord_avatar_hash');

        // the age of the user
        table.integer('age');

        // flag that determines if the user is a bot user
        table.boolean('is_bot');

        // when they joined the discord
        table.date('join_date');

        // if on leave, this determines how long for excused absences
        table.date('inactivity_excused_until');

        // if the user left the discord, this is when that happened
        table.timestamp('quit_timestamp', { useTz: false });
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('discord_users');
};