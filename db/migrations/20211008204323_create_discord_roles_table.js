exports.up = function (knex) {
    return knex.schema.createTable('discord_roles', function (table) {
        table.string('discord_role_id').primary();
        table.string('discord_role_name');
        table.integer('discord_role_position');
    });
};

exports.down = function (knex) {
    return knex.schema.dropTable('discord_roles');
};