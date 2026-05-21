require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static frontend files

// REST API Logging Middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`[REST API] --> ${req.method} ${req.url}`);
  
  // Intercept response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m'; // Red or Green
    const resetColor = '\x1b[0m';
    console.log(`[REST API] <-- ${req.method} ${req.url} ${statusColor}${res.statusCode}${resetColor} (${duration}ms)`);
  });
  next();
});

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/products', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));

// Fallback for SPA routing (if using HTML5 history API, though we use hash routing for simplicity here)
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'API route not found' });
  }
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`API Gateway ready.`);
});
