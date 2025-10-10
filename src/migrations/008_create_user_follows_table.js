exports.up = async (knex) => {
  await knex.schema.createTable('user_follows', (t) => {
    // JS expects user_id + artist_id
    t.string('user_id').notNullable().references('users.id').onDelete('CASCADE');
    t.string('artist_id').notNullable().references('artists.id').onDelete('CASCADE');

    t.timestamp('created_at').notNullable().defaultTo(knex.fn.now());

    // one follow per (user, artist)
    t.primary(['user_id', 'artist_id']);
    t.index(['user_id']);
    t.index(['artist_id']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('user_follows');
};

