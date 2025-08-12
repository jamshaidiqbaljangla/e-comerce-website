const { pgTable, serial, varchar, text, decimal, integer, timestamp, boolean } = require('drizzle-orm/pg-core');

// Categories table
const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  image_url: varchar('image_url', { length: 500 }),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

// Collections table  
const collections = pgTable('collections', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  image_url: varchar('image_url', { length: 500 }),
  is_featured: boolean('is_featured').default(false),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

// Products table
const products = pgTable('products', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  compare_price: decimal('compare_price', { precision: 10, scale: 2 }),
  cost_price: decimal('cost_price', { precision: 10, scale: 2 }),
  sku: varchar('sku', { length: 100 }),
  barcode: varchar('barcode', { length: 100 }),
  track_quantity: boolean('track_quantity').default(true),
  quantity: integer('quantity').default(0),
  weight: decimal('weight', { precision: 8, scale: 2 }),
  image_url: varchar('image_url', { length: 500 }),
  images: text('images'),
  category_id: integer('category_id').references(() => categories.id),
  is_featured: boolean('is_featured').default(false),
  is_active: boolean('is_active').default(true),
  meta_title: varchar('meta_title', { length: 255 }),
  meta_description: text('meta_description'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

module.exports = {
  categories,
  collections,
  products
};
