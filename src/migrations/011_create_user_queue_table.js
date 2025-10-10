exports.up = async (knex) => {
  await knex.schema.createTable('user_queue', (t) => {
    t.string('user_id').notNullable().references('users.id').onDelete('CASCADE');
    t.string('track_id').notNullable().references('tracks.id').onDelete('CASCADE');
    t.integer('position').notNullable().defaultTo(0);
    t.primary(['user_id', 'track_id']);
    t.index(['user_id', 'position']);
    t.timestamps(true, true);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('user_queue');
};
