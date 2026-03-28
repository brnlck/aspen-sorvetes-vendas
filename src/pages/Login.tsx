import { useState } from 'react';
import { IceCreamCone, Lock, Mail, Eye, EyeOff, AlertCircle } from 'lucide-react';
import './Login.css';

interface LoginProps {
  onLogin: () => void;
}

const VALID_EMAIL    = 'admin@aspensorvetes.com';
const VALID_PASSWORD = 'admin123';

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    setTimeout(() => {
      if (email === VALID_EMAIL && password === VALID_PASSWORD) {
        onLogin();
      } else {
        setError('E-mail ou senha inválidos. Verifique as credenciais de acesso.');
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className="login-bg">
      {/* Animated blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="login-card animate-fade-in">
        {/* Logo */}
        <div className="login-logo">
          <div className="login-logo-icon">
            <IceCreamCone size={36} />
          </div>
          <h1 className="login-title">Aspen Sorvetes - Vendas Carrinhos</h1>
          <p className="login-subtitle">Vendas Carrinhos</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="login-error">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">E-mail</label>
            <div className="input-wrapper">
              <Mail size={18} className="input-icon" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@aspensorvetes.com"
                required
                className="input-with-icon"
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Senha</label>
            <div className="input-wrapper">
              <Lock size={18} className="input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input-with-icon input-with-icon-right"
              />
              <button
                type="button"
                className="input-icon-right"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className={`btn-primary login-btn ${loading ? 'login-btn--loading' : ''}`}
            disabled={loading}
          >
            {loading ? (
              <span className="login-spinner" />
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>

        <p className="login-hint">
          Credenciais: <span>admin@aspensorvetes.com</span> / <span>admin123</span>
        </p>
      </div>
    </div>
  );
}
