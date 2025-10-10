const path = require('path');

const afterCreate = (conn, done) => {
  conn.run('PRAGMA foreign_keys = ON', done);
};

module.exports = {
  development: {
    client: 'sqlite3',
    connection: { filename: path.join(__dirname, 'database.sqlite') },
    useNullAsDefault: true,
    migrations: { directory: './src/migrations', extension: 'js' },
    seeds: { directory: './src/seeds', extension: 'js' },
    pool: { afterCreate }
  }
};