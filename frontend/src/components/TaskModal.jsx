import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { Modal, FormField, Button, Badge, Avatar, toast } from './UI';
import { format, parseISO } from 'date-fns';
import { Send, Trash2, MessageSquare } from 'lucide-react';

export default function TaskModal({ task, projectId, members, myRole, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    assignee_id: task?.assignee_id || '',
    due_date: task?.due_date || '',
  });
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [tab, setTab] = useState('details');

  useEffect(() => {
    if (task?.id) {
      api.get(`/projects/${projectId}/tasks/${task.id}`).then(r => setComments(r.data.comments));
    }
  }, [task?.id]);

  const handleSave = async e => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, assignee_id: form.assignee_id || null, due_date: form.due_date || null };
      let res;
      if (task?.id) {
        res = await api.put(`/projects/${projectId}/tasks/${task.id}`, payload);
      } else {
        res = await api.post(`/projects/${projectId}/tasks`, payload);
      }
      toast(task?.id ? 'Task updated!' : 'Task created!');
      onSaved?.(res.data.task);
      if (!task?.id) onClose?.();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    setDeleting(true);
    try {
      await api.delete(`/projects/${projectId}/tasks/${task.id}`);
      toast('Task deleted');
      onDeleted?.(task.id);
      onClose?.();
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to delete', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleComment = async e => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPostingComment(true);
    try {
      const res = await api.post(`/projects/${projectId}/tasks/${task.id}/comments`, { content: newComment });
      setComments(c => [...c, res.data.comment]);
      setNewComment('');
    } catch {
      toast('Failed to post comment', 'error');
    } finally {
      setPostingComment(false);
    }
  };

  const isEdit = !!task?.id;
  const canDelete = myRole === 'admin';

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit Task' : 'New Task'} width={580}>
      {isEdit && (
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>
          {['details', 'comments'].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{
              padding: '8px 16px', background: 'none', color: tab === t ? 'var(--text)' : 'var(--text-muted)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              fontWeight: tab === t ? 600 : 400, fontSize: 13, cursor: 'pointer', transition: 'all 0.15s',
              textTransform: 'capitalize',
            }}>
              {t} {t === 'comments' && `(${comments.length})`}
            </button>
          ))}
        </div>
      )}

      {tab === 'details' ? (
        <form onSubmit={handleSave}>
          <FormField label="Title">
            <input placeholder="What needs to be done?" value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })} required autoFocus />
          </FormField>
          <FormField label="Description">
            <textarea placeholder="Add more details..." rows={3} value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              style={{ resize: 'vertical' }} />
          </FormField>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <FormField label="Status">
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="review">Review</option>
                <option value="done">Done</option>
              </select>
            </FormField>
            <FormField label="Priority">
              <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </FormField>
            <FormField label="Assignee">
              <select value={form.assignee_id} onChange={e => setForm({ ...form, assignee_id: e.target.value })}>
                <option value="">Unassigned</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Due Date">
              <input type="date" value={form.due_date}
                onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </FormField>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
            {isEdit && canDelete ? (
              <Button variant="danger" type="button" loading={deleting} icon={<Trash2 size={14} />} onClick={handleDelete}>
                Delete
              </Button>
            ) : <div />}
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={saving}>{isEdit ? 'Save Changes' : 'Create Task'}</Button>
            </div>
          </div>
        </form>
      ) : (
        <div>
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-muted)' }}>
              <MessageSquare size={28} style={{ opacity: 0.3, marginBottom: 8 }} />
              <p style={{ fontSize: 13 }}>No comments yet</p>
            </div>
          ) : (
            <div style={{ marginBottom: 20, maxHeight: 300, overflowY: 'auto' }}>
              {comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <Avatar name={c.user_name} color={c.avatar_color} size={28} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{c.user_name}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>
                        {format(new Date(c.created_at), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, lineHeight: 1.5 }}>
                      {c.content}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleComment} style={{ display: 'flex', gap: 8 }}>
            <input placeholder="Write a comment..." value={newComment}
              onChange={e => setNewComment(e.target.value)} style={{ flex: 1 }} />
            <Button type="submit" loading={postingComment} icon={<Send size={14} />}>Post</Button>
          </form>
        </div>
      )}
    </Modal>
  );
}
