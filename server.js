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

const fs = require('fs');

// REST API Logging Middleware
app.use((req, res, next) => {
  if (req.url === '/api/logs') return next();
  const start = Date.now();
  console.log(`[REST API] --> ${req.method} ${req.url}`);
  
  // Intercept response finish
  const originalJson = res.json;
  const originalSend = res.send;
  let responseBody;

  res.json = function(data) {
    responseBody = data;
    return originalJson.call(this, data);
  };
  
  res.send = function(data) {
    if (!responseBody && typeof data === 'object') responseBody = data;
    return originalSend.call(this, data);
  };

  res.on('finish', () => {
    const duration = Date.now() - start;
    const statusColor = res.statusCode >= 400 ? '\x1b[31m' : '\x1b[32m'; // Red or Green
    const resetColor = '\x1b[0m';
    console.log(`[REST API] <-- ${req.method} ${req.url} ${statusColor}${res.statusCode}${resetColor} (${duration}ms)`);

    // Append JSON log
    const logEntry = {
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      body: Object.keys(req.body || {}).length ? req.body : undefined,
      query: Object.keys(req.query || {}).length ? req.query : undefined,
      status: res.statusCode,
      response: responseBody,
      durationMs: duration
    };
    fs.appendFile(path.join(__dirname, 'logs.json'), JSON.stringify(logEntry) + ',\n', (err) => {
      if (err) console.error('Failed to write log', err);
    });
  });
  next();
});

app.get('/api/logs', (req, res) => {
  fs.readFile(path.join(__dirname, 'logs.json'), 'utf8', (err, data) => {
    if (err) return res.json([]);
    const jsonStr = '[' + data.trim().replace(/,$/, '') + ']';
    res.type('json').send(jsonStr);
  });
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
