exports.up = function (knex) {
    return knex.schema.createTable('discord_roles_users', function (table) {
        table.string('discord_role_id').references('discord_role_id').inTable('discord_roles').onDelete('CASCADE');
        table.string('discord_user_id').references('discord_user_id').inTable('discord_users').onDelete('CASCADE');
        table.primary(['discord_role_id', 'discord_user_id']);
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('discord_roles_users');
};