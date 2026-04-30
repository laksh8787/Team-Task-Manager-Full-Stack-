import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import { Button, Modal, FormField, Spinner, EmptyState, Badge, toast } from '../components/UI';
import { Plus, FolderKanban, Users, CheckSquare, Trash2 } from 'lucide-react';

const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#f97316'];

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', color: COLORS[0] });
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  const load = () => api.get('/projects').then(r => setProjects(r.data.projects)).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.post('/projects', form);
      setProjects(p => [res.data.project, ...p]);
      setShowCreate(false);
      setForm({ name: '', description: '', color: COLORS[0] });
      toast('Project created!');
      navigate(`/projects/${res.data.project.id}`);
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to create', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div style={{ padding: 32 }} className="animate-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.02em' }}>Projects</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4 }}>{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        <Button icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>New Project</Button>
      </div>

      {projects.length === 0 ? (
        <div style={{
          background: 'var(--bg-card)', border: '2px dashed var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '60px 20px', textAlign: 'center',
        }}>
          <EmptyState
            icon={<FolderKanban size={40} />}
            title="No projects yet"
            description="Create your first project to start managing tasks with your team"
            action={<Button icon={<Plus size={15} />} onClick={() => setShowCreate(true)}>Create Project</Button>}
          />
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {projects.map(p => {
            const progress = p.task_count > 0 ? Math.round((p.done_count / p.task_count) * 100) : 0;
            return (
              <Link key={p.id} to={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                <div style={{
                  background: 'var(--bg-card)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)', padding: '20px', cursor: 'pointer',
                  transition: 'all 0.2s', position: 'relative', overflow: 'hidden',
                }}>
                  {/* Color accent */}
                  <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: p.color }} />

                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12, marginTop: 4 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 700, flex: 1, marginRight: 8 }}>{p.name}</h3>
                    <Badge type={p.my_role} />
                  </div>

                  {p.description && (
                    <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16, lineHeight: 1.5,
                      overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                      {p.description}
                    </p>
                  )}

                  {/* Progress */}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                      <span>Progress</span>
                      <span style={{ fontWeight: 600 }}>{progress}%</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: p.color, width: `${progress}%`, transition: 'width 0.5s' }} />
                    </div>
                  </div>

                  {/* Meta */}
                  <div style={{ display: 'flex', gap: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-dim)', fontSize: 12 }}>
                      <CheckSquare size={12} />
                      {p.task_count} tasks
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: 'var(--text-dim)', fontSize: 12 }}>
                      <Users size={12} />
                      {p.member_count} members
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>by {p.owner_name}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="New Project">
        <form onSubmit={handleCreate}>
          <FormField label="Project Name">
            <input placeholder="e.g. Website Redesign" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })} required autoFocus />
          </FormField>
          <FormField label="Description">
            <textarea placeholder="What's this project about?" rows={3} value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              style={{ resize: 'vertical' }} />
          </FormField>
          <FormField label="Color">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm({ ...form, color: c })}
                  style={{
                    width: 28, height: 28, borderRadius: '50%', background: c, border: 'none',
                    cursor: 'pointer', outline: form.color === c ? `3px solid ${c}` : '3px solid transparent',
                    outlineOffset: 2, transition: 'outline 0.15s',
                  }} />
              ))}
            </div>
          </FormField>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <Button variant="secondary" type="button" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create Project</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
