/* ================================================================
   SGAS — database.js
   PostgreSQL con Supabase (datos persistentes)
   ================================================================ */

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

/* ── Crear tablas si no existen ── */
async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS ats (
      id            SERIAL PRIMARY KEY,
      nombre        TEXT    NOT NULL,
      categoria     TEXT    NOT NULL,
      estado        TEXT    NOT NULL DEFAULT 'borrador',
      filas         TEXT    NOT NULL DEFAULT '[]',
      observaciones TEXT    NOT NULL DEFAULT '',
      created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS emergencias (
      id          SERIAL PRIMARY KEY,
      nombre      TEXT    NOT NULL,
      extintores  TEXT    NOT NULL DEFAULT '[]',
      duchas      TEXT    NOT NULL DEFAULT '[]',
      alarmas     TEXT    NOT NULL DEFAULT '[]',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS documentos (
      id          SERIAL PRIMARY KEY,
      nombre      TEXT    NOT NULL,
      fecha       TEXT    NOT NULL,
      base64      TEXT    NOT NULL,
      mime_type   TEXT    NOT NULL DEFAULT 'application/pdf',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS config (
      key         TEXT    PRIMARY KEY,
      value       TEXT    NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categorias (
      id          SERIAL PRIMARY KEY,
      nombre      TEXT    NOT NULL UNIQUE,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('Base de datos inicializada');
}

module.exports = { pool, init };
