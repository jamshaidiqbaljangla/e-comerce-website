/**
 * Database Migration: Add Collections Table
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');

async function addCollectionsTable() {
  console.log('🔄 Adding collections table to database...\n');

  const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
      console.error('Error opening database:', err);
      return;
    }
    console.log('✅ Connected to SQLite database');
  });

  // Create collections table
  const createCollectionsTable = `
    CREATE TABLE IF NOT EXISTS collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      image_url TEXT,
      slug TEXT UNIQUE NOT NULL,
      sort_order INTEGER DEFAULT 0,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `;

  return new Promise((resolve, reject) => {
    db.run(createCollectionsTable, (err) => {
      if (err) {
        console.error('❌ Error creating collections table:', err);
        reject(err);
        return;
      }
      console.log('✅ Collections table created successfully');

      // Insert sample collections
      const sampleCollections = [
        {
          id: 'col1',
          name: 'Summer Collection',
          description: 'Fresh summer styles and trends',
          slug: 'summer-collection',
          sort_order: 1
        },
        {
          id: 'col2', 
          name: 'Winter Collection',
          description: 'Cozy winter essentials',
          slug: 'winter-collection',
          sort_order: 2
        },
        {
          id: 'col3',
          name: 'Premium Line',
          description: 'Our most exclusive products',
          slug: 'premium-line',
          sort_order: 3
        }
      ];

      const insertCollection = `
        INSERT OR IGNORE INTO collections (id, name, description, slug, sort_order, active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      `;

      let completed = 0;
      sampleCollections.forEach((collection) => {
        db.run(insertCollection, [
          collection.id,
          collection.name,
          collection.description,
          collection.slug,
          collection.sort_order
        ], (err) => {
          if (err) {
            console.error(`❌ Error inserting collection ${collection.name}:`, err);
          } else {
            console.log(`✅ Inserted collection: ${collection.name}`);
          }
          
          completed++;
          if (completed === sampleCollections.length) {
            console.log('\n🎉 Collections table migration completed!');
            db.close((err) => {
              if (err) {
                console.error('Error closing database:', err);
                reject(err);
              } else {
                console.log('✅ Database connection closed');
                resolve();
              }
            });
          }
        });
      });
    });
  });
}

// Run the migration
addCollectionsTable().catch(console.error);
