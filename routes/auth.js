const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { verifyToken } = require('../middleware/auth');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password);
    res.json(result);
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// POST /api/auth/change-password
router.post('/change-password', verifyToken, async (req, res) => {
  try {
    // Only allow if it's actually their first login
    if (!req.user.is_first_login) {
      return res.status(400).json({ error: 'Password already changed' });
    }
    
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const result = await authService.changePassword(req.user.id, newPassword);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
