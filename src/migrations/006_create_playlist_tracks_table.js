exports.up = async (knex) => {
  await knex.schema.createTable('playlist_tracks', (t) => {
    t.string('playlist_id').notNullable().references('playlists.id').onDelete('CASCADE');
    t.string('track_id').notNullable().references('tracks.id').onDelete('CASCADE');
    t.integer('position').notNullable().defaultTo(0);
    t.primary(['playlist_id', 'track_id']);
    t.timestamps(true, true);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('playlist_tracks');
};
