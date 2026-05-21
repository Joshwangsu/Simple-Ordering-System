const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const productService = require('../services/productService');
const { verifyToken, requireRole } = require('../middleware/auth');

// Configure Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname))
  }
});
const upload = multer({ storage: storage });

// POST /api/products (Admin Only)
router.post('/', verifyToken, requireRole('admin'), upload.single('image'), async (req, res) => {
  try {
    const productData = {
       ...req.body,
       price: parseFloat(req.body.price),
       stock: parseInt(req.body.stock, 10),
       is_on_sale: req.body.is_on_sale === 'true'
    };
    if (req.file) {
       productData.image_url = '/uploads/' + req.file.filename;
    }
    const product = await productService.addProduct(productData);
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products (Auth required)
router.get('/', verifyToken, async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// GET /api/products/:id (Auth required)
router.get('/:id', verifyToken, async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/products/:id (Admin Only)
router.put('/:id', verifyToken, requireRole('admin'), upload.single('image'), async (req, res) => {
  try {
    const productData = {
       ...req.body,
       price: parseFloat(req.body.price),
       stock: parseInt(req.body.stock, 10),
       is_on_sale: req.body.is_on_sale === 'true'
    };
    if (req.file) {
       productData.image_url = '/uploads/' + req.file.filename;
    } else if (req.body.existing_image_url) {
       // Keep existing image if no new file is uploaded
       productData.image_url = req.body.existing_image_url;
    }
    
    const product = await productService.updateProduct(req.params.id, productData);
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/products/:id (Admin Only)
router.delete('/:id', verifyToken, requireRole('admin'), async (req, res) => {
  try {
    const success = await productService.deleteProduct(req.params.id);
    if (!success) return res.status(404).json({ error: 'Product not found' });
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
