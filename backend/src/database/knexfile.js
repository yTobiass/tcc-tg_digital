const path = require('path');

module.exports = {
  client: 'better-sqlite3',
  connection: {
    filename: path.resolve(__dirname, '../../data/tiro_de_guerra.db'),
  },
  migrations: {
    directory: path.resolve(__dirname, 'migrations'),
    tableName: 'knex_migrations',
  },
  useNullAsDefault: true,
  pool: {
    afterCreate: (conn, cb) => {
      conn.pragma('foreign_keys = ON');
      conn.pragma('journal_mode = WAL');
      cb();
    },
  },
};
