exports.up = async (knex) => {
  await knex.schema.createTable('albums', (t) => {
    t.string('id').primary();
    t.string('artist_id').notNullable().references('artists.id').onDelete('CASCADE');
    t.string('title', 255).notNullable();
    t.integer('year').nullable();
    t.string('cover_url').nullable();
    t.timestamps(true, true);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('albums');
};
