import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { Spinner, Avatar, Badge, EmptyState } from '../components/UI';
import { formatDistanceToNow, format, isPast, parseISO } from 'date-fns';
import { CheckCircle2, Clock, AlertTriangle, FolderOpen, TrendingUp, Activity } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const { projects, myTasks, stats, recentActivity, overdueTasks } = data;

  const statCards = [
    { label: 'Total Tasks', value: stats.total_tasks, icon: CheckCircle2, color: 'var(--accent)', bg: 'var(--accent-glow)' },
    { label: 'Completed', value: stats.completed_tasks, icon: TrendingUp, color: 'var(--green)', bg: 'var(--green-dim)' },
    { label: 'My Tasks', value: stats.my_tasks, icon: Clock, color: 'var(--blue)', bg: 'var(--blue-dim)' },
    { label: 'Overdue', value: stats.overdue_tasks, icon: AlertTriangle, color: 'var(--red)', bg: 'var(--red-dim)' },
  ];

  return (
    <div style={{ padding: '32px', maxWidth: 1100 }} className="animate-in">
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>
          Good day, {user?.name?.split(' ')[0]} 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>
          Here's what's happening across your projects
        </p>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
        {statCards.map(({ label, value, icon: Icon, color, bg }) => (
          <div key={label} style={{
            background: 'var(--bg-card)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)', padding: '20px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 500, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
                <div style={{ fontSize: 32, fontWeight: 800, fontFamily: 'var(--font-display)', color }}>{value ?? 0}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={18} color={color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* My Tasks */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>My Assigned Tasks</h3>
            <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>{myTasks.length} pending</span>
          </div>
          {myTasks.length === 0 ? (
            <EmptyState icon="✅" title="All clear!" description="No tasks assigned to you" />
          ) : (
            <div>
              {myTasks.slice(0, 6).map(task => (
                <Link key={task.id} to={`/projects/${task.project_id}`} style={{
                  display: 'flex', alignItems: 'center', padding: '12px 20px',
                  borderBottom: '1px solid var(--border)', gap: 12,
                  transition: 'background 0.15s',
                  textDecoration: 'none',
                }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      color: task.is_overdue ? 'var(--red)' : 'var(--text)',
                    }}>
                      {task.title}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                      <span style={{
                        fontSize: 11, color: 'var(--text-dim)',
                        display: 'flex', alignItems: 'center', gap: 3,
                      }}>
                        <span style={{ width: 8, height: 8, borderRadius: 2, background: task.project_color, display: 'inline-block' }} />
                        {task.project_name}
                      </span>
                      {task.due_date && (
                        <span style={{ fontSize: 11, color: task.is_overdue ? 'var(--red)' : 'var(--text-dim)' }}>
                          {task.is_overdue ? '⚠ ' : ''}Due {format(parseISO(task.due_date), 'MMM d')}
                        </span>
                      )}
                    </div>
                  </div>
                  <Badge type={task.priority} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Projects */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: 14, fontWeight: 600 }}>Your Projects</h3>
            <Link to="/projects" style={{ color: 'var(--accent-light)', fontSize: 12 }}>View all</Link>
          </div>
          {projects.length === 0 ? (
            <EmptyState icon={<FolderOpen size={32} />} title="No projects" description="Create your first project" />
          ) : (
            <div>
              {projects.slice(0, 5).map(p => {
                const progress = p.total_tasks > 0 ? Math.round((p.done_tasks / p.total_tasks) * 100) : 0;
                return (
                  <Link key={p.id} to={`/projects/${p.id}`} style={{
                    display: 'flex', alignItems: 'center', padding: '13px 20px',
                    borderBottom: '1px solid var(--border)', gap: 14,
                    textDecoration: 'none', transition: 'background 0.15s',
                  }}>
                    <div style={{ width: 10, height: 10, borderRadius: 3, background: p.color, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                      <div style={{ height: 4, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                        <div style={{ height: '100%', background: p.color, width: `${progress}%`, transition: 'width 0.5s ease' }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', flexShrink: 0 }}>{progress}%</span>
                    {p.overdue_tasks > 0 && (
                      <span style={{ fontSize: 11, color: 'var(--red)', background: 'var(--red-dim)', padding: '2px 7px', borderRadius: 99 }}>
                        {p.overdue_tasks} overdue
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Activity Feed */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <Activity size={15} color="var(--text-muted)" />
          <h3 style={{ fontSize: 14, fontWeight: 600 }}>Recent Activity</h3>
        </div>
        {recentActivity.length === 0 ? (
          <EmptyState icon="📋" title="No activity yet" description="Actions across your projects will appear here" />
        ) : (
          <div style={{ padding: '8px 0' }}>
            {recentActivity.slice(0, 8).map(log => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px' }}>
                <Avatar name={log.user_name} color={log.avatar_color} size={28} />
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: 13, fontWeight: 500 }}>{log.user_name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13 }}> — {log.details}</span>
                </div>
                <span style={{ color: 'var(--text-dim)', fontSize: 11, flexShrink: 0 }}>
                  {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
