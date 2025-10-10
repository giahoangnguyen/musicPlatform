const { randomUUID } = require('crypto');

exports.seed = async (knex) => {
  await knex('artists').del();
  await knex('artists').insert([
    { id: randomUUID(), name: 'The Example Band', bio: 'Demo bio', image_url: null },
    { id: randomUUID(), name: 'Sample Artist', bio: null, image_url: null },
  ]);
};
