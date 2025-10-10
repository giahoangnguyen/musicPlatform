exports.up = async (knex) => {
  await knex.schema.createTable('artists', (t) => {
    t.string('id').primary();
    t.string('name', 255).notNullable();

    // profile fields
    t.text('bio').nullable();
    t.string('image_url').nullable();
    t.string('background_image_url').nullable();

    // model-dependent fields used by queries/sorting
    t.integer('monthly_listeners').notNullable().defaultTo(0);
    t.boolean('is_verified').notNullable().defaultTo(false);

    // timestamps (created_at, updated_at)
    t.timestamps(true, true);
  });

  // Optional: helpful indexes
  await knex.schema.alterTable('artists', (t) => {
    t.index(['name']);
    t.index(['monthly_listeners']);
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('artists');
};

