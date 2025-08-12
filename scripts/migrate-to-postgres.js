/**
 * Database migration script: SQLite to PostgreSQL
 * 
 * This script helps migrate data from SQLite to PostgreSQL
 * for production deployment.
 */

const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { Pool } = require('pg');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config({ path: '.env.production' });

// Database connections
const sqliteDb = new sqlite3.Database(path.join(__dirname, '..', 'database.sqlite'));
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for Heroku PostgreSQL
  }
});

// Get all tables from SQLite
async function getSqliteTables() {
  return new Promise((resolve, reject) => {
    sqliteDb.all(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
      (err, tables) => {
        if (err) reject(err);
        else resolve(tables.map(t => t.name));
      }
    );
  });
}

// Get table schema from SQLite
async function getSqliteTableSchema(tableName) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(`PRAGMA table_info(${tableName})`, (err, columns) => {
      if (err) reject(err);
      else resolve(columns);
    });
  });
}

// Get data from SQLite table
async function getSqliteTableData(tableName) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(`SELECT * FROM ${tableName}`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

// Convert SQLite type to PostgreSQL type
function convertType(sqliteType) {
  const type = sqliteType.toUpperCase();
  
  if (type.includes('INT')) return 'INTEGER';
  if (type.includes('CHAR') || type.includes('TEXT') || type.includes('CLOB')) return 'TEXT';
  if (type.includes('REAL') || type.includes('FLOA') || type.includes('DOUB')) return 'NUMERIC';
  if (type.includes('BLOB')) return 'BYTEA';
  if (type.includes('BOOLEAN')) return 'BOOLEAN';
  if (type.includes('DATE') || type.includes('TIME')) return 'TIMESTAMP';
  
  return 'TEXT'; // Default
}

// Create PostgreSQL table
async function createPostgresTable(tableName, columns) {
  const columnDefs = columns.map(col => {
    const pgType = convertType(col.type);
    const nullConstraint = col.notnull ? 'NOT NULL' : 'NULL';
    const defaultValue = col.dflt_value ? `DEFAULT ${col.dflt_value}` : '';
    const primaryKey = col.pk ? 'PRIMARY KEY' : '';
    
    return `"${col.name}" ${pgType} ${nullConstraint} ${defaultValue} ${primaryKey}`.trim();
  }).join(', ');
  
  const query = `CREATE TABLE IF NOT EXISTS ${tableName} (${columnDefs})`;
  
  try {
    await pgPool.query(query);
    console.log(`✅ Created table ${tableName}`);
  } catch (error) {
    console.error(`❌ Error creating ${tableName}:`, error.message);
  }
}

// Insert data into PostgreSQL
async function insertPostgresData(tableName, data) {
  if (data.length === 0) {
    console.log(`ℹ️  No data to insert for ${tableName}`);
    return;
  }
  
  const columns = Object.keys(data[0]);
  
  for (const row of data) {
    const values = columns.map(col => row[col]);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
    
    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT DO NOTHING
    `;
    
    try {
      await pgPool.query(query, values);
    } catch (error) {
      console.error(`❌ Error inserting into ${tableName}:`, error.message);
    }
  }
  
  console.log(`✅ Inserted ${data.length} rows into ${tableName}`);
}

// Main migration function
async function migrate() {
  try {
    console.log('🚀 Starting database migration: SQLite to PostgreSQL');
    
    // Get all tables
    const tables = await getSqliteTables();
    console.log(`📋 Found ${tables.length} tables: ${tables.join(', ')}`);
    
    // Process each table
    for (const tableName of tables) {
      console.log(`\n🔄 Processing table: ${tableName}`);
      
      // Get schema and create table
      const columns = await getSqliteTableSchema(tableName);
      await createPostgresTable(tableName, columns);
      
      // Get and insert data
      const data = await getSqliteTableData(tableName);
      await insertPostgresData(tableName, data);
    }
    
    console.log('\n✨ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
  } finally {
    // Close connections
    sqliteDb.close();
    await pgPool.end();
  }
}

// Run migration
migrate();
