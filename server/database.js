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

    CREATE TABLE IF NOT EXISTS equipos (
      id          SERIAL PRIMARY KEY,
      nombre      TEXT    NOT NULL,
      total       INTEGER NOT NULL DEFAULT 0,
      columnas    TEXT    NOT NULL DEFAULT '[]',
      datos       TEXT    NOT NULL DEFAULT '[]',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_ats_categoria  ON ats(categoria);
    CREATE INDEX IF NOT EXISTS idx_ats_updated_at ON ats(updated_at DESC);

    -- Agregar columna tipo si no existe (sin tocar datos existentes)
    ALTER TABLE ats ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'ats';
    ALTER TABLE categorias ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'ats';
    ALTER TABLE ats ADD COLUMN IF NOT EXISTS emergencia TEXT NOT NULL DEFAULT '{}';

    CREATE INDEX IF NOT EXISTS idx_ats_tipo ON ats(tipo);

    -- Constraint única por nombre+tipo en categorías (para upsert correcto)
    DO $$ BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'categorias_nombre_tipo_key'
      ) THEN
        ALTER TABLE categorias ADD CONSTRAINT categorias_nombre_tipo_key UNIQUE (nombre, tipo);
      END IF;
    END $$;

    CREATE TABLE IF NOT EXISTS sheets (
      id          SERIAL PRIMARY KEY,
      nombre      TEXT    NOT NULL,
      url         TEXT    NOT NULL,
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS checklists (
      id          SERIAL PRIMARY KEY,
      nombre      TEXT    NOT NULL,
      fecha       TEXT    NOT NULL,
      base64      TEXT    NOT NULL,
      mime_type   TEXT    NOT NULL DEFAULT 'application/pdf',
      created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
  console.log('Base de datos inicializada');
}

module.exports = { pool, init };
