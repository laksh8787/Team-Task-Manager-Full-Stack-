import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Button, Modal, FormField, Spinner, EmptyState, Badge, Avatar, toast } from '../components/UI';
import TaskModal from '../components/TaskModal';
import { Plus, Settings, Users, Trash2, ChevronLeft, Search, AlertCircle } from 'lucide-react';

const COLUMNS = [
  { key: 'todo', label: 'To Do', color: '#7070a0' },
  { key: 'in_progress', label: 'In Progress', color: '#3b82f6' },
  { key: 'review', label: 'Review', color: '#f59e0b' },
  { key: 'done', label: 'Done', color: '#10b981' },
];

export default function ProjectDetail() {
  const { projectId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [members, setMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({});
  const [myRole, setMyRole] = useState('member');
  const [loading, setLoading] = useState(true);

  const [tab, setTab] = useState('board');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showMembers, setShowMembers] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [filterAssignee, setFilterAssignee] = useState('');

  const loadProject = async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${projectId}`),
        api.get(`/projects/${projectId}/tasks`),
      ]);
      setProject(projRes.data.project);
      setMembers(projRes.data.members);
      setStats(projRes.data.stats);
      setMyRole(projRes.data.myRole);
      setTasks(tasksRes.data.tasks);
    } catch (err) {
      if (err.response?.status === 403) navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProject(); }, [projectId]);

  const searchUsers = async (q) => {
    setSearchUser(q);
    if (q.length < 2) { setSearchResults([]); return; }
    const res = await api.get(`/auth/users/search?q=${q}`);
    const memberIds = members.map(m => m.id);
    setSearchResults(res.data.users.filter(u => !memberIds.includes(u.id)));
  };

  const addMember = async (userId, role = 'member') => {
    try {
      await api.post(`/projects/${projectId}/members`, { userId, role });
      toast('Member added!');
      loadProject();
      setSearchUser('');
      setSearchResults([]);
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to add', 'error');
    }
  };

  const removeMember = async (userId) => {
    if (!confirm('Remove this member?')) return;
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);
      toast('Member removed');
      loadProject();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed', 'error');
    }
  };

  const changeRole = async (userId, role) => {
    try {
      await api.patch(`/projects/${projectId}/members/${userId}/role`, { role });
      loadProject();
    } catch { toast('Failed to change role', 'error'); }
  };

  const deleteProject = async () => {
    if (!confirm('Delete this project? This cannot be undone.')) return;
    try {
      await api.delete(`/projects/${projectId}`);
      toast('Project deleted');
      navigate('/projects');
    } catch (err) {
      toast(err.response?.data?.error || 'Failed', 'error');
    }
  };

  const handleTaskSaved = (savedTask) => {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === savedTask.id);
      if (idx >= 0) { const next = [...prev]; next[idx] = savedTask; return next; }
      return [savedTask, ...prev];
    });
    setSelectedTask(savedTask);
  };

  const handleTaskDeleted = (taskId) => {
    setTasks(prev => prev.filter(t => t.id !== taskId));
  };

  const quickStatus = async (taskId, status) => {
    try {
      const res = await api.put(`/projects/${projectId}/tasks/${taskId}`, { status });
      handleTaskSaved(res.data.task);
    } catch { toast('Failed', 'error'); }
  };

  if (loading) return <Spinner />;
  if (!project) return <div style={{ padding: 32 }}>Project not found</div>;

  const filteredTasks = filterAssignee ? tasks.filter(t => t.assignee_id === parseInt(filterAssignee)) : tasks;
  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.key] = filteredTasks.filter(t => t.status === col.key);
    return acc;
  }, {});

  const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;

  return (
    <div style={{ minHeight: '100vh' }} className="animate-in">
      {/* Header */}
      <div style={{
        padding: '20px 28px', borderBottom: '1px solid var(--border)',
        background: 'var(--bg-card)', position: 'sticky', top: 0, zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/projects" style={{ color: 'var(--text-muted)', display: 'flex' }}>
              <ChevronLeft size={20} />
            </Link>
            <div style={{ width: 14, height: 14, borderRadius: 4, background: project.color }} />
            <h1 style={{ fontSize: 18, fontWeight: 800 }}>{project.name}</h1>
            <Badge type={myRole} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {members.slice(0, 4).map((m, i) => (
                <div key={m.id} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 4 - i }}>
                  <Avatar name={m.name} color={m.avatar_color} size={28} />
                </div>
              ))}
              {members.length > 4 && (
                <div style={{ marginLeft: -8, width: 28, height: 28, borderRadius: '50%', background: 'var(--bg-hover)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: 'var(--text-muted)' }}>
                  +{members.length - 4}
                </div>
              )}
            </div>
            <Button variant="secondary" size="sm" icon={<Users size={13} />} onClick={() => setShowMembers(true)}>Team</Button>
            {myRole === 'admin' && (
              <Button variant="ghost" size="sm" icon={<Settings size={13} />} onClick={() => setShowSettings(true)} />
            )}
            <Button size="sm" icon={<Plus size={13} />} onClick={() => { setSelectedTask(null); setShowTaskModal(true); }}>
              Add Task
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: 20, marginTop: 14, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 12 }}>
            {COLUMNS.map(col => (
              <div key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: 2, background: col.color }} />
                <span style={{ color: 'var(--text-muted)' }}>{col.label}:</span>
                <span style={{ fontWeight: 600 }}>{stats[col.key] || 0}</span>
              </div>
            ))}
            {stats.overdue > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <AlertCircle size={10} color="var(--red)" />
                <span style={{ color: 'var(--red)', fontWeight: 600 }}>{stats.overdue} overdue</span>
              </div>
            )}
          </div>
          <div style={{ flex: 1, maxWidth: 200 }}>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', background: project.color, width: `${progress}%`, transition: 'width 0.5s' }} />
            </div>
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 600 }}>{progress}%</span>
        </div>

        {/* Tabs + Filter */}
        <div style={{ display: 'flex', gap: 0, marginTop: 14, justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex' }}>
            {['board', 'list'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '6px 14px', background: 'none',
                color: tab === t ? 'var(--text)' : 'var(--text-muted)',
                borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
                fontWeight: tab === t ? 600 : 400, fontSize: 13, cursor: 'pointer',
                textTransform: 'capitalize',
              }}>{t}</button>
            ))}
          </div>
          <select value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}
            style={{ width: 'auto', minWidth: 140, fontSize: 12, padding: '5px 10px' }}>
            <option value="">All Members</option>
            {members.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
      </div>

      {/* Board View */}
      {tab === 'board' && (
        <div style={{ display: 'flex', gap: 16, padding: '24px 28px', overflowX: 'auto', minHeight: 'calc(100vh - 200px)' }}>
          {COLUMNS.map(col => (
            <div key={col.key} style={{ minWidth: 280, flex: '1 1 280px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: col.color }} />
                <span style={{ fontWeight: 700, fontSize: 13 }}>{col.label}</span>
                <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>({tasksByStatus[col.key].length})</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasksByStatus[col.key].map(task => (
                  <div key={task.id} onClick={() => { setSelectedTask(task); setShowTaskModal(true); }}
                    style={{
                      background: 'var(--bg-card)', border: `1px solid ${task.is_overdue ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)', padding: '14px', cursor: 'pointer',
                      transition: 'border-color 0.15s, background 0.15s',
                    }}>
                    <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8, lineHeight: 1.4 }}>
                      {task.is_overdue && <AlertCircle size={12} color="var(--red)" style={{ marginRight: 4, verticalAlign: 'middle' }} />}
                      {task.title}
                    </div>
                    {task.description && (
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.4,
                        overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                        {task.description}
                      </p>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Badge type={task.priority} />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {task.due_date && (
                          <span style={{ fontSize: 11, color: task.is_overdue ? 'var(--red)' : 'var(--text-dim)' }}>
                            {new Date(task.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                          </span>
                        )}
                        {task.assignee_id && (
                          <Avatar name={task.assignee_name} color={task.assignee_avatar} size={22} />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                <button onClick={() => { setSelectedTask({ status: col.key }); setShowTaskModal(true); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '10px 14px',
                    background: 'transparent', color: 'var(--text-dim)', borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--border)', cursor: 'pointer', fontSize: 13, width: '100%',
                    transition: 'all 0.15s',
                  }}>
                  <Plus size={13} /> Add task
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* List View */}
      {tab === 'list' && (
        <div style={{ padding: '24px 28px' }}>
          {filteredTasks.length === 0 ? (
            <EmptyState icon="📋" title="No tasks yet" description="Add your first task to get started"
              action={<Button icon={<Plus size={14} />} onClick={() => setShowTaskModal(true)}>Add Task</Button>} />
          ) : (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
              {filteredTasks.map((task, i) => (
                <div key={task.id} onClick={() => { setSelectedTask(task); setShowTaskModal(true); }}
                  style={{
                    display: 'flex', alignItems: 'center', padding: '13px 18px', gap: 12, cursor: 'pointer',
                    borderBottom: i < filteredTasks.length - 1 ? '1px solid var(--border)' : 'none',
                    transition: 'background 0.15s',
                  }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: task.is_overdue ? 'var(--red)' : 'var(--text)' }}>
                      {task.is_overdue && '⚠ '}{task.title}
                    </div>
                    {task.description && <div style={{ fontSize: 12, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</div>}
                  </div>
                  <Badge type={task.status} />
                  <Badge type={task.priority} />
                  {task.due_date && <span style={{ fontSize: 12, color: task.is_overdue ? 'var(--red)' : 'var(--text-dim)', flexShrink: 0 }}>
                    {new Date(task.due_date).toLocaleDateString('en', { month: 'short', day: 'numeric' })}
                  </span>}
                  {task.assignee_id ? <Avatar name={task.assignee_name} color={task.assignee_avatar} size={26} /> : <div style={{ width: 26 }} />}
                  {task.comment_count > 0 && <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>💬 {task.comment_count}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task Modal */}
      {showTaskModal && (
        <TaskModal
          task={selectedTask}
          projectId={projectId}
          members={members}
          myRole={myRole}
          onClose={() => { setShowTaskModal(false); setSelectedTask(null); }}
          onSaved={handleTaskSaved}
          onDeleted={handleTaskDeleted}
        />
      )}

      {/* Members Modal */}
      <Modal open={showMembers} onClose={() => setShowMembers(false)} title={`Team (${members.length})`}>
        {myRole === 'admin' && (
          <div style={{ marginBottom: 20 }}>
            <FormField label="Add Member">
              <div style={{ position: 'relative' }}>
                <input placeholder="Search by name or email..." value={searchUser}
                  onChange={e => searchUsers(e.target.value)} />
                {searchResults.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
                    background: 'var(--bg-card)', border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)', zIndex: 10, overflow: 'hidden',
                  }}>
                    {searchResults.map(u => (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', gap: 10 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={u.name} color={u.avatar_color} size={28} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{u.email}</div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Button size="sm" variant="secondary" onClick={() => addMember(u.id, 'member')}>+ Member</Button>
                          <Button size="sm" onClick={() => addMember(u.id, 'admin')}>+ Admin</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </FormField>
          </div>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {members.map(m => (
            <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
              <Avatar name={m.name} color={m.avatar_color} size={36} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{m.name} {m.id === user.id && <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>(you)</span>}</div>
                <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{m.email}</div>
              </div>
              {myRole === 'admin' && m.id !== user.id ? (
                <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                  <select value={m.role} onChange={e => changeRole(m.id, e.target.value)}
                    style={{ width: 'auto', fontSize: 12, padding: '4px 8px' }}>
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <Button variant="danger" size="sm" icon={<Trash2 size={12} />} onClick={() => removeMember(m.id)} />
                </div>
              ) : <Badge type={m.role} />}
            </div>
          ))}
        </div>
      </Modal>

      {/* Settings Modal */}
      <Modal open={showSettings} onClose={() => setShowSettings(false)} title="Project Settings">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Project: <strong>{project.name}</strong></p>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <h4 style={{ color: 'var(--red)', marginBottom: 8, fontSize: 14 }}>Danger Zone</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 12 }}>
              Permanently delete this project and all its tasks. This cannot be undone.
            </p>
            {project.owner_id === user.id ? (
              <Button variant="danger" icon={<Trash2 size={14} />} onClick={deleteProject}>Delete Project</Button>
            ) : (
              <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>Only the project owner can delete it.</p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
