import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Button, FormField } from '../components/UI';
import { Zap } from 'lucide-react';

function AuthLayout({ children, title, subtitle }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
      background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%), var(--bg)',
    }}>
      <div style={{ width: '100%', maxWidth: 400 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, var(--accent), #ec4899)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 14px',
          }}>
            <Zap size={24} color="#fff" fill="#fff" />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.03em' }}>TaskFlow</h1>
          <p style={{ color: 'var(--text-muted)', marginTop: 4, fontSize: 14 }}>{subtitle}</p>
        </div>

        <div style={{
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius-lg)', padding: '28px',
        }}>
          <h2 style={{ fontSize: 18, marginBottom: 24 }}>{title}</h2>
          {children}
        </div>
      </div>
    </div>
  );
}

export function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Welcome back" subtitle="Sign in to your workspace">
      <form onSubmit={handleSubmit}>
        <FormField label="Email" error={error && ' '}>
          <input type="email" placeholder="you@company.com" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} required />
        </FormField>
        <FormField label="Password" error={error}>
          <input type="password" placeholder="Your password" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} required />
        </FormField>
        <Button type="submit" loading={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
          Sign In
        </Button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-muted)', fontSize: 13 }}>
        No account?{' '}
        <Link to="/signup" style={{ color: 'var(--accent-light)', fontWeight: 500 }}>Create one</Link>
      </p>
      <p style={{ textAlign: 'center', marginTop: 12, color: 'var(--text-dim)', fontSize: 12 }}>
        Demo: test@example.com / password123
      </p>
    </AuthLayout>
  );
}

export function SignupPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setErrors({});
    setLoading(true);
    try {
      await signup(form.name, form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      const apiErrors = err.response?.data?.errors;
      if (apiErrors) {
        const mapped = {};
        apiErrors.forEach(e => { mapped[e.path] = e.msg; });
        setErrors(mapped);
      } else {
        setErrors({ general: err.response?.data?.error || 'Signup failed' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Start managing tasks with your team">
      <form onSubmit={handleSubmit}>
        {errors.general && (
          <div style={{ background: 'var(--red-dim)', border: '1px solid rgba(239,68,68,0.3)', color: 'var(--red)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', marginBottom: 16, fontSize: 13 }}>
            {errors.general}
          </div>
        )}
        <FormField label="Full Name" error={errors.name}>
          <input placeholder="Jane Smith" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })} required />
        </FormField>
        <FormField label="Email" error={errors.email}>
          <input type="email" placeholder="you@company.com" value={form.email}
            onChange={e => setForm({ ...form, email: e.target.value })} required />
        </FormField>
        <FormField label="Password" error={errors.password}>
          <input type="password" placeholder="Min 6 characters" value={form.password}
            onChange={e => setForm({ ...form, password: e.target.value })} required />
        </FormField>
        <Button type="submit" loading={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
          Create Account
        </Button>
      </form>
      <p style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-muted)', fontSize: 13 }}>
        Already have an account?{' '}
        <Link to="/login" style={{ color: 'var(--accent-light)', fontWeight: 500 }}>Sign in</Link>
      </p>
    </AuthLayout>
  );
}
