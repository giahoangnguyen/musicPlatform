exports.up = async (knex) => {
  await knex.schema.createTable('tracks', (t) => {
    t.string('id').primary();
    t.string('album_id').notNullable().references('albums.id').onDelete('CASCADE');
    t.string('artist_id').notNullable().references('artists.id').onDelete('CASCADE');
    t.string('title', 255).notNullable();
    t.integer('duration_ms').notNullable();
    t.integer('track_number').nullable();
    t.string('audio_url').nullable();
    t.timestamps(true, true);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('tracks');
};
