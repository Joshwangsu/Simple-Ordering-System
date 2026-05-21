const express = require('express');
const router = express.Router();
const customerService = require('../services/customerService');
const { verifyToken, requireRole } = require('../middleware/auth');

// POST /api/customers/register (Admin Only)
router.post('/register', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const customer = await customerService.registerCustomer(req.body);
    res.status(201).json(customer);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// GET /api/customers (Admin Only)
router.get('/', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const customers = await customerService.getAllCustomers();
    res.json(customers);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/customers/:id (Admin Only)
router.get('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/customers/:id (Admin Only)
router.put('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    res.json(customer);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/customers/:id (Admin Only)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const success = await customerService.deleteCustomer(req.params.id);
    if (!success) return res.status(404).json({ error: 'Customer not found' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
