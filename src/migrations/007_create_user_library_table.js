exports.up = async (knex) => {
  await knex.schema.createTable('user_library', (t) => {
    t.string('user_id').notNullable().references('users.id').onDelete('CASCADE');
    t.string('item_type').notNullable();
    t.string('item_id').notNullable();
    t.primary(['user_id', 'item_type', 'item_id']);
    t.timestamps(true, true);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('user_library');
};
