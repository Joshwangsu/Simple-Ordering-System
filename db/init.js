const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function initDB() {
  try {
    console.log('Connecting to MySQL server...');
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER || 'root',
      password: process.env.DB_PASSWORD || ''
    });

    console.log('Reading schema.sql...');
    const schemaPath = path.join(__dirname, 'schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split the SQL file into separate statements
    const statements = sql.split(/;\s*$/m).filter(stmt => stmt.trim().length > 0);
    
    console.log(`Executing ${statements.length} SQL statements...`);
    for (let stmt of statements) {
      if (stmt.trim()) {
         await connection.query(stmt);
      }
    }

    // Insert Default Admin
    console.log('Inserting default admin account...');
    const adminPasswordHash = await bcrypt.hash('admin123', 10);
    await connection.query(
      `INSERT INTO customers (first_name, last_name, email, password_hash, role, is_first_login) 
       VALUES ('System', 'Admin', 'admin@admin.com', ?, 'admin', false)`,
      [adminPasswordHash]
    );
    
    console.log('Database initialized successfully! Default admin: admin@admin.com / admin123');
    await connection.end();
    process.exit(0);
  } catch (error) {
    console.error('Error initializing database:', error);
    process.exit(1);
  }
}

initDB();
