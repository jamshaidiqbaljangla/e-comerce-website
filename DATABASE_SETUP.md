# Database Setup Guide for BINGO E-commerce

This guide will help you set up the PostgreSQL database for the BINGO e-commerce website.

## Option 1: Using PostgreSQL (Recommended)

### 1. Install PostgreSQL

**On macOS:**
```bash
# Using Homebrew
brew install postgresql
brew services start postgresql

# Create a user
createuser -s postgres
```

**On Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create user and database
sudo -u postgres createuser --interactive
sudo -u postgres createdb bingo_ecommerce
```

**On Windows:**
- Download and install PostgreSQL from https://www.postgresql.org/download/windows/
- Use pgAdmin or command line to create user and database

### 2. Create Database and User

```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create the database
CREATE DATABASE bingo_ecommerce;

-- Create a user (optional, you can use postgres user)
CREATE USER bingo_user WITH PASSWORD 'secure_password_here';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE bingo_ecommerce TO bingo_user;

-- Exit psql
\q
```

### 3. Update .env Configuration

Update your `.env` file with your database credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=bingo_ecommerce
DB_USER=bingo_user
DB_PASSWORD=secure_password_here
```

## Option 2: Using SQLite (Development Only)

For development purposes, you can modify the server to use SQLite instead:

### 1. Install SQLite3

```bash
npm install sqlite3
```

### 2. Update server.js (Lines 67-75)

Replace the PostgreSQL configuration with:

```javascript
// For SQLite
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./bingo_ecommerce.db');

// Comment out the PostgreSQL pool configuration
/*
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'bingo_ecommerce',
  password: process.env.DB_PASSWORD || 'password123',
  port: process.env.DB_PORT || 5432,
});
*/
```

## Option 3: Docker Setup (Easy)

### 1. Create docker-compose.yml

```yaml
version: '3.8'
services:
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: bingo_ecommerce
      POSTGRES_USER: bingo_user
      POSTGRES_PASSWORD: secure_password_here
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### 2. Start Database

```bash
docker-compose up -d
```

## Testing Database Connection

Run this command to test your database connection:

```bash
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  user: 'bingo_user',
  host: 'localhost',
  database: 'bingo_ecommerce',
  password: 'secure_password_here',
  port: 5432,
});
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
  } else {
    console.log('✅ Database connection successful!');
    release();
  }
  process.exit();
});
"
```

## Initialize Database Tables

Once your database is connected, run:

```bash
npm start
```

The server will automatically create all necessary tables on first run.

## Troubleshooting

### Common Issues:

1. **"role does not exist"**
   - Create the PostgreSQL user as shown above
   - Or use the default `postgres` user

2. **"database does not exist"**
   - Create the database: `createdb bingo_ecommerce`

3. **Connection refused**
   - Ensure PostgreSQL is running: `brew services start postgresql` (macOS)
   - Check if port 5432 is available: `lsof -i :5432`

4. **Permission denied**
   - Grant proper privileges to your user
   - Or use the postgres superuser account

### Quick Fix for Development

If you just want to test the website quickly, you can:

1. Comment out all database-related code in `server.js`
2. Use the static file server: `python3 -m http.server 8000`
3. Access the website at `http://localhost:8000`

Note: Without the database, features like user accounts, orders, and admin functions won't work, but you can see the UI and design.
