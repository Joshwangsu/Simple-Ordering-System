const pool = require('../db/connection');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-ordering-key-123';

const login = async (email, password) => {
  const [rows] = await pool.execute('SELECT * FROM customers WHERE email = ?', [email]);
  const user = rows[0];

  if (!user) {
    throw new Error('Invalid email or password');
  }

  const isValidPassword = await bcrypt.compare(password, user.password_hash);
  if (!isValidPassword) {
    throw new Error('Invalid email or password');
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, is_first_login: user.is_first_login },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  return {
    token,
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      is_first_login: user.is_first_login
    }
  };
};

const changePassword = async (userId, newPassword) => {
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  
  await pool.execute(
    'UPDATE customers SET password_hash = ?, is_first_login = false WHERE id = ?',
    [hashedPassword, userId]
  );
  
  const [rows] = await pool.execute('SELECT * FROM customers WHERE id = ?', [userId]);
  const user = rows[0];
  
  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, is_first_login: user.is_first_login },
    JWT_SECRET,
    { expiresIn: '1d' }
  );

  return {
    token,
    user: {
      id: user.id,
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      role: user.role,
      is_first_login: user.is_first_login
    }
  };
};

// Generate a random password for newly registered buyers
const generateTempPassword = () => {
  return '123';
};

module.exports = { login, changePassword, generateTempPassword, JWT_SECRET };
