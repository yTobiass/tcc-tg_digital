const Database = require('better-sqlite3');
const path = require('path');

// DB_PATH pode ser sobrescrito por variável de ambiente (usado nos testes
// automatizados para não tocar no banco real).
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../../data/tiro_de_guerra.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
  }
  return db;
}

module.exports = { getDb };
