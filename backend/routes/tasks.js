const express = require('express');
const { body, validationResult } = require('express-validator');
const db = require('../models/db');
const { authenticate, requireProjectRole } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });

// GET /api/projects/:projectId/tasks
router.get('/', authenticate, requireProjectRole(), (req, res) => {
  const { projectId } = req.params;
  const { status, assignee, priority } = req.query;

  let query = `
    SELECT t.*, 
      u.name as assignee_name, u.avatar_color as assignee_avatar,
      c.name as creator_name,
      (SELECT COUNT(*) FROM comments WHERE task_id = t.id) as comment_count,
      CASE WHEN t.due_date < DATE('now') AND t.status != 'done' THEN 1 ELSE 0 END as is_overdue
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    JOIN users c ON c.id = t.created_by
    WHERE t.project_id = ?
  `;
  const params = [projectId];

  if (status) { query += ' AND t.status = ?'; params.push(status); }
  if (assignee) { query += ' AND t.assignee_id = ?'; params.push(assignee); }
  if (priority) { query += ' AND t.priority = ?'; params.push(priority); }

  query += ' ORDER BY CASE t.priority WHEN "critical" THEN 1 WHEN "high" THEN 2 WHEN "medium" THEN 3 ELSE 4 END, t.created_at DESC';

  const tasks = db.prepare(query).all(...params);
  res.json({ tasks });
});

// POST /api/projects/:projectId/tasks
router.post('/', authenticate, requireProjectRole(), [
  body('title').trim().notEmpty().withMessage('Title required'),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('due_date').optional().isISO8601(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { projectId } = req.params;
  const { title, description, status, priority, assignee_id, due_date } = req.body;

  // Validate assignee is a project member
  if (assignee_id) {
    const isMember = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, assignee_id);
    if (!isMember) return res.status(400).json({ error: 'Assignee is not a project member' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, project_id, assignee_id, created_by, due_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    title, description || null,
    status || 'todo', priority || 'medium',
    projectId, assignee_id || null, req.user.id,
    due_date || null
  );

  db.prepare(
    "INSERT INTO activity_log (user_id, project_id, task_id, action, details) VALUES (?, ?, ?, 'task_created', ?)"
  ).run(req.user.id, projectId, result.lastInsertRowid, `Created task "${title}"`);

  const task = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_avatar
    FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ task });
});

// GET /api/projects/:projectId/tasks/:taskId
router.get('/:taskId', authenticate, requireProjectRole(), (req, res) => {
  const { taskId, projectId } = req.params;
  const task = db.prepare(`
    SELECT t.*, 
      u.name as assignee_name, u.avatar_color as assignee_avatar,
      c.name as creator_name, c.avatar_color as creator_avatar,
      CASE WHEN t.due_date < DATE('now') AND t.status != 'done' THEN 1 ELSE 0 END as is_overdue
    FROM tasks t
    LEFT JOIN users u ON u.id = t.assignee_id
    JOIN users c ON c.id = t.created_by
    WHERE t.id = ? AND t.project_id = ?
  `).get(taskId, projectId);

  if (!task) return res.status(404).json({ error: 'Task not found' });

  const comments = db.prepare(`
    SELECT cm.*, u.name as user_name, u.avatar_color
    FROM comments cm JOIN users u ON u.id = cm.user_id
    WHERE cm.task_id = ? ORDER BY cm.created_at ASC
  `).all(taskId);

  res.json({ task, comments });
});

// PUT /api/projects/:projectId/tasks/:taskId
router.put('/:taskId', authenticate, requireProjectRole(), [
  body('title').optional().trim().notEmpty(),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'critical']),
  body('due_date').optional({ nullable: true }).isISO8601(),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { taskId, projectId } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(taskId, projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  // Only admin, creator, or assignee can edit
  const isAdmin = req.projectRole === 'admin';
  const isInvolved = task.created_by === req.user.id || task.assignee_id === req.user.id;
  if (!isAdmin && !isInvolved) return res.status(403).json({ error: 'Not authorized to edit this task' });

  const { title, description, status, priority, assignee_id, due_date } = req.body;

  if (assignee_id) {
    const isMember = db.prepare('SELECT id FROM project_members WHERE project_id = ? AND user_id = ?').get(projectId, assignee_id);
    if (!isMember) return res.status(400).json({ error: 'Assignee is not a project member' });
  }

  db.prepare(`
    UPDATE tasks SET
      title = COALESCE(?, title),
      description = COALESCE(?, description),
      status = COALESCE(?, status),
      priority = COALESCE(?, priority),
      assignee_id = CASE WHEN ? IS NOT NULL THEN ? ELSE assignee_id END,
      due_date = COALESCE(?, due_date),
      updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    title || null, description !== undefined ? description : null,
    status || null, priority || null,
    assignee_id !== undefined ? assignee_id : null,
    assignee_id !== undefined ? assignee_id : null,
    due_date !== undefined ? due_date : null,
    taskId
  );

  if (status && status !== task.status) {
    db.prepare(
      "INSERT INTO activity_log (user_id, project_id, task_id, action, details) VALUES (?, ?, ?, 'task_status_changed', ?)"
    ).run(req.user.id, projectId, taskId, `Changed status to "${status}"`);
  }

  const updated = db.prepare(`
    SELECT t.*, u.name as assignee_name, u.avatar_color as assignee_avatar
    FROM tasks t LEFT JOIN users u ON u.id = t.assignee_id WHERE t.id = ?
  `).get(taskId);

  res.json({ task: updated });
});

// DELETE /api/projects/:projectId/tasks/:taskId
router.delete('/:taskId', authenticate, requireProjectRole(), (req, res) => {
  const { taskId, projectId } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ? AND project_id = ?').get(taskId, projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const isAdmin = req.projectRole === 'admin';
  if (!isAdmin && task.created_by !== req.user.id) return res.status(403).json({ error: 'Not authorized' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
  res.json({ message: 'Task deleted' });
});

// POST /api/projects/:projectId/tasks/:taskId/comments
router.post('/:taskId/comments', authenticate, requireProjectRole(), [
  body('content').trim().notEmpty().withMessage('Comment cannot be empty'),
], (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { taskId, projectId } = req.params;
  const { content } = req.body;

  const task = db.prepare('SELECT id FROM tasks WHERE id = ? AND project_id = ?').get(taskId, projectId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const result = db.prepare(
    'INSERT INTO comments (task_id, user_id, content) VALUES (?, ?, ?)'
  ).run(taskId, req.user.id, content);

  const comment = db.prepare(`
    SELECT cm.*, u.name as user_name, u.avatar_color
    FROM comments cm JOIN users u ON u.id = cm.user_id WHERE cm.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({ comment });
});

module.exports = router;
