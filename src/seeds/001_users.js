const { randomUUID } = require('crypto');
const bcrypt = require('bcryptjs');

exports.seed = async (knex) => {
  await knex('users').del();

  const saltRounds = 10;
  const hash = await bcrypt.hash('password123', saltRounds);

  await knex('users').insert([
    {
      id: randomUUID(),
      email: 'alice@example.com',
      password_hash: hash,
      display_name: 'Alice',
      username: 'alice',
      avatar_url: null,
    },
    {
      id: randomUUID(),
      email: 'bob@example.com',
      password_hash: hash,
      display_name: 'Bob',
      username: 'bobby',
      avatar_url: null,
    },
  ]);
};
