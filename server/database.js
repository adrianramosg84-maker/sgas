/* ================================================================
   SGAS — database.js
   Inicialización de SQLite con better-sqlite3
   ================================================================ */

const Database = require('better-sqlite3');
const path     = require('path');

const DB_PATH = path.join(__dirname, 'sgas.db');
const db      = new Database(DB_PATH);

// Habilitar WAL para mejor performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

/* ── Crear tablas si no existen ── */
db.exec(`
  CREATE TABLE IF NOT EXISTS ats (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      TEXT    NOT NULL,
    categoria   TEXT    NOT NULL,
    estado      TEXT    NOT NULL DEFAULT 'borrador',
    filas       TEXT    NOT NULL DEFAULT '[]',
    observaciones TEXT  NOT NULL DEFAULT '',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS emergencias (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      TEXT    NOT NULL,
    extintores  TEXT    NOT NULL DEFAULT '[]',
    duchas      TEXT    NOT NULL DEFAULT '[]',
    alarmas     TEXT    NOT NULL DEFAULT '[]',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now')),
    updated_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS documentos (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre      TEXT    NOT NULL,
    fecha       TEXT    NOT NULL,
    base64      TEXT    NOT NULL,
    mime_type   TEXT    NOT NULL DEFAULT 'application/pdf',
    created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS config (
    key         TEXT    PRIMARY KEY,
    value       TEXT    NOT NULL
  );
`);

module.exports = db;
