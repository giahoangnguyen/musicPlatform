exports.up = async (knex) => {
    await knex.schema.createTable('users', (table) => {
        table.string('id').primary();
        table.string('email', 255).notNullable().unique();
        table.string('password_hash', 255).notNullable();
        table.string('display_name', 100).notNullable();
        table.string('username', 50).nullable();     
        table.string('avatar_url').nullable();
        table.timestamps(true, true);                
    });
};

exports.down = async (knex) => {
    await knex.schema.dropTableIfExists('users');
};
