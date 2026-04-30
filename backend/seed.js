/**
 * Seed script — creates demo user and sample data
 * Run: node seed.js
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const db = require('./models/db');

async function seed() {
  console.log('🌱 Seeding database...');

  // Create demo users
  const password = await bcrypt.hash('password123', 12);
  
  const users = [
    { name: 'Alice Johnson', email: 'test@example.com', color: '#6366f1' },
    { name: 'Bob Smith', email: 'bob@example.com', color: '#ec4899' },
    { name: 'Carol White', email: 'carol@example.com', color: '#14b8a6' },
  ];

  const userIds = [];
  for (const u of users) {
    try {
      const res = db.prepare('INSERT INTO users (name, email, password, avatar_color) VALUES (?, ?, ?, ?)').run(u.name, u.email, password, u.color);
      userIds.push(res.lastInsertRowid);
      console.log(`✅ Created user: ${u.email}`);
    } catch (e) {
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(u.email);
      userIds.push(existing.id);
      console.log(`⏩ User already exists: ${u.email}`);
    }
  }

  // Create sample project
  try {
    const proj = db.prepare('INSERT INTO projects (name, description, color, owner_id) VALUES (?, ?, ?, ?)').run(
      'Website Redesign', 'Complete overhaul of the company website with new brand identity', '#6366f1', userIds[0]
    );
    const projectId = proj.lastInsertRowid;

    // Add all users as members
    db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(projectId, userIds[0], 'admin');
    db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(projectId, userIds[1], 'member');
    db.prepare('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)').run(projectId, userIds[2], 'member');

    // Add sample tasks
    const tasks = [
      { title: 'Design new homepage mockup', status: 'done', priority: 'high', assignee: userIds[1] },
      { title: 'Set up CI/CD pipeline', status: 'done', priority: 'medium', assignee: userIds[0] },
      { title: 'Write API documentation', status: 'in_progress', priority: 'high', assignee: userIds[0], due: '2026-05-10' },
      { title: 'Implement user authentication', status: 'in_progress', priority: 'critical', assignee: userIds[2] },
      { title: 'Mobile responsive layout', status: 'review', priority: 'high', assignee: userIds[1], due: '2026-05-05' },
      { title: 'Performance optimization', status: 'todo', priority: 'medium', assignee: userIds[2], due: '2026-05-20' },
      { title: 'SEO improvements', status: 'todo', priority: 'low', due: '2026-06-01' },
      { title: 'Browser compatibility testing', status: 'todo', priority: 'medium', due: '2026-04-25' },
    ];

    for (const t of tasks) {
      db.prepare('INSERT INTO tasks (title, status, priority, project_id, assignee_id, created_by, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
        t.title, t.status, t.priority, projectId, t.assignee || null, userIds[0], t.due || null
      );
    }

    console.log(`✅ Created project "Website Redesign" with ${tasks.length} tasks`);
  } catch (e) {
    console.log('⏩ Project already seeded');
  }

  console.log('\n🎉 Done! Login with: test@example.com / password123');
}

seed().catch(console.error);
