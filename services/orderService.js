const pool = require('../db/connection');

// Place a new order
const placeOrder = async ({ customer_id, items }) => {
  // items: [{ product_id, quantity }]
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // Calculate total & validate stock
    let totalAmount = 0;
    const itemDetails = [];

    const orderItemsData = [];

    // Check stock and calculate total
    for (const item of items) {
      const [productRows] = await conn.execute('SELECT name, price, stock FROM products WHERE id = ? FOR UPDATE', [item.product_id]);
      if (productRows.length === 0) throw new Error(`Product ID ${item.product_id} not found`);
      
      const product = productRows[0];
      if (product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}. Available: ${product.stock}`);
      }

      totalAmount += product.price * item.quantity;
      orderItemsData.push({ product_id: item.product_id, quantity: item.quantity, price: product.price });

      // Deduct stock
      await conn.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
    }

    // Insert order

    const [orderResult] = await conn.execute(
      'INSERT INTO orders (customer_id, total_amount, status) VALUES (?, ?, ?)',
      [customer_id, totalAmount, 'pending']
    );
    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of orderItemsData) {
      await conn.execute(
        'INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );
    }

    await conn.commit();
    return await getOrderById(orderId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

// Get all orders with customer name (Admin)
const getAllOrders = async () => {
  const [rows] = await pool.execute(`
    SELECT o.*, CONCAT_WS(' ', c.first_name, c.middle_name, c.last_name) AS customer_name, c.email AS customer_email
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    ORDER BY o.created_at DESC
  `);
  return rows;
};

// Get orders for a specific customer (Buyer)
const getOrdersByCustomer = async (customerId) => {
  const [rows] = await pool.execute(`
    SELECT o.*, CONCAT_WS(' ', c.first_name, c.middle_name, c.last_name) AS customer_name, c.email AS customer_email
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.customer_id = ?
    ORDER BY o.created_at DESC
  `, [customerId]);
  return rows;
};

// Get single order with items
const getOrderById = async (id) => {
  const [orderRows] = await pool.execute(`
    SELECT o.*, CONCAT_WS(' ', c.first_name, c.middle_name, c.last_name) AS customer_name, c.email AS customer_email
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
  `, [id]);

  if (!orderRows[0]) return null;

  const [itemRows] = await pool.execute(`
    SELECT oi.*, p.name AS product_name
    FROM order_items oi
    JOIN products p ON oi.product_id = p.id
    WHERE oi.order_id = ?
  `, [id]);

  return { ...orderRows[0], items: itemRows };
};

// Update order status
const updateOrderStatus = async (id, status) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    
    // Check current status
    const [orderRows] = await connection.execute('SELECT status FROM orders WHERE id = ? FOR UPDATE', [id]);
    if (orderRows.length === 0) throw new Error('Order not found');
    const currentStatus = orderRows[0].status;

    // Update status
    await connection.execute('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    
    // If transitioning to cancelled from non-cancelled, restore stock
    if (status === 'cancelled' && currentStatus !== 'cancelled') {
        const [items] = await connection.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
        for (const item of items) {
             await connection.execute('UPDATE products SET stock = stock + ? WHERE id = ?', [item.quantity, item.product_id]);
        }
    }
    // If transitioning from cancelled to non-cancelled, deduct stock again
    if (currentStatus === 'cancelled' && status !== 'cancelled') {
        const [items] = await connection.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ?', [id]);
        for (const item of items) {
             const [pRows] = await connection.execute('SELECT name, stock FROM products WHERE id = ? FOR UPDATE', [item.product_id]);
             if (pRows[0].stock < item.quantity) {
                 throw new Error(`Insufficient stock to un-cancel order. Need ${item.quantity} for ${pRows[0].name}, but only ${pRows[0].stock} available.`);
             }
             await connection.execute('UPDATE products SET stock = stock - ? WHERE id = ?', [item.quantity, item.product_id]);
        }
    }

    await connection.commit();
    return getOrderById(id);
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

module.exports = { placeOrder, getAllOrders, getOrdersByCustomer, getOrderById, updateOrderStatus };
