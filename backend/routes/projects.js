const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../models/db');
const { authenticate, requireProjectRole } = require('../middleware/auth');

const router = express.Router();

// GET /api/projects - list user's projects
router.get('/', authenticate, (req, res) => {
  const projects = db.prepare(`
    SELECT p.*, pm.role as my_role,
      (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) as member_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_count,
      u.name as owner_name
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    JOIN users u ON u.id = p.owner_id
    ORDER BY p.created_at DESC
  `).all(req.user.id);

  res.json({ projects });
});

// POST /api/projects - create project
router.post('/', authenticate, [
  body('name').trim().notEmpty().withMessage('Project name required'),
  body('description').optional().trim(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description, color } = req.body;

  const createProject = db.transaction(() => {
    const result = db.prepare(
      'INSERT INTO projects (name, description, color, owner_id) VALUES (?, ?, ?, ?)'
    ).run(name, description || null, color || '#6366f1', req.user.id);

    // Add creator as admin
    db.prepare(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
    ).run(result.lastInsertRowid, req.user.id, 'admin');

    db.prepare(
      "INSERT INTO activity_log (user_id, project_id, action, details) VALUES (?, ?, 'project_created', ?)"
    ).run(req.user.id, result.lastInsertRowid, `Created project "${name}"`);

    return result.lastInsertRowid;
  });

  const projectId = createProject();
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  res.status(201).json({ project });
});

// GET /api/projects/:projectId
router.get('/:projectId', authenticate, requireProjectRole(), (req, res) => {
  const { projectId } = req.params;
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Project not found' });

  const members = db.prepare(`
    SELECT u.id, u.name, u.email, u.avatar_color, pm.role, pm.joined_at
    FROM project_members pm
    JOIN users u ON u.id = pm.user_id
    WHERE pm.project_id = ?
  `).all(projectId);

  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total,
      SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
      SUM(CASE WHEN status = 'review' THEN 1 ELSE 0 END) as review,
      SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
      SUM(CASE WHEN due_date < DATE('now') AND status != 'done' THEN 1 ELSE 0 END) as overdue
    FROM tasks WHERE project_id = ?
  `).get(projectId);

  res.json({ project, members, stats, myRole: req.projectRole });
});

// PUT /api/projects/:projectId
router.put('/:projectId', authenticate, requireProjectRole('admin'), [
  body('name').optional().trim().notEmpty(),
  body('description').optional().trim(),
  body('color').optional().matches(/^#[0-9A-Fa-f]{6}$/),
], (req, res) => {
  const { projectId } = req.params;
  const { name, description, color } = req.body;

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Not found' });

  db.prepare(`
    UPDATE projects SET 
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      color = COALESCE(?, color)
    WHERE id = ?
  `).run(name || null, description !== undefined ? description : null, color || null, projectId);

  const updated = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  res.json({ project: updated });
});

// DELETE /api/projects/:projectId
router.delete('/:projectId', authenticate, requireProjectRole('admin'), (req, res) => {
  const { projectId } = req.params;
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(projectId);
  if (!project) return res.status(404).json({ error: 'Not found' });
  if (project.owner_id !== req.user.id) return res.status(403).json({ error: 'Only owner can delete' });

  db.prepare('DELETE FROM projects WHERE id = ?').run(projectId);
  res.json({ message: 'Project deleted' });
});

// POST /api/projects/:projectId/members
router.post('/:projectId/members', authenticate, requireProjectRole('admin'), [
  body('userId').isInt(),
  body('role').isIn(['admin', 'member']),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { projectId } = req.params;
  const { userId, role } = req.body;

  const user = db.prepare('SELECT id, name FROM users WHERE id = ?').get(userId);
  if (!user) return res.status(404).json({ error: 'User not found' });

  try {
    db.prepare(
      'INSERT INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)'
    ).run(projectId, userId, role);

    db.prepare(
      "INSERT INTO activity_log (user_id, project_id, action, details) VALUES (?, ?, 'member_added', ?)"
    ).run(req.user.id, projectId, `Added ${user.name} as ${role}`);

    res.status(201).json({ message: 'Member added' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(409).json({ error: 'Already a member' });
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/projects/:projectId/members/:userId
router.delete('/:projectId/members/:userId', authenticate, requireProjectRole('admin'), (req, res) => {
  const { projectId, userId } = req.params;
  if (parseInt(userId) === req.user.id) return res.status(400).json({ error: "Can't remove yourself" });

  db.prepare('DELETE FROM project_members WHERE project_id = ? AND user_id = ?').run(projectId, userId);
  res.json({ message: 'Member removed' });
});

// PATCH /api/projects/:projectId/members/:userId/role
router.patch('/:projectId/members/:userId/role', authenticate, requireProjectRole('admin'), (req, res) => {
  const { projectId, userId } = req.params;
  const { role } = req.body;
  if (!['admin', 'member'].includes(role)) return res.status(400).json({ error: 'Invalid role' });

  db.prepare('UPDATE project_members SET role = ? WHERE project_id = ? AND user_id = ?').run(role, projectId, userId);
  res.json({ message: 'Role updated' });
});

// GET /api/projects/:projectId/activity
router.get('/:projectId/activity', authenticate, requireProjectRole(), (req, res) => {
  const { projectId } = req.params;
  const logs = db.prepare(`
    SELECT al.*, u.name as user_name, u.avatar_color
    FROM activity_log al
    JOIN users u ON u.id = al.user_id
    WHERE al.project_id = ?
    ORDER BY al.created_at DESC
    LIMIT 50
  `).all(projectId);

  res.json({ logs });
});

module.exports = router;
