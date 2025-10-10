const { randomUUID } = require('crypto');

exports.seed = async (knex) => {
  await knex('tracks').del();

  const album = await knex('albums').first('id', 'artist_id');
  if (!album) return;

  await knex('tracks').insert([
    {
      id: randomUUID(),
      album_id: album.id,
      artist_id: album.artist_id,
      title: 'First Track',
      duration_ms: 210000,
      track_number: 1,
      audio_url: null,
    },
  ]);
};
