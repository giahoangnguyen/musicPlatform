exports.up = async (knex) => {
  await knex.schema.createTable('play_history', (t) => {
    t.increments('id').primary();
    t.string('user_id').notNullable().references('users.id').onDelete('CASCADE');
    t.string('track_id').notNullable().references('tracks.id').onDelete('CASCADE');
    t.timestamp('played_at').notNullable().defaultTo(knex.fn.now());
    t.index(['user_id', 'played_at']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('play_history');
};
