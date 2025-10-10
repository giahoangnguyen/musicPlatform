const { randomUUID } = require('crypto');

exports.seed = async (knex) => {
  await knex('albums').del();

  const [artist] = await knex('artists').select('id').limit(1);

  if (!artist) return;

  await knex('albums').insert([
    { id: randomUUID(), artist_id: artist.id, title: 'Hello World', year: 2024, cover_url: null },
  ]);
};
