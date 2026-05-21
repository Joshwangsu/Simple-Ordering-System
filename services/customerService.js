const pool = require('../db/connection');

const bcrypt = require('bcryptjs');
const { generateTempPassword } = require('./authService');

// Register a new customer (buyer role)
const registerCustomer = async ({ first_name, middle_name, last_name, email, phone, address }) => {
  const tempPassword = generateTempPassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);
  
  const [result] = await pool.execute(
    'INSERT INTO customers (first_name, middle_name, last_name, email, phone, address, password_hash, role) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [first_name, middle_name || null, last_name, email, phone || null, address || null, hashedPassword, 'buyer']
  );
  
  // Return the temp password to display it to the admin who created them
  return { id: result.insertId, first_name, last_name, email, phone, address, tempPassword };
};

// Get all customers
const getAllCustomers = async () => {
  const [rows] = await pool.execute(
    'SELECT * FROM customers ORDER BY created_at DESC'
  );
  return rows;
};

// Get single customer
const getCustomerById = async (id) => {
  const [rows] = await pool.execute('SELECT id, first_name, middle_name, last_name, email, phone, address, role FROM customers WHERE id = ?', [id]);
  return rows[0];
};

// Update customer
const updateCustomer = async (id, { first_name, middle_name, last_name, email, phone, address }) => {
  await pool.execute(
    'UPDATE customers SET first_name=?, middle_name=?, last_name=?, email=?, phone=?, address=? WHERE id=?',
    [first_name, middle_name || null, last_name, email, phone || null, address || null, id]
  );
  return getCustomerById(id);
};

// Delete customer
const deleteCustomer = async (id) => {
  const [result] = await pool.execute('DELETE FROM customers WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = { registerCustomer, getAllCustomers, getCustomerById, updateCustomer, deleteCustomer };
