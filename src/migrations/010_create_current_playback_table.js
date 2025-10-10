exports.up = async (knex) => {
  await knex.schema.createTable('current_playback', (t) => {
    t.string('user_id').primary().references('users.id').onDelete('CASCADE');
    t.string('track_id').nullable().references('tracks.id').onDelete('SET NULL');
    t.boolean('is_playing').notNullable().defaultTo(false);
    t.integer('position_ms').notNullable().defaultTo(0);
    t.integer('volume_percent').notNullable().defaultTo(100);
    t.string('device_name').nullable();
    t.boolean('shuffle_state').notNullable().defaultTo(false);
    t.string('repeat_state').notNullable().defaultTo('off');
    t.timestamp('updated_at').notNullable().defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTableIfExists('current_playback');
};
