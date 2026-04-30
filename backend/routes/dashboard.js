const express = require('express');
const db = require('../models/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// GET /api/dashboard - comprehensive dashboard data
router.get('/', authenticate, (req, res) => {
  const userId = req.user.id;

  // Projects user belongs to
  const projects = db.prepare(`
    SELECT p.id, p.name, p.color, pm.role,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as total_tasks,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status = 'done') as done_tasks,
      (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status != 'done' AND due_date < DATE('now')) as overdue_tasks
    FROM projects p
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    ORDER BY p.created_at DESC
  `).all(userId);

  // My assigned tasks
  const myTasks = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color,
      CASE WHEN t.due_date < DATE('now') AND t.status != 'done' THEN 1 ELSE 0 END as is_overdue
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    WHERE t.assignee_id = ? AND t.status != 'done'
    ORDER BY 
      CASE WHEN t.due_date < DATE('now') THEN 0 ELSE 1 END,
      t.due_date ASC NULLS LAST,
      CASE t.priority WHEN 'critical' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 ELSE 4 END
    LIMIT 10
  `).all(userId);

  // Overall stats across all user's projects
  const stats = db.prepare(`
    SELECT 
      COUNT(*) as total_tasks,
      SUM(CASE WHEN t.status = 'done' THEN 1 ELSE 0 END) as completed_tasks,
      SUM(CASE WHEN t.status != 'done' AND t.due_date < DATE('now') THEN 1 ELSE 0 END) as overdue_tasks,
      SUM(CASE WHEN t.assignee_id = ? THEN 1 ELSE 0 END) as my_tasks
    FROM tasks t
    JOIN project_members pm ON pm.project_id = t.project_id AND pm.user_id = ?
  `).get(userId, userId);

  // Recent activity across user's projects
  const recentActivity = db.prepare(`
    SELECT al.*, u.name as user_name, u.avatar_color,
      p.name as project_name, p.color as project_color
    FROM activity_log al
    JOIN users u ON u.id = al.user_id
    LEFT JOIN projects p ON p.id = al.project_id
    WHERE al.project_id IN (
      SELECT project_id FROM project_members WHERE user_id = ?
    )
    ORDER BY al.created_at DESC
    LIMIT 20
  `).all(userId);

  // Overdue tasks across all projects
  const overdueTasks = db.prepare(`
    SELECT t.*, p.name as project_name, p.color as project_color,
      u.name as assignee_name
    FROM tasks t
    JOIN projects p ON p.id = t.project_id
    JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = ?
    LEFT JOIN users u ON u.id = t.assignee_id
    WHERE t.status != 'done' AND t.due_date < DATE('now')
    ORDER BY t.due_date ASC
    LIMIT 5
  `).all(userId);

  res.json({ projects, myTasks, stats, recentActivity, overdueTasks });
});

module.exports = router;
