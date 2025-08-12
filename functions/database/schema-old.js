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

// Collections table
export const collections = pgTable('collections', {
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
export const products = pgTable('products', {
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
  images: text('images'), // JSON string of image URLs
  category_id: integer('category_id').references(() => categories.id),
  is_featured: boolean('is_featured').default(false),
  is_active: boolean('is_active').default(true),
  meta_title: varchar('meta_title', { length: 255 }),
  meta_description: text('meta_description'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

// Product Collections junction table
export const productCollections = pgTable('product_collections', {
  id: serial('id').primaryKey(),
  product_id: integer('product_id').references(() => products.id),
  collection_id: integer('collection_id').references(() => collections.id),
  created_at: timestamp('created_at').defaultNow()
});

// Users table
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  first_name: varchar('first_name', { length: 100 }),
  last_name: varchar('last_name', { length: 100 }),
  phone: varchar('phone', { length: 20 }),
  role: varchar('role', { length: 50 }).default('customer'),
  is_active: boolean('is_active').default(true),
  email_verified: boolean('email_verified').default(false),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

// Admin users table
export const admins = pgTable('admins', {
  id: serial('id').primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).default('admin'),
  is_active: boolean('is_active').default(true),
  last_login: timestamp('last_login'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

// Orders table
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  order_number: varchar('order_number', { length: 100 }).notNull().unique(),
  user_id: integer('user_id').references(() => users.id),
  email: varchar('email', { length: 255 }).notNull(),
  total_amount: decimal('total_amount', { precision: 10, scale: 2 }).notNull(),
  tax_amount: decimal('tax_amount', { precision: 10, scale: 2 }).default('0'),
  shipping_amount: decimal('shipping_amount', { precision: 10, scale: 2 }).default('0'),
  discount_amount: decimal('discount_amount', { precision: 10, scale: 2 }).default('0'),
  status: varchar('status', { length: 50 }).default('pending'),
  payment_status: varchar('payment_status', { length: 50 }).default('pending'),
  shipping_address: text('shipping_address'),
  billing_address: text('billing_address'),
  notes: text('notes'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

// Order items table
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  order_id: integer('order_id').references(() => orders.id),
  product_id: integer('product_id').references(() => products.id),
  quantity: integer('quantity').notNull(),
  price: decimal('price', { precision: 10, scale: 2 }).notNull(),
  total: decimal('total', { precision: 10, scale: 2 }).notNull(),
  created_at: timestamp('created_at').defaultNow()
});

// Coupons table
export const coupons = pgTable('coupons', {
  id: serial('id').primaryKey(),
  code: varchar('code', { length: 100 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  discount_type: varchar('discount_type', { length: 20 }).notNull(), // 'percentage' or 'fixed'
  discount_value: decimal('discount_value', { precision: 10, scale: 2 }).notNull(),
  minimum_amount: decimal('minimum_amount', { precision: 10, scale: 2 }),
  maximum_discount: decimal('maximum_discount', { precision: 10, scale: 2 }),
  usage_limit: integer('usage_limit'),
  used_count: integer('used_count').default(0),
  is_active: boolean('is_active').default(true),
  starts_at: timestamp('starts_at'),
  expires_at: timestamp('expires_at'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

// Blog posts table
export const blogPosts = pgTable('blog_posts', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  content: text('content').notNull(),
  excerpt: text('excerpt'),
  featured_image: varchar('featured_image', { length: 500 }),
  author_id: integer('author_id').references(() => admins.id),
  is_published: boolean('is_published').default(false),
  meta_title: varchar('meta_title', { length: 255 }),
  meta_description: text('meta_description'),
  published_at: timestamp('published_at'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

// Site pages table
export const sitePages = pgTable('site_pages', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  content: text('content').notNull(),
  is_published: boolean('is_published').default(true),
  meta_title: varchar('meta_title', { length: 255 }),
  meta_description: text('meta_description'),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

// Admin settings table
export const adminSettings = pgTable('admin_settings', {
  id: serial('id').primaryKey(),
  key: varchar('key', { length: 255 }).notNull().unique(),
  value: text('value'),
  description: text('description'),
  type: varchar('type', { length: 50 }).default('text'), // text, number, boolean, json
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow()
});

// Notifications table
export const notifications = pgTable('notifications', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  type: varchar('type', { length: 50 }).default('info'), // info, success, warning, error
  is_read: boolean('is_read').default(false),
  user_id: integer('user_id').references(() => admins.id),
  created_at: timestamp('created_at').defaultNow()
});
