const express = require('express');
const router = express.Router();
const orderService = require('../services/orderService');
const { verifyToken, requireRole } = require('../middleware/auth');

// POST /api/orders (Buyer Only)
router.post('/', verifyToken, requireRole('buyer'), async (req, res) => {
  try {
    // Force the customer_id to be the logged-in buyer's ID
    const orderData = { ...req.body, customer_id: req.user.id };
    const order = await orderService.placeOrder(orderData);
    res.status(201).json(order);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// GET /api/orders (Auth required: Admin sees all, Buyer sees own)
router.get('/', verifyToken, async (req, res) => {
  try {
    let orders;
    if (req.user.role === 'admin') {
      orders = await orderService.getAllOrders();
    } else {
      orders = await orderService.getOrdersByCustomer(req.user.id);
    }
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/orders/:id (Auth required)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    
    // Prevent buyer from seeing someone else's order
    if (req.user.role === 'buyer' && order.customer_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied to this order' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /api/orders/:id/status (Admin Only)
router.patch('/:id/status', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const order = await orderService.updateOrderStatus(req.params.id, status);
    res.json(order);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
