import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { db, writeAuditLog } from '../db.js';
import { signToken, authenticate } from '../auth.js';

const router = Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !user.password_hash) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = bcrypt.compareSync(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE users SET last_login_at = ? WHERE id = ?').run(now, user.id);

  writeAuditLog(db, {
    actor_id: user.id,
    actor_email: user.email,
    action: 'auth.login',
    entity: 'user',
    entity_id: user.id,
    summary: `User ${user.email} logged in`,
    ip: req.ip
  });

  const token = signToken(user);
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    }
  });
});

router.post('/register', (req, res) => {
  const { email, password, full_name, role = 'recruiter', phone = null } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ error: 'User with this email already exists' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const now = new Date().toISOString();

  const result = db.prepare(`
    INSERT INTO users (email, password_hash, role, full_name, phone, created_at, last_login_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(email, hash, role, full_name || null, phone, now, now);

  const newUserId = Number(result.lastInsertRowid);
  const user = { id: newUserId, email, role, full_name: full_name || null, phone };

  writeAuditLog(db, {
    actor_id: newUserId,
    actor_email: email,
    action: 'auth.register',
    entity: 'user',
    entity_id: newUserId,
    summary: `Registered user ${email}`,
    ip: req.ip
  });

  const token = signToken(user);
  res.status(201).json({
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      full_name: user.full_name
    }
  });
});

router.get('/me', authenticate, (req, res) => {
  const user = db.prepare('SELECT id, email, role, full_name, phone, created_at, last_login_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

export default router;
