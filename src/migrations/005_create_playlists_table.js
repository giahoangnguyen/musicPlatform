exports.up = async (knex) => {
  await knex.schema.createTable('playlists', (t) => {
    t.string('id').primary();

    // owner of the playlist — your JS expects `user_id` (not `owner_id`)
    t.string('user_id').notNullable().references('users.id').onDelete('CASCADE');

    t.string('name', 255).notNullable();
    t.text('description').nullable();

    // your JS uses `image_url` (not `cover_url`)
    t.string('image_url').nullable();

    t.boolean('is_public').notNullable().defaultTo(true);

    // created_at / updated_at
    t.timestamps(true, true);
  });

  // helpful indexes
  await knex.schema.alterTable('playlists', (t) => {
    t.index(['user_id']);
    t.index(['is_public']);
    t.index(['created_at']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('playlists');
};

