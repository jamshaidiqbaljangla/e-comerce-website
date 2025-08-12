const { Pool } = require('pg');
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bingo_ecommerce',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

const createMediaTables = async () => {
  try {
    // Create media tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS media (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL,
        original_name VARCHAR(255),
        section VARCHAR(50) NOT NULL,
        alt_text TEXT,
        title TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create media usage tracking table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS media_usage (
        id SERIAL PRIMARY KEY,
        media_id INTEGER REFERENCES media(id),
        page VARCHAR(255),
        section VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ Media tables created successfully');
  } catch (error) {
    console.error('Error creating media tables:', error);
    throw error;
  }
};

const insertMedia = async (filename, section, altText, title, originalName) => {
  const result = await pool.query(
    'INSERT INTO media (filename, section, alt_text, title, original_name) VALUES ($1, $2, $3, $4, $5) RETURNING id',
    [filename, section, altText, title, originalName]
  );
  return result.rows[0].id;
};

const trackMediaUsage = async (mediaId, page, section) => {
  await pool.query(
    'INSERT INTO media_usage (media_id, page, section) VALUES ($1, $2, $3)',
    [mediaId, page, section]
  );
};

const getMediaBySection = async (section) => {
  const result = await pool.query(
    'SELECT * FROM media WHERE section = $1 ORDER BY created_at DESC',
    [section]
  );
  return result.rows;
};

const deleteMedia = async (filename) => {
  await pool.query('DELETE FROM media WHERE filename = $1', [filename]);
};

module.exports = {
  createMediaTables,
  insertMedia,
  trackMediaUsage,
  getMediaBySection,
  deleteMedia
};
