# ⚡ TaskFlow — Team Task Manager

A full-stack team task management application with role-based access control, built with Node.js, Express, SQLite, and React.

**Live Demo:** `https://your-app.railway.app`  
**Demo credentials:** `test@example.com` / `password123`

---

## ✨ Features

- **Authentication** — JWT-based signup/login with secure bcrypt password hashing
- **Projects** — Create and manage multiple projects with custom colors
- **Kanban Board** — Drag-and-drop style task management across 4 columns (To Do → In Progress → Review → Done)
- **Task Management** — Full CRUD with title, description, status, priority (Low/Medium/High/Critical), due dates, and assignments
- **Role-Based Access** — Admin (full control) vs Member (create/edit own tasks)
- **Team Management** — Invite users by search, assign roles, remove members
- **Dashboard** — Unified view of all tasks across projects, overdue alerts, activity feed
- **Comments** — Per-task comment threads
- **Activity Log** — Audit trail for project actions
- **Overdue Detection** — Automatic flagging of past-due tasks

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js + Express |
| Database | SQLite (via `better-sqlite3`) |
| Auth | JWT + bcryptjs |
| Validation | express-validator |
| Frontend | React 18 + React Router v6 |
| HTTP Client | Axios |
| Build Tool | Vite |
| Deployment | Railway |

---

## 🚀 Local Development

### Prerequisites
- Node.js 18+
- npm 9+

### Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/taskflow.git
cd taskflow

# Install all dependencies
cd backend && npm install && cd ../frontend && npm install

# Create backend .env
cp backend/.env.example backend/.env
# Edit JWT_SECRET to something secure

# Seed demo data (optional)
cd backend && node seed.js

# Run development servers (two terminals)
# Terminal 1:
cd backend && npm run dev

# Terminal 2:
cd frontend && npm run dev
```

Frontend: http://localhost:5173  
Backend: http://localhost:5000

---

## 📡 API Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Create account |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/auth/users/search?q=` | Search users |

### Projects
| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| GET | `/api/projects` | ✅ | Any |
| POST | `/api/projects` | ✅ | Any |
| GET | `/api/projects/:id` | ✅ | Member |
| PUT | `/api/projects/:id` | ✅ | Admin |
| DELETE | `/api/projects/:id` | ✅ | Owner |
| POST | `/api/projects/:id/members` | ✅ | Admin |
| DELETE | `/api/projects/:id/members/:userId` | ✅ | Admin |
| PATCH | `/api/projects/:id/members/:userId/role` | ✅ | Admin |

### Tasks
| Method | Endpoint | Auth | Role |
|--------|----------|------|------|
| GET | `/api/projects/:id/tasks` | ✅ | Member |
| POST | `/api/projects/:id/tasks` | ✅ | Member |
| GET | `/api/projects/:id/tasks/:taskId` | ✅ | Member |
| PUT | `/api/projects/:id/tasks/:taskId` | ✅ | Admin/Creator/Assignee |
| DELETE | `/api/projects/:id/tasks/:taskId` | ✅ | Admin/Creator |
| POST | `/api/projects/:id/tasks/:taskId/comments` | ✅ | Member |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | Aggregated dashboard data |

---

## 🌐 Deploying to Railway

### One-Click Deploy

1. Push code to GitHub
2. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
3. Select your repository
4. Railway auto-detects the `railway.toml` config

### Environment Variables (set in Railway dashboard)

```
NODE_ENV=production
JWT_SECRET=your-very-long-random-secret-key-here
PORT=5000
```

### That's it!
Railway will:
- Run `npm install` + build the frontend
- Start the Express server which also serves the built frontend
- Assign a public URL

---

## 🗂 Project Structure

```
taskflow/
├── backend/
│   ├── models/
│   │   └── db.js          # SQLite schema & init
│   ├── middleware/
│   │   └── auth.js        # JWT + RBAC middleware
│   ├── routes/
│   │   ├── auth.js        # Authentication routes
│   │   ├── projects.js    # Project CRUD + team management
│   │   ├── tasks.js       # Task CRUD + comments
│   │   └── dashboard.js   # Dashboard aggregation
│   ├── server.js          # Express entry point
│   ├── seed.js            # Demo data seeder
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.jsx     # Sidebar + nav
│   │   │   ├── TaskModal.jsx  # Task create/edit modal
│   │   │   └── UI.jsx         # Shared design system
│   │   ├── context/
│   │   │   └── AuthContext.jsx
│   │   ├── pages/
│   │   │   ├── Auth.jsx       # Login + Signup
│   │   │   ├── Dashboard.jsx  # Overview dashboard
│   │   │   ├── Projects.jsx   # Project list
│   │   │   └── ProjectDetail.jsx # Kanban board
│   │   ├── api.js             # Axios client
│   │   ├── App.jsx            # Router
│   │   └── main.jsx
│   └── vite.config.js
├── railway.toml           # Railway deployment config
└── package.json           # Root build scripts
```

---

## 🔐 Role-Based Access

| Action | Admin | Member |
|--------|-------|--------|
| View project | ✅ | ✅ |
| Create tasks | ✅ | ✅ |
| Edit own tasks | ✅ | ✅ |
| Edit all tasks | ✅ | ❌ |
| Delete own tasks | ✅ | ✅ |
| Delete all tasks | ✅ | ❌ |
| Manage members | ✅ | ❌ |
| Edit project | ✅ | ❌ |
| Delete project | Owner only | ❌ |

---

## 📸 Screenshots

> Add screenshots of your dashboard, kanban board, and project views here.

---

## 📄 License

MIT
