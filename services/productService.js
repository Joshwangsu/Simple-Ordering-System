const pool = require('../db/connection');

// Add a new product
const addProduct = async ({ name, description, price, stock, image_url, is_on_sale }) => {
  const [result] = await pool.execute(
    'INSERT INTO products (name, description, price, stock, image_url, is_on_sale) VALUES (?, ?, ?, ?, ?, ?)',
    [name, description || null, price, stock || 0, image_url || null, is_on_sale === undefined ? true : is_on_sale]
  );
  return { id: result.insertId, name, description, price, stock, image_url, is_on_sale };
};

// Get all products
const getAllProducts = async () => {
  const [rows] = await pool.execute(
    'SELECT * FROM products ORDER BY created_at DESC'
  );
  return rows;
};

// Get product by ID
const getProductById = async (id) => {
  const [rows] = await pool.execute(
    'SELECT * FROM products WHERE id = ?', [id]
  );
  return rows[0] || null;
};

// Update product
const updateProduct = async (id, { name, description, price, stock, image_url, is_on_sale }) => {
  await pool.execute(
    'UPDATE products SET name=?, description=?, price=?, stock=?, image_url=?, is_on_sale=? WHERE id=?',
    [name, description, price, stock, image_url || null, is_on_sale === undefined ? true : is_on_sale, id]
  );
  return getProductById(id);
};

// Delete product
const deleteProduct = async (id) => {
  const [result] = await pool.execute(
    'DELETE FROM products WHERE id = ?', [id]
  );
  return result.affectedRows > 0;
};

module.exports = { addProduct, getAllProducts, getProductById, updateProduct, deleteProduct };
