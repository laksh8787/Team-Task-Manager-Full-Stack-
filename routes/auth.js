const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../models/db');
const { authenticate, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

const AVATAR_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444'];

// POST /api/auth/signup
router.post('/signup', [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be 6+ characters'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, email, password } = req.body;
  try {
    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    if (existing) return res.status(409).json({ error: 'Email already registered' });

    const hashed = await bcrypt.hash(password, 12);
    const color = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
    const result = db.prepare(
      'INSERT INTO users (name, email, password, avatar_color) VALUES (?, ?, ?, ?)'
    ).run(name, email, hashed, color);

    const token = jwt.sign({ userId: result.lastInsertRowid }, JWT_SECRET, { expiresIn: '7d' });
    const user = db.prepare('SELECT id, name, email, avatar_color FROM users WHERE id = ?').get(result.lastInsertRowid);

    res.status(201).json({ token, user });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, password } = req.body;
  try {
    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });
    const { password: _, ...userSafe } = user;

    res.json({ token, user: userSafe });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/users/search - search users to add to project
router.get('/users/search', authenticate, (req, res) => {
  const { q } = req.query;
  if (!q || q.length < 2) return res.json({ users: [] });

  const users = db.prepare(
    "SELECT id, name, email, avatar_color FROM users WHERE (name LIKE ? OR email LIKE ?) AND id != ? LIMIT 10"
  ).all(`%${q}%`, `%${q}%`, req.user.id);

  res.json({ users });
});

module.exports = router;
