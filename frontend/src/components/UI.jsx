import { Loader2 } from 'lucide-react';

// ---- Button ----
export function Button({ children, variant = 'primary', size = 'md', loading, disabled, icon, ...props }) {
  const styles = {
    primary: { background: 'var(--accent)', color: '#fff', border: 'none' },
    secondary: { background: 'var(--bg-hover)', color: 'var(--text)', border: '1px solid var(--border)' },
    ghost: { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' },
    danger: { background: 'var(--red-dim)', color: 'var(--red)', border: '1px solid rgba(239,68,68,0.3)' },
    success: { background: 'var(--green-dim)', color: 'var(--green)', border: '1px solid rgba(16,185,129,0.3)' },
  };
  const sizes = {
    sm: { padding: '6px 12px', fontSize: '12px', borderRadius: 'var(--radius-sm)' },
    md: { padding: '9px 18px', fontSize: '14px', borderRadius: 'var(--radius-sm)' },
    lg: { padding: '12px 24px', fontSize: '15px', borderRadius: 'var(--radius)' },
  };
  return (
    <button
      style={{
        ...styles[variant], ...sizes[size],
        display: 'inline-flex', alignItems: 'center', gap: '8px',
        fontWeight: 500, cursor: (disabled || loading) ? 'not-allowed' : 'pointer',
        opacity: (disabled || loading) ? 0.6 : 1,
        transition: 'all 0.15s', fontFamily: 'var(--font-body)',
        whiteSpace: 'nowrap',
      }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 size={14} className="spin" /> : icon}
      {children}
    </button>
  );
}

// ---- Badge ----
const BADGE_STYLES = {
  todo: { bg: 'rgba(112,112,160,0.15)', color: '#9090c0', label: 'To Do' },
  in_progress: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', label: 'In Progress' },
  review: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', label: 'Review' },
  done: { bg: 'rgba(16,185,129,0.15)', color: '#34d399', label: 'Done' },
  low: { bg: 'rgba(112,112,160,0.15)', color: '#9090c0', label: 'Low' },
  medium: { bg: 'rgba(59,130,246,0.15)', color: '#60a5fa', label: 'Medium' },
  high: { bg: 'rgba(245,158,11,0.15)', color: '#fbbf24', label: 'High' },
  critical: { bg: 'rgba(239,68,68,0.15)', color: '#f87171', label: 'Critical' },
  admin: { bg: 'rgba(124,58,237,0.15)', color: '#a78bfa', label: 'Admin' },
  member: { bg: 'rgba(112,112,160,0.1)', color: '#7070a0', label: 'Member' },
};

export function Badge({ type, custom }) {
  const s = BADGE_STYLES[type] || { bg: 'rgba(100,100,150,0.1)', color: '#9090c0', label: type };
  return (
    <span style={{
      background: custom?.bg || s.bg,
      color: custom?.color || s.color,
      padding: '3px 9px', borderRadius: '99px',
      fontSize: '11px', fontWeight: 600, letterSpacing: '0.03em',
      display: 'inline-flex', alignItems: 'center', gap: '4px',
    }}>
      {s.label}
    </span>
  );
}

// ---- Avatar ----
export function Avatar({ name = '?', color = '#6366f1', size = 32 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.38, fontWeight: 700, fontFamily: 'var(--font-display)',
      flexShrink: 0, userSelect: 'none',
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ---- Card ----
export function Card({ children, style, onClick, hover = false }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '20px',
        transition: 'border-color 0.2s, background 0.2s',
        cursor: onClick ? 'pointer' : 'default',
        ...(hover || onClick ? {
          ':hover': { borderColor: 'var(--border-light)', background: 'var(--bg-hover)' }
        } : {}),
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ---- Modal ----
export function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px', backdropFilter: 'blur(4px)',
    }} onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div style={{
        background: 'var(--bg-card)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)', width: '100%', maxWidth: width,
        animation: 'fadeIn 0.2s ease', maxHeight: '90vh', overflow: 'auto',
      }}>
        <div style={{ padding: '24px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ fontSize: '18px' }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text-muted)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <div style={{ padding: '20px 24px 24px' }}>{children}</div>
      </div>
    </div>
  );
}

// ---- FormField ----
export function FormField({ label, error, children }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-muted)', marginBottom: '6px' }}>{label}</label>}
      {children}
      {error && <p style={{ color: 'var(--red)', fontSize: '12px', marginTop: '4px' }}>{error}</p>}
    </div>
  );
}

// ---- Spinner ----
export function Spinner({ size = 24 }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px' }}>
      <Loader2 size={size} className="spin" color="var(--accent)" />
    </div>
  );
}

// ---- Empty State ----
export function EmptyState({ icon, title, description, action }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
      <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>{icon}</div>
      <h3 style={{ fontSize: 16, marginBottom: 8, color: 'var(--text)' }}>{title}</h3>
      <p style={{ fontSize: 14, marginBottom: action ? 20 : 0, opacity: 0.8 }}>{description}</p>
      {action}
    </div>
  );
}

// ---- Toast ----
let toastFn = null;
export function setToastFn(fn) { toastFn = fn; }
export function toast(msg, type = 'success') { toastFn?.(msg, type); }

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);
  
  useEffect(() => {
    setToastFn((msg, type) => {
      const id = Date.now();
      setToasts(t => [...t, { id, msg, type }]);
      setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
    });
  }, []);

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 2000, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === 'error' ? 'var(--red-dim)' : 'var(--green-dim)',
          border: `1px solid ${t.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(16,185,129,0.3)'}`,
          color: t.type === 'error' ? 'var(--red)' : 'var(--green)',
          padding: '12px 16px', borderRadius: 'var(--radius-sm)', fontSize: 13,
          animation: 'slideIn 0.3s ease', maxWidth: 320, fontWeight: 500,
        }}>
          {t.msg}
        </div>
      ))}
    </div>
  );
}

import { useState, useEffect } from 'react';
